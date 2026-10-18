import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyRover,DURATION} from '../assets/recon-rover/runtime.js';

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
const thrusterGlow=new T.PointLight(0x6be4ff,0,8,1.6);
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
controls.minDistance=1.8;
controls.maxDistance=28;

let root,manifest,lod=1,time=6.4,playing=true,last=performance.now(),token=0,w=0,h=0;

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
  if(kind==='side'){
    controls.target.set(0,0.85,0);
    camera.position.set(-5.8,1.15,0.01);
  }else if(kind==='ventral'){
    controls.target.set(0,0.95,0);
    camera.position.set(2.9,0.28,3.1);
  }else if(kind==='top'){
    controls.target.set(0,0.6,0);
    camera.position.set(0,8.2,0.01);
  }else{
    controls.target.set(0,0.85,0.1);
    camera.position.set(4.2,2.1,4.6);
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

function update(){
  if(!root)return;
  const thrusters=$('thrusters').checked&&lod<2;
  const jump=$('jump').checked&&lod<2;
  const gimbalDeg=Number($('gimbal').value)||0;
  const mastYawDeg=Number($('mast').value)||0;
  $('gimbalVal').textContent=`${gimbalDeg}°`;
  $('mastVal').textContent=`${mastYawDeg}°`;

  const s=applyRover(root,time,lod,{thrusters,jump,gimbalDeg,mastYawDeg});
  root.updateMatrixWorld(true);
  thrusterGlow.position.set(0,Math.max(0.25,s.chassisY-0.25),s.chassisZ);
  thrusterGlow.intensity=s.plumeIntensity*5.5;
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
    root.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});
    for(const id of ['time','play','thrusters','jump','gimbal','mast'])$(id).disabled=lod===2;
    if(lod===2){playing=false;$('play').textContent='Play';}
    $('stats').textContent=`${e.triangles.toLocaleString()} triangles · ${e.draw_calls} draws · ${e.bytes.toLocaleString()} plain bytes · ${e.meshopt_bytes.toLocaleString()} Meshopt bytes`;
    $('download').href=base+file;
    $('status').textContent=`R-47X D0 / LOD${lod} · ${lod===2?'Static merged distance tier':'Runtime-controlled'} · Game review pending`;
    update();
    window.reconRoverViewer={get root(){return root;},scene,renderer,camera,manifest};
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
  update();
};
for(const id of ['thrusters','jump','gimbal','mast'])$(id).oninput=update;
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
  $('gimbal').value=0;
  $('mast').value=0;
  update();
};
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>frame(b.dataset.camera);
addEventListener('resize',paint);
new ResizeObserver(paint).observe(stage);

frame('recon');
load();
requestAnimationFrame(function loop(now){
  const dt=(now-last)/1000;
  last=now;
  if(playing&&lod<2){
    time=(time+Math.min(dt,0.1))%DURATION;
    update();
  }
  requestAnimationFrame(loop);
});
