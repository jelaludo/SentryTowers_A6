import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyStride,transportPose} from '../assets/pallet-cargo/runtime.js';
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
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();let serial=0,active=[],robot=null,pallet=null,cargo=null,time=0,playing=false,view='hero';
const markerGroup=new T.Group();scene.add(markerGroup);
for(const [label,z] of [['A',-1.7],['B',1.7]]){const points=[[-1.15,0,-.7],[1.15,0,-.7],[1.15,0,.7],[-1.15,0,.7],[-1.15,0,-.7]].map(([x,y,dz])=>new T.Vector3(x,.003,z+dz));const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xb99155,transparent:true,opacity:.6}));markerGroup.add(line);const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#efc37e';ctx.font='bold 80px monospace';ctx.textAlign='center';ctx.fillText(label,64,94);const plane=new T.Mesh(new T.PlaneGeometry(.3,.3),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(-1.35,.005,z);markerGroup.add(plane);}
async function get(module,lod,encoding){const entry=manifest.assets.find(e=>e.module===module&&e.lod===lod),file=encoding==='meshopt'?entry.meshopt_file:entry.file;if(!cache.has(file))cache.set(file,loader.loadAsync(base+file).catch(e=>{cache.delete(file);throw e;}));const gltf=await cache.get(file),root=gltf.scene.children[0].clone(true);root.userData.static=entry.static;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return {root,entry};}
function staticMode(){return $('lod').value==='2';}
function operate(){
 const transport=$('motion').value==='transport'&&!staticMode()&&robot;
 const pose=transport?transportPose(time):{height:+$('height').value,steer:+$('steer').value,travel:0,lock:$('locked').checked?1:0};
 if(robot)applyStride(robot,pose);holder.position.z=transport?pose.z:0;markerGroup.visible=!!transport;
 if(pallet&&robot){const attach=robot.getObjectByName('SOCKET_PALLET');pallet.position.y=attach.parent.position.y+attach.position.y+($('separate').checked?.35:0);}
 if(cargo){cargo.visible=$('cargo').checked;cargo.position.y=(pallet?.position.y||0)+.16+($('separate').checked?.18:0);}
 $('phase').textContent=staticMode()?'Static distance · articulation disabled':transport?pose.phase:'Stationary · '+($('locked').checked?'pallet secured':'locks released');
 $('timeValue').textContent=time.toFixed(1)+' / 20 s';$('heightValue').textContent=(transport?.68:+$('height').value).toFixed(2)+' m';$('steerValue').textContent=(transport?0:Math.round(+$('steer').value*180/Math.PI))+'°';
 holder.updateMatrixWorld(true);socketOverlay.children.forEach(m=>m.position.copy(m.userData.socket.getWorldPosition(new T.Vector3())));
}
function appearance(){holder.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});socketOverlay.visible=$('sockets').checked;}
function controlsState(){const stat=staticMode(),hasRobot=!!robot,isAssembly=$('module').value==='assembly',transport=$('motion').value==='transport';for(const id of ['height','steer','locked'])$(id).disabled=stat||!hasRobot||transport;for(const id of ['motion','play','time'])$(id).disabled=stat||!hasRobot;for(const id of ['separate','cargo'])$(id).disabled=!isAssembly;}
function fit(){
 operate();const bounds=new T.Box3().setFromObject(holder);if($('motion').value==='transport'&&robot&&!staticMode()){bounds.expandByPoint(new T.Vector3(-1.1,0,-2.4));bounds.expandByPoint(new T.Vector3(1.1,1.4,2.4));}
 const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const directions={hero:[2.1,1.55,2.7],front:[0,.13,3],top:[0,4,.001],underside:[2,-1.1,2.5]},dir=new T.Vector3(...directions[view]).normalize();
 // Fit the bounding sphere to the narrower FOV, including portrait screens.
 const halfFov=Math.min(T.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect));const distance=size.length()/2/Math.sin(halfFov)*1.05;
 orbit.target.copy(center);camera.position.copy(center).addScaledVector(dir,distance);camera.near=.01;camera.updateProjectionMatrix();orbit.update();floor.visible=grid.visible=view!=='underside';
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
async function load(){
 const ticket=++serial;window.palletCargoReady=false;$('status').textContent='Loading selected models…';const mode=$('module').value,lod=+$('lod').value,encoding=$('encoding').value;
 const modules=mode==='assembly'?['stride','pallet','crate']:[mode==='stack'?'pallet':mode];const loaded=await Promise.all(modules.map(m=>get(m,lod,encoding)));if(ticket!==serial)return;
 holder.clear();socketOverlay.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});socketOverlay.clear();active=[];robot=pallet=cargo=null;
 for(const item of loaded){if(mode==='assembly'&&item.entry.module==='crate'){cargo=new T.Group();cargo.name='CARGO_PREVIEW_GRID';holder.add(cargo);for(const x of [-.30,.30])for(const z of [-.25,.25]){const clone=item.root.clone(true);clone.position.set(x,0,z);cargo.add(clone);active.push({...item,root:clone});}}else if(mode==='stack'){for(let i=0;i<5;i++){const clone=item.root.clone(true);clone.position.y=i*.16;holder.add(clone);active.push({...item,root:clone});}}else{holder.add(item.root);active.push(item);if(item.entry.module==='stride')robot=item.root;if(item.entry.module==='pallet')pallet=item.root;}}
 holder.traverse(o=>{if(o.name.startsWith('SOCKET_')){const m=new T.Mesh(new T.SphereGeometry(.014,8,6),new T.MeshBasicMaterial({color:o.name.includes('LOCK')?0xffbf59:0x86dada,depthTest:false}));m.userData.socket=o;m.renderOrder=10;socketOverlay.add(m);}});
 if(staticMode()){playing=false;$('play').textContent='Play';}
 const totals=active.reduce((a,{entry:e})=>({triangles:a.triangles+e.triangles,draws:a.draws+e.draw_calls}),{triangles:0,draws:0});const unique=loaded.reduce((a,{entry:e})=>a+(encoding==='meshopt'?e.meshopt_bytes:e.bytes),0);
 $('stats').innerHTML=`<strong>${totals.triangles.toLocaleString()} triangles · ${totals.draws} model draws</strong><br>${(unique/1024).toFixed(1)} KiB unique ${encoding} files<br>1 material / module · D0 intact${lod===2?'<br>Static surfaces / lookup nodes retained':''}`;
 $('downloads').replaceChildren(...loaded.map(({entry:e})=>{const a=document.createElement('a');a.href=base+(encoding==='meshopt'?e.meshopt_file:e.file);a.download='';a.textContent='↓ '+e.module.toUpperCase()+' / selected GLB';return a;}));
 $('modeLabel').textContent={assembly:'01 / THE WORKING UNIT',pallet:'02 / PASSIVE PALLET',stride:'03 / STRIDE CARRIER',stack:'04 / EMPTY RETURN',crate:'05 / MODULAR CARGO'}[mode];
 $('status').textContent=mode==='pallet'?'P-01 · 1.20 × 1.00 × 0.16 m':mode==='stack'?'Five pallets · 0.80 m return stack':mode==='crate'?'Quarter-footprint · 0.56 × 0.46 × 0.36 m':mode==='stride'?'STRIDE-01 · Four independent wheeled legs':'STRIDE-01 · P-01 pallet · Four cargo modules';
 controlsState();operate();appearance();fit();window.palletCargo={scene,holder,camera,renderer,orbit,manifest,active,robot,pallet,get time(){return time;},get mode(){return mode;},get encoding(){return encoding;},get lod(){return lod;},scrub(t){time=t;$('time').value=t;operate();},fit};window.palletCargoReady=true;
}
function fail(e){$('status').textContent='Load failed: '+e.message;console.error(e);}
for(const id of ['module','lod','encoding'])$(id).onchange=()=>load().catch(fail);
for(const id of ['cargo','separate'])$(id).onchange=()=>{operate();fit();};
for(const id of ['height','steer','locked'])$(id).oninput=operate;
for(const id of ['wire','sockets'])$(id).onchange=appearance;
$('motion').onchange=()=>{time=0;playing=$('motion').value==='transport';$('play').textContent=playing?'Pause':'Play';controlsState();operate();fit();};
$('play').onclick=()=>{if($('motion').value==='inspect'){$('motion').value='transport';controlsState();fit();}playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('reset').onclick=()=>{time=0;$('time').value=0;$('height').value=.68;$('steer').value=0;$('locked').checked=true;operate();};
$('time').oninput=()=>{time=+$('time').value;playing=false;$('play').textContent='Play';operate();};
$('fit').onclick=fit;$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('.workspace').requestFullscreen().catch(fail);};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;fit();});
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;renderer.setSize(stage.clientWidth,stage.clientHeight);camera.updateProjectionMatrix();if(active.length)fit();}).observe(stage);
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(playing&&!staticMode()&&robot){time=(time+dt)%20;$('time').value=time;}operate();orbit.update();renderer.render(scene,camera);});
try{await load();}catch(e){fail(e);}
