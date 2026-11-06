import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStory,applyTime,DURATION,CHAPTERS,smooth,clamp} from '../assets/stalheart-diorama/runtime.js';

const $=id=>document.getElementById(id),stage=$('stage');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.domElement.setAttribute('aria-label','ISAO constructs STALHEART, which prints a tank and a habitat');stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x203541);scene.fog=new T.Fog(0x203541,190,420);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.6;room.dispose();pmrem.dispose();scene.add(new T.HemisphereLight(0xd6f0ff,0x566366,1.5));
const sun=new T.DirectionalLight(0xffefd3,3);sun.position.set(-45,90,75);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:75,bottom:-75,near:1,far:220});sun.shadow.normalBias=.08;sun.shadow.bias=-.00006;sun.target.position.set(0,0,26);scene.add(sun,sun.target);
const camera=new T.PerspectiveCamera(40,1,.08,600),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=2;orbit.maxDistance=250;orbit.maxPolarAngle=Math.PI*.49;
const floor=new T.Mesh(new T.PlaneGeometry(600,600),new T.MeshStandardMaterial({color:0x152c36,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.52;floor.receiveShadow=true;scene.add(floor);
const plinth=new T.Mesh(new T.BoxGeometry(92,.5,132),new T.MeshStandardMaterial({color:0x263b45,metalness:.3,roughness:.7}));plinth.position.set(0,-.25,26);plinth.receiveShadow=true;scene.add(plinth);
const lineMat=new T.LineBasicMaterial({color:0x94b6bf,transparent:true,opacity:.22}),markMat=new T.LineBasicMaterial({color:0xd8bd83,transparent:true,opacity:.68});
function lines(points,material){const l=new T.LineSegments(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),material);scene.add(l);return l;}
const grid=[];for(let x=-44;x<=44;x+=4)grid.push([x,.008,-38],[x,.008,90]);for(let z=-38;z<=90;z+=4)grid.push([-44,.008,z],[44,.008,z]);lines(grid,lineMat);
for(const z of [0,52]){const p=[];for(const x of [-1,1])for(const side of [-1,1]){p.push([x*26,.018,z+side*15],[x*20,.018,z+side*15],[x*26,.018,z+side*15],[x*26,.018,z+side*9]);}lines(p,markMat);}
const lane=[];for(const x of [-16,16])for(let z=16;z<36;z+=4)lane.push([x,.019,z],[x,.019,z+2]);lines(lane,markMat);
function groundLabel(text,z){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const c=canvas.getContext('2d');c.font='500 48px monospace';c.textAlign='center';c.fillStyle='#b9cbcc';c.fillText(text,512,78);const m=new T.Mesh(new T.PlaneGeometry(32,4),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:.65}));m.rotation.x=-Math.PI/2;m.position.set(0,.026,z);scene.add(m);}
groundLabel('01 / ASSEMBLY + VEHICLE',-20);groundLabel('02 / HABITAT',72);
let story=null,ready=false,time=0,running=true,lod=1,view='auto',serial=0,last=performance.now(),layout;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
for(const [i,c]of CHAPTERS.entries()){const button=document.createElement('button');button.dataset.chapter=c.id;button.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span>${c.title}<time>${fmt(c.start)}</time>`;button.onclick=()=>{time=c.start+.02;running=true;render();};$('chapters').append(button);}
function disposeStory(s){if(!s)return;s.root.removeFromParent();s.mixer.stopAllAction();s.mixer.uncacheRoot(s.isao);const gs=new Set(),ms=new Set();for(const r of [s.root,...Object.values(s.models).map(m=>m.scene)])r.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)[].concat(o.material).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
async function loadTier(value){
  const ticket=++serial;ready=false;$('loading').style.display='grid';$('loading').textContent='Preparing the construction site…';
  try{const tier=layout.tiers.find(v=>v.lod===value),pairs=await Promise.all(tier.sources.map(async e=>[e.role,await loader.loadAsync('../'+e.file+'?v='+e.sha256.slice(0,12))]));
    const next=createStory(T,Object.fromEntries(pairs),value);if(ticket!==serial){disposeStory(next);return;}
    disposeStory(story);story=next;scene.add(story.root);lod=value;ready=true;$('loading').style.display='none';$('quality').value=String(value);$('metrics').textContent=`${(tier.source_bytes/1048576).toFixed(2)} MiB of original models · ${tier.generated_line_segments.toLocaleString()} derived wire segments`;render();
  }catch(error){$('loading').textContent='The scene could not load. Reload to try again.';console.error(error);}
}
const shot=(target,offset)=>({target:new T.Vector3(...target),offset:new T.Vector3(...offset)});
function blend(a,b,f){f=smooth(f);return{target:a.target.clone().lerp(b.target,f),offset:a.offset.clone().lerp(b.offset,f)};}
function cameraShot(){
  const s=story.state,z=s.z,overview=shot([0,14,26],[-83,55,108]),gantry=shot([0,17,z],[-54,25,67]),isao=shot(story.isaoWorld.clone().add(new T.Vector3(0,.6,0)).toArray(),new T.Vector3(-5,3,7).applyQuaternion(story.isao.quaternion).toArray());
  const tool=shot([0,Math.max(5,s.dome*story.domeHeight),z+2.6],[-20,12,27]),tank=shot([0,5.8,3],[-21,11,29]),dome=shot([0,10,54.6],[-33,20,39]);
  if(view==='overview')return overview;if(view==='gantry')return gantry;if(view==='isao')return isao;if(view==='tool')return tool;
  const assembly=shot(story.isaoWorld.clone().add(new T.Vector3(0,-2,0)).toArray(),[-14,9,22]);
  if(time<4)return isao;
  if(time<6)return blend(isao,assembly,(time-4)/2);
  if(time<26)return assembly;
  if(time<30)return blend(assembly,gantry,(time-26)/4);
  if(time<46)return gantry;
  if(time<50)return blend(gantry,tank,(time-46)/4);
  if(time<72)return tank;
  if(time<78)return blend(tank,gantry,(time-72)/6);
  if(time<98)return gantry;
  if(time<104)return blend(gantry,dome,(time-98)/6);
  if(time<132)return dome;
  return blend(dome,overview,(time-132)/8);
}
function moveCamera(){if(!ready||view==='orbit')return;const s=cameraShot();s.offset.multiplyScalar(Math.max(1,Math.min(2.1,1.15/camera.aspect)));camera.position.copy(s.target).add(s.offset);orbit.target.copy(s.target);orbit.update();}
function render(){
  if(!ready)return;const s=applyTime(T,story,time);time=s.time;$('phase').textContent=s.chapter.title;$('caption').textContent=s.chapter.detail;$('clock').textContent=fmt(time);$('time-label').textContent=`${fmt(time)} / 02:24`;$('time').value=time;$('play').textContent=running?'Pause':'Play';
  let value=s.wire,name='GANTRY WIREFRAME';if(time>=34){value=s.surface;name='SURFACE FINISH';}if(time>=50){value=s.tank;name='MÖRK WIREFRAME';}if(time>=78){value=s.z/52;name='TRANSFER / 52 M';}if(time>=104){value=s.dome;name='HABITAT WIREFRAME';}
  $('progress-name').textContent=name;$('progress-value').textContent=Math.round(value*100)+'%';$('progress-bar').style.width=value*100+'%';
  for(const b of $('chapters').children)b.setAttribute('aria-current',String(b.dataset.chapter===s.chapter.id));
  moveCamera();renderer.render(scene,camera);
}
$('play').onclick=()=>{if(time>=DURATION)time=0;running=!running;render();};$('restart').onclick=()=>{time=0;running=true;render();};$('time').oninput=()=>{time=Number($('time').value);running=false;render();};$('quality').onchange=()=>loadTier(Number($('quality').value));$('camera').onchange=()=>{view=$('camera').value;render();};$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen();$('photo').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download=`STALHEART-DIORAMA-${fmt(time).replace(':','-')}.png`;a.click();};
orbit.addEventListener('start',()=>{view='orbit';$('camera').value='orbit';});
new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();moveCamera();if(ready)renderer.render(scene,camera);}).observe(stage);
function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(ready&&running){time+=dt*Number($('speed').value);if(time>=DURATION){if($('loop').checked)time%=DURATION;else{time=DURATION;running=false;}}render();}else if(orbit.update())renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.diorama={get ready(){return ready;},get story(){return story;},get time(){return time;},get running(){return running;},get lod(){return lod;},scene,renderer,camera,render,loadTier,setTime(t){time=clamp(t,0,DURATION);running=false;render();},setView(v){view=v;$('camera').value=v;render();}};
try{layout=await fetch('../assets/stalheart-diorama/layout.json').then(r=>{if(!r.ok)throw Error('Scene manifest missing');return r.json();});await loadTier(1);}catch(error){$('loading').textContent='The scene manifest could not load. Reload to try again.';console.error(error);}
