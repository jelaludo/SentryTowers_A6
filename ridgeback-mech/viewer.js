import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyMech,solveHydraulics,LEGS} from '../assets/ridgeback-mech/runtime.js';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/ridgeback-mech/';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x111b22);const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pm.fromScene(room).texture;room.dispose();pm.dispose();scene.add(new T.HemisphereLight(0xc5e3f1,0x33302a,2));const sun=new T.DirectionalLight(0xffe0af,3);sun.position.set(-4,7,5);scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(35,35),new T.MeshStandardMaterial({color:0x263036,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);const grid=new T.GridHelper(20,20,0x5b6564,0x344248);grid.position.y=-.01;scene.add(grid);
const camera=new T.PerspectiveCamera(40,1,.05,120),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=2;controls.maxDistance=25;
function view(v){camera.position.set(...(v==='top'?[.01,11,.01]:v==='side'?[-10,3,.3]:[-7.6,5.2,8.8]));controls.target.set(0,v==='top'?0:1.4,0);controls.update();}view('hero');
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let manifest,root,mixer,clip,entry,serial=0,time=0,playing=true,markers=[];
const markerGeometry=new T.SphereGeometry(.045,8,6),markerMaterial=new T.MeshBasicMaterial({color:0xffc66f});
function dispose(r){const gs=new Set(),ms=new Set();r.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
async function load(){const ticket=++serial;$('status').textContent='Loading MX-06…';try{manifest??=await fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error('Manifest HTTP '+r.status);return r.json();});const e=manifest.assets.find(e=>e.lod===+$('lod').value&&e.damage_level===+$('damage').value);const file=$('encoding').value==='meshopt'?e.meshopt_file:e.file;const gltf=await loader.loadAsync(base+file);if(ticket!==serial){dispose(gltf.scene);return;}if(root){mixer?.stopAllAction();scene.remove(root);dispose(root);}for(const m of markers)scene.remove(m);markers=[];root=gltf.scene;entry=e;root.getObjectByName('MX06_ROOT').userData.static=e.static;scene.add(root);mixer=new T.AnimationMixer(root);clip=gltf.animations[0]||null;if(clip)mixer.clipAction(clip).play();
 for(const l of LEGS)for(let i=1;i<=3;i++){const m=new T.Mesh(markerGeometry,markerMaterial);m.userData.node=`SOCKET_CLAW_${l.id}_${i}`;markers.push(m);scene.add(m);}
 for(const id of ['mode','time','play','yaw','pitch','spin'])$(id).disabled=e.static||e.damage_level===3;
 $('damageInfo').textContent=['Intact: full stride and weapon aiming.','Battered: armor dents and scuffs; full gait.','Damaged: breached hull, buckled front-left shin, shorter steps and reduced aiming sector.','Disabled: collapsed stance, stripped armor and scorched systems. Movement and weapons offline.'][e.damage_level];$('download').href=base+file;$('stats').textContent=`${e.triangles.toLocaleString()} triangles · ${e.draw_calls} draws · ${(e.bytes/1024).toFixed(1)} KiB plain · ${e.clips[0]?.name||'No baked clip'}`;pose();}catch(err){$('status').textContent='Load failed: '+err.message;}}
function pose(){if(!root)return;const options={damage:entry.damage_level,mode:$('mode').value==='park'?'park':'walk',aimYaw:+$('yaw').value*Math.PI/180,aimPitch:+$('pitch').value*Math.PI/180,barrelAngle:$('spin').checked?time*12:0};const state=applyMech(root,time,options);
 if($('mode').value==='clip'&&clip&&!entry.static){mixer.setTime(time%4);solveHydraulics(root);}
 root.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});for(const m of markers){m.visible=$('contacts').checked;m.position.copy(root.getObjectByName(m.userData.node).getWorldPosition(new T.Vector3()));}
 $('status').textContent=`MX-06 / D${entry.damage_level} · ${state.phase} · ${state.contacts}/6 planted feet · ${entry.static?'static':time.toFixed(2)+' s'}${$('mode').value==='clip'&&clip?' · Exported GLB clip':''}`;}
for(const id of ['lod','damage','encoding'])$(id).onchange=load;
for(const id of ['mode','yaw','pitch','spin','wire','contacts'])$(id).oninput=pose;
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};$('time').oninput=()=>{time=+$('time').value;playing=false;$('play').textContent='Play';pose();};$('reset').onclick=()=>{time=0;$('time').value=0;$('yaw').value=0;$('pitch').value=0;pose();};for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>view(b.dataset.view);
new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}).observe(stage);
let previous=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;if(playing&&entry&&!entry.static&&entry.damage_level<3){time=(time+dt)%4;$('time').value=time;}pose();controls.update();renderer.render(scene,camera);});await load();
