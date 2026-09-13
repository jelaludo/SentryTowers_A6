import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id),stage=$('stage');
window.addEventListener('error',event=>{$('hud').textContent=`Viewer error: ${event.message}`;});
window.addEventListener('unhandledrejection',event=>{$('hud').textContent=`Viewer error: ${event.reason?.message||event.reason}`;});
const scene=new T.Scene();scene.background=new T.Color('#09151b');scene.fog=new T.Fog('#09151b',4.8,11);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.03,40);camera.position.set(2.2,1.8,-4.4);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.85,0);controls.enableDamping=true;controls.minDistance=.6;controls.maxDistance=8;controls.update();
scene.add(new T.HemisphereLight(0xbcecf4,0x263138,2.5));
const key=new T.DirectionalLight(0xffe1ba,4.2);key.position.set(-2,4,-3);scene.add(key);
const rim=new T.DirectionalLight(0x39cce8,5);rim.position.set(3,2,2);scene.add(rim);
scene.add(new T.GridHelper(6,24,0x426872,0x19343c));
const pad=new T.Mesh(new T.CylinderGeometry(.62,.69,.035,32),new T.MeshStandardMaterial({color:0x122c34,metalness:.55,roughness:.55}));pad.position.y=.018;scene.add(pad);
const padRing=new T.Mesh(new T.TorusGeometry(.65,.009,5,64),new T.MeshBasicMaterial({color:0x3cc7d8,transparent:true,opacity:.65}));padRing.rotation.x=Math.PI/2;padRing.position.y=.04;scene.add(padRing);

const manifest=await fetch('../assets/isao-birudoron/manifest.json').then(r=>r.json());
const entries=new Map(manifest.assets.map(entry=>[entry.id,entry]));
const emotionData={
  neutral:{label:'Neutral',color:'#f3b548',rows:['00000000','01000010','00000000','00000000','00111100','00000000'],lean:0,yaw:0,pitch:0,head:0,speed:1},
  happy:{label:'Happy',color:'#67ef7d',rows:['01000010','10100101','00000000','10000001','01000010','00111100'],lean:-.055,yaw:-.16,pitch:.18,head:-.15,speed:1.2},
  glee:{label:'Glee',color:'#67ef7d',fps:3.3,frames:[['01000010','10100101','00000000','10000001','01100110','00111100'],['10100101','01000010','00000000','10000001','01100110','00111100']],lean:-.08,yaw:-.08,pitch:.20,head:-.16,speed:2},
  curious:{label:'Curious',color:'#f3b548',fps:2,frames:[['01100110','00000000','10001000','00000000','01111110','00000000'],['01100110','00000000','01000010','00000000','01111110','00000000'],['01100110','00000000','00010001','00000000','01111110','00000000'],['01100110','00000000','01000010','00000000','01111110','00000000']],lean:.065,yaw:.32,pitch:-.12,head:.28,speed:.8},
  working:{label:'Working',color:'#42dbff',rows:['11100111','10100101','11100111','00011000','00111100','00011000'],lean:.02,yaw:0,pitch:.38,head:-.3,speed:1.8},
  alarm:{label:'Alarm',color:'#ff4e43',rows:['10000001','01000010','00100100','00000000','00111100','01000010'],lean:.1,yaw:-.32,pitch:-.28,head:.18,speed:2.4},
  determined:{label:'Determined',color:'#f3b548',rows:['00000000','11100111','00100100','00000000','00011000','00000000'],lean:-.07,yaw:0,pitch:.12,head:-.08,speed:1.1},
  sad:{label:'Sad',color:'#9d55ff',rows:['00100100','01000010','00100100','00000000','00111100','01000010'],lean:.1,yaw:0,pitch:.18,head:.28,speed:.55},
  skeptical:{label:'Skeptical',color:'#f3b548',fps:1.25,frames:[['01000000','00000000','00000110','01000010','00000000','00011100'],['00100000','01000000','00000110','01000010','00000000','00011100']],lean:.075,yaw:.12,pitch:-.05,head:.12,speed:.7},
  love:{label:'Love',color:'#ff4a9d',fps:2.85,frames:[['00000000','00100100','01111110','01111110','00111100','00011000'],['01000010','11100111','11111111','01111110','00111100','00011000'],['00000000','00100100','01111110','01111110','00111100','00011000'],['01000010','11100111','11111111','01111110','00111100','00011000']],lean:-.04,yaw:0,pitch:.08,head:-.08,speed:1.5},
  worried:{label:'Worried',color:'#9d55ff',fps:2.5,frames:[['00100100','01000010','00000000','00011000','00100100','01000010'],['00100100','10000001','00000000','00011000','00100100','01000010']],lean:.06,yaw:-.08,pitch:.12,head:.18,speed:2.2},
  angry:{label:'Angry',color:'#ff4e43',fps:2.5,frames:[['11100111','00100100','00000000','00000000','00111100','00000000'],['01000010','00100100','00000000','01011010','00111100','00000000']],lean:-.10,yaw:0,pitch:-.12,head:-.08,speed:3},
  surprised:{label:'Surprised',color:'#f3b548',fps:7,frames:[['00000000','01100110','00000000','00011000','00100100','00011000'],['01100110','01100110','00000000','00011000','00100100','00011000']],lean:.16,yaw:0,pitch:-.16,head:.20,speed:2.4},
  sleepy:{label:'Sleepy',color:'#9d55ff',fps:.55,frames:[['00000000','01100110','00000000','00000000','00111100','00000000'],['00000000','00100100','00000000','00000000','00111100','00000000']],lean:.10,yaw:0,pitch:.15,head:.28,speed:.4}
};
const loader=new GLTFLoader();
let wrapper=null,gltf=null,mixer=null,entry=null,production=false,staticDistance=false,emotion='neutral',time=0,emotionEpoch=0;
let rotorAction=null,hoverAction=null,emotionAction=null,toolAction=null,concept={};
const faceCanvas=document.createElement('canvas');faceCanvas.width=256;faceCanvas.height=192;
const faceTexture=new T.CanvasTexture(faceCanvas);faceTexture.colorSpace=T.SRGBColorSpace;faceTexture.minFilter=T.NearestFilter;faceTexture.magFilter=T.NearestFilter;faceTexture.flipY=true;

function drawFace(config,frame=0){
  const ctx=faceCanvas.getContext('2d');ctx.fillStyle='#05080a';ctx.fillRect(0,0,256,192);
  const frames=config.frames||[config.rows],rows=frames[frame%frames.length];
  const cell=22,gap=5,w=rows[0].length*cell,h=rows.length*cell,x=(256-w)/2,y=(192-h)/2;ctx.shadowColor=config.color;ctx.shadowBlur=12;
  rows.forEach((row,ry)=>[...row].forEach((bit,rx)=>{if(bit==='1'){ctx.fillStyle=config.color;ctx.fillRect(x+rx*cell+gap/2,y+ry*cell+gap/2,cell-gap,cell-gap);}}));ctx.shadowBlur=0;faceTexture.needsUpdate=true;
}
function clip(name){return gltf.animations.find(item=>item.name===name);}
function play(name,loop=true){const source=clip(name);if(!source)return null;const action=mixer.clipAction(source);action.reset();action.enabled=true;action.clampWhenFinished=!loop;action.setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);action.play();return action;}
function stop(action){if(action)action.stop();}
function frameModel(){
  wrapper.updateMatrixWorld(true);const box=new T.Box3().setFromObject(wrapper,true),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),radius=Math.max(size.x,size.y,size.z);
  controls.target.copy(center);const direction=new T.Vector3(1.25,.65,-2.8).normalize();camera.position.copy(center).addScaledVector(direction,Math.max(2.2,radius*2.5));controls.update();
}
function prepareConcept(){
  const rotorNames=['Rotor_FL_Spin','Rotor_FR_Spin','Rotor_RL_Spin','Rotor_RR_Spin'];
  concept.rotors=rotorNames.map(n=>gltf.scene.getObjectByName(n)).filter(Boolean);concept.boomYaw=gltf.scene.getObjectByName('Boom_Yaw');concept.boomPitch=gltf.scene.getObjectByName('Boom_Pitch');concept.headPitch=gltf.scene.getObjectByName('Head_Pitch');concept.bases=new Map([concept.boomYaw,concept.boomPitch,concept.headPitch].filter(Boolean).map(o=>[o,o.rotation.clone()]));
  let faceMesh=null;gltf.scene.getObjectByName('Isao_CRT')?.traverse(o=>{if(!faceMesh&&o.isMesh&&o.material?.map)faceMesh=o;});
  if(faceMesh){faceMesh.material=faceMesh.material.clone();faceMesh.material.map=faceTexture;faceMesh.material.color?.set('#ffffff');if(faceMesh.material.emissive){faceMesh.material.emissive.set('#ffffff');faceMesh.material.emissiveMap=faceTexture;faceMesh.material.emissiveIntensity=2.25;}faceMesh.material.needsUpdate=true;}
  concept.faceMesh=faceMesh;drawFace(emotionData[emotion]);
}
async function loadModel(id){
  if(wrapper)scene.remove(wrapper);mixer=null;concept={};entry=entries.get(id);staticDistance=entry.static===true;production=entry.production_lod===true||staticDistance;$('hud').innerHTML='<strong>Loading ISAO…</strong>';
  gltf=await loader.loadAsync(`../assets/isao-birudoron/${entry.file}`);wrapper=new T.Group();wrapper.add(gltf.scene);wrapper.position.y=production?.12:.54;scene.add(wrapper);
  if(production){mixer=new T.AnimationMixer(gltf.scene);rotorAction=play('Rotor_Cycle');hoverAction=play('Hover_Idle');concept={};$('badge').textContent=staticDistance?'STATIC DISTANCE / BACKGROUND':`PRODUCTION ALPHA / ${entry.lod===0?'DETAILED LOD0':'GAME LOD1'}`;$('note').textContent=staticDistance?'One-draw distant-flight proxy with a non-emotive cyan panel signal. Swap to LOD1 before facial or limb acting becomes readable.':'Functional LED, body, four-limb, rotor and fabrication-tool animation. Production alpha: pending art-direction, gameplay and damage-state review.';}
  else{prepareConcept();$('badge').textContent='INITIAL CONCEPT / NOT GAME-READY';$('note').textContent='The draft has no embedded clips and its visible limbs are not attached to the supplied leg pivots. Its LED, body lean and tool gestures are procedural viewer studies.';}
  document.querySelectorAll('[data-emotion]').forEach(button=>button.disabled=staticDistance);$('fabricate').disabled=staticDistance;if(staticDistance)emotion='neutral';$('stats').textContent=`${entry.triangles.toLocaleString()} triangles · ${entry.draw_calls} draws · ${(entry.bytes/1024).toFixed(0)} KB · ${(entry.clips||entry.animations).length} embedded clips`;$('download').href=`../assets/isao-birudoron/${entry.file}`;$('sourceDownload').href=staticDistance?'../source/blender/isao-birudoron-distance.blend':'../source/blender/isao-birudoron.blend';
  setEmotion(emotion);frameModel();window.isaoViewer={gltf,wrapper,mixer,entry,setEmotion};window.isaoViewerReady=true;
}
function setEmotion(name){
  emotion=name;emotionEpoch=time;document.querySelectorAll('[data-emotion]').forEach(button=>button.classList.toggle('active',button.dataset.emotion===name));
  if(production&&mixer&&!staticDistance){stop(emotionAction);const clipName=`Emotion_${name[0].toUpperCase()+name.slice(1)}`,meta=entry.clips.find(item=>item.name===clipName);emotionAction=play(clipName,meta?.loop??true);}
  else drawFace(emotionData[name],0);
}
document.querySelectorAll('[data-emotion]').forEach(button=>button.addEventListener('click',()=>setEmotion(button.dataset.emotion)));
$('fabricate').onclick=()=>{if(production&&mixer){stop(toolAction);toolAction=play('Tool_Fabricate');}else setEmotion('working');};
$('model').onchange=()=>loadModel($('model').value);
$('hover').onchange=()=>{if(production){if($('hover').checked){rotorAction=play('Rotor_Cycle');hoverAction=play('Hover_Idle');}else{stop(rotorAction);stop(hoverAction);}}};
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}).observe(stage);
const clock=new T.Clock();
renderer.setAnimationLoop(()=>{try{
  const dt=Math.min(clock.getDelta(),.04),cfg=emotionData[emotion],motion=$('hover').checked;time+=dt;
  if(production){mixer?.update(dt);wrapper.position.y=.12+(motion?.025*Math.sin(time*2.15):0);}
  else if(wrapper){const pulse=motion?Math.sin(time*cfg.speed):0;drawFace(cfg,Math.floor((time-emotionEpoch)*(cfg.fps||1)));wrapper.position.y=.54+(motion?.025*Math.sin(time*2.15):0);wrapper.rotation.z=T.MathUtils.lerp(wrapper.rotation.z,cfg.lean+(motion?.012*Math.sin(time*1.4):0),.08);wrapper.rotation.x=T.MathUtils.lerp(wrapper.rotation.x,emotion==='alarm'?.045*Math.sin(time*8):0,.12);if(concept.boomYaw)concept.boomYaw.rotation.y=T.MathUtils.lerp(concept.boomYaw.rotation.y,concept.bases.get(concept.boomYaw).y+cfg.yaw+.035*pulse,.08);if(concept.boomPitch)concept.boomPitch.rotation.x=T.MathUtils.lerp(concept.boomPitch.rotation.x,concept.bases.get(concept.boomPitch).x+cfg.pitch+.045*pulse,.08);if(concept.headPitch)concept.headPitch.rotation.x=T.MathUtils.lerp(concept.headPitch.rotation.x,concept.bases.get(concept.headPitch).x+cfg.head-.06*pulse,.08);if(motion)concept.rotors.forEach((rotor,index)=>rotor.rotation.y+=dt*(18+(index%2?1:-1)*2));}
  padRing.material.opacity=.45+.2*Math.sin(time*2.15);$('hud').innerHTML=staticDistance?'<strong>Distance signal</strong> · static one-draw flight silhouette<br>Root translation and rotation remain engine-driven; select LOD1 for character performance.':`<strong>${cfg.label}</strong> · ${production?'embedded LED + articulated limb performance':'procedural LED + posture/tool study'}<br>${production?'Use Fabrication tool to preview the nozzle pass.':'Full articulated limb acting is available in the production alpha.'}`;controls.update();renderer.render(scene,camera);
  }catch(error){$('hud').textContent=`Viewer error: ${error.message}`;renderer.setAnimationLoop(null);console.error(error);}});
await loadModel($('model').value);
