import * as T from 'three';
import {createMotionInspector} from '../workshop/quadruped-motion-inspector.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const $=id=>document.getElementById(id),scene=new T.Scene(),stage=$('stage');
scene.background=new T.Color('#171b1d');scene.fog=new T.Fog('#171b1d',7,18);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.01,80);camera.position.set(1.325,.8,1.6);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.245,-.12);controls.enableDamping=true;controls.minDistance=.2;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.49;
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04).texture;scene.environmentIntensity=.85;env.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xe5efff,0x58513e,1.5));
const key=new T.DirectionalLight(0xffe2b3,3);key.position.set(2,4,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2.4,right:2.4,top:2.4,bottom:-2.4});key.shadow.normalBias=.0015;scene.add(key,key.target);
const rim=new T.DirectionalLight(0xb6d5ef,2.5);rim.position.set(-2,2,-3);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x262b2c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(20,160,0x74705c,0x48504c);grid.position.y=-.003;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const holder=new T.Group();scene.add(holder);
const markers={};for(const id of ['FL','FR','HL','HR']){const marker=new T.Mesh(new T.RingGeometry(.021,.024,32),new T.MeshBasicMaterial({color:0x9bccec,side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));marker.rotation.x=-Math.PI/2;scene.add(marker);markers[id]=marker;}
const manifest=await fetch('../assets/k0-tech-01/manifest.json?v=k0-optics-20261027').then(r=>r.json());
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const labels={Watch_Idle:'Watch',Feline_Walk_Cycle:'Walk',Stalk_Cycle:'Stalk',Gallop_Cycle:'Gallop',Sit_Down:'Sit',Pounce:'Pounce',Roll_Over:'Roll',Give_Paw:'Hand'};
const notes={Watch_Idle:'A quiet watch with small head, ear and tail adjustments.',Feline_Walk_Cycle:'Hind foot, then the forefoot on the same side. Narrow steps, sliding shoulders and a quiet head. 0.24 m/s.',Stalk_Cycle:'A lower body and slower paw lift keep at least three feet in stance. 0.09 m/s.',Gallop_Cycle:'Fore contacts → gathered flight → hind contacts → extended flight. Study the spine at ¼ speed. 2.69 m/s.',Sit_Down:'Hindquarters fold down while the forepaws support the chest. Holds the seated pose.',Roll_Over:'Crouch, tuck the paws and ears, roll through 360°, then stand again.',Give_Paw:'Sit, offer the left forepaw, shake gently, then return to standing.',Pounce:'Crouch, extend from the hind legs, tuck, then reach for forepaw-first contact. The hips and tail settle afterward. Includes 0.528 m travel.'};
const inspector=createMotionInspector($('motion-study'),{seek:t=>scrub(t),sideView:()=>setView('side')});
let gltf,mixer,action,helper,entry,comparison,comparisonPromise,clipName='Watch_Idle',time=0,elapsed=0,playing=true,loadToken=0;
const phaseNames={fore_support:'Fore support',gathered:'Gathered flight',hind_support:'Hind support',extended:'Extended flight'};
for(const [name,label] of Object.entries(labels)){const button=document.createElement('button');button.innerHTML=`<span>${String(Object.keys(labels).indexOf(name)+1).padStart(2,'0')}</span>${label}`;button.onclick=()=>selectClip(name);button.dataset.clip=name;$('clips').append(button);}
function metadata(){return entry?.clips.find(c=>c.name===clipName);}
function selectClip(name){
 clipName=name;time=0;elapsed=0;playing=true;holder.position.set($('comparison').checked?.42:0,0,0);mixer?.stopAllAction();
 const clip=gltf?.animations.find(c=>c.name===name);action=clip?mixer.clipAction(clip):null;
 if(action){action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(0);}
 $('clip-note').textContent=entry?.static?'Static standing silhouette for distance and loading views. Choose game or master to inspect movement.':notes[name];
 inspector.setClip(entry?.clips.find(c=>c.name===name));$('time').max=clip?.duration||1;$('time').disabled=!clip;$('play').disabled=!clip;$('replay').disabled=!clip;$('play').textContent='Pause';
 $('phase-panel').hidden=name!=='Gallop_Cycle'||!!entry?.static;
 document.querySelectorAll('[data-clip]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.clip===name));b.disabled=!!entry?.static;});
 updatePose();
}
function disposeAsset(asset){asset.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
async function load(){
 const token=++loadToken;$('status').textContent='Loading '+$('lod').selectedOptions[0].textContent+'…';
 const selected=manifest.assets.find(e=>e.lod===Number($('lod').value)),encoding=$('encoding').value,file=encoding==='meshopt'?selected.meshopt_file:selected.file;
 try{
  const next=await loader.loadAsync('../assets/k0-tech-01/'+file+'?v='+(encoding==='meshopt'?selected.meshopt_sha256:selected.sha256).slice(0,12));if(token!==loadToken){disposeAsset(next);return;}
  if(gltf){mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);holder.remove(gltf.scene);disposeAsset(gltf);}
  if(helper){scene.remove(helper);helper.dispose();}
  gltf=next;entry=selected;holder.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
  mixer=new T.AnimationMixer(gltf.scene);helper=new T.SkeletonHelper(gltf.scene);helper.material.depthTest=false;helper.renderOrder=10;scene.add(helper);helper.visible=$('skeleton').checked&&!entry.static;
  $('download').href='../assets/k0-tech-01/'+file;$('stats').innerHTML=`<dt>Triangles</dt><dd>${entry.triangles.toLocaleString()}</dd><dt>Mesh draws</dt><dd>${entry.draw_calls}</dd><dt>File size</dt><dd>${((encoding==='meshopt'?entry.meshopt_bytes:entry.bytes)/1024).toFixed(0)} KiB</dd><dt>Animation clips</dt><dd>${gltf.animations.length}</dd>`;
  selectClip(clipName);wireframe();
 }catch(e){$('status').textContent='Asset loading failed: '+e.message;console.error(e);}
}
function wireframe(){gltf?.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=$('wireframe').checked;});}
function phaseLabel(){const u=time/(action?.getClip().duration||1);return u<.26?'Fore support':u<.48?'Gathered flight':u<.74?'Hind support':'Extended flight';}
function updatePose(){
 if(!gltf)return;holder.position.z=0;
 if(action){action.time=Math.min(time,action.getClip().duration-1e-7);action.enabled=true;action.paused=false;mixer.update(0);const meta=metadata();if($('travel').checked&&meta.speed_mps)holder.position.z=meta.speed_mps*elapsed;}
 holder.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});helper?.updateMatrixWorld(true);
 let contacts=0;for(const [id,marker] of Object.entries(markers)){
  const point=gltf.scene.getObjectByName('SOCKET_PAW_'+id).getWorldPosition(new T.Vector3()),contact=point.y<.006;contacts+=Number(contact);
  marker.visible=$('contacts').checked;marker.position.set(point.x,.001,point.z);marker.material.opacity=contact?.8:.18;marker.material.color.setHex(contact?0x9bccec:0xa1aaa9);
  const badge=document.querySelector(`[data-paw="${id}"]`);badge.classList.toggle('contact',contact);badge.title=contact?'Sole near floor':`Airborne · ${Math.max(0,point.y*100).toFixed(1)} cm`;
 }
 const a=gltf.scene.getObjectByName('PELVIS').getWorldPosition(new T.Vector3()),b=gltf.scene.getObjectByName('CHEST').getWorldPosition(new T.Vector3());
 const phase=clipName==='Gallop_Cycle'&&!entry.static?phaseLabel():contacts===4?'Four paws grounded':`${contacts} paws near floor`;
 $('motion-readout').textContent=`${phase} · Chest–pelvis ${(a.distanceTo(b)*100).toFixed(1)} cm`;
 document.querySelectorAll('[data-phase]').forEach(button=>button.setAttribute('aria-pressed',String(phaseNames[button.dataset.phase]===phase)));
 inspector.update(time,gltf.scene);$('time').value=time;$('readout').value=`${time.toFixed(2)} / ${(action?.getClip().duration||0).toFixed(2)} s`;
 $('status').textContent=entry.static?'STATIC DISTANCE / STANDING':`${labels[clipName].toUpperCase()} / ${playing?'PLAYING':'PAUSED'} · ${entry.lod===0?'DETAILED MASTER':'GAME TIER'}`;
}
function scrub(t){time=t;elapsed=t;playing=false;$('play').textContent='Play';updatePose();}
$('lod').onchange=load;$('encoding').onchange=load;$('wireframe').onchange=wireframe;
$('skeleton').onchange=()=>helper.visible=$('skeleton').checked&&!entry.static;
$('play').onclick=()=>{if(!playing&&action&&time>=action.getClip().duration){time=0;elapsed=0;}playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('replay').onclick=()=>selectClip(clipName);$('travel').onchange=()=>{elapsed=time;updatePose();};$('contacts').onchange=updatePose;$('time').oninput=()=>scrub(Number($('time').value));
const views={hero:{p:[1.325,.80,1.60],target:[0,.245,-.12]},side:{p:[2.25,.41,-.12],target:[0,.24,-.12]},front:{p:[0,.60,1.8],target:[0,.235,-.08]},head:{p:[.38,.50,.79],target:[0,.325,.34]}};
function followPoint(){const p=new T.Vector3();gltf?.scene.getObjectByName('MOTION')?.getWorldPosition(p);p.y=0;return p;}
let previousFollow=new T.Vector3();
function setView(name){const v=views[name],focus=followPoint();camera.position.fromArray(v.p).add(focus);controls.target.fromArray(v.target).add(focus);if($('comparison').checked&&name!=='head'){controls.target.set(0,.40,focus.z-.35);camera.position.copy(controls.target).add(new T.Vector3(...v.p).sub(new T.Vector3(...v.target)).multiplyScalar(2.05));}previousFollow.copy(focus);controls.update();camera.updateMatrixWorld(true);}
async function showComparison(){
 const enabled=$('comparison').checked;
 if(enabled&&!comparison){
  comparisonPromise??=(async()=>{const reference=await fetch('../assets/mechanical-cheetah/manifest.json').then(r=>r.json()),asset=reference.assets.find(e=>e.lod===2);const loaded=await loader.loadAsync('../assets/mechanical-cheetah/'+asset.file+'?v='+asset.sha256.slice(0,12));comparison=loaded.scene;comparison.name='C07_STANDING_SIZE_REFERENCE';comparison.position.set(-.55,0,-.12);comparison.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(comparison);})();
  try{await comparisonPromise;}catch(e){comparisonPromise=null;$('comparison').checked=false;$('status').textContent='Size reference could not load: '+e.message;return;}
 }
 if(comparison)comparison.visible=$('comparison').checked;
 holder.position.x=$('comparison').checked?.42:0;
 if($('comparison').checked){selectClip('Watch_Idle');scrub(0);}
 $('comparison-note').hidden=!$('comparison').checked;setView('hero');updatePose();
}
$('comparison').onchange=showComparison;
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setView(button.dataset.view);
for(const button of document.querySelectorAll('[data-phase]'))button.onclick=()=>{const meta=metadata();if(!meta?.phase_landmarks)return;scrub(meta.duration_s*meta.phase_landmarks[button.dataset.phase]);setView('side');};
$('fullscreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(e.target.tagName)){e.preventDefault();$('play').click();}});
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.fov=2*Math.atan(Math.tan(38*Math.PI/360)/Math.min(1,camera.aspect/1.1))*180/Math.PI;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}).observe(stage);
await load();let last=performance.now();
renderer.setAnimationLoop(now=>{
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(playing&&action){const speed=Number($('speed').value),duration=action.getClip().duration;time+=dt*speed;elapsed+=dt*speed;if(time>=duration){if(metadata().loop||$('loop').checked)time%=duration;else{time=duration;playing=false;$('play').textContent='Play';}}}
 updatePose();const focus=followPoint(),delta=focus.clone().sub(previousFollow);camera.position.add(delta);controls.target.add(delta);previousFollow.copy(focus);
 if(comparison?.visible)comparison.position.z=focus.z-.12;
 grid.position.z=Math.floor(focus.z/.125)*.125;floor.position.z=focus.z;key.position.z=focus.z+3;key.target.position.z=focus.z;key.target.updateMatrixWorld();controls.update();renderer.render(scene,camera);
});
window.k0Tech01={get gltf(){return gltf},get entry(){return entry},get time(){return time},get comparison(){return comparison},selectClip,load,updatePose,scrub,setView,renderer,scene,camera,holder,markers};
