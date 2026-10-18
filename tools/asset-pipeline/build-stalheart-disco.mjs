import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {REST_HOOK_WORLD,HOOK_LOCAL_OFFSET,DURATION} from '../../assets/stalheart-disco/runtime.js';

const out=new URL('../../assets/stalheart-disco/',import.meta.url);
await fs.mkdir(out,{recursive:true});

await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

const tiers=[
  {
    lod:0,
    quality:'detailed',
    stalheart_plain:'../terraformer/terraformer_3000_d0.glb',
    stalheart_meshopt:'../terraformer/terraformer_3000_d0.glb',
    disco_plain:'../disco-ball/lod0/disco_ball_d0_lod0.glb',
    disco_meshopt:'../disco-ball/derived/meshopt/lod0/disco_ball_d0_lod0.meshopt.glb',
    mork_file:'../hover-tank/mork_hover_tank_low_d0.glb',
    isao_file:'../isao-birudoron/isao_birudoron_lod1.glb'
  },
  {
    lod:1,
    quality:'game',
    stalheart_plain:'../terraformer/terraformer_3000_d0_lod1.glb',
    stalheart_meshopt:'../terraformer/terraformer_3000_d0_lod1.meshopt.glb',
    disco_plain:'../disco-ball/lod1/disco_ball_d0_lod1.glb',
    disco_meshopt:'../disco-ball/derived/meshopt/lod1/disco_ball_d0_lod1.meshopt.glb',
    mork_file:'../hover-tank/mork_hover_tank_low_d0.glb',
    isao_file:'../isao-birudoron/isao_birudoron_lod1.glb'
  },
  {
    lod:2,
    quality:'distance',
    stalheart_plain:'../terraformer/terraformer_3000_d0_lod2.glb',
    stalheart_meshopt:'../terraformer/terraformer_3000_d0_lod2.meshopt.glb',
    disco_plain:'../disco-ball/lod2/disco_ball_d0_lod2.glb',
    disco_meshopt:'../disco-ball/derived/meshopt/lod2/disco_ball_d0_lod2.meshopt.glb',
    mork_file:'../hover-tank/mork_hover_tank_d0_lod2.glb',
    isao_file:'../isao-birudoron/isao_birudoron_lod2.glb'
  }
];

const reference_files={};

async function inspectFile(relPath){
  if(reference_files[relPath])return reference_files[relPath];
  const bytes=await fs.readFile(new URL(relPath,out));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(gltf.scene);
  let triangles=0,draw_calls=0,cradle_triangles=0,cradle_draws=0;
  gltf.scene.traverse(o=>{
    if(o.isMesh){
      const tris=Math.round((o.geometry.index?.count||o.geometry.attributes.position.count)/3);
      const draws=Array.isArray(o.material)?o.material.length:1;
      triangles+=tris;
      draw_calls+=draws;
      if(o.name==='STANDALONE_CRADLE'){
        cradle_triangles+=tris;
        cradle_draws+=draws;
      }
    }
  });
  const info={
    bytes:bytes.length,
    sha256:sha(bytes),
    triangles,
    draw_calls,
    cradle_triangles,
    cradle_draws,
    bounds:{
      min:bounds.min.toArray().map(v=>+v.toFixed(4)),
      max:bounds.max.toArray().map(v=>+v.toFixed(4))
    }
  };
  reference_files[relPath]=info;
  return info;
}

const tierSummaries=[];
for(const t of tiers){
  const sp=await inspectFile(t.stalheart_plain);
  const sm=await inspectFile(t.stalheart_meshopt);
  const dp=await inspectFile(t.disco_plain);
  const dm=await inspectFile(t.disco_meshopt);
  const mk=await inspectFile(t.mork_file);
  const is=await inspectFile(t.isao_file);

  const activeDiscoTriangles=dp.triangles-dp.cradle_triangles;
  const activeDiscoDraws=dp.draw_calls-dp.cradle_draws;

  tierSummaries.push({
    lod:t.lod,
    quality:t.quality,
    static:t.lod===2,
    files:{
      stalheart_plain:t.stalheart_plain,
      stalheart_meshopt:t.stalheart_meshopt,
      disco_plain:t.disco_plain,
      disco_meshopt:t.disco_meshopt,
      mork_guest:t.mork_file,
      isao_guest:t.isao_file
    },
    core_diorama:{
      triangles:sp.triangles+activeDiscoTriangles,
      exported_triangles:sp.triangles+dp.triangles,
      draw_calls:sp.draw_calls+activeDiscoDraws,
      exported_draw_calls:sp.draw_calls+dp.draw_calls,
      plain_bytes:sp.bytes+dp.bytes,
      meshopt_bytes:sm.bytes+dm.bytes,
      stalheart_triangles:sp.triangles,
      stalheart_draws:sp.draw_calls,
      disco_active_triangles:activeDiscoTriangles,
      disco_active_draws:activeDiscoDraws
    },
    with_guests:{
      triangles:sp.triangles+activeDiscoTriangles+mk.triangles+is.triangles,
      draw_calls:sp.draw_calls+activeDiscoDraws+mk.draw_calls+is.draw_calls,
      plain_bytes:sp.bytes+dp.bytes+mk.bytes+is.bytes
    }
  });
}

const layout={
  schema:'stalheart-disco/diorama-v1',
  family:'stalheart_disco_diorama',
  label:'Stålheart / Celebration Disco Gantry Diorama',
  status:'diorama_candidate_pending_game_review',
  derived_composition:true,
  plain_glb_source_of_truth:true,
  credit:'Models by jelaludo',
  units:'meters',
  up:'+Y',
  forward:'+Z',
  plot_m:[48,56],
  source_of_truth:'Canonical plain GLBs in assets/terraformer/ and assets/disco-ball/; this diorama composes them by reference without mutating or duplicating source binaries.',
  attachment:{
    parent_module:'terraformer_3000',
    parent_node:'EXTRUSION_TIP',
    child_module:'disco_ball',
    child_socket:'SOCKET_GANTRY_HOOK',
    child_socket_local_m:HOOK_LOCAL_OFFSET,
    rest_hook_world_m:REST_HOOK_WORLD,
    rest_ball_center_world_m:[
      +(REST_HOOK_WORLD[0]).toFixed(4),
      +(REST_HOOK_WORLD[1]-3.2).toFixed(4),
      +(REST_HOOK_WORLD[2]).toFixed(4)
    ],
    hidden_child_nodes:['STANDALONE_CRADLE']
  },
  guests:{
    mork:{position:[-6.2,0.31,-4.2],yaw:0.42,role:'optional_scale_and_celebration_guest'},
    isao:{position:[5.6,0,-3.2],yaw:-0.6,role:'optional_scale_and_celebration_guest'}
  },
  runtime:{
    adapter:'runtime.js',
    demonstration:{name:'Stalheart_Celebration_Cycle',duration_s:DURATION,loop:true},
    lod_selection:{initial:2,approach_distance_m:150,hysteresis_m:20}
  },
  tiers:tierSummaries,
  reference_files
};

await fs.writeFile(new URL('layout.json',out),JSON.stringify(layout,null,2)+'\n');
console.log('STALHEART_DISCO_DIORAMA_BUILT');
for(const t of tierSummaries){
  console.log(`LOD${t.lod}:`,t.core_diorama.triangles,'active tris (',t.core_diorama.draw_calls,'draws ) | plain:',t.core_diorama.plain_bytes,'B | meshopt:',t.core_diorama.meshopt_bytes,'B');
}
