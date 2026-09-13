import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id),stage=$('stage');
window.addEventListener('error',event=>{$('hud').textContent=`Viewer error: ${event.message}`;});
window.addEventListener('unhandledrejection',event=>{$('hud').textContent=`Viewer error: ${event.reason?.message||event.reason}`;});
const scene=new T.Scene();scene.background=new T.Color('#09151b');scene.fog=new T.Fog('#09151b',3.4,7);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.03,30);camera.position.set(1.3,1.2,-3.4);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.76,0);controls.enableDamping=true;controls.minDistance=.75;controls.maxDistance=4.2;
controls.update();
scene.add(new T.HemisphereLight(0xbcecf4,0x263138,2.5));
const key=new T.DirectionalLight(0xffe1ba,4.2);key.position.set(-2,4,-3);scene.add(key);
const rim=new T.DirectionalLight(0x39cce8,5);rim.position.set(3,2,2);scene.add(rim);
const grid=new T.GridHelper(5,20,0x426872,0x19343c);scene.add(grid);
const pad=new T.Mesh(new T.CylinderGeometry(.54,.62,.035,32),new T.MeshStandardMaterial({color:0x122c34,metalness:.55,roughness:.55}));pad.position.y=.018;scene.add(pad);
const padRing=new T.Mesh(new T.TorusGeometry(.58,.009,5,64),new T.MeshBasicMaterial({color:0x3cc7d8,transparent:true,opacity:.65}));padRing.rotation.x=Math.PI/2;padRing.position.y=.04;scene.add(padRing);

const emotionData={
  neutral:{label:'Neutral',color:'#55ddff',rows:['01100110','10011001','00000000','00011000','00011000','00000000'],lean:0,yaw:0,pitch:0,head:0,speed:1},
  happy:{label:'Happy',color:'#67ef7d',rows:['01000010','10100101','00000000','10000001','01000010','00111100'],lean:-.055,yaw:-.16,pitch:.18,head:-.15,speed:1.2},
  curious:{label:'Curious',color:'#ffb443',rows:['01100000','10000110','00000000','00011000','00000000','00110000'],lean:.065,yaw:.32,pitch:-.12,head:.28,speed:.8},
  working:{label:'Working',color:'#42dbff',rows:['11100111','10100101','11100111','00011000','00111100','00011000'],lean:.02,yaw:0,pitch:.38,head:-.3,speed:1.8},
  alarm:{label:'Alarm',color:'#ff4e43',rows:['10000001','01000010','00100100','00000000','00111100','01000010'],lean:.1,yaw:-.32,pitch:-.28,head:.18,speed:2.4}
};

const gltf=await new GLTFLoader().loadAsync('../assets/isao-birudoron/isao_birudoron_initial_concept.glb');
const poseRoot=new T.Group();poseRoot.position.y=.54;poseRoot.add(gltf.scene);scene.add(poseRoot);
const rotorNames=['Rotor_FL_Spin','Rotor_FR_Spin','Rotor_RL_Spin','Rotor_RR_Spin'];
const rotors=rotorNames.map(n=>gltf.scene.getObjectByName(n)).filter(Boolean);
const boomYaw=gltf.scene.getObjectByName('Boom_Yaw'),boomPitch=gltf.scene.getObjectByName('Boom_Pitch'),headPitch=gltf.scene.getObjectByName('Head_Pitch');
const bases=new Map([boomYaw,boomPitch,headPitch].filter(Boolean).map(o=>[o,o.rotation.clone()]));

const faceCanvas=document.createElement('canvas');faceCanvas.width=256;faceCanvas.height=192;
const faceTexture=new T.CanvasTexture(faceCanvas);faceTexture.colorSpace=T.SRGBColorSpace;faceTexture.minFilter=T.NearestFilter;faceTexture.magFilter=T.NearestFilter;faceTexture.flipY=false;
let faceMesh=null;const crt=gltf.scene.getObjectByName('Isao_CRT');
crt?.traverse(o=>{if(!faceMesh&&o.isMesh&&o.material?.map)faceMesh=o;});
if(faceMesh){faceMesh.material=faceMesh.material.clone();faceMesh.material.map=faceTexture;faceMesh.material.color?.set('#ffffff');if(faceMesh.material.emissive){faceMesh.material.emissive.set('#ffffff');faceMesh.material.emissiveMap=faceTexture;faceMesh.material.emissiveIntensity=2.25;}faceMesh.material.needsUpdate=true;}

function drawFace(config){
  const ctx=faceCanvas.getContext('2d');ctx.fillStyle='#05080a';ctx.fillRect(0,0,faceCanvas.width,faceCanvas.height);
  const rows=config.rows,cell=22,gap=5,w=rows[0].length*cell,h=rows.length*cell,x=(256-w)/2,y=(192-h)/2;
  ctx.shadowColor=config.color;ctx.shadowBlur=12;
  rows.forEach((row,ry)=>[...row].forEach((bit,rx)=>{if(bit==='1'){ctx.fillStyle=config.color;ctx.fillRect(x+rx*cell+gap/2,y+ry*cell+gap/2,cell-gap,cell-gap);}}));
  ctx.shadowBlur=0;faceTexture.needsUpdate=true;
}

let emotion='neutral',transition=1;
function setEmotion(name){emotion=name;transition=0;drawFace(emotionData[name]);document.querySelectorAll('[data-emotion]').forEach(b=>b.classList.toggle('active',b.dataset.emotion===name));}
document.querySelectorAll('[data-emotion]').forEach(b=>b.addEventListener('click',()=>setEmotion(b.dataset.emotion)));
setEmotion('neutral');

const manifest=await fetch('../assets/isao-birudoron/manifest.json').then(r=>r.json()),entry=manifest.assets[0];
$('stats').textContent=`${entry.triangles.toLocaleString()} triangles · ${entry.draw_calls} draws · ${(entry.bytes/1024).toFixed(0)} KB · ${entry.animations.length} embedded clips`;

new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}).observe(stage);
const clock=new T.Clock();let time=0;
renderer.setAnimationLoop(()=>{
  try{
  const dt=Math.min(clock.getDelta(),.04),cfg=emotionData[emotion],motion=$('hover').checked;time+=dt;transition=Math.min(1,transition+dt*4);
  const ease=transition*transition*(3-2*transition),pulse=motion?Math.sin(time*cfg.speed):0;
  poseRoot.position.y=.54+(motion?.025*Math.sin(time*2.15):0);
  poseRoot.rotation.z=T.MathUtils.lerp(poseRoot.rotation.z,cfg.lean+(motion?.012*Math.sin(time*1.4):0),.08);
  poseRoot.rotation.x=T.MathUtils.lerp(poseRoot.rotation.x,emotion==='alarm'?.045*Math.sin(time*8):0,.12);
  if(boomYaw)boomYaw.rotation.y=T.MathUtils.lerp(boomYaw.rotation.y,bases.get(boomYaw).y+cfg.yaw+.035*pulse,ease*.12+.03);
  if(boomPitch)boomPitch.rotation.x=T.MathUtils.lerp(boomPitch.rotation.x,bases.get(boomPitch).x+cfg.pitch+.045*pulse,ease*.12+.03);
  if(headPitch)headPitch.rotation.x=T.MathUtils.lerp(headPitch.rotation.x,bases.get(headPitch).x+cfg.head-.06*pulse,ease*.12+.03);
  if(motion)rotors.forEach((r,i)=>r.rotation.y+=dt*(18+(i%2?1:-1)*2));
  padRing.material.opacity=.45+.2*Math.sin(time*2.15);
  $('hud').innerHTML=`<strong>${cfg.label}</strong> · LED + hover posture + tool gesture<br>Full articulated limb acting is reserved for the production remake.`;
  controls.update();renderer.render(scene,camera);
  }catch(error){$('hud').textContent=`Viewer error: ${error.message}`;renderer.setAnimationLoop(null);console.error(error);}
});

window.isaoViewer={gltf,poseRoot,rotors,boomYaw,boomPitch,headPitch,faceMesh,setEmotion,get emotion(){return emotion}};
window.isaoViewerReady=true;
