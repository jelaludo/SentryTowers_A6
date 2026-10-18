import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {applyStalheartCelebration,DURATION,REST_HOOK_WORLD} from '../../assets/stalheart-disco/runtime.js';

const base=new URL('../../assets/stalheart-disco/',import.meta.url);
const layout=JSON.parse(await fs.readFile(new URL('layout.json',base)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache=new Map();

async function loadModel(rel){
  if(cache.has(rel))return cache.get(rel);
  const bytes=await fs.readFile(new URL(rel,base));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const rec={bytes,scene:gltf.scene};
  cache.set(rel,rec);
  return rec;
}

const report={
  schema:'stalheart-disco/validation-v1',
  errors:[],
  tiers:[],
  clearance:{min_ball_ground_y_m:Infinity,min_guest_headroom_m:Infinity,max_hook_coupling_error_m:0}
};

for(const [rel,meta] of Object.entries(layout.reference_files)){
  const {bytes,scene}=await loadModel(rel);
  if(sha(bytes)!==meta.sha256)report.errors.push(`${rel}: sha256 mismatch`);
  if(bytes.length!==meta.bytes)report.errors.push(`${rel}: byte length mismatch`);
  let tris=0,draws=0;
  scene.traverse(o=>{
    if(o.isMesh){
      tris+=Math.round((o.geometry.index?.count||o.geometry.attributes.position.count)/3);
      draws+=Array.isArray(o.material)?o.material.length:1;
    }
  });
  if(tris!==meta.triangles||draws!==meta.draw_calls){
    report.errors.push(`${rel}: measured ${tris}/${draws} expected ${meta.triangles}/${meta.draw_calls}`);
  }
}

for(const tier of layout.tiers){
  const stalRec=await loadModel(tier.files.stalheart_plain);
  const discoRec=await loadModel(tier.files.disco_plain);
  const morkRec=await loadModel(tier.files.mork_guest);
  const isaoRec=await loadModel(tier.files.isao_guest);

  const stalheart=stalRec.scene.clone(true);
  const disco=discoRec.scene.clone(true);
  const mork=morkRec.scene.clone(true);
  const isao=isaoRec.scene.clone(true);

  mork.position.set(...layout.guests.mork.position);
  mork.rotation.y=layout.guests.mork.yaw;
  isao.position.set(...layout.guests.isao.position);
  isao.rotation.y=layout.guests.isao.yaw;

  const world=new T.Group();
  world.add(stalheart,disco,mork,isao);
  world.updateMatrixWorld(true);

  const morkBox=new T.Box3().setFromObject(mork);
  const isaoBox=new T.Box3().setFromObject(isao);
  const guestMaxY=Math.max(morkBox.max.y,isaoBox.max.y);

  let tierMinBallY=Infinity,tierMaxCouplingErr=0;
  const samples=tier.lod===2?1:64;
  for(let i=0;i<samples;i++){
    const t=(i/samples)*DURATION;
    applyStalheartCelebration(T,{stalheart,disco,mork,isao},t,tier.lod,{lasers:true,lights:true,swing:true});
    world.updateMatrixWorld(true);

    const cradle=disco.getObjectByName('STANDALONE_CRADLE');
    if(cradle?.visible)report.errors.push(`LOD${tier.lod}: STANDALONE_CRADLE must be hidden in gantry diorama`);

    const hook=disco.getObjectByName('SOCKET_GANTRY_HOOK')?.getWorldPosition(new T.Vector3());
    const expectedHook=tier.lod<2
      ?stalheart.getObjectByName('EXTRUSION_TIP')?.getWorldPosition(new T.Vector3())
      :new T.Vector3(...REST_HOOK_WORLD);
    const err=hook.distanceTo(expectedHook);
    tierMaxCouplingErr=Math.max(tierMaxCouplingErr,err);
    report.clearance.max_hook_coupling_error_m=Math.max(report.clearance.max_hook_coupling_error_m,err);
    if(err>0.002)report.errors.push(`LOD${tier.lod} t=${t.toFixed(2)}: hook coupling error ${err.toFixed(4)} m`);

    const sphereNode=disco.getObjectByName(tier.lod===2?'DISCO_STATIC_BODY':'DISCO_SPHERE_MESH');
    const sphereBox=new T.Box3().setFromObject(sphereNode);
    const ballBottomY=tier.lod===2
      ?(disco.getObjectByName('SOCKET_BALL_CENTER').getWorldPosition(new T.Vector3()).y-1.38)
      :sphereBox.min.y;
    tierMinBallY=Math.min(tierMinBallY,ballBottomY);
    report.clearance.min_ball_ground_y_m=Math.min(report.clearance.min_ball_ground_y_m,ballBottomY);
    const headroom=ballBottomY-guestMaxY;
    report.clearance.min_guest_headroom_m=Math.min(report.clearance.min_guest_headroom_m,headroom);
    if(ballBottomY<6.0)report.errors.push(`LOD${tier.lod} t=${t.toFixed(2)}: disco ball ground clearance too low (${ballBottomY.toFixed(2)} m)`);
    if(headroom<3.0)report.errors.push(`LOD${tier.lod} t=${t.toFixed(2)}: guest headroom too low (${headroom.toFixed(2)} m)`);
  }

  report.tiers.push({
    lod:tier.lod,
    quality:tier.quality,
    core_triangles:tier.core_diorama.triangles,
    core_draws:tier.core_diorama.draw_calls,
    min_ball_ground_y_m:+tierMinBallY.toFixed(3),
    max_hook_coupling_error_m:+tierMaxCouplingErr.toFixed(6)
  });
}

report.clearance.min_ball_ground_y_m=+report.clearance.min_ball_ground_y_m.toFixed(3);
report.clearance.min_guest_headroom_m=+report.clearance.min_guest_headroom_m.toFixed(3);
report.clearance.max_hook_coupling_error_m=+report.clearance.max_hook_coupling_error_m.toFixed(6);

await fs.writeFile(new URL('validation-report.json',base),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.errors.length)process.exitCode=1;
