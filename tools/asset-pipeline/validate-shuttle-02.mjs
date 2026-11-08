import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {poseShuttle,applyDocking,dockingState,applyVTOL,vtolState,PHASES,VTOL_PHASES,SPEC,DOCK_TIMING} from '../../assets/shuttle-02/runtime.js';
const out=new URL('../../assets/shuttle-02/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const load=async bytes=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const roots=[],frames=[],report={status:'passed',scope:'Decoded plain GLBs, names, socket frames, conservative station separation, door aperture rays and sampled kinematic docking. No force, pressure or general collision simulation.',files:[],cycle_samples:0,aperture_checks:[],checks:[]};
const near=(a,b,e=1e-5)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
for(const a of manifest.assets){
 const bytes=await fs.readFile(new URL(a.file,out));assert.equal(bytes.length,a.bytes);assert.equal(sha(bytes),a.sha256);
 const v=await validator.validateBytes(bytes);assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 const g=await load(bytes),root=g.scene.getObjectByName(a.root);roots[a.lod]=root;root.updateMatrixWorld(true);assert.equal(g.animations.length,0);
 const names=[],frame={};let triangles=0,draws=0;
 root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name),o.name);if(o.name!=='SHUTTLE_DISTANCE_SURFACE')frame[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};
  if(o.isMesh){draws++;assert(!o.material.map&&!Array.isArray(o.material));const p=o.geometry.attributes.position,idx=o.geometry.index,count=idx?.count||p.count;triangles+=count/3;assert(Array.from(p.array).every(Number.isFinite));assert(Array.from(o.geometry.attributes.normal.array).every(Number.isFinite));for(let j=0;j<count;j+=3){const ps=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(j+k):j+k));assert(ps[1].sub(ps[0]).cross(ps[2].sub(ps[0])).lengthSq()>1e-18,'degenerate '+a.file+' '+o.name+' '+j);}}
 });frames[a.lod]=frame;assert.equal(new Set(names).size,names.length);assert.deepEqual(names.sort(),[...a.nodes].sort());assert.equal(triangles,a.triangles);assert.equal(draws,a.draw_calls);
 const bounds=new T.Box3().setFromObject(root,true);near(bounds.min.y,0);assert(bounds.min.distanceTo(new T.Vector3(...a.bounds.min))<1e-5);assert(bounds.max.distanceTo(new T.Vector3(...a.bounds.max))<1e-5);
 if(a.lod){assert.deepEqual(Object.keys(frame).sort(),Object.keys(frames[0]).sort());for(const [name,f]of Object.entries(frame)){assert.equal(f.parent,frames[0][name].parent);f.matrix.forEach((x,i)=>near(x,frames[0][name].matrix[i]));}const m=manifest.assets[0];assert(bounds.min.distanceTo(new T.Vector3(...m.bounds.min))<.001);assert(bounds.max.distanceTo(new T.Vector3(...m.bounds.max))<.001);}
 for(const s of a.sockets){const o=root.getObjectByName(s.node);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-5);assert(o.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion(...s.quaternion))<1e-5);}
 if(a.lod===1)assert(triangles<=25000);
 if(a.lod===2){assert(triangles<=3000&&draws===1&&bytes.length<=250000);poseShuttle(root,{extension:1,hatch:1,lock:1,tiltL:90,tiltR:90});for(const [name,f]of Object.entries(frame))assert.deepEqual(root.getObjectByName(name).matrix.toArray(),f.matrix);}
 report.files.push({file:a.file,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});
}
const station=(await load(await fs.readFile(new URL('../../assets/space-elevator/orbital_d0_lod0.glb',import.meta.url)))) .scene;station.updateMatrixWorld(true);
const stationSocket=station.getObjectByName(SPEC.station_socket),target=stationSocket.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).applyQuaternion(stationSocket.getWorldQuaternion(new T.Quaternion())),stationMaxX=new T.Box3().setFromObject(station,true).max.x;
let minSeparation=Infinity,maxSocketError=0;
for(const lod of [0,1]){
 const root=roots[lod],socket=root.getObjectByName('SOCKET_BELLY_DOCK');
 for(const hatch of [0,1]){
  poseShuttle(root,{hatch,extension:0});const ray=new T.Raycaster(new T.Vector3(.4,-4,SPEC.belly_z_m),new T.Vector3(0,1,0)),hit=ray.intersectObject(root,true)[0];assert(hit,'airlock ray hit');assert(hatch?hit.object.name==='HULL':hit.object.name.startsWith('BELLY_HATCH_'),hit.object.name);near(hit.point.y,hatch?2.82:1.75,.001);report.aperture_checks.push({lod,hatch,first_surface:hit.object.name,first_hit_y_m:hit.point.y});
  if(hatch){near(root.getObjectByName('DOCK_EXTEND').position.y,-1.2);const l=new T.Box3().setFromObject(root.getObjectByName('BELLY_HATCH_L'),true),r=new T.Box3().setFromObject(root.getObjectByName('BELLY_HATCH_R'),true);assert(l.max.x<-1.25&&r.min.x>1.25,'full aperture clear');}
 }
 // Sample the full 2.5 m aperture, not only its centre.
 poseShuttle(root,{hatch:1});for(let i=0;i<16;i++){const angle=i/16*Math.PI*2,ray=new T.Raycaster(new T.Vector3(1.15*Math.cos(angle),-4,SPEC.belly_z_m+1.15*Math.sin(angle)),new T.Vector3(0,1,0)),hit=ray.intersectObject(root,true)[0];near(hit.point.y,2.82,.001);}
 for(let i=0;i<=720;i++){
  const t=i/10,s=applyDocking(root,t);root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  const gap=socket.getWorldPosition(new T.Vector3()).distanceTo(target);
  if(t>=30&&t<=47){maxSocketError=Math.max(maxSocketError,gap);assert(gap<1e-5);near(new T.Vector3(0,0,1).applyQuaternion(socket.getWorldQuaternion(new T.Quaternion())).dot(normal),-1);}
  if(s.hatch>0){assert.equal(s.lock,1);assert.equal(s.extension,1);assert(gap<1e-5);}
  if(t>47)assert.equal(s.hatch,0);
  for(const name of ['HULL','CANOPY','THRUSTER_L_TILT','THRUSTER_R_TILT','BELLY_HATCH_L','BELLY_HATCH_R']){const b=new T.Box3().setFromObject(root.getObjectByName(name),true),separation=b.min.x-stationMaxX;assert(separation>0,'non-coupling geometry crosses station envelope '+name+' '+t);minSeparation=Math.min(minSeparation,separation);}
  report.cycle_samples++;
 }
}
// Arrival must keep travelling while rolling, then settle into the same seal frame.
const channels=t=>{const s=dockingState(t);return[...s.position,s.roll,s.extension];};
let movingRollSamples=0,minArrivalSpeed=Infinity,peakRollRate=0;
for(let i=1;i<300;i++){const t=i/10,h=.001,a=channels(t-h),b=channels(t+h),v=b.map((x,j)=>(x-a[j])/(2*h)),s=dockingState(t);const speed=Math.hypot(...v.slice(0,3));assert(speed>1e-4,'arrival pauses at '+t);assert(v[0]<=1e-7&&v[2]>=-1e-7&&v[3]<=1e-7,'arrival reverses at '+t);minArrivalSpeed=Math.min(minArrivalSpeed,speed);peakRollRate=Math.max(peakRollRate,Math.abs(v[3])*180/Math.PI);if(t>2&&t<14&&Math.abs(v[3])>1e-5&&speed>.01)movingRollSamples++;if(t>2&&t<10)assert(s.roll<0,'roll begins before previous stop');}
const joins=[0,...new Set(Object.values(DOCK_TIMING))].sort((a,b)=>a-b);
for(const t of joins){const h=.001,a=channels(t-2*h),b=channels(t-h),c=channels(t),d=channels(t+h),e=channels(t+2*h);for(let j=0;j<c.length;j++){assert(Math.abs((c[j]-b[j])/h-(d[j]-c[j])/h)<.005,'arrival velocity continuity '+t);assert(Math.abs((c[j]-2*b[j]+a[j])/(h*h)-(e[j]-2*d[j]+c[j])/(h*h))<.005,'arrival acceleration continuity '+t);}}
near(dockingState(8).roll,-Math.PI/4);near(dockingState(14).roll,-Math.PI/2);assert(dockingState(12).position[2]<-SPEC.belly_z_m);assert.deepEqual(dockingState(30).position,[32,15,2]);assert(movingRollSamples>100);
report.arrival={timing:DOCK_TIMING,moving_roll_samples:movingRollSamples,min_sampled_approach_speed_m_s:minArrivalSpeed,peak_roll_rate_deg_s:peakRollRate,velocity_and_acceleration_joins_s:joins};
for(const p of PHASES.slice(1)){const a=dockingState(p.start-1e-6),b=dockingState(p.start+1e-6);assert(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position))<1e-4);for(const k of ['roll','extension','lock','hatch'])near(a[k],b[k]);}
for(const s of manifest.sources){const b=await fs.readFile(new URL('../../'+s.file,import.meta.url));assert.equal(b.length,s.bytes);assert.equal(sha(b),s.sha256);}
// Conservatively clip fixed triangles into each pod's axial slab, then compare
// their radial distance with the complete rotating geometry's swept cylinder.
function clipX(poly,x,greater){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],aa=greater?a.x>=x:a.x<=x,bb=greater?b.x>=x:b.x<=x;if(aa)result.push(a);if(aa!==bb)result.push(a.clone().lerp(b,(x-a.x)/(b.x-a.x)));}return result;}
function radialRange(poly,y,z){const ps=poly.map(p=>new T.Vector2(p.y-y,p.z-z));let min=Infinity,inside=false;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],d=b.clone().sub(a),u=Math.max(0,Math.min(1,-a.dot(d)/(d.lengthSq()||1)));min=Math.min(min,a.clone().addScaledVector(d,u).length());if((a.y>0)!==(b.y>0)&&0<(b.x-a.x)*(-a.y)/(b.y-a.y)+a.x)inside=!inside;}return{min:inside?0:min,max:Math.max(...ps.map(p=>p.length()))};}
report.vtol={sweeps:[],dock_angle_samples:0,cycle_samples:0};
for(const lod of [0,1]){
 const root=roots[lod];root.position.set(0,0,0);root.rotation.set(0,0,0);poseShuttle(root,{hatch:1});
 const airlock=new T.Box3();for(const name of ['DOCK_EXTEND','BELLY_HATCH_L','BELLY_HATCH_R'])airlock.union(new T.Box3().setFromObject(root.getObjectByName(name),true));
 const fixed=root.getObjectByName('HULL').geometry,fp=fixed.attributes.position,fi=fixed.index;
 for(const [id,side]of [['L',-1],['R',1]]){
  const rotor=root.getObjectByName('THRUSTER_'+id+'_SURFACE').geometry.attributes.position,centre=new T.Vector3(side*7.2,4.5,0);let radius=0,minX=Infinity,maxX=-Infinity;
  for(let i=0;i<rotor.count;i++){radius=Math.max(radius,Math.hypot(rotor.getY(i),rotor.getZ(i)));minX=Math.min(minX,rotor.getX(i)+centre.x);maxX=Math.max(maxX,rotor.getX(i)+centre.x);}
  let minGap=Infinity,interfaces=0,checked=0;for(let i=0;i<fi.count;i+=3){let poly=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(fp,fi.getX(i+j)));poly=clipX(clipX(poly,minX,true),maxX,false);if(poly.length<3)continue;const range=radialRange(poly,centre.y,centre.z);if(range.max<1.38){interfaces++;continue;}minGap=Math.min(minGap,range.min-radius);checked++;}
  assert(minGap>.1,'full swept-cylinder clearance '+lod+' '+id+' '+minGap);const dockGap=side<0?airlock.min.x-maxX:minX-airlock.max.x;assert(dockGap>2,'airlock sweep independent of tilt');report.vtol.sweeps.push({lod,pod:id,rotor_radius_m:radius,fixed_triangle_checks:checked,rotary_interface_triangles_excluded:interfaces,min_radial_clearance_m:minGap,min_airlock_axial_clearance_m:dockGap});
 }
 for(let left=0;left<=90;left+=5)for(let right=0;right<=90;right+=5){applyDocking(root,37);poseShuttle(root,{extension:1,hatch:1,lock:1,tiltL:left,tiltR:right});const s=root.getObjectByName('SOCKET_BELLY_DOCK');assert(s.getWorldPosition(new T.Vector3()).distanceTo(target)<1e-5);near(new T.Vector3(0,0,1).applyQuaternion(s.getWorldQuaternion(new T.Quaternion())).dot(normal),-1);for(const id of ['L','R'])assert(new T.Box3().setFromObject(root.getObjectByName('THRUSTER_'+id+'_TILT'),true).min.x>stationMaxX);report.vtol.dock_angle_samples++;}
 root.position.set(0,0,0);root.rotation.set(0,0,0);
 for(let angle=0;angle<=90;angle++){poseShuttle(root,{tiltL:angle,tiltR:angle});for(const id of ['L','R']){const s=root.getObjectByName('SOCKET_EXHAUST_'+id),p=s.getWorldPosition(new T.Vector3()),d=new T.Vector3(0,0,1).applyQuaternion(s.getWorldQuaternion(new T.Quaternion()));near(d.y,-Math.cos(angle*Math.PI/180));near(d.z,-Math.sin(angle*Math.PI/180));const ray=new T.Raycaster(p,d,0,9);const hits=ray.intersectObject(root.getObjectByName('HULL'),false);assert.equal(hits.length,0,JSON.stringify({check:'exhaust centreline clears fixed structure',angle,id,start:p.toArray(),direction:d.toArray(),hits:hits.map(h=>({point:h.point.toArray(),distance:h.distance}))}));}}
 for(let i=0;i<=240;i++){const s=applyVTOL(root,i/10);assert(s.tiltL>=0&&s.tiltL<=90);assert.equal(s.tiltL,s.tiltR);root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));report.vtol.cycle_samples++;}
 const a=vtolState(0),b=vtolState(24);assert.deepEqual(a.position,b.position);near(a.tiltL,b.tiltL);
}
report.docking={max_socket_error_m:maxSocketError,min_non_coupling_separation_m:minSeparation,station_max_x_m:stationMaxX};
report.checks=['All three plain GLBs validate with zero errors and warnings; finite, nondegenerate geometry','Unique dot-free names, same hierarchy/TRS and sockets across tiers; envelope difference below 1 mm','Game triangle target and all distance targets met; 11 articulated draws reported','Outer doors close the aperture and clear it when open; collar extension interlock holds','Two animated tiers sampled through all 72 seconds: opposing mating normals, latch-before-open and close-before-release','Non-coupling meshes remain outside station bounding plane through entire cycle; contact geometry is excluded','Distance adapter preserves every local transform; original station exports remain byte-identical'];
report.checks.push('Full thruster swept cylinders clear fixed non-interface geometry; open airlock stays outside their axial slabs','722 independent left/right angle combinations preserve the fully open, captured docking interface','Exhaust centreline directions follow every integer degree of tilt and clear fixed hull for 9 m','482 VTOL cycle samples retain finite transforms, 0–90 degree limits and matching loop endpoints');
report.checks.push('Early roll overlaps continuous forward/lateral approach; no intermediate stop, reversal or velocity/acceleration discontinuity at arrival joins');
await fs.writeFile(new URL('validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
