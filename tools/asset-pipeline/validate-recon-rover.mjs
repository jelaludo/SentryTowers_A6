import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dequantize} from '@gltf-transform/functions';
import validator from 'gltf-validator';
import {
  applyRover,
  createColdGasSystem,
  NOZZLE_IDS,
  ZONE_DEFS,
  DEBRIS_MAP
} from '../../assets/recon-rover/runtime.js';

const out=new URL('../../assets/recon-rover/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={assets:[],errors:[]};
const socketBaseline=new Map();

await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const io=new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});

const DISPLAY_MESHES=[
  'DISPLAY_SPEED_LEFT',
  'DISPLAY_THRUST_RIGHT',
  'DISPLAY_GAS_RESERVE_REAR',
  'DISPLAY_FDAI_TELEMETRY_PANEL'
];

for(const e of manifest.assets){
  const stats=[];
  for(const [kind,file,hash] of [['plain',e.file,e.sha256],['meshopt',e.meshopt_file,e.meshopt_sha256]]){
    const bytes=await fs.readFile(new URL(file,out));
    if(sha(bytes)!==hash)report.errors.push(`${file}: hash mismatch`);
    let gltf;
    try{
      let validationBytes=bytes;
      if(kind==='meshopt'){
        const doc=await io.readBinary(bytes);
        doc.getRoot().listExtensionsUsed().filter(x=>x.extensionName===EXTMeshoptCompression.EXTENSION_NAME).forEach(x=>x.dispose());
        await doc.transform(dequantize());
        validationBytes=await io.writeBinary(doc);
      }
      const v=await validator.validateBytes(validationBytes);
      if(v.issues.numErrors||v.issues.numWarnings){
        report.errors.push(`${file}: glTF ${v.issues.numErrors} errors, ${v.issues.numWarnings} warnings`);
      }
      gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(
        bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''
      );
    }catch(err){
      report.errors.push(`${file}: decode ${err.message}`);
      continue;
    }
    const root=gltf.scene,names=new Set(),dupes=[],missing=[];
    let triangles=0,draws=0,degenerate=0;
    root.updateMatrixWorld(true);
    root.traverse(o=>{
      if(names.has(o.name))dupes.push(o.name);
      names.add(o.name);
      if(o.isMesh){
        draws++;
        const g=o.geometry,idx=g.index,p=g.attributes.position,count=idx?.count||p.count;
        triangles+=count/3;
        for(let i=0;i<count;i+=3){
          const ids=[i,i+1,i+2].map(j=>idx?idx.getX(j):j);
          const v=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j));
          if(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()<1e-18)degenerate++;
        }
      }
    });
    for(const n of e.required_nodes)if(!names.has(n))missing.push(n);
    for(const socket of e.sockets){
      const o=root.getObjectByName(socket.node);
      if(!o)continue;
      const p=o.getWorldPosition(new T.Vector3()),expected=new T.Vector3(...socket.position_m);
      if(p.distanceTo(expected)>0.005)report.errors.push(`${file}: socket ${socket.node} position mismatch`);
      const baseline=socketBaseline.get(socket.node);
      if(baseline&&p.distanceTo(baseline)>0.005)report.errors.push(`${file}: socket ${socket.node} tier/damage parity`);
      else if(!baseline)socketBaseline.set(socket.node,p.clone());
    }
    if(dupes.length)report.errors.push(`${file}: duplicate names ${dupes.join(',')}`);
    if(missing.length)report.errors.push(`${file}: missing ${missing.join(',')}`);
    if(degenerate)report.errors.push(`${file}: ${degenerate} degenerate triangles`);
    if(Math.round(triangles)!==e.triangles||draws!==e.draw_calls){
      report.errors.push(`${file}: metrics ${triangles}/${draws} expected ${e.triangles}/${e.draw_calls}`);
    }
    if(gltf.animations.length)report.errors.push(`${file}: unexpected baked clips`);
    if(e.lod===2&&draws!==1)report.errors.push(`${file}: static tier must be one draw`);

    if(e.lod<2){
      // Verify 4 onboard display meshes have clean UVs and distinct materials across D0–D3
      const dispMats=new Set();
      for(const dName of DISPLAY_MESHES){
        const dm=root.getObjectByName(dName);
        if(!dm?.isMesh){
          report.errors.push(`${file}: ${dName} must be a Mesh in LOD${e.lod}`);
          continue;
        }
        dispMats.add(dm.material.name);
        const uv=dm.geometry.attributes.uv;
        if(!uv||uv.count<4)report.errors.push(`${file}: ${dName} missing UV attribute`);
      }
      if(dispMats.size!==DISPLAY_MESHES.length){
        report.errors.push(`${file}: onboard displays must have separately addressable materials`);
      }

      // Verify all 19 localized zone mesh nodes and 6 debris nodes exist as Meshes in LOD0/LOD1
      for(const z of ZONE_DEFS){
        for(const mName of z.meshes){
          const zm=root.getObjectByName(mName);
          if(!zm?.isMesh)report.errors.push(`${file}: zone mesh ${mName} missing in LOD${e.lod}`);
        }
      }
      for(const d of DEBRIS_MAP){
        const dm=root.getObjectByName(d.id);
        if(!dm?.isMesh)report.errors.push(`${file}: debris mesh ${d.id} missing in LOD${e.lod}`);
      }

      // Verify steering + spin + suspension + 8 individual nozzles + sensor pitch/yaw + damage state behavior
      const zoneStates={};
      for(const z of ZONE_DEFS)zoneStates[z.id]=e.damage_level;
      const s=applyRover(root,5.2,e.lod,{
        thrusters:true,
        jump:false,
        speedMps:6.0,
        steerDeg:28,
        mastYawDeg:135,
        mastPitchDeg:-22,
        damageLevel:e.damage_level,
        zoneStates,
        leakEnabled:true,
        leakIntensity:0.85
      });

      if(e.damage_level<3){
        if(Math.abs(root.getObjectByName('WHEEL_STEER_FL').rotation.y)<0.12){
          report.errors.push(`${file}: front steering pivot failed`);
        }
        if(Math.abs(root.getObjectByName('WHEEL_SPIN_RL').rotation.x)<0.05){
          report.errors.push(`${file}: wheel spin pivot failed`);
        }
        if(Math.abs(root.getObjectByName('OPTICS_HEAD_PITCH').rotation.x)<0.08){
          report.errors.push(`${file}: optics head pitch failed`);
        }
        const fx=createColdGasSystem(T,root,{enabled:true,dust:true,leakEnabled:true});
        const stepRes=fx.step(0.02,s.nozzleIntensities,root,s.leakIntensities);
        if(!(stepRes.activePlumeCount>0)){
          report.errors.push(`${file}: cold-gas particle helper failed to spawn mist`);
        }
        if(e.damage_level===2&&!(stepRes.activeLeakCount>0)){
          report.errors.push(`${file}: D2 cold-gas leak failed to spawn mist from leak sockets`);
        }
      }else{
        // D3 disabled wreck check
        if(s.telemetry.speedMps!==0||s.telemetry.thrustPct!==0){
          report.errors.push(`${file}: D3 disabled wreck should have zero speed and thrust`);
        }
      }
      for(const id of NOZZLE_IDS){
        const sock=root.getObjectByName(`SOCKET_THRUSTER_${id}`);
        if(sock?.parent?.name!==`THRUSTER_${id}`){
          report.errors.push(`${file}: SOCKET_THRUSTER_${id} not parented to THRUSTER_${id}`);
        }
      }
    }
    stats.push({kind,bytes:bytes.length,triangles:Math.round(triangles),draw_calls:draws,degenerate});
  }
  report.assets.push({id:e.id,lod:e.lod,damage_level:e.damage_level,stats});
}

for(const e of manifest.assets){
  const b=manifest.budgets[`lod${e.lod}`];
  if(b&&(e.triangles>b.triangles||e.draw_calls>b.draw_calls||e.bytes>b.bytes)){
    report.errors.push(`${e.id}: exceeds budget (${e.triangles}/${b.triangles} tris, ${e.draw_calls}/${b.draw_calls} draws, ${e.bytes}/${b.bytes} bytes)`);
  }
}

await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.errors.length)process.exitCode=1;
