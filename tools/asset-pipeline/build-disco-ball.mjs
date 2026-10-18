import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildDiscoBall,ENGINE_NODES} from './disco-ball-shape.mjs';

const out=new URL('../../assets/disco-ball/',import.meta.url);
await fs.mkdir(out,{recursive:true});

globalThis.FileReader=class{
  readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}
  readAsDataURL(b){b.arrayBuffer().then(x=>{this.result=`data:${b.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}
};

await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const assets=[];

for(const lod of [0,1,2]){
  const root=buildDiscoBall(lod);
  root.updateMatrixWorld(true);
  let triangles=0,draw_calls=0;
  const names=[],sockets=[],mats=new Set();
  root.traverse(o=>{
    names.push(o.name);
    if(o.isMesh){
      triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
      draw_calls++;
      mats.add(o.material);
    }
    if(o.name.startsWith('SOCKET_')){
      sockets.push({
        id:o.name.slice(7),
        node:o.name,
        kind:o.userData.kind,
        position_m:o.getWorldPosition(new T.Vector3()).toArray().map(v=>+v.toFixed(4)),
        normal:o.userData.normal||[0,0,1]
      });
    }
  });
  const bounds=new T.Box3().setFromObject(root);
  const file=`lod${lod}/disco_ball_d0_lod${lod}.glb`;
  await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));
  await fs.writeFile(new URL(file,out),bytes);

  const doc=await io.readBinary(bytes);
  await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));
  doc.createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
  const packed=Buffer.from(await io.writeBinary(doc));
  const meshopt_file=`derived/meshopt/lod${lod}/disco_ball_d0_lod${lod}.meshopt.glb`;
  await fs.mkdir(new URL(`derived/meshopt/lod${lod}/`,out),{recursive:true});
  await fs.writeFile(new URL(meshopt_file,out),packed);

  const entry={
    id:`disco_ball_d0_lod${lod}`,
    family:'disco_ball',
    file,
    lod,
    damage_level:0,
    static:lod===2,
    derived:false,
    review_status:'contract_candidate_pending_game_review',
    bytes:bytes.length,
    sha256:sha(bytes),
    triangles:Math.round(triangles),
    draw_calls,
    materials:mats.size,
    textures:0,
    meshopt_file,
    meshopt_bytes:packed.length,
    meshopt_sha256:sha(packed),
    meshopt_derived:true,
    plot_m:[8,8],
    bounds:{
      min:bounds.min.toArray().map(v=>+v.toFixed(4)),
      max:bounds.max.toArray().map(v=>+v.toFixed(4)),
      dimensions_m:bounds.getSize(new T.Vector3()).toArray().map(v=>+v.toFixed(4))
    },
    sockets,
    colliders:[
      {id:'standalone_rig_envelope',center_m:[0,3.1,0],size_m:[5.6,6.3,5.6],condition:'standalone_cradle'},
      {id:'suspended_ball_envelope',center_m:[0,3.8,0],size_m:[4.2,4.8,4.2],condition:'gantry_hanging'}
    ],
    clips:[],
    engine_nodes:ENGINE_NODES,
    required_nodes:names.filter(Boolean),
    credit:'Models by jelaludo'
  };
  assets.push(entry);
  console.log(entry.id,entry.triangles,'tris',entry.draw_calls,'draws',entry.bytes,'bytes','meshopt:',entry.meshopt_bytes,'bytes');
}

const manifest={
  schema:'jelaludo.asset-family/v2-candidate',
  family:'disco_ball',
  label:'DSC-01 / Celebration Disco Ball with Laser and Lights',
  status:'contract_candidate_pending_game_review',
  plain_glb_source_of_truth:true,
  coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},
  supported_damage_levels:[0],
  missing_damage_states_reason:'D1–D3 are not authored; celebration rig is intact D0 only and damage remains independent of detail.',
  budgets:{
    lod1:{triangles:8000,draw_calls:10,bytes:400000},
    lod2:{triangles:3000,draw_calls:1,bytes:250000}
  },
  lod_selection:{
    initial:2,
    approach_distance_m:150,
    hysteresis_m:20,
    provisional:true,
    detailed:'Close shots, celebration cutscenes and recordings',
    distance:'Static merged rest pose with one material and one draw call. Swap to LOD1 before spinning, pendulum swing or laser/light sweeps.'
  },
  runtime:{
    adapter:'runtime.js',
    baked_clips:[],
    demonstration:{name:'Disco_Celebration_Cycle',duration_s:16,loop:true},
    gantry_mount:{
      hook_socket:'SOCKET_GANTRY_HOOK',
      hide_in_gantry_mode:['STANDALONE_CRADLE'],
      stalheart_target_node:'EXTRUSION_TIP'
    },
    scope:'Pendulum swing, faceted sphere rotation, counter-rotating light halo and laser ring, spotlight/aperture emission and translucent laser beam preview are runtime-controlled via unbaked pivots.'
  },
  assets
};

await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
