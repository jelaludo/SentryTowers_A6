import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {applyLaunch,DURATION} from '../assets/orbital-launcher/runtime.js?v=passage-hold-1';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/orbital-launcher/';
const scene=new T.Scene();scene.background=new T.Color(0x22343f);scene.fog=new T.Fog(0x22343f,140,340);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(42,1,.1,600),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=250;controls.maxPolarAngle=Math.PI*.49;
const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.05).texture;environment.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xc8e4f5,0x30434e,2));const key=new T.DirectionalLight(0xffe6bf,3.5);key.position.set(15,55,-20);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:.1,far:150});key.shadow.bias=-.0003;scene.add(key);
const ground=new T.Mesh(new T.PlaneGeometry(600,600),new T.MeshStandardMaterial({color:0x2b414b,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(200,50,0x4e6770,0x324b57);grid.position.y=-.015;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
const group=new T.Group();scene.add(group);const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();
let manifest,models={},lod=1,view='complex',generation=0,ready=false,time=0,playing=false,last=performance.now(),cameraMode='perspective';
let stageWidth=0,stageHeight=0;
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(w>0&&h>0&&(w!==stageWidth||h!==stageHeight)){stageWidth=w;stageHeight=h;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}}
function paint(){resize();renderer.render(scene,camera);}
controls.addEventListener?.('change',paint);
function play(value){playing=value;if(value)last=performance.now();$('play').textContent=value?'Pause':'Play launch';}
function frame(kind='perspective'){
 resize();
 cameraMode=kind;$('follow').checked=false;
 const b=new T.Box3().setFromObject(view==='satellite'?group:(models.launcher||group)),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),span=view==='satellite'?7:Math.max(size.x,size.y,size.z);
 const distance=span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*Math.max(1,1/camera.aspect)*1.05;
 controls.target.copy(center);const direction=kind==='map'?new T.Vector3(.001,1,.001):kind==='side'?new T.Vector3(1,.3,.04):new T.Vector3(1,.75,1);
 camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));controls.update();paint();
}
function update(){
 if(!ready)return;const state=applyLaunch(T,models.launcher,models.satellite,time,lod);
 if(view==='satellite'&&models.satellite){models.satellite.position.set(0,2.1,0);models.satellite.rotation.set(0,0,0);}
 $('phase').textContent=state.phase;$('time').value=String(time);$('seconds').textContent=time.toFixed(1)+' / 30 s';$('charge').textContent=lod===2?'Static':Math.round(state.charge*100)+'%';$('deploy').textContent=lod===2?'Packed':state.deploy===0?'Packed':state.deploy===1?'Deployed':Math.round(state.deploy*100)+'%';
 if($('follow').checked&&models.satellite){const center=new T.Box3().setFromObject(models.satellite).getCenter(new T.Vector3());controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(7,5,9));controls.update();}
 paint();
}
function download(){if(!manifest)return;const e=manifest.assets.find(e=>e.family===$('downloadFamily').value&&e.lod===lod);$('download').href=base+($('encoding').value==='meshopt'?e.meshopt_file:e.file);$('download').textContent='Download '+e.family+' / LOD'+lod;}
async function load(){
 const token=++generation,nextLod=Number($('lod').value),nextView=$('view').value,encoding=$('encoding').value;play(false);$('status').textContent='Loading '+nextView+'…';
 try{
  if(!manifest){const r=await fetch(base+'manifest.json',{cache:'no-cache'});if(!r.ok)throw Error('Manifest HTTP '+r.status);manifest=await r.json();}
  const entries=manifest.assets.filter(e=>e.lod===nextLod&&(nextView==='complex'||e.family===nextView));
  const loaded=await Promise.all(entries.map(async e=>{const file=encoding==='meshopt'?e.meshopt_file:e.file,hash=encoding==='meshopt'?e.meshopt_sha256:e.sha256,url=base+file+'?v='+hash.slice(0,12);if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(error=>{cache.delete(url);throw error;}));const original=(await cache.get(url)).scene,root=original.clone(true);root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.wireframe=$('wire').checked;o.castShadow=true;o.receiveShadow=true;}});return [e.family,root];}));
  if(token!==generation){loaded.forEach(([,r])=>r.traverse(o=>{if(o.isMesh)o.material.dispose();}));return;}
  group.traverse(o=>{if(o.isMesh)o.material.dispose();});group.clear();models=Object.fromEntries(loaded);Object.values(models).forEach(o=>group.add(o));lod=nextLod;view=nextView;
  if(lod===2&&models.satellite)models.satellite.position.set(0,3.03,-24);
  ready=true;update();frame();download();$('triangles').textContent=entries.reduce((s,e)=>s+e.triangles,0).toLocaleString();$('draws').textContent=entries.reduce((s,e)=>s+e.draw_calls,0);
  $('play').disabled=lod===2;$('time').disabled=lod===2;$('follow').disabled=view==='launcher';
  $('note').textContent=lod===2?'Static docked/packed geometry. Keep LOD1 throughout a launch or deployed collector shot.':'30-second visual choreography. The rail, atmosphere and orbit are not physically simulated. Insertion plume is optional preview geometry.';
  $('status').textContent=(encoding==='meshopt'?'Decoded Meshopt derivatives':'Plain GLB sources')+' · D0 candidate · game/phone review pending';
  window.orbitalLauncher={models,get time(){return time;},get lod(){return lod;},get view(){return view;},renderer,scene,camera};
 }catch(e){if(token===generation){$('status').textContent='Load failed: '+e.message+'. Change detail or encoding to retry.';console.error(e);}}
}
$('view').onchange=()=>{if($('view').value!=='complex')$('downloadFamily').value=$('view').value;return load();};$('lod').onchange=load;$('encoding').onchange=load;$('downloadFamily').onchange=download;
$('play').onclick=()=>{if(time>=DURATION)time=0;play(!playing);};$('reset').onclick=()=>{play(false);time=0;update();if(!$('follow').checked)frame(cameraMode);};$('time').oninput=()=>{play(false);time=Number($('time').value);update();};
$('follow').onchange=update;$('wire').onchange=()=>{group.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});paint();};document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>frame(b.dataset.camera));
$('collector').onclick=async()=>{play(false);time=23;$('view').value='satellite';$('downloadFamily').value='satellite';if($('lod').value==='2')$('lod').value='1';await load();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else $('status').textContent='Fullscreen unavailable in this browser.';}catch(e){$('status').textContent=e.message;}};
new ResizeObserver(paint).observe(stage);
function tick(now){const dt=Math.max(0,Math.min(.3,(now-last)/1000));last=now;if(playing&&ready){time=Math.min(DURATION,time+dt);if(time===DURATION)play(false);update();}controls.update();paint();}
renderer.setAnimationLoop(tick);
// Safari may defer animation frames for an occluded window. Preserve deliberate
// playback and control feedback without running a second foreground render loop.
const playbackWatchdog=setInterval(()=>{const now=performance.now();if(playing&&ready&&now-last>250)tick(now);},100);
window.addEventListener?.('pagehide',()=>clearInterval(playbackWatchdog),{once:true});
await load();

