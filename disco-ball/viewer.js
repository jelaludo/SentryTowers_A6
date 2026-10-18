import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyDisco,DURATION,PARTY_COLORS} from '../assets/disco-ball/runtime.js';

const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/disco-ball/';
const scene=new T.Scene();
scene.background=new T.Color(0x09131a);

const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.3;
stage.prepend(renderer.domElement);

const pm=new T.PMREMGenerator(renderer),env=new RoomEnvironment();
scene.environment=pm.fromScene(env).texture;
env.dispose();
pm.dispose();

const ambient=new T.HemisphereLight(0xbbe8ff,0x192830,1.2);
const sun=new T.DirectionalLight(0xffe5c4,1.6);
sun.position.set(6,12,8);
scene.add(ambient,sun);

const floor=new T.Mesh(
  new T.CircleGeometry(14,48),
  new T.MeshStandardMaterial({color:0x16262e,roughness:0.78,metalness:0.22})
);
floor.rotation.x=-Math.PI/2;
floor.position.y=-0.01;
scene.add(floor);

const grid=new T.GridHelper(24,24,0x3f6470,0x233b44);
grid.position.y=-0.005;
scene.add(grid);

const camera=new T.PerspectiveCamera(42,1,0.05,150);
const controls=new OrbitControls(camera,renderer.domElement);
controls.maxPolarAngle=Math.PI*0.49;
controls.minDistance=2.5;
controls.maxDistance=40;

const spots=[];
const spotAngles=[Math.PI*0.25,Math.PI*0.75,Math.PI*1.25,Math.PI*1.75];
for(let i=0;i<4;i++){
  const s=new T.SpotLight(PARTY_COLORS[i],26,20,Math.PI/4.5,0.55,1);
  scene.add(s,s.target);
  spots.push(s);
}

// Procedural floor reflection sparkles driven by sphere spin (viewer presentation only, not exported in GLB)
const sparkleGroup=new T.Group();
sparkleGroup.position.y=0.012;
scene.add(sparkleGroup);
for(let i=0;i<24;i++){
  const r=1.8+(i%4)*1.95;
  const a=(i/24)*Math.PI*2;
  const dot=new T.Mesh(
    new T.CircleGeometry(0.14+(i%3)*0.05,8),
    new T.MeshBasicMaterial({color:PARTY_COLORS[i%4],transparent:true,opacity:0.55,depthWrite:false})
  );
  dot.rotation.x=-Math.PI/2;
  dot.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
  sparkleGroup.add(dot);
}

let root,manifest,lod=1,time=5,playing=true,last=performance.now(),token=0,w=0,h=0;

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
  controls.target.set(0,kind==='close'?3.4:3.0,0);
  camera.position.set(...(kind==='top'?[0,19,0.01]:kind==='close'?[4.4,4.2,5.0]:[8.8,5.8,10.5]));
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
  const lasers=$('lasers').checked&&lod<2;
  const lights=$('lights').checked&&lod<2;
  const swing=$('swing').checked&&lod<2;
  const hanging=!$('cradle').checked;
  const s=applyDisco(root,time,lod,{lasers,lights,swing,hanging});
  root.updateMatrixWorld(true);
  const ballCenter=root.getObjectByName('SOCKET_BALL_CENTER')?.getWorldPosition(new T.Vector3())||new T.Vector3(0,3,0);
  for(let i=0;i<4;i++){
    const a=spotAngles[i]+s.haloYaw;
    spots[i].position.set(ballCenter.x+Math.cos(a)*2.0,ballCenter.y+1.7,ballCenter.z+Math.sin(a)*2.0);
    spots[i].target.position.set(Math.cos(a+0.7)*4.2,0,Math.sin(a+0.7)*4.2);
    spots[i].intensity=lights?28*s.pulse:0;
  }
  sparkleGroup.visible=lights;
  sparkleGroup.rotation.y=s.sphereSpinY*0.65;
  sparkleGroup.position.x=ballCenter.x;
  sparkleGroup.position.z=ballCenter.z;
  ambient.intensity=lights?0.65:1.5;
  sun.intensity=lights?0.55:2.2;
  scene.environmentIntensity=lights?0.45:0.95;
  $('phase').textContent=`${s.phase} · ${time.toFixed(1)} s`;
  $('time').value=time;
  paint();
}

async function load(){
  const my=++token,next=Number($('lod').value);
  $('status').textContent='Loading disco ball…';
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
    for(const id of ['time','play','lasers','lights','swing','cradle'])$(id).disabled=lod===2;
    if(lod===2){playing=false;$('play').textContent='Play';}
    $('stats').textContent=`${e.triangles.toLocaleString()} triangles · ${e.draw_calls} draws · ${e.bytes.toLocaleString()} plain bytes · ${e.meshopt_bytes.toLocaleString()} Meshopt bytes`;
    $('download').href=base+file;
    $('status').textContent=`DSC-01 D0 / LOD${lod} · ${lod===2?'Static merged distance tier':'Runtime-controlled'} · Game review pending`;
    update();
    window.discoBallViewer={get root(){return root;},scene,renderer,camera,manifest};
  }catch(e){
    if(my===token)$('status').textContent='Load failed: '+e.message;
  }
}

$('lod').onchange=load;
$('encoding').onchange=load;
$('time').oninput=()=>{
  playing=false;
  $('play').textContent='Play';
  time=Number($('time').value);
  update();
};
$('play').onclick=()=>{
  if(lod===2)return;
  playing=!playing;
  last=performance.now();
  $('play').textContent=playing?'Pause':'Play';
};
$('reset').onclick=()=>{
  playing=false;
  $('play').textContent='Play';
  time=0;
  update();
};
for(const id of ['lasers','lights','swing','cradle'])$(id).onchange=update;
$('wire').onchange=()=>{
  root?.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});
  paint();
};
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>frame(b.dataset.camera));
controls.addEventListener('change',paint);
new ResizeObserver(paint).observe(stage);
renderer.setAnimationLoop(now=>{
  const dt=Math.min(0.15,Math.max(0,(now-last)/1000));
  last=now;
  if(playing&&lod<2){
    time=(time+dt)%DURATION;
    update();
  }else paint();
});
frame('wide');
await load();
