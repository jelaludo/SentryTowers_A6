import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildReconRover,ENGINE_NODES} from './recon-rover-shape.mjs';

const out=new URL('../../assets/recon-rover/',import.meta.url);
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
  const root=buildReconRover(lod);
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
  const file=`lod${lod}/r47x_recon_rover_d0_lod${lod}.glb`;
  await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));
  await fs.writeFile(new URL(file,out),bytes);

  const doc=await io.readBinary(bytes);
  await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));
  doc.createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
  const packed=Buffer.from(await io.writeBinary(doc));
  const meshopt_file=`derived/meshopt/lod${lod}/r47x_recon_rover_d0_lod${lod}.meshopt.glb`;
  await fs.mkdir(new URL(`derived/meshopt/lod${lod}/`,out),{recursive:true});
  await fs.writeFile(new URL(meshopt_file,out),packed);

  const entry={
    id:`r47x_recon_rover_d0_lod${lod}`,
    family:'recon_rover',
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
    plot_m:[6,8],
    bounds:{
      min:bounds.min.toArray().map(v=>+v.toFixed(4)),
      max:bounds.max.toArray().map(v=>+v.toFixed(4)),
      dimensions_m:bounds.getSize(new T.Vector3()).toArray().map(v=>+v.toFixed(4))
    },
    sockets,
    colliders:[
      {id:'chassis_hull_envelope',center_m:[0,0.62,0.04],size_m:[2.36,1.12,4.66],condition:'ground_nominal'},
      {id:'airborne_jump_envelope',center_m:[0,1.45,0.22],size_m:[2.40,2.65,4.80],condition:'low_gravity_hop'}
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
  family:'recon_rover',
  label:'R-47X / 6x6 Unmanned Reconnaissance Rover with 8 Gimbaled Cold-Gas Thrusters',
  status:'contract_candidate_pending_game_review',
  plain_glb_source_of_truth:true,
  coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},
  supported_damage_levels:[0],
  missing_damage_states_reason:'D1–D3 are not authored yet; initial handoff provides intact D0 across LOD0–LOD2 while keeping damage independent of detail.',
  budgets:{
    lod1:{triangles:8000,draw_calls:10,bytes:400000},
    lod2:{triangles:3000,draw_calls:1,bytes:250000}
  },
  lod_selection:{
    initial:2,
    approach_distance_m:140,
    hysteresis_m:20,
    provisional:true,
    detailed:'Close inspection, suspension/thruster engineering cutaways and cinematic recordings',
    distance:'Static merged rest pose with one material and one draw call. Swap to LOD1 before articulating suspension, sensor mast, or firing cold-gas jump thrusters.'
  },
  runtime:{
    adapter:'runtime.js',
    baked_clips:[],
    demonstration:{name:'Low_Gravity_Recon_Jump_Cycle',duration_s:16,loop:true},
    propulsion:{
      wheels:6,
      cold_gas_thrusters_total:8,
      ventral_lift_thrusters:4,
      lateral_vector_thrusters:4,
      copv_pressure_tanks:4
    },
    scope:'Hydraulic suspension crouch, 6x6 wheel droop, 8-thruster ventral/lateral multi-axis gimbal vectoring, cold-gas exhaust plumes, airborne low-gravity jump arc, and EO/IR + LiDAR mast scanning are runtime-controlled via unbaked pivots.'
  },
  assets
};

await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
