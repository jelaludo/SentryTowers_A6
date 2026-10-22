import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {DURATION,SCALE,UNITS,state,pose,smooth} from './timeline.js';
import {effects} from './effects.js';
const $=id=>document.getElementById(id),stage=$('stage');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x657783);scene.fog=new T.FogExp2(0x657783,.0026);const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pm.fromScene(room).texture;room.dispose();pm.dispose();scene.add(new T.HemisphereLight(0xb9d8ee,0x403529,2));const sun=new T.DirectionalLight(0xffd0a0,3.5);sun.position.set(-80,120,-30);scene.add(sun);
const camera=new T.PerspectiveCamera(46,1,.1,2000),controls=new OrbitControls(camera,renderer.domElement);controls.maxDistance=600;controls.enableDamping=true;
const ground=new T.Mesh(new T.PlaneGeometry(1800,1800),new T.MeshStandardMaterial({color:0x57534b,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.015;scene.add(ground);
const rockGeo=new T.IcosahedronGeometry(1,0),rockMat=new T.MeshStandardMaterial({color:0x5a574f,roughness:1,flatShading:true});const rocks=new T.InstancedMesh(rockGeo,rockMat,350),dummy=new T.Object3D();for(let i=0;i<350;i++){const a=i*2.399,r=18+(Math.sin(i*73)*.5+.5)*270,h=1+(Math.sin(i*17)*.5+.5)*15;dummy.position.set(Math.cos(a)*r,h*.22-1,-65-Math.abs(Math.sin(a)*r));dummy.scale.set(h*1.7,h,h);dummy.rotation.set(i,.3*i,i*.6);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}scene.add(rocks);
// Soft contact marks give scale and remain separate from cracks.
for(const u of UNITS){const m=new T.Mesh(new T.CircleGeometry(2.5,32),new T.MeshBasicMaterial({color:0x262625,transparent:true,opacity:.2,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(u.x,.009,u.z);scene.add(m);}
const slings=UNITS.map(()=>{const lines=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(24),3)),new T.LineBasicMaterial({color:0x333a3d}));scene.add(lines);return lines;});
const loader=new GLTFLoader(),units=[],fx=UNITS.map((_,i)=>effects(scene,i));let carrier,time=0,playing=false,ready=false,loadSerial=0;
async function load(){ready=false;const serial=++loadSerial;$('status').textContent='Loading deployment…';try{const [mech,ship]=await Promise.all([loader.loadAsync(`../assets/ridgeback-mech/mx06_d0_lod${$('tier').value}.glb`),carrier?Promise.resolve(null):loader.loadAsync('../assets/korp/korp_d0_lod1.glb')]);if(serial!==loadSerial)return;
 if(units.length){const geometries=new Set(),materials=new Set();units[0].traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});units.forEach(u=>scene.remove(u));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());units.length=0;}
 for(let i=0;i<3;i++){const g=new T.Group();g.name='CINEMATIC_RIDGEBACK_'+(i+1);g.scale.setScalar(SCALE);g.add(mech.scene.clone(true));scene.add(g);units.push(g);}
 if(ship){carrier=ship.scene;carrier.name='CINEMATIC_KORP';scene.add(carrier);const rail=new T.Mesh(new T.BoxGeometry(16,.2,1),rockMat);rail.position.set(0,2.5,0);carrier.add(rail);}
 ready=true;update();}catch(e){$('status').textContent='Scene failed to load: '+e.message;}}
function update(){if(!ready)return;const states=units.map((root,i)=>{const s=pose(root,time,i);root.position.set(s.x,s.height,s.z);root.rotation.set(s.pitch,s.yaw,s.roll);root.updateMatrixWorld(true);fx[i].update(s,time,root);const line=slings[i];line.visible=s.age<0;const points=line.geometry.attributes.position;let k=0;for(const side of ['L','R'])for(const end of ['FRONT','REAR']){const a=root.getObjectByName('SOCKET_AIRDROP_'+side+'_'+end).getWorldPosition(new T.Vector3());points.setXYZ(k++,a.x,a.y,a.z);points.setXYZ(k++,s.x+(side==='L'?-.5:.5),183.5,s.z+(end==='FRONT'?.5:-.5));}points.needsUpdate=true;line.geometry.computeBoundingSphere();return s;});
 const depart=Math.max(0,time-2);carrier.position.set(0,181+depart*depart*2,-depart*depart*8);carrier.rotation.x=-Math.min(.15,depart*.035);carrier.visible=time<7;
 if($('cinema').checked){const centre=states.reduce((sum,s)=>sum+s.height,0)/3,approach=smooth((time-5.8)/1.2);camera.fov=46+8*smooth((time-2)/3)*(1-approach);camera.updateProjectionMatrix();camera.position.set(-25+approach*8,centre+13*(1-approach)+5*approach,52-approach*29);controls.target.set(0,centre+1,0);
 if(time<1.8){camera.position.set(-33,199,40);controls.target.set(0,185,0);}
 else if(time<2.4){const u=smooth((time-1.8)/.6);camera.position.lerpVectors(new T.Vector3(-33,199,40),new T.Vector3(-25,centre+13,52),u);controls.target.y=185*(1-u)+(centre+1)*u;}
 if($('shake').checked){const fall=states.reduce((v,s)=>v+s.heat,0)*.035,impact=states.reduce((v,s)=>v+(s.hit>=0?.35*Math.exp(-s.hit*5):0),0),amp=fall+impact;camera.position.x+=Math.sin(time*91)*amp;camera.position.y+=Math.sin(time*67)*amp;controls.target.z+=Math.cos(time*73)*amp*.5;}
 controls.update();}
 $('clock').textContent=`${time.toFixed(2)} / 13 s`;
 $('status').textContent=`${time.toFixed(2)} / 13.00 s  ·  `+states.map((s,i)=>`${i+1}: ${s.phase}`).join('  /  ');
}
let immersive=false,armedAt=0,fullscreenRequest=0;
function reveal(){
 if(!immersive)return;immersive=false;fullscreenRequest++;document.body.classList.remove('immersive');
 if(document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});
}
function present(nativeFullscreen=true){
 immersive=true;armedAt=performance.now();const token=++fullscreenRequest;document.body.classList.add('immersive');
 // Full-viewport presentation remains available when native fullscreen is unsupported.
 if(nativeFullscreen&&stage.requestFullscreen&&!document.fullscreenElement)stage.requestFullscreen().then(()=>{if(token!==fullscreenRequest&&document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});}).catch(()=>{});
}
for(const event of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(event,reveal,{capture:true,passive:true});
document.addEventListener('pointermove',e=>{if(performance.now()-armedAt>250&&(Math.abs(e.movementX)+Math.abs(e.movementY)>1))reveal();},{passive:true});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)reveal();});
function play(restart=false){if(!ready)return;if(restart||time>=DURATION)time=0;playing=true;$('play').textContent='Pause';present();}
$('time').oninput=()=>{reveal();time=+$('time').value;playing=false;$('play').textContent='Play';update();};
$('play').onclick=()=>{if(playing){playing=false;reveal();$('play').textContent='Play';}else play();};
$('replay').onclick=()=>{$('cinema').checked=true;play(true);};
$('tier').onchange=load;
for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>{time=+b.dataset.time;playing=false;$('play').textContent='Play';$('time').value=time;$('cinema').checked=true;update();};
new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}).observe(stage);
let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.1,(now-last)/1000);last=now;if(ready&&playing){time=Math.min(DURATION,time+dt*+$('rate').value);if(time===DURATION){playing=false;$('play').textContent='Play';reveal();}$('time').value=time;}update();if(!$('cinema').checked)controls.update();renderer.render(scene,camera);$('stats').textContent=`Rendered frame: ${renderer.info.render.triangles.toLocaleString()} triangles · ${renderer.info.render.calls} draw calls · shared mech geometry · no FPS claim`;});await load();
if(new URLSearchParams(location.search).get('play')==='1'){if(ready){time=0;playing=true;$('play').textContent='Pause';present(false);update();}else document.body.classList.remove('immersive');}
