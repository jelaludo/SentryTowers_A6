// Scene-specific contact passes. Original Kimodo files and library remain unchanged.
import fs from 'node:fs/promises';import crypto from 'node:crypto';import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {trackSample,smooth,clamp,lerp} from '../../nisoku03-chase/course.js';
const base=new URL('../../assets/nisoku03-kimodo/',import.meta.url),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),point=b=>b.getWorldPosition(V()),rot=b=>b.getWorldQuaternion(new T.Quaternion());
async function load(f){const b=await fs.readFile(new URL(f,base));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
const [rig,library]=await Promise.all([load('rig.glb'),load('derived/library.glb')]),paths=JSON.parse(await fs.readFile(new URL('derived/recorded-paths.json',base),'utf8'));
const holder=new T.Group();holder.add(rig.scene);const nodes={},bones=[];rig.scene.traverse(o=>{if(o.name)nodes[o.name]=o;if(o.isBone)bones.push(o)});const bind=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
const clipsByName=new Map(library.animations.map(c=>[c.name,c])),samplers=new Map(library.animations.map(c=>[c.name,c.tracks.map(t=>({node:nodes[t.name.slice(0,t.name.lastIndexOf('.'))],property:t.name.slice(t.name.lastIndexOf('.')+1),interpolant:t.createInterpolant()}))]));
const update=()=>{holder.updateMatrixWorld(true);rig.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()})};
function source(name,time){bones.forEach((b,i)=>{b.position.copy(bind[i].p);b.quaternion.copy(bind[i].q)});for(const s of samplers.get(name)){s.node[s.property].fromArray(s.interpolant.evaluate(clamp(time,0,clipsByName.get(name).duration-.000001)))}update()}
function capture(){return bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}))}
function apply(pose){bones.forEach((b,i)=>{b.position.copy(pose[i].p);b.quaternion.copy(pose[i].q)});update()}
function blend(a,b,w){bones.forEach((n,i)=>{n.position.lerpVectors(a[i].p,b[i].p,w);n.quaternion.copy(a[i].q).slerp(b[i].q,w)});update()}
function worldRotation(b,q){b.quaternion.copy(rot(b.parent).invert().multiply(q)).normalize();update()}
function aim(b,c,target){const origin=point(b),a=point(c).sub(origin).normalize(),d=target.clone().sub(origin).normalize();worldRotation(b,new T.Quaternion().setFromUnitVectors(a,d).multiply(rot(b)))}
function solve(a,b,c,goal,endRotation){const h=point(a),k=point(b),e=point(c),l1=h.distanceTo(k),l2=k.distanceTo(e),ray=goal.clone().sub(h),distance=ray.length(),d=clamp(distance,Math.abs(l1-l2)+.00001,l1+l2-.00001);ray.normalize();const pole=k.sub(h).addScaledVector(ray,-k.dot(ray));if(pole.lengthSq()<1e-9)pole.set(0,0,1);pole.normalize();const x=(l1*l1-l2*l2+d*d)/(2*d),y=Math.sqrt(Math.max(0,l1*l1-x*x));aim(a,b,h.clone().addScaledVector(ray,x).addScaledVector(pole,y));aim(b,c,h.clone().addScaledVector(ray,d));if(endRotation)worldRotation(c,endRotation);return distance-d}
function shiftBody(y){const m=nodes.MOTION,p=point(m).add(V(0,y,0));m.position.copy(m.parent.worldToLocal(p));update()}
function floorMin(){return new T.Box3().setFromObject(rig.scene,true).min.y}
function ground(target=.009){shiftBody(target-floorMin())}
// Lowest surface vertex belonging to each extremity, including its actual toe/finger shape.
const surfaces={};for(const key of ['FOOT_L','FOOT_R','HAND_L','HAND_R']){const list=[];rig.scene.traverse(m=>{if(!m.isSkinnedMesh)return;const ix=m.geometry.attributes.skinIndex,w=m.geometry.attributes.skinWeight;for(let i=0;i<ix.count;i++){const b=m.skeleton.bones[ix.getX(i)];if(w.getX(i)>.99&&(b.name.startsWith(key)||b.name===key.replace('FOOT','ANKLE')||b.name===key.replace('HAND','WRIST')))list.push([m,i])}});surfaces[key]=list}
function lowest(key){let low=V(0,Infinity,0);for(const [m,i] of surfaces[key]){const p=m.localToWorld(m.getVertexPosition(i,V()));if(p.y<low.y)low=p}return low}
function contact(side,groundY){const ankle=nodes['ANKLE_'+side],p=lowest('FOOT_'+side);return {anchor:V(p.x,groundY+.009,p.z),local:ankle.worldToLocal(p.clone()),q:rot(ankle)}}
function pin(side,lock,w=1){const ankle=nodes['ANKLE_'+side],q=rot(ankle).slerp(lock.q,w),offset=lock.local.clone().multiply(ankle.getWorldScale(V())).applyQuaternion(q),goal=point(ankle).lerp(lock.anchor.clone().sub(offset),w);return solve(nodes['HIP_'+side],nodes['KNEE_'+side],ankle,goal,q)}
function fitLockedLegs(locks){let dy=0;for(const s of ['L','R']){const a=nodes['ANKLE_'+s],h=point(nodes['HIP_'+s]),k=point(nodes['KNEE_'+s]),limit=h.distanceTo(k)+k.distanceTo(point(a))-.002,offset=locks[s].local.clone().multiply(a.getWorldScale(V())).applyQuaternion(locks[s].q),goal=locks[s].anchor.clone().sub(offset),horizontal=(h.x-goal.x)**2+(h.z-goal.z)**2;dy=Math.min(dy,goal.y+Math.sqrt(Math.max(0,limit*limit-horizontal))-h.y)}if(dy<0)shiftBody(dy)}

function fist(weight){for(const b of bones)if(/^HAND_[LR]_(INDEX|MIDDLE|RING|LITTLE)_(MCP|PIP|DIP)_FLEX$/.test(b.name)){const target=b.name.includes('_PIP_')?1.5:b.name.includes('_MCP_')?1.2:.9,sign=Math.sign(b.quaternion.x)||1;b.quaternion.slerp(new T.Quaternion().setFromAxisAngle(V(1,0,0),sign*target),weight)}update()}
holder.position.set(0,0,0);holder.quaternion.identity();source('game-idle-seed411-nisoku03',0);const idle=capture();
source('recorded-hero-landing',1.2);fist(1);const wrist=nodes.WRIST_L;let hand=lowest('HAND_L'),goal=point(wrist).add(V(0,.012-hand.y,0));solve(nodes.SHOULDER_L,nodes.ELBOW_L,wrist,goal,rot(wrist));ground(.009);const hero=capture(),heroAnkles=Object.fromEntries(['L','R'].map(s=>[s,{p:point(nodes['ANKLE_'+s]),q:rot(nodes['ANKLE_'+s])}]));
apply(idle);const idleAnkles=Object.fromEntries(['L','R'].map(s=>[s,{p:point(nodes['ANKLE_'+s]),q:rot(nodes['ANKLE_'+s])}]));
const descriptions=[
 {id:'side-roll-left',source:'recorded-side-roll-left',duration:5.9,kind:'side',direction:1,lockStart:5.05},
 {id:'side-roll-right',source:'recorded-side-roll-right',duration:5.9,kind:'side',direction:1,lockStart:5.05},
 {id:'ukemi-forward',source:'game-ukemi-forward-seed1101-nisoku03',duration:3.7,kind:'roll',direction:1,lockStart:3.1},
 {id:'ukemi-backward',source:'game-ukemi-backward-seed101-nisoku03',duration:3.65,kind:'roll',direction:-1,lockStart:2.95},
 {id:'crouch-down',source:'game-crouch-down-seed411-nisoku03',duration:1.9,kind:'crouch',direction:1},
 {id:'crouch-forward',source:'game-crouch-forward-seed411-nisoku03',duration:2.366667,kind:'crouch-loop',direction:1},
 {id:'crouch-up',source:'game-crouch-up-seed411-nisoku03',duration:1.9,kind:'crouch',direction:1},
 {id:'climb',source:'game-mantle-seed411-nisoku03',duration:4.4,kind:'climb',direction:1,lockStart:3.9},
 {id:'deck',source:'game-walk-forward-seed411-nisoku03',duration:2.6875,kind:'deck',direction:1},
 {id:'hero-landing',source:'recorded-hero-landing',duration:4.1,kind:'hero',direction:1,lockStart:3.6}
];
const clips=[],metadata={schema:'jelaludo.chase-contact-passes/2',derived:true,source_archive_untouched:true,actions:{}},measurements=[];
for(const spec of descriptions){
 const count=Math.ceil(spec.duration*60),times=[],positions=[],quaternions=[],samples=bones.map(()=>({p:[],q:[]})),locks={},frameStats=[];let minY=Infinity,fixtureClearance=Infinity,headMax=-Infinity,maxLockError=0,maxReach=0,rootAtLock=null,lastRoot=null,slideAfterLock=0;
 for(let i=0;i<=count;i++){
  const t=i/count*spec.duration;holder.position.set(0,0,0);holder.quaternion.identity();let z=0,y=0,groundY=0;
  if(spec.kind==='side'){
   source(spec.source,t);const p=paths[spec.id];holder.quaternion.fromArray(trackSample(p.rotation_times,p.quaternions,4,t));
   z=t<3.45?trackSample(p.times,p.positions,3,t)[2]:lerp(trackSample(p.times,p.positions,3,3.45)[2],5.15,smooth((t-3.45)/1.45));holder.position.z=z;update();
   if(t>3.4)ground(.009); // Correct the imported floor-plane offsets without editing the source.
  }else if(spec.kind==='roll'){
   source(spec.source,Math.min(t,clipsByName.get(spec.source).duration-.00001));
   if(spec.direction===1)z=t<.65?1.05*t:lerp(.6825,3.0,smooth((t-.65)/2.15));else z=-2.25*smooth(t/2.75);
   holder.position.z=z;update();ground();
   const w=smooth((t-(spec.direction===1?3.05:2.75))/.4);if(w>0){const current=capture();blend(current,idle,w);ground()}
  }else if(spec.kind.startsWith('crouch')){
   source(spec.source,spec.id==='crouch-up'?t+.65:t);ground();
   if(spec.id==='crouch-up'){const w=smooth((t-1.55)/.35);if(w>0){const p=capture();blend(p,idle,w);ground()}}
  }else if(spec.kind==='climb'){
   source(spec.source,t);z=.28*smooth((t-.3)/.9)+.97*smooth((t-2.7)/1.15);y=1.05*smooth((t-1.65)/1.9);holder.position.set(0,y,z);shiftBody(-y); // Source already contains ascent; transfer it to the controller exactly once.
   groundY=t>3.55?1.05:0;
   const w=smooth((t-1.0)/.35)*(1-smooth((t-1.8)/.35));
   for(const s of ['L','R']){const hand=nodes['WRIST_'+s],target=V(s==='L'?.27:-.27,1.25,.64),goal=point(hand).lerp(target,w);maxReach=Math.max(maxReach,solve(nodes['SHOULDER_'+s],nodes['ELBOW_'+s],hand,goal))}
   if(t>2.4&&t<3.55){let under=Infinity;for(const key of ['FOOT_L','FOOT_R'])for(const [m,i] of surfaces[key]){const p=m.localToWorld(m.getVertexPosition(i,V()));if(p.z>.6)under=Math.min(under,p.y)}if(under<1.059)shiftBody(1.059-under)}
   if(t>3.55){ground(1.059);const w=smooth((t-3.8)/.6),p=capture();blend(p,idle,w);ground(1.059)}
  }else if(spec.kind==='deck'){
   z=.8*t;const surface=d=>1.05+.75*clamp((d-.35)/1.8);y=surface(z);groundY=y;holder.position.set(0,y,z);source(spec.source,(t*1.2)%clipsByName.get(spec.source).duration);shiftBody(-.16*smooth((z-.2)/.3)*smooth((2.25-z)/.3));
   const goals=[];for(const side of ['L','R']){const a=nodes['ANKLE_'+side],sole=nodes['SOCKET_SOLE_'+side],p=point(sole),local=a.worldToLocal(p.clone());const lift=Math.max(0,p.y-y-.025);p.z=z+clamp((p.z-z)*.5,-.26,.26);const tilt=p.z>.35&&p.z<2.25?-Math.atan(.75/1.8):0,q=new T.Quaternion().setFromAxisAngle(V(1,0,0),tilt).multiply(idleAnkles[side].q),offset=local.multiply(a.getWorldScale(V())).applyQuaternion(q),target=V(p.x,surface(p.z)+.018+lift,p.z).sub(offset);goals.push({side,target,q})}
   let lower=0;for(const g of goals){const h=point(nodes['HIP_'+g.side]),k=point(nodes['KNEE_'+g.side]),a=point(nodes['ANKLE_'+g.side]),limit=h.distanceTo(k)+k.distanceTo(a)-.002,d2=(h.x-g.target.x)**2+(h.z-g.target.z)**2;lower=Math.min(lower,g.target.y+Math.sqrt(Math.max(0,limit*limit-d2))-h.y)}if(lower<0)shiftBody(lower);for(const g of goals)maxReach=Math.max(maxReach,solve(nodes['HIP_'+g.side],nodes['KNEE_'+g.side],nodes['ANKLE_'+g.side],g.target,g.q));
   for(const g of goals){let low=Infinity;for(const [m,i] of surfaces['FOOT_'+g.side]){const p=m.localToWorld(m.getVertexPosition(i,V()));low=Math.min(low,p.y-surface(p.z))}if(low<.006){g.target.y+=.006-low;maxReach=Math.max(maxReach,solve(nodes['HIP_'+g.side],nodes['KNEE_'+g.side],nodes['ANKLE_'+g.side],g.target,g.q))}}
  }else if(spec.kind==='hero'){
   const flight=.72;y=t<flight?1.8+1.1*t-(1.8+1.1*flight)*Math.pow(t/flight,2):0;z=1.5*clamp(t/flight);holder.position.set(0,y,z);
   if(t<.64){source('game-jump-run-seed411-nisoku03',lerp(.38,.86,clamp(t/.64)));const p=capture();blend(idle,p,smooth(t/.16))}
   else if(t<.95){source('game-jump-run-seed411-nisoku03',.86);const p=capture();blend(p,hero,smooth((t-.64)/.31));if(t>=flight)ground()}
   else{
    let w=t<1.9?0:t<2.5?.25*smooth((t-1.9)/.6):t<3.25?lerp(.25,.7,smooth((t-2.5)/.75)):lerp(.7,1,smooth((t-3.25)/.35));blend(hero,idle,w);
    for(const s of ['L','R']){const a=heroAnkles[s],b=idleAnkles[s],u=s==='R'?smooth((t-1.9)/.6):smooth((t-2.5)/.75),p=a.p.clone().lerp(b.p,u);p.y+=.09*Math.sin(Math.PI*u);p.add(holder.position);maxReach=Math.max(maxReach,solve(nodes['HIP_'+s],nodes['KNEE_'+s],nodes['ANKLE_'+s],p,a.q.clone().slerp(b.q,u)))}
    if(t<1.9){const w=nodes.WRIST_L,p=lowest('HAND_L'),g=point(w).add(V(0,.012-p.y,0));maxReach=Math.max(maxReach,solve(nodes.SHOULDER_L,nodes.ELBOW_L,w,g,rot(w)))}
    const low=floorMin();if(low<.004)shiftBody(.004-low);
   }
  }
  update();
  if(spec.lockStart!==undefined&&t>=spec.lockStart){
   for(const s of ['L','R'])locks[s]??=contact(s,groundY);fitLockedLegs(locks);for(const s of ['L','R']){maxReach=Math.max(maxReach,pin(s,locks[s],smooth((t-spec.lockStart)/.12)));if(t>=spec.lockStart+.15){const p=nodes['ANKLE_'+s].localToWorld(locks[s].local.clone());maxLockError=Math.max(maxLockError,p.distanceTo(locks[s].anchor))}}
   rootAtLock??=holder.position.clone();slideAfterLock=Math.max(slideAfterLock,Math.hypot(holder.position.x-rootAtLock.x,holder.position.z-rootAtLock.z));
  }
  update();headMax=Math.max(headMax,new T.Box3().setFromObject(rig.scene,true).max.y-holder.position.y);if(spec.kind==='deck')for(const key of ['FOOT_L','FOOT_R'])for(const [m,i] of surfaces[key]){const p=m.localToWorld(m.getVertexPosition(i,V()));fixtureClearance=Math.min(fixtureClearance,p.y-(1.05+.75*clamp((p.z-.35)/1.8)))}
  update();minY=Math.min(minY,floorMin()-(['climb','deck'].includes(spec.kind)?groundY:0));
  times.push(t);positions.push(...holder.position.toArray());quaternions.push(...holder.quaternion.toArray());bones.forEach((b,j)=>{samples[j].p.push(...b.position.toArray());samples[j].q.push(...b.quaternion.toArray())});lastRoot=holder.position.clone();
 }
 const tracks=[];bones.forEach((b,i)=>{for(const [key,size,rest,type,prop] of [['p',3,bind[i].p.toArray(),T.VectorKeyframeTrack,'position'],['q',4,bind[i].q.toArray(),T.QuaternionKeyframeTrack,'quaternion']]){const v=samples[i][key];if(v.some((x,k)=>Math.abs(x-rest[k%size])>1e-5))tracks.push(new type(b.name+'.'+prop,times,v))}});
 const clip=new T.AnimationClip('chase-'+spec.id,spec.duration,tracks);clips.push(clip);
 metadata.actions[spec.id]={...spec,clip:clip.name,duration_s:spec.duration,length_m:Math.abs(lastRoot.z),end_height_m:lastRoot.y,times,positions,rotation_times:times,quaternions,root_motion:'Derived contact pass; apply this controller path once. Pose clip excludes actor transform.',recovery_lock_start_s:spec.lockStart??null};measurements.push({id:spec.id,tracks:tracks.length,min_surface_relative_floor_m:minY,max_locked_contact_error_m:maxLockError,max_ik_reach_excess_m:maxReach,recovery_horizontal_travel_m:slideAfterLock,max_local_surface_y_m:headMax,deck_foot_clearance_m:Number.isFinite(fixtureClearance)?fixtureClearance:null});
 console.log(measurements.at(-1));
}
apply(idle);holder.position.set(0,0,0);holder.quaternion.identity();const meshes=[];rig.scene.traverse(o=>{if(o.isMesh)meshes.push(o)});meshes.forEach(m=>m.removeFromParent());globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.()})}};
const bytes=new Uint8Array(await new GLTFExporter().parseAsync(rig.scene,{binary:true,trs:true,animations:clips}));await fs.writeFile(new URL('derived/chase-actions.glb',base),bytes);metadata.asset={file:'derived/chase-actions.glb',lod:1,damage_level:0,derived:true,triangles:0,draw_calls:0,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),clips:clips.map(c=>({name:c.name,duration_s:c.duration})),credit:'Scene-specific derived contact passes from the user-supplied Kimodo output on the original Isao rig'};await fs.writeFile(new URL('derived/chase-actions.json',base),JSON.stringify(metadata));await fs.writeFile(new URL('chase-contact-validation.json',base),JSON.stringify({schema:'jelaludo.contact-bake-checks/1',fps:60,measurements,source_files_unchanged:true},null,2)+'\n');
