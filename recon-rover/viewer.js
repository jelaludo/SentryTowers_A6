import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {
  applyRover,
  createColdGasSystem,
  createOnboardDisplays,
  DURATION
} from '../assets/recon-rover/runtime.js';

const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/recon-rover/';
const scene=new T.Scene();
scene.background=new T.Color(0x0a141c);

const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
stage.prepend(renderer.domElement);

const pm=new T.PMREMGenerator(renderer),env=new RoomEnvironment();
scene.environment=pm.fromScene(env).texture;
env.dispose();
pm.dispose();

const ambient=new T.HemisphereLight(0xcbe8ff,0x1a2832,1.35);
const sun=new T.DirectionalLight(0xfff0d8,1.85);
sun.position.set(6,10,7);
const thrusterGlow=new T.PointLight(0xbbeeff,0,6,1.6);
scene.add(ambient,sun,thrusterGlow);

const floor=new T.Mesh(
  new T.CircleGeometry(12,48),
  new T.MeshStandardMaterial({color:0x14232b,roughness:0.82,metalness:0.18})
);
floor.rotation.x=-Math.PI/2;
floor.position.y=-0.01;
scene.add(floor);

const grid=new T.GridHelper(20,20,0x3f6470,0x223942);
grid.position.y=-0.005;
scene.add(grid);

const camera=new T.PerspectiveCamera(40,1,0.05,120);
const controls=new OrbitControls(camera,renderer.domElement);
controls.maxPolarAngle=Math.PI*0.54;
controls.minDistance=1.4;
controls.maxDistance=28;

// Reusable cold-gas mist particle system + ground dust
const coldGasFX=createColdGasSystem(T,null,{
  enabled:true,
  dust:true,
  maxPlumeParticles:320,
  maxDustParticles:96,
  textureUrl:base+'cold-gas-puff.png'
});
scene.add(coldGasFX.group);

let displays=null;
let root,manifest,lod=1,time=5.2,playing=true,last=performance.now(),token=0,w=0,h=0;

function paint(){
  const a=stage.clientWidth,b=stage.clientHeight;
  if(!a||!b)return;
  if(a!==w||b!==h){
    w=a;h=b;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
}

function frame(kind){
  if(kind==='rear'){
    controls.target.set(0,0.78,-1.35);
    camera.position.set(0.0,1.65,-3.65);
  }else if(kind==='side'){
    controls.target.set(0,0.68,0);
    camera.position.set(-5.6,0.95,0.01);
  }else if(kind==='ventral'){
    controls.target.set(0,0.58,0.1);
    camera.position.set(2.6,0.22,2.8);
  }else if(kind==='top'){
    controls.target.set(0,0.6,0);
    camera.position.set(0,7.8,0.01);
  }else{
    controls.target.set(0,0.68,0.15);
    camera.position.set(3.9,1.85,4.2);
  }
  controls.update();
  paint();
}

function dispose(r){
  r?.traverse(o=>{
    if(o.isMesh){
      o.geometry.dispose();
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
      else o.material.dispose();
    }
  });
}

function buildNozzleOverrides(preset){
  if(preset==='single_v_fl'){
    return {V_FL:1,V_FR:0,V_RL:0,V_RR:0,L_FL:0,L_FR:0,L_RL:0,L_RR:0};
  }
  if(preset==='single_l_fl'){
    return {V_FL:0,V_FR:0,V_RL:0,V_RR:0,L_FL:1,L_FR:0,L_RL:0,L_RR:0};
  }
  return null;
}

function update(dt=0.016){
  if(!root)return;
  const thrusters=$('thrusters').checked&&lod<2;
  const dust=$('dust').checked&&lod<2;
  const jump=$('jump').checked&&lod<2;
  const autoMode=$('autoSteer').checked;
  const speedMps=Number($('speed').value)||0;
  const steerDeg=autoMode?null:Number($('steer').value)||0;
  const suspBiasM=Number($('susp').value)||0;
  const gimbalDeg=Number($('gimbal').value)||0;
  const mastYawDeg=autoMode?null:Number($('mast').value)||0;
  const mastPitchDeg=autoMode?null:Number($('mastPitch').value)||0;
  const preset=$('nozzlePreset').value;

  $('speedVal').textContent=`${speedMps>=0?'+':''}${speedMps.toFixed(1)} m/s`;
  $('suspVal').textContent=`${suspBiasM>=0?'+':''}${suspBiasM.toFixed(2)} m`;
  $('gimbalVal').textContent=`${gimbalDeg}°`;

  const s=applyRover(root,time,lod,{
    thrusters,
    jump,
    speedMps,
    steerDeg,
    suspBiasM,
    gimbalPitchDeg:gimbalDeg,
    gimbalRollDeg:gimbalDeg*0.75,
    nozzlePreset:preset,
    nozzleOverrides:buildNozzleOverrides(preset),
    mastYawDeg,
    mastPitchDeg
  });

  if(autoMode){
    $('steer').value=Math.round(s.steerDeg);
    $('mast').value=Math.round(s.mastYawDeg);
    $('mastPitch').value=Math.round(s.mastPitchDeg);
  }
  $('steerVal').textContent=`${Math.round(s.steerDeg)}°`;
  $('mastVal').textContent=`${Math.round(s.mastYawDeg)}° / ${Math.round(s.mastPitchDeg)}°`;

  root.updateMatrixWorld(true);
  coldGasFX.setEnabled(thrusters);
  coldGasFX.setDustEnabled(dust);
  coldGasFX.step(dt,s.nozzleIntensities,root);

  if(displays&&lod<2){
    displays.update(s.telemetry,root);
  }

  thrusterGlow.position.set(0,Math.max(0.22,s.chassisY-0.25),s.chassisZ);
  thrusterGlow.intensity=thrusters?s.plumeIntensity*2.2:0;
  $('phase').textContent=`${s.phase} · ${time.toFixed(1)} s`;
  $('time').value=time;
  paint();
}

async function load(){
  const my=++token,next=Number($('lod').value);
  $('status').textContent='Loading R-47X rover…';
  try{
    if(!manifest){
      const r=await fetch(base+'manifest.json');
      if(!r.ok)throw Error('Manifest HTTP '+r.status);
      manifest=await r.json();
    }
    const e=manifest.assets.find(a=>a.lod===next);
    const file=$('encoding').value==='plain'?e.file:e.meshopt_file;
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const g=await loader.loadAsync(base+file);
    if(my!==token){dispose(g.scene);return;}
    if(root){scene.remove(root);dispose(root);}
    root=g.scene;
    scene.add(root);
    lod=next;
    displays=lod<2?createOnboardDisplays(T,root):null;
    root.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});
    for(const id of ['time','play','speed','autoSteer','steer','susp','nozzlePreset','gimbal','mast','mastPitch','thrusters','dust','jump']){
      $(id).disabled=lod===2;
    }
    if(lod===2){
      playing=false;
      $('play').textContent='Play';
      coldGasFX.setEnabled(false);
    }
    $('stats').textContent=`${e.triangles.toLocaleString()} triangles · ${e.draw_calls} draws · ${e.bytes.toLocaleString()} plain bytes · ${e.meshopt_bytes.toLocaleString()} Meshopt bytes`;
    $('download').href=base+file;
    $('status').textContent=`R-47X D0 / LOD${lod} · ${lod===2?'Static merged distance tier (1 draw)':'6 wheels + 8 nozzles + 4 UV displays'} · Game review pending`;
    update(0.016);
    window.reconRoverViewer={get root(){return root;},scene,renderer,camera,manifest,coldGasFX,displays};
  }catch(e){
    if(my===token)$('status').textContent='Load failed: '+e.message;
  }
}

$('lod').onchange=load;
$('encoding').onchange=load;
$('time').oninput=e=>{
  playing=false;
  $('play').textContent='Play';
  time=Number(e.target.value);
  update(0.016);
};
for(const id of ['steer','mast','mastPitch']){
  $(id).oninput=()=>{
    $('autoSteer').checked=false;
    update(0.016);
  };
}
for(const id of ['speed','autoSteer','susp','nozzlePreset','gimbal','thrusters','dust','jump']){
  $(id).oninput=()=>update(0.016);
}
$('wire').onchange=e=>{
  root?.traverse(o=>{if(o.isMesh)o.material.wireframe=e.target.checked;});
  paint();
};
$('play').onclick=()=>{
  if(lod===2)return;
  playing=!playing;
  $('play').textContent=playing?'Pause':'Play';
  last=performance.now();
};
$('reset').onclick=()=>{
  playing=false;
  $('play').textContent='Play';
  time=0;
  $('speed').value=4.2;
  $('autoSteer').checked=true;
  $('steer').value=0;
  $('susp').value=0;
  $('nozzlePreset').value='auto';
  $('gimbal').value=0;
  $('mast').value=0;
  $('mastPitch').value=-8;
  coldGasFX.clear();
  update(0.016);
};
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>frame(b.dataset.camera);
addEventListener('resize',paint);
new ResizeObserver(paint).observe(stage);

frame('recon');
load();
requestAnimationFrame(function loop(now){
  const dt=Math.min(0.1,(now-last)/1000);
  last=now;
  if(playing&&lod<2){
    time=(time+dt)%DURATION;
  }
  if(lod<2)update(dt);
  requestAnimationFrame(loop);
});
