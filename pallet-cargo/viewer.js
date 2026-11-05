import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyStride,strideStudy,applyCup,cupTransferPose,STATIONS} from '../assets/pallet-cargo/runtime.js?v=pcs-r2';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/pallet-cargo/';
const manifest=await fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();});
const scene=new T.Scene();scene.background=new T.Color(0x304c5d);scene.fog=new T.Fog(0x304c5d,15,35);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room).texture;room.dispose();pmrem.dispose();
scene.environmentIntensity=.65;scene.add(new T.HemisphereLight(0xe3f3ff,0x42515b,.8));const sun=new T.DirectionalLight(0xffeed6,2.2);sun.position.set(-3,6,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});sun.shadow.bias=-.00015;sun.shadow.normalBias=.003;sun.shadow.radius=3;scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x3b5667,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.004;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(30,60,0x66808b,0x526b78);grid.position.y=-.002;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
const camera=new T.PerspectiveCamera(34,1,.01,100),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=.35;orbit.maxDistance=18;orbit.maxPolarAngle=Math.PI*.8;
const holder=new T.Group();scene.add(holder);const socketOverlay=new T.Group();scene.add(socketOverlay);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();let serial=0,active=[],robot=null,cup=null,pallet=null,cargo=null,movingCrate=null,time=0,playing=false,view='hero';
for(const {id,side,end} of STATIONS){const row=document.createElement('div');row.className='wheel-control';row.innerHTML=`<label for="yaw${id}">${id} swivel <output id="yawValue${id}">${side*end*45}°</output></label><input id="yaw${id}" type="range" min="-180" max="180" step="1" value="${side*end*45}"><label for="susp${id}">${id} suspension <output id="suspValue${id}">0 mm</output></label><input id="susp${id}" type="range" min="-.035" max=".035" step=".001" value="0">`;$('wheelControls').append(row);}
const duration=()=>$('motion').value==='cup-transfer'?24:$('motion').value==='suspension'?6:20;
const markerGroup=new T.Group();scene.add(markerGroup);
for(const [label,z] of [['A',-1.7],['B',1.7]]){const points=[[-1.15,0,-.7],[1.15,0,-.7],[1.15,0,.7],[-1.15,0,.7],[-1.15,0,-.7]].map(([x,y,dz])=>new T.Vector3(x,.003,z+dz));const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xb99155,transparent:true,opacity:.6}));markerGroup.add(line);const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#efc37e';ctx.font='bold 80px monospace';ctx.textAlign='center';ctx.fillText(label,64,94);const plane=new T.Mesh(new T.PlaneGeometry(.3,.3),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(-1.35,.005,z);markerGroup.add(plane);}
async function get(module,lod,encoding){const entry=manifest.assets.find(e=>e.module===module&&e.lod===lod),file=encoding==='meshopt'?entry.meshopt_file:entry.file;if(!cache.has(file))cache.set(file,loader.loadAsync(base+file).catch(e=>{cache.delete(file);throw e;}));const gltf=await cache.get(file),root=gltf.scene.children[0].clone(true);root.userData.static=entry.static;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return {root,entry};}
function staticMode(){return $('lod').value==='2';}
function operate(){
 const motion=$('motion').value,anim=motion!=='inspect'&&!staticMode(),transport=anim&&robot;
 const headings={},suspension={};for(const {id} of STATIONS){headings[id]=+$('yaw'+id).value*Math.PI/180;suspension[id]=+$('susp'+id).value;$('yawValue'+id).textContent=$('yaw'+id).value+'°';$('suspValue'+id).textContent=Math.round(suspension[id]*1000)+' mm';}
 const preset=$('steeringMode').value;
 const pose=transport?strideStudy(time,motion):{height:+$('height').value,steer:preset==='common'?+$('steer').value*Math.PI/180:null,headings:preset==='individual'?headings:preset==='spin'?strideStudy(0,'rotate').headings:{},suspension,travel:0,lock:$('locked').checked?1:0};
 if(robot)applyStride(robot,pose);holder.position.set(transport?pose.x||0:0,0,transport?pose.z||0:0);holder.rotation.y=transport?pose.yaw||0:0;markerGroup.visible=!!transport&&motion==='transport';
 if(pallet&&robot){const attach=robot.getObjectByName('SOCKET_PALLET');pallet.position.y=attach.parent.position.y+attach.position.y+($('separate').checked?.35:0);}
 if(cargo){cargo.visible=$('cargo').checked;cargo.position.y=(pallet?.position.y||0)+.16+($('separate').checked?.18:0);}
 let cupPose;if(cup){const yaw=+$('cupYaw').value*Math.PI/180,r=+$('cupReach').value;cupPose=anim?cupTransferPose(time):{target:[Math.sin(yaw)*r,+$('cupHeight').value,Math.cos(yaw)*r],vacuum:$('vacuum').checked?1:0,crate:[.65,.16,.8],phase:'CUP · inspect level suction head'};applyCup(cup,cupPose);if(movingCrate)movingCrate.position.set(...(staticMode()?[.65,.16,.8]:cupPose.crate));}
 $('phase').textContent=staticMode()?'Static distance · articulation disabled':cup?cupPose.phase:transport?pose.phase:'Stationary · '+($('locked').checked?'pallet secured':'locks released');
 $('timeValue').textContent=time.toFixed(1)+' / '+duration()+' s';$('heightValue').textContent=(transport?pose.height:+$('height').value).toFixed(2)+' m';$('steerValue').textContent=$('steer').value+'°';
 $('cupYawValue').textContent=$('cupYaw').value+'°';$('cupReachValue').textContent=(+$('cupReach').value).toFixed(2)+' m';$('cupHeightValue').textContent=(+$('cupHeight').value).toFixed(2)+' m';
 holder.updateMatrixWorld(true);socketOverlay.children.forEach(m=>m.position.copy(m.userData.socket.getWorldPosition(new T.Vector3())));
}
function appearance(){holder.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});socketOverlay.visible=$('sockets').checked;}
function controlsState(){const stat=staticMode(),isAssembly=$('module').value==='assembly',anim=$('motion').value!=='inspect';$('strideControls').hidden=!robot;$('cupControls').hidden=!cup;for(const id of ['height','steer','locked','steeringMode',...STATIONS.flatMap(s=>['yaw'+s.id,'susp'+s.id])])$(id).disabled=stat||!robot||anim;$('steer').disabled=stat||!robot||anim||$('steeringMode').value!=='common';for(const {id} of STATIONS)$('yaw'+id).disabled=stat||!robot||anim||$('steeringMode').value!=='individual';for(const id of ['cupYaw','cupReach','cupHeight','vacuum'])$(id).disabled=stat||!cup||anim;for(const id of ['motion','play','time'])$(id).disabled=stat||!(robot||cup);for(const id of ['separate','cargo'])$(id).disabled=!isAssembly;for(const o of $('motion').options)o.disabled=o.value==='inspect'?false:cup?o.value!=='cup-transfer':o.value==='cup-transfer';$('time').max=duration();}
function fit(){
 operate();const bounds=new T.Box3().setFromObject(holder);if($('motion').value!=='inspect'&&robot&&!staticMode()){bounds.expandByPoint(new T.Vector3(-2.8,0,-2.8));bounds.expandByPoint(new T.Vector3(2.8,1.4,2.8));}if(cup){bounds.expandByPoint(new T.Vector3(-1.6,0,-.6));bounds.expandByPoint(new T.Vector3(1.6,1.75,1.55));}
 const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const directions={hero:cup?[2.5,1.6,-2.8]:[2.1,1.55,2.7],front:[0,.13,3],top:[0,4,.001],underside:[2,-1.1,2.5]},dir=new T.Vector3(...directions[view]).normalize();
 // Fit the bounding sphere to the narrower FOV, including portrait screens.
 const halfFov=Math.min(T.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect));const distance=size.length()/2/Math.sin(halfFov)*1.05;
 orbit.target.copy(center);camera.position.copy(center).addScaledVector(dir,distance);camera.near=.01;camera.updateProjectionMatrix();orbit.update();floor.visible=grid.visible=view!=='underside';
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
async function load(){
 const ticket=++serial;window.palletCargoReady=false;$('status').textContent='Loading selected models…';const mode=$('module').value,lod=+$('lod').value,encoding=$('encoding').value;
 const modules=mode==='assembly'?['stride','pallet','crate']:mode==='cup-loading'?['cup','pallet','crate']:[mode==='stack'?'pallet':mode];const loaded=await Promise.all(modules.map(m=>get(m,lod,encoding)));if(ticket!==serial)return;
 holder.clear();socketOverlay.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});socketOverlay.clear();active=[];robot=cup=pallet=cargo=movingCrate=null;
 function place(item,pos,parent=holder){const clone=item.root.clone(true);clone.position.set(...pos);parent.add(clone);active.push({...item,root:clone});return clone;}
 for(const item of loaded){
  if(mode==='cup-loading'&&item.entry.module==='pallet'){for(const side of [-1,1])place(item,[side*.95,0,1.05]);}
  else if(mode==='cup-loading'&&item.entry.module==='crate'){for(const side of [-1,1])for(const x of [-.30,.30])for(const z of [-.25,.25]){if(x===-side*.30&&z===-.25)continue;place(item,[side*.95+x,.16,1.05+z]);}movingCrate=place(item,[.65,.16,.8]);}
  else if(mode==='assembly'&&item.entry.module==='crate'){cargo=new T.Group();cargo.name='CARGO_PREVIEW_GRID';holder.add(cargo);for(const x of [-.30,.30])for(const z of [-.25,.25])place(item,[x,0,z],cargo);}
  else if(mode==='stack'){for(let i=0;i<5;i++)place(item,[0,i*.16,0]);}
  else{holder.add(item.root);active.push(item);if(item.entry.module==='stride')robot=item.root;if(item.entry.module==='cup')cup=item.root;if(item.entry.module==='pallet')pallet=item.root;}
 }
 if(cup&&$('motion').value!=='cup-transfer'||!cup&&$('motion').value==='cup-transfer'){$('motion').value='inspect';playing=false;time=0;$('play').textContent='Play';}
 holder.traverse(o=>{if(o.name.startsWith('SOCKET_')){const m=new T.Mesh(new T.SphereGeometry(.014,8,6),new T.MeshBasicMaterial({color:o.name.includes('LOCK')?0xffbf59:0x86dada,depthTest:false}));m.userData.socket=o;m.renderOrder=10;socketOverlay.add(m);}});
 if(staticMode()){playing=false;$('play').textContent='Play';}
 const totals=active.reduce((a,{entry:e})=>({triangles:a.triangles+e.triangles,draws:a.draws+e.draw_calls}),{triangles:0,draws:0});const unique=loaded.reduce((a,{entry:e})=>a+(encoding==='meshopt'?e.meshopt_bytes:e.bytes),0);
 $('stats').innerHTML=`<strong>${totals.triangles.toLocaleString()} triangles · ${totals.draws} model draws</strong><br>${(unique/1024).toFixed(1)} KiB unique ${encoding} files<br>1 material / module · D0 intact${lod===2?'<br>Static surfaces / lookup nodes retained':''}`;
 $('downloads').replaceChildren(...loaded.map(({entry:e})=>{const a=document.createElement('a');a.href=base+(encoding==='meshopt'?e.meshopt_file:e.file);a.download='';a.textContent='↓ '+e.module.toUpperCase()+' / selected GLB';return a;}));
 $('modeLabel').textContent={assembly:'01 / THE WORKING UNIT',pallet:'02 / PASSIVE PALLET',stride:'03 / STRIDE CARRIER',stack:'04 / EMPTY RETURN',crate:'05 / MODULAR CARGO',cup:'06 / CUP LOADER','cup-loading':'07 / PALLET TRANSFER'}[mode];
 $('status').textContent=cup?'CUP-01 · Four suction cups · Pressurized bay':mode==='pallet'?'P-01 · 1.20 × 1.00 × 0.16 m':mode==='stack'?'Five pallets · 0.80 m return stack':mode==='crate'?'Quarter-footprint · 0.56 × 0.46 × 0.36 m':'STRIDE-01 · 45° stance · Independent swivel and suspension';
 controlsState();operate();appearance();fit();window.palletCargo={scene,holder,camera,renderer,orbit,manifest,active,robot,cup,pallet,movingCrate,get time(){return time;},get mode(){return mode;},get encoding(){return encoding;},get lod(){return lod;},scrub(t){time=t;$('time').value=t;operate();},fit};window.palletCargoReady=true;
}
function fail(e){$('status').textContent='Load failed: '+e.message;console.error(e);}
for(const id of ['module','lod','encoding'])$(id).onchange=()=>load().catch(fail);
for(const id of ['cargo','separate'])$(id).onchange=()=>{operate();fit();};
for(const id of ['height','steer','locked','cupYaw','cupReach','cupHeight','vacuum',...STATIONS.flatMap(s=>['yaw'+s.id,'susp'+s.id])])$(id).oninput=operate;
$('steeringMode').onchange=()=>{controlsState();operate();};
for(const id of ['wire','sockets'])$(id).onchange=appearance;
$('motion').onchange=()=>{time=0;playing=$('motion').value!=='inspect';$('play').textContent=playing?'Pause':'Play';controlsState();operate();fit();};
$('play').onclick=()=>{if($('motion').value==='inspect'){$('motion').value=cup?'cup-transfer':'transport';controlsState();fit();}if(time>=duration())time=0;playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('reset').onclick=()=>{time=0;$('time').value=0;$('height').value=.68;$('steer').value=0;$('steeringMode').value='ready';$('locked').checked=true;for(const {id,side,end} of STATIONS){$('yaw'+id).value=side*end*45;$('susp'+id).value=0;}$('cupYaw').value=39;$('cupReach').value=1.03;$('cupHeight').value=.82;$('vacuum').checked=false;operate();};
$('time').oninput=()=>{time=+$('time').value;playing=false;$('play').textContent='Play';operate();};
$('fit').onclick=fit;$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('.workspace').requestFullscreen().catch(fail);};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;fit();});
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;renderer.setSize(stage.clientWidth,stage.clientHeight);camera.updateProjectionMatrix();if(active.length)fit();}).observe(stage);
const query=new URLSearchParams(location.search);if([...$('module').options].some(o=>o.value===query.get('module')))$('module').value=query.get('module');
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(playing&&!staticMode()&&(robot||cup)){time+=dt;if($('motion').value==='rotate'&&time>=duration()){time=duration();playing=false;$('play').textContent='Play';}else time%=duration();$('time').value=time;}operate();orbit.update();renderer.render(scene,camera);});
try{await load();}catch(e){fail(e);}
