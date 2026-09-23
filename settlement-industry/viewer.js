import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {applyDemo,aimMirror,DEMO_DURATION} from '../assets/settlement-industry/runtime.js';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/settlement-industry/';
const scene=new T.Scene();scene.background=new T.Color(0x243840);scene.fog=new T.Fog(0x243840,70,170);
const camera=new T.PerspectiveCamera(40,1,.1,300),renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=90;
const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environmentTarget=pmrem.fromScene(environment,.04);scene.environment=environmentTarget.texture;environment.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xc5e5f0,0x32444a,2.1));const key=new T.DirectionalLight(0xffecd2,3.5);key.position.set(-12,25,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.1,far:90});key.shadow.bias=-.0004;scene.add(key);
const ground=new T.Mesh(new T.PlaneGeometry(250,250),new T.MeshStandardMaterial({color:0x273d46,roughness:.92}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(70,35,0x48616b,0x304750);grid.position.y=-.017;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map(),families=['drill','hauler','mirror','furnace','cassette'],mirrorPositions=[[3,-4],[7,-4],[11,-4],[3,0],[7,0],[11,0],[11,4]],sun=new T.Vector3(-.35,1,-.3).normalize();
let manifest,models={},mirrors=[],group=new T.Group(),rayGroup=new T.Group(),generation=0,time=0,playing=false,currentLod=1,currentView='site',last=performance.now(),ready=false;
scene.add(group,rayGroup);
const captions={site:'A settlement learns to build its own future.',drill:'BOR-01 / Anchor. Sample. Extract.',hauler:'TRK-01 / Six wheels. One common cargo interface.',mirror:'HEL-01 / The first small piece of a stellar future.',furnace:'CRU-01 / Sunlight becomes useful process heat.',cassette:'CAS-01 / From the bore to the fabrication yard.'};
function framing(kind='perspective'){
 const box=new T.Box3().setFromObject(group),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z,2);controls.target.copy(center);
 const distance=span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*Math.max(1,1/camera.aspect)*1.16;
 camera.position.copy(center).add((kind==='top'?new T.Vector3(.001,1,.001):new T.Vector3(1,.85,1.35)).normalize().multiplyScalar(distance));camera.near=.05;camera.far=400;camera.updateProjectionMatrix();controls.update();
}
function updateDownload(){if(!manifest)return;const e=manifest.assets.find(e=>e.family===$('downloadFamily').value&&e.lod===currentLod);$('download').href=base+($('encoding').value==='meshopt'?e.meshopt_file:e.file);$('download').textContent='Download '+$('downloadFamily').selectedOptions[0].text.split(' / ')[0]+' · LOD'+currentLod;}
function disposeRays(){rayGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});rayGroup.clear();}
function rays(){
 disposeRays();if(currentLod===2)return;
 const receiver=new T.Vector3(5,3.24,6.60);for(const m of mirrors){m.updateMatrixWorld(true);const p=m.getObjectByName('SOCKET_OPTICAL_CENTER').getWorldPosition(new T.Vector3()),g=new T.BufferGeometry().setFromPoints([p.clone().addScaledVector(sun,4),p,p,receiver]);rayGroup.add(new T.LineSegments(g,new T.LineBasicMaterial({color:0xe9c589,transparent:true,opacity:.45})));}
 rayGroup.visible=$('rays').checked&&currentView==='site';
}
function update(){
 if(!ready)return;const state=applyDemo(T,currentView==='site'?models:currentView==='drill'?{drill:models.drill}:currentView==='cassette'?{cassette:models.cassette}:{},time,currentLod);
 $('seconds').textContent=time.toFixed(1)+' / 32 s';$('time').value=String(time);$('phase').textContent=state.phase;$('fill').textContent=currentLod===2?'Static':Math.round(state.fill*100)+'%';
 if(!['site','cassette'].includes(currentView))$('fill').textContent='—';
 if(currentView==='mirror'&&currentLod<2)$('phase').textContent='Heliostat / authored rest pose';
 if(currentView==='furnace'&&currentLod<2)$('phase').textContent='Solar receiver / awaiting process integration';
 if(currentView==='hauler'&&currentLod<2){applyDemo(T,{hauler:models.hauler},time,currentLod);models.hauler.position.z=0;}
}
function togglePlaying(value){playing=value;$('play').textContent=value?'Pause':'Play collection';}
async function load(){
 const token=++generation,lod=Number($('lod').value),view=$('view').value,encoding=$('encoding').value;togglePlaying(false);$('status').textContent='Loading '+(view==='site'?'complete scene':view)+'…';
 try{
  if(!manifest){const response=await fetch(base+'manifest.json');if(!response.ok)throw Error('Manifest HTTP '+response.status);manifest=await response.json();}
  const wanted=view==='site'?families:[view],entries=wanted.map(f=>manifest.assets.find(e=>e.family===f&&e.lod===lod));
  const loaded=await Promise.all(entries.map(async e=>{const file=encoding==='meshopt'?e.meshopt_file:e.file;if(!cache.has(file)){const request=loader.loadAsync(base+file).catch(error=>{cache.delete(file);throw error;});cache.set(file,request);}return [e.family,(await cache.get(file)).scene.clone(true)];}));
  if(token!==generation)return;
  ready=false;group.clear();models=Object.fromEntries(loaded);mirrors=[];currentLod=lod;currentView=view;
  for(const [family,model] of Object.entries(models)){group.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.wireframe=$('wire').checked;}});}
  if(view==='site'){
   models.drill.position.set(-7,0,0);models.hauler.position.set(-4.4,0,4.8);models.cassette.position.set(-4.4,.12,0);models.furnace.position.set(5,0,7.8);
   for(let i=0;i<mirrorPositions.length;i++){const m=i===0?models.mirror:models.mirror.clone(true);if(i)group.add(m);m.position.set(mirrorPositions[i][0],0,mirrorPositions[i][1]);if(lod<2)aimMirror(T,m,sun,new T.Vector3(5,3.24,6.60));mirrors.push(m);}
  }
  ready=true;update();rays();framing();updateDownload();$('caption').textContent=captions[view];
  const multiplier=e=>view==='site'&&e.family==='mirror'?7:1;
  $('triangles').textContent=entries.reduce((n,e)=>n+e.triangles*multiplier(e),0).toLocaleString();$('draws').textContent=entries.reduce((n,e)=>n+e.draw_calls*multiplier(e),0);$('bytes').textContent=(entries.reduce((n,e)=>n+(encoding==='meshopt'?e.meshopt_bytes:e.bytes),0)/1024).toFixed(0)+' KB';
  const demoAvailable=lod<2&&!['mirror','furnace'].includes(view);$('play').disabled=!demoAvailable;$('time').disabled=!demoAvailable;$('rays').disabled=lod===2||view!=='site';
  $('note').textContent=lod===2?'Static rest-pose proxies. Moving controls and optical tracking are disabled. Switch to LOD1 before interaction.':'D0 prototype · 32-second engine-driven demonstration. Inventory, physics, refinery unloading and game/phone review remain pending.';
  $('status').textContent=encoding==='meshopt'?'Decoded Meshopt derivative · '+entries.length+' unique model files':'Plain GLB sources · '+entries.length+' unique model files';
  window.industry={models,mirrors,get time(){return time;},get lod(){return currentLod;},get view(){return currentView;},renderer,scene,camera};
 }catch(error){if(token===generation){$('status').textContent='Unable to load: '+error.message+'. Change detail or encoding to retry.';console.error(error);}}
}
$('view').onchange=()=>{if($('view').value!=='site')$('downloadFamily').value=$('view').value;return load();};$('lod').onchange=load;$('encoding').onchange=load;$('downloadFamily').onchange=updateDownload;
$('play').onclick=()=>{if(time>=DEMO_DURATION)time=0;togglePlaying(!playing);};$('reset').onclick=()=>{togglePlaying(false);time=0;update();};$('time').oninput=()=>{togglePlaying(false);time=Number($('time').value);update();};
$('wire').onchange=()=>group.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});$('rays').onchange=()=>rayGroup.visible=$('rays').checked&&currentLod<2&&currentView==='site';
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>framing(b.dataset.camera));
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else $('status').textContent='Fullscreen is unavailable in this browser.';}catch(e){$('status').textContent=e.message;}};
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(stage);
renderer.setAnimationLoop(now=>{const dt=Math.min(.08,(now-last)/1000);last=now;if(playing&&ready){time=Math.min(DEMO_DURATION,time+dt);if(time===DEMO_DURATION)togglePlaying(false);update();}controls.update();renderer.render(scene,camera);});
await load();
