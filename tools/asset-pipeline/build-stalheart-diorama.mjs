import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStory,applyTime,CHAPTERS,DURATION,DOME_SCALE,SITE_DISTANCE} from '../../assets/stalheart-diorama/runtime.js';
const out=new URL('../../assets/stalheart-diorama/',import.meta.url),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const tiers=[];
for(const lod of [0,1]){
  const paths={kidou:`assets/stalheart-kidou/stalheart_kidou_d0_lod${lod}.glb`,isao:`assets/isao-birudoron/isao_birudoron_lod${lod}.glb`,tank:`assets/hover-tank/mork_hover_tank_${lod?'low_':''}d0.glb`,dome:`assets/dome-colony/habitat_d0_lod${lod}.glb`};
  const sources=[],models={};
  for(const [role,file]of Object.entries(paths)){
    const bytes=await fs.readFile(new URL('../../'+file,import.meta.url)),model=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');models[role]=model;model.scene.updateMatrixWorld(true);
    let triangles=0,draws=0;model.scene.traverse(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;draws+=Math.max(1,n.geometry.groups.length);}});
    const bounds=new T.Box3().setFromObject(model.scene,true);sources.push({role,file,lod,damage_level:0,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls:draws,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},sockets:role==='kidou'?['EXTRUSION_TIP','SOCKET_FABRICATION_ORIGIN']:role==='isao'?['TOOL_TIP']:[],clips:model.animations.map(a=>({name:a.name,duration_s:a.duration})),credit:'Models by jelaludo'});
  }
  const story=createStory(T,models,lod);applyTime(T,story,DURATION);
  const lines=[story.kw,story.tw,story.dw].map(w=>({node:w.name,segments:w.geometry.attributes.position.count/2,bounds:{min:w.geometry.boundingBox.min.toArray(),max:w.geometry.boundingBox.max.toArray()},draw_calls:1,derived:true}));
  tiers.push({lod,role:lod===0?'Detailed recording composition':'Reduced animated composition',source_bytes:sources.reduce((a,s)=>a+s.bytes,0),source_triangles:sources.reduce((a,s)=>a+s.triangles,0),source_draw_calls:sources.reduce((a,s)=>a+s.draw_calls,0),sources,wireframes:lines,generated_line_segments:lines.reduce((a,l)=>a+l.segments,0),endpoint:{tank_wireframe:true,dome_wireframe:true,kidou_position:[0,0,SITE_DISTANCE],dome_height_m:story.domeHeight}});
  console.log('tier',lod,'source bytes',tiers.at(-1).source_bytes,'wire segments',tiers.at(-1).generated_line_segments);
}
await fs.writeFile(new URL('layout.json',out),JSON.stringify({schema:'jelaludo.scene-composition/v1',family:'stalheart-diorama',derived:true,source_commit:'acb8221ea4408c581e5c7813bbda7b12867ef556',credit:'Models by jelaludo',status:'cinematic_kinematic_diorama',units:'metres',up:'+Y',forward:'+Z',root:'STALHEART_DIORAMA_ROOT',origin:'First build site at ground level',plot_m:[92,132],plot_center:[0,0,26],plain_glb_source_of_truth:true,merged_scene_glb:false,clip:{name:'ISAO_STALHEART_Settlement_Sequence',duration_s:DURATION,playback:'One-shot, clamped endpoint; optional viewer loop',implementation:'Deterministic runtime.js composition; no new baked engine-pivot clips'},chapters:CHAPTERS,instances:{kidou:{scale:1,sites:[[0,0,0],[0,0,SITE_DISTANCE]]},isao:{scale:1},tank:{scale:1,position:[0,0,2.6],appearance:'Wireframe only'},dome:{scale:DOME_SCALE,position:[0,0,SITE_DISTANCE+2.6],source_role:'Dome City habitat',appearance:'Wireframe only'}},lod_selection:{default:1,detailed:0,automatic_swap:false,distance:'No animated scene LOD2: static source proxies cannot preserve the final raised fabrication-arm pose. Existing module distance tiers remain separate.'},textures:'Original source palettes appear on STALHEART. No bitmap textures added to canonical models.',tiers,handoff:{folder:'assets/stalheart-diorama/',viewer:'stalheart-diorama/',source_folders:['assets/stalheart-kidou/','assets/isao-birudoron/','assets/hover-tank/','assets/dome-colony/'],pending:['Game navigation and force simulation','Production collision/arm limits','Game-camera and reference-device performance','Release gltfpack packing and decoded validation if consumed by the game']}},null,2)+'\n');
