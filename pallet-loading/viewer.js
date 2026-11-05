import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyStride,applyCup} from '../assets/pallet-cargo/runtime.js';
import {state,DURATION,LAYOUT,CHAPTERS,ease} from './timeline.js';
const $=id=>document.getElementById(id),stage=$('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x203640);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D STRIDE and CUP loading station');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x203640);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xeaf6ff,0x39414a,2.0));
const sun=new THREE.DirectionalLight(0xffedcf,3.6);sun.position.set(0,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:22});sun.shadow.normalBias=.012;sun.shadow.bias=-.00008;scene.add(sun);scene.add(sun.target);
const fill=new THREE.DirectionalLight(0x8ac5f1,1.4);fill.position.set(-5,3,-4);scene.add(fill);
const camera=new THREE.PerspectiveCamera(43,1,.03,100),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1.7;orbit.maxDistance=28;orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(-1,.8,0);
let actors=null,t=0,playing=true,ready=false,lod=1,cameraMode='director',loadSerial=0,last=performance.now(),lastState=null,modelMetrics=null;
const loader=new GLTFLoader(),manifest=await fetch('./manifest.json').then(r=>r.json());
const cache=new Map();
function load(path){if(!cache.has(path))cache.set(path,loader.loadAsync(path));return cache.get(path);}
async function build(level){
 const serial=++loadSerial;ready=false;$('loading').hidden=false;$('loading').textContent='Opening the loading bay…';$('play').disabled=$('replay').disabled=$('time').disabled=true;
 try{
  const files=[`station_d0_lod${level}.glb`,...['stride','cup','pallet','crate'].map(n=>`../assets/pallet-cargo/${n}_d0_lod${level}.glb`)];
  const gltf=await Promise.all(files.map(load));if(serial!==loadSerial)return;
  const group=new THREE.Group();group.name='LOADING_SCENE';
  const roots=gltf.map(g=>g.scene.clone(true)),[station,stride,cup,pallet,crate]=roots;
  const crates=Array.from({length:4},(_,i)=>{const c=crate.clone(true);c.name=`CARGO_${String(i+1).padStart(2,'0')}`;return c;});
  group.add(station,stride,cup,pallet,...crates);cup.position.fromArray(LAYOUT.cup);
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  if(actors)scene.remove(actors.group);scene.add(group);
  actors={group,station,strideRoot:stride.getObjectByName('STRIDE_ROOT'),stride,cupRoot:cup.getObjectByName('CUP_ROOT'),cup,pallet,crates};lod=level;ready=true;
  modelMetrics=manifest.scene_metrics.find(m=>m.lod===level);
  $('metrics').textContent=`${modelMetrics.triangles.toLocaleString()} triangles · ${modelMetrics.draw_calls} model draws · ${level===0?'Detailed master':'Game tier'}`;
  setWire();update(t);$('loading').hidden=true;$('play').disabled=$('replay').disabled=$('time').disabled=false;setPlaying(playing);
 }catch(e){$('loading').textContent=`The scene could not load: ${e.message}`;console.error(e);throw e;}
}
function setWire(){actors?.group.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});}
function pose(s){
 actors.stride.position.fromArray(s.stride.position);applyStride(actors.strideRoot,s.stride);
 actors.pallet.position.set(s.stride.position[0],s.pallet_y,s.stride.position[2]);applyCup(actors.cupRoot,s.cup);
 s.crates.forEach((c,i)=>actors.crates[i].position.fromArray(c.position));scene.updateMatrixWorld(true);
}
function cameraPose(s){
 if(cameraMode==='orbit'){orbit.update();return;}
 let pos,target;
 const overview={p:[6.6,6.2,8.8],t:[-1.1,.70,.2]},arrival={p:[5.4,4.9,5.7],t:[-1.3,.8,-1.5]},close={p:[3.5,3.3,4.7],t:[-.95,1.05,.22]};
 const follow={p:[s.stride.position[0]+3.7,3.5,s.stride.position[2]+5.2],t:[s.stride.position[0]-.20,.75,s.stride.position[2]]};
 if(cameraMode==='director'){
  const a=ease((s.time-1.8)/1.8),b=ease((s.time-16.7)/1.3);
  pos=arrival.p.map((v,i)=>THREE.MathUtils.lerp(THREE.MathUtils.lerp(v,close.p[i],a),follow.p[i],b));
  target=arrival.t.map((v,i)=>THREE.MathUtils.lerp(THREE.MathUtils.lerp(v,close.t[i],a),follow.t[i],b));
 }else if(cameraMode==='loading'){pos=close.p;target=close.t;}
 else if(cameraMode==='follow'){pos=follow.p;target=follow.t;}
 else if(cameraMode==='top'){pos=[-1,16.5,.201];target=[-1,0,.2];}
 else{pos=overview.p;target=overview.t;}
 const aim=new THREE.Vector3(...target),offset=new THREE.Vector3(...pos).sub(aim);
 // Preserve horizontal framing on narrow screens without making desktop too distant.
 const narrow=Math.max(1,1.25/camera.aspect);offset.multiplyScalar(Math.min(2.1,narrow));
 camera.position.copy(aim).add(offset);orbit.target.copy(aim);camera.lookAt(aim);camera.updateMatrixWorld(true);
}
function update(time){
 t=THREE.MathUtils.clamp(time,0,DURATION);lastState=state(t);if(ready)pose(lastState);cameraPose(lastState);
 $('time').value=t;$('clock').innerHTML=`${t.toFixed(1).padStart(4,'0')} <span>/ 22.0</span>`;
 $('phase').textContent=lastState.phase;$('action').textContent=lastState.held>=0?`PACKAGE ${String(lastState.held+1).padStart(2,'0')} · ${lastState.action}`:lastState.action;
 $('phaseCode').textContent=t<3.4?'01 / ARRIVAL':t<16.7?'02 / FOUR QUICK TRANSFERS':t<17.4?'03 / READY TO GO':'03 / DEPARTURE';
 $('count').innerHTML=`${lastState.loaded} <small>/ 4</small>`;
 [...$('slots').children].forEach((el,i)=>{el.className=lastState.crates[i].custody==='stride'?'loaded':lastState.crates[i].custody==='cup'?'held':'';});
 [...$('chapters').children].forEach((el,i)=>el.classList.toggle('active',t>=CHAPTERS[i].time&&(i===CHAPTERS.length-1||t<CHAPTERS[i+1].time)));
 if(t===DURATION)setPlaying(false);
}
function setPlaying(value){playing=value;$('play').textContent=playing?'Pause':t===DURATION?'Play again':'Play';$('play').setAttribute('aria-pressed',String(playing));}
function seek(time){update(time);setPlaying(false);}
function playToggle(){if(t>=DURATION)update(0);setPlaying(!playing);}
for(const c of CHAPTERS){const b=document.createElement('button');b.textContent=c.label;b.addEventListener('click',()=>seek(c.time));$('chapters').append(b);}
$('play').onclick=playToggle;$('replay').onclick=()=>{update(0);setPlaying(true);};$('time').oninput=e=>seek(Number(e.target.value));
$('quality').onchange=e=>build(Number(e.target.value));$('camera').onchange=e=>{cameraMode=e.target.value;cameraPose(lastState||state(t));};
$('wire').onchange=setWire;$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen();
orbit.addEventListener('start',()=>{cameraMode='orbit';$('camera').value='orbit';});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();playToggle();}});
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();cameraPose(lastState||state(t));}
new ResizeObserver(resize).observe(stage);resize();
// Review API uses the same deterministic timeline as normal playback.
window.loadingStation={seek,get state(){return lastState;},get ready(){return ready;},get actors(){return actors;},get metrics(){return modelMetrics;},get time(){return t;},get playing(){return playing;},get lod(){return lod;},camera,renderer,scene,setCamera(mode){cameraMode=mode;$('camera').value=mode;cameraPose(lastState||state(t));},get screens(){scene.updateMatrixWorld(true);return['stride','cup',...Array.from({length:4},(_,i)=>`crate${i}`)].map(key=>{const obj=key.startsWith('crate')?actors.crates[Number(key.slice(5))]:actors[key],b=new THREE.Box3().setFromObject(obj,true);const corners=[];for(const x of [b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])corners.push(new THREE.Vector3(x,y,z).project(camera).toArray());return{key,corners};});}};
await build(1);
function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(ready){if(playing)update(t+dt*Number($('speed').value));else if(cameraMode==='orbit')orbit.update();renderer.render(scene,camera);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
