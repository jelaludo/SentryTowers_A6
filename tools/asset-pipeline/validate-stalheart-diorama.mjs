import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStory,applyTime,stateAt,DURATION,CHAPTERS,SITE_DISTANCE} from '../../assets/stalheart-diorama/runtime.js';
const out=new URL('../../assets/stalheart-diorama/',import.meta.url),layout=JSON.parse(await fs.readFile(new URL('layout.json',out))),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={status:'passed',duration_s:DURATION,samples:0,tiers:[],max_print_horizontal_error_m:0,min_nozzle_to_layer_m:Infinity,max_link_length_error_m:0,max_wheel_contact_error_m:0,max_boundary_tip_jump_m:0,checks:[]};
const position=o=>o.getWorldPosition(new T.Vector3());
for(const tier of layout.tiers){
  const models={};for(const e of tier.sources){const b=await fs.readFile(new URL('../../'+e.file,import.meta.url));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);models[e.role]=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
  const story=createStory(T,models,tier.lod),root=story.root,tip=story.kidou.getObjectByName('EXTRUSION_TIP');
  assert.equal(story.isao.scale.x,1);assert.equal(story.tw.isLineSegments,true);assert.equal(story.dw.isLineSegments,true);assert(!root.children.includes(models.tank.scene)&&!root.children.includes(models.dome.scene));
  const dome=story.dw.geometry.boundingBox,tank=story.tw.geometry.boundingBox;assert(Math.abs(dome.max.y-17.925)<1e-5);assert(dome.min.x>-14.1&&dome.max.x<14.1);assert(dome.min.z>SITE_DISTANCE-12&&dome.max.z<SITE_DISTANCE+12);assert(dome.max.y<25);
  for(const wire of [story.kw,story.tw,story.dw]){const p=wire.geometry.attributes.position;assert(p.count%2===0);for(const n of p.array)assert(Number.isFinite(n));assert.equal(p.count/2,tier.wireframes.find(w=>w.node===wire.name).segments);}
  for(let t=0;t<=DURATION;t+=.5){
    const s=applyTime(T,story,t);root.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),'matrix '+n.name));
    assert.equal(story.kidou.visible,t>34);assert.equal(story.kw.visible,t>6&&t<44);assert.equal(story.tw.visible,t>50);assert.equal(story.dw.visible,t>104);
    if(t>50&&t<72||t>104&&t<132){const v=position(tip),q=story.printTarget,h=Math.hypot(v.x-q.x,v.z-q.z),gap=v.y-q.y;report.max_print_horizontal_error_m=Math.max(report.max_print_horizontal_error_m,h);report.min_nozzle_to_layer_m=Math.min(report.min_nozzle_to_layer_m,gap);assert(h<1e-4,'nozzle horizontal '+JSON.stringify({t,lod:tier.lod,h,v:v.toArray(),q:q.toArray()}));assert(gap>.79,'tip above frontier');const upright=new T.Vector3(0,-1,0).applyQuaternion(tip.getWorldQuaternion(new T.Quaternion()));assert(upright.distanceTo(new T.Vector3(0,-1,0))<1e-5,'nozzle vertical');}
    const c=story.pose;for(const [a,b,len]of [[c.j[1],c.j[2],6],[c.j[2],c.j[3],5],[c.j[3],c.j[4],.6]]){const e=Math.abs(position(a).distanceTo(position(b))-len);report.max_link_length_error_m=Math.max(report.max_link_length_error_m,e);assert(e<2e-6);}
    for(const w of c.wheels){const e=Math.abs(position(w.contact).y);report.max_wheel_contact_error_m=Math.max(report.max_wheel_contact_error_m,e);assert(e<1e-5);assert(Math.abs(w.spin.rotation.x*1.82-s.z)<1e-7);}
    for(let i=0;i<2;i++){const end=c.carriage.localToWorld(new T.Vector3(.6+i*.35,0,.7));c.gantry.worldToLocal(end);const stored=c.feed[i].userData.endpoint.split(',').map(Number);assert(end.distanceTo(new T.Vector3(...stored))<1e-4,'moving hose endpoint');}
    report.samples++;
  }
  // Random seeking must produce the same frame as linear playback.
  applyTime(T,story,65);const before=position(tip).clone();applyTime(T,story,125);applyTime(T,story,0);applyTime(T,story,65);assert(position(tip).distanceTo(before)<1e-7);
  for(const t of [6,34,44,50,72,78,98,104,132]){applyTime(T,story,t-.00001);const a=position(tip).clone();applyTime(T,story,t+.00001);const d=position(tip).distanceTo(a);report.max_boundary_tip_jump_m=Math.max(report.max_boundary_tip_jump_m,d);assert(d<.002,'continuous chapter boundary '+t+' jump '+d);}
  applyTime(T,story,DURATION);assert.equal(story.kidou.position.z,52);assert(story.tw.visible&&story.dw.visible&&!story.kw.visible);assert(story.tw.geometry.boundingBox.equals(tank));assert(story.dw.geometry.boundingBox.equals(dome));
  report.tiers.push({lod:tier.lod,source_bytes:tier.source_bytes,line_segments:tier.generated_line_segments,dome_width_m:dome.max.x-dome.min.x,dome_height_m:dome.max.y,dome_side_clearance_m:14.1-dome.max.x,dome_longitudinal_clearance_m:SITE_DISTANCE+12-dome.max.z,dome_clearance_below_25m_working_limit_m:25-dome.max.y});
}
assert.equal(CHAPTERS[0].start,0);assert.equal(CHAPTERS.at(-1).end,DURATION);for(let i=1;i<CHAPTERS.length;i++)assert.equal(CHAPTERS[i].start,CHAPTERS[i-1].end);assert.equal(stateAt(-20).time,0);assert.equal(stateAt(200).time,DURATION);
report.checks=['Original source SHA-256 and byte sizes unchanged in both detail tiers','144-second deterministic one-shot; chapter boundaries continuous; backward seeking stable','Progressive gantry wireframe, original surface reveal, persistent wire-only tank and habitat','Half-scale dome fits within the side beams and 24 m machine length, below 25 m working limit','Rigid arm link lengths, downward nozzle and print-front clearance','Eight wheel contacts on the ground and rotation tied to 52 m displacement','Procedural feed endpoints follow the blended carriage','Detailed and game compositions use original source pivots; no animation baked into donor GLBs'];
await fs.writeFile(new URL('validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
