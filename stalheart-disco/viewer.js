import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyStalheartCelebration,DURATION,PARTY_COLORS,REST_HOOK_WORLD} from '../assets/stalheart-disco/runtime.js';

const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/stalheart-disco/';
const scene=new T.Scene();
scene.background=new T.Color(0x071017);
scene.fog=new T.Fog(0x071017,120,340);

const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
stage.prepend(renderer.domElement);

const pm=new T.PMREMGenerator(renderer),env=new RoomEnvironment();
scene.environment=pm.fromScene(env).texture;
env.dispose();
pm.dispose();

const ambient=new T.HemisphereLight(0xbbe8ff,0x1b2b32,1.15);
const sun=new T.DirectionalLight(0xffe6c7,1.4);
sun.position.set(-24,48,32);
scene.add(ambient,sun);

const floor=new T.Mesh(
  new T.PlaneGeometry(160,160),
  new T.MeshStandardMaterial({color:0x132229,roughness:0.85,metalness:0.15})
);
floor.rotation.x=-Math.PI/2;
floor.position.y=-0.025;
scene.add(floor);

const grid=new T.GridHelper(80,40,0x3a5d68,0x20353d);
grid.position.y=-0.015;
scene.add(grid);

const camera=new T.PerspectiveCamera(40,1,0.1,420);
const controls=new OrbitControls(camera,renderer.domElement);
controls.maxPolarAngle=Math.PI*0.49;
controls.minDistance=4;
controls.maxDistance=180;

const spots=[];
const spotAngles=[Math.PI*0.25,Math.PI*0.75,Math.PI*1.25,Math.PI*1.75];
for(let i=0;i<4;i++){
  const s=new T.SpotLight(PARTY_COLORS[i],85,48,Math.PI/3.6,0.5,1);
  scene.add(s,s.target);
  spots.push(s);
}

// Bay floor disco reflection dots (viewer presentation only)
const sparkleGroup=new T.Group();
sparkleGroup.position.y=0.02;
scene.add(sparkleGroup);
for(let i=0;i<36;i++){
  const r=3.5+(i%6)*2.8;
  const a=(i/36)*Math.PI*2;
  const dot=new T.Mesh(
    new T.CircleGeometry(0.28+(i%3)*0.12,8),
    new T.MeshBasicMaterial({color:PARTY_COLORS[i%4],transparent:true,opacity:0.52,depthWrite:false})
  );
  dot.rotation.x=-Math.PI/2;
  dot.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
  sparkleGroup.add(dot);
}

// Static hoist line for LOD2 distance view where Stålheart arm is in rest pose
const staticTether=new T.Line(
  new T.BufferGeometry().setFromPoints([
    new T.Vector3(2,24.2,2.6),
    new T.Vector3(...REST_HOOK_WORLD)
  ]),
  new T.LineBasicMaterial({color:0xf5ad4b})
);
staticTether.visible=false;
scene.add(staticTether);

const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let layout,stalheart,disco,mork,isao,lod=1,time=6,playing=true,last=performance.now(),token=0,w=0,h=0;

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

function frame(kind='bay'){
  const presets={
    bay:{target:[0,6.8,1.2],eye:[22,11,26]},
    wide:{target:[0,14,0],eye:[44,28,52]},
    ball:{target:[-0.35,8.6,2.6],eye:[6.8,9.8,11.2]},
    top:{target:[0,6,2],eye:[0,62,2.01]}
  };
  const p=presets[kind]||presets.bay;
  controls.target.fromArray(p.target);
  camera.position.fromArray(p.eye);
  controls.update();
  paint();
}

function dispose(r){
  if(!r)return;
  scene.remove(r);
  r.traverse(o=>{
    if(o.isMesh){
      o.geometry.dispose();
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
      else o.material.dispose();
    }
  });
}

function setWireframe(flag){
  for(const r of [stalheart,disco,mork,isao]){
    r?.traverse(o=>{
      if(o.isMesh){
        for(const m of [].concat(o.material||[]))m.wireframe=flag;
      }
    });
  }
}

function update(){
  if(!stalheart||!disco)return;
  const lasers=$('lasers').checked&&lod<2;
  const lights=$('lights').checked&&lod<2;
  const swing=$('swing').checked&&lod<2;
  const showGuests=$('guests').checked;
  if(mork)mork.visible=showGuests;
  if(isao)isao.visible=showGuests;
  staticTether.visible=lod===2;

  const s=applyStalheartCelebration(T,{stalheart,disco,mork,isao},time,lod,{lasers,lights,swing});
  const ballCenter=disco.getObjectByName('SOCKET_BALL_CENTER')?.getWorldPosition(new T.Vector3())||new T.Vector3(0,8.4,2.6);

  for(let i=0;i<4;i++){
    const a=spotAngles[i]+s.haloYaw;
    spots[i].position.set(ballCenter.x+Math.cos(a)*2.1,ballCenter.y+1.7,ballCenter.z+Math.sin(a)*2.1);
    spots[i].target.position.set(ballCenter.x+Math.cos(a+0.6)*9.5,0,ballCenter.z+Math.sin(a+0.6)*9.5);
    spots[i].intensity=lights?95*s.pulse:0;
  }
  sparkleGroup.visible=lights;
  sparkleGroup.position.x=ballCenter.x;
  sparkleGroup.position.z=ballCenter.z;
  sparkleGroup.rotation.y=s.sphereSpinY*0.6;
  ambient.intensity=lights?0.72:1.6;
  sun.intensity=lights?0.65:2.4;
  scene.environmentIntensity=lights?0.45:0.95;

  $('phase').textContent=`${s.phase} · ${time.toFixed(1)} s`;
  $('time').value=time;
  paint();
}

async function load(){
  const my=++token,next=Number($('lod').value);
  $('status').textContent='Loading Stålheart & DSC-01 celebration diorama…';
  try{
    if(!layout){
      const r=await fetch(base+'layout.json');
      if(!r.ok)throw Error('Layout HTTP '+r.status);
      layout=await r.json();
    }
    const tier=layout.tiers.find(t=>t.lod===next);
    const useMeshopt=$('encoding').value==='meshopt';
    const stalFile=useMeshopt?tier.files.stalheart_meshopt:tier.files.stalheart_plain;
    const discoFile=useMeshopt?tier.files.disco_meshopt:tier.files.disco_plain;

    const [sg,dg,mg,ig]=await Promise.all([
      loader.loadAsync(base+stalFile),
      loader.loadAsync(base+discoFile),
      loader.loadAsync(base+tier.files.mork_guest),
      loader.loadAsync(base+tier.files.isao_guest)
    ]);
    if(my!==token){
      [sg,dg,mg,ig].forEach(g=>dispose(g.scene));
      return;
    }
    [stalheart,disco,mork,isao].forEach(dispose);
    stalheart=sg.scene;
    disco=dg.scene;
    mork=mg.scene;
    isao=ig.scene;

    mork.position.set(...layout.guests.mork.position);
    mork.rotation.y=layout.guests.mork.yaw;
    isao.position.set(...layout.guests.isao.position);
    isao.rotation.y=layout.guests.isao.yaw;

    scene.add(stalheart,disco,mork,isao);
    lod=next;
    setWireframe($('wire').checked);

    for(const id of ['time','play','lasers','lights','swing'])$(id).disabled=lod===2;
    if(lod===2){playing=false;$('play').textContent='Play';}

    const c=tier.core_diorama;
    $('stats').textContent=`Core (Stålheart + DSC-01): ${c.triangles.toLocaleString()} active triangles · ${c.draw_calls} draws · ${(c.plain_bytes/1024).toFixed(0)} KB plain · ${(c.meshopt_bytes/1024).toFixed(0)} KB Meshopt\nWith MÖRK & ISAO guests: ${tier.with_guests.triangles.toLocaleString()} triangles · ${tier.with_guests.draw_calls} draws`;
    $('downloadDisco').href=base+discoFile;
    $('downloadStal').href=base+stalFile;
    $('status').textContent=`Stålheart + DSC-01 D0 / LOD${lod} · ${lod===2?'Static distance composition':'Runtime gantry + pendulum choreography'} · Game review pending`;
    update();
    window.stalheartDiscoViewer={get stalheart(){return stalheart;},get disco(){return disco;},mork,isao,layout,scene,renderer,camera};
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
for(const id of ['lasers','lights','swing','guests'])$(id).onchange=update;
$('wire').onchange=()=>{
  setWireframe($('wire').checked);
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
frame('bay');
await load();
