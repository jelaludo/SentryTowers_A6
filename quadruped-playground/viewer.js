import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {ChaseSimulation,ACTORS,STEP,track,TRACK_LENGTH,OBSTACLES} from './simulation.js?v=k0-antenna-ears-20261027';
import {ChaseActor} from './actor.js?v=k0-antenna-ears-20261027';
const $=id=>document.getElementById(id),stage=$('stage'),manifest=await fetch('manifest.json?v=k0-antenna-ears-20261027').then(r=>r.json());
const scene=new T.Scene();scene.background=new T.Color('#1c292b');scene.fog=new T.Fog('#1c292b',32,75);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(42,1,.05,150),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=2;controls.maxDistance=65;
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04).texture;scene.environmentIntensity=.85;env.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xe3f1ff,0x62695c,2));
const sun=new T.DirectionalLight(0xffe5c1,3.3);sun.position.set(8,14,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.1,far:45});sun.shadow.bias=-.00015;sun.shadow.normalBias=.015;scene.add(sun,sun.target);
const fill=new T.DirectionalLight(0xb1d7e3,1.8);fill.position.set(-10,6,-8);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:0x142120,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(70,70,0x82938b,0x65746b);grid.position.y=-.007;grid.material.transparent=true;grid.material.opacity=.20;scene.add(grid);
for(const lane of [-2.5,2.5]){const points=Array.from({length:257},(_,i)=>{const p=track(TRACK_LENGTH*i/256,lane);return new T.Vector3(p.x,.004,p.z);});const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x9ea68b,transparent:true,opacity:.48}));scene.add(line);}
const marks=new T.InstancedMesh(new T.BoxGeometry(.035,.008,.32),new T.MeshStandardMaterial({color:0x83988b,roughness:1}),66);for(let i=0;i<66;i++){const p=track(i*TRACK_LENGTH/66),o=new T.Object3D();o.position.set(p.x,.002,p.z);o.rotation.y=p.yaw;o.updateMatrix();marks.setMatrixAt(i,o.matrix);}scene.add(marks);
const hurdles=new T.Group();hurdles.name='PLAYGROUND_HURDLES';scene.add(hurdles);
const rails=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0xb7c5ba,roughness:.55,metalness:.2}),9);
OBSTACLES.forEach((h,i)=>{const p=track(h.s);for(let n=0;n<3;n++){const o=new T.Object3D(),side=n===0?0:n===1?-h.width/2:h.width/2;o.position.set(p.x+p.dz*side,(h.height+(n?.05:0))/2,p.z-p.dx*side);o.rotation.y=p.yaw;o.scale.set(n?.12:h.width,h.height+(n?.05:0),n?.22:h.depth);o.updateMatrix();rails.setMatrixAt(i*3+n,o.matrix);rails.setColorAt(i*3+n,new T.Color(n?0xeea84f:0xc6d6cd));}});rails.castShadow=true;rails.receiveShadow=true;hurdles.add(rails);
const ball=new T.Mesh(new T.SphereGeometry(.135,24,16),new T.MeshStandardMaterial({color:0xff812f,emissive:0xfb6d17,emissiveIntensity:.8,roughness:.24,metalness:.15}));ball.name='CHASE_BALL';ball.castShadow=true;scene.add(ball);
const halo=new T.Mesh(new T.RingGeometry(.20,.26,40),new T.MeshBasicMaterial({color:0xffa04c,transparent:true,opacity:.65,side:T.DoubleSide}));halo.rotation.x=-Math.PI/2;scene.add(halo);
const traces=[0xa7d0b9,0xebbf68,0x9bccec,0xff9955].map(color=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(150*3),3));geometry.setDrawRange(0,0);const line=new T.Line(geometry,new T.LineBasicMaterial({color,transparent:true,opacity:.48}));scene.add(line);return {line,points:[]};});
const loader=new GLTFLoader();let actors=[],sim,ready=false,playing=true,accumulator=0,loadToken=0,lastTrace=0;
const seedParam=Number(new URLSearchParams(location.search).get('seed'));let seed=Number.isFinite(seedParam)&&seedParam>0?seedParam:27;
function clearTraces(){for(const t of traces){t.points=[];t.line.geometry.setDrawRange(0,0);}lastTrace=0;}
function restart(nextSeed=seed){seed=nextSeed;sim.reset(seed);sim.obstacles=$('obstacles').checked;accumulator=0;actors.forEach(a=>a.reset());clearTraces();actors.forEach((a,i)=>a.pose(sim.actors[i]));playing=true;$('play').textContent='Pause';cameraUpdate(1,true);render();}
async function load(){
 const token=++loadToken;ready=false;$('loading').hidden=false;$('loading').textContent='Loading three articulated rigs…';
 const entries=ACTORS.map(p=>manifest.assets.find(a=>a.family===p.family&&a.lod===Number($('lod').value)));
 const loaded=await Promise.all(entries.map(e=>loader.loadAsync('../'+e.file+'?v='+e.sha256.slice(0,12))));if(token!==loadToken)return;
 for(const a of actors){scene.remove(a.holder);a.dispose();}actors=loaded.map((g,i)=>new ChaseActor(g,entries[i]));actors.forEach(a=>scene.add(a.holder));
 const clips=Object.fromEntries(ACTORS.map((p,i)=>[p.id,entries[i].clips]));sim=new ChaseSimulation({seed,clips,obstacles:$('obstacles').checked});ready=true;restart(seed);$('loading').hidden=true;
 for(const id of ['play','burst','restart','new-seed'])$(id).disabled=false;
}
function advance(seconds){
 if(!ready)return;accumulator+=Math.max(0,seconds);
 while(accumulator>=STEP){sim.step(STEP);actors.forEach((a,i)=>a.pose(sim.actors[i],STEP));accumulator-=STEP;}
 if(sim.time-lastTrace>.06){const points=[...sim.actors.map(a=>a.position),sim.ball];traces.forEach((trace,i)=>{trace.points.push([points[i].x,.012,points[i].z]);if(trace.points.length>150)trace.points.shift();const attr=trace.line.geometry.attributes.position;trace.points.forEach((p,j)=>attr.setXYZ(j,...p));attr.needsUpdate=true;trace.line.geometry.setDrawRange(0,trace.points.length);});lastTrace=sim.time;}
}
function cameraUpdate(dt,snap=false){
 if(!sim||$('camera').value==='free')return;
 let target,desired;const mode=$('camera').value;
 if(mode==='overview'){target=new T.Vector3(0,0,0);desired=new T.Vector3(24,29,31).multiplyScalar(Math.max(1,1.2/camera.aspect));}
 else{
  // Fit animated skeleton extents, including the long tail and airborne pose,
  // in camera space. Root-only framing clips a turning feline on narrow screens.
  const points=[new T.Vector3(sim.ball.x,sim.ball.y,sim.ball.z)];
  for(const a of actors)for(const n of Object.values(a.nodes))if(n.isBone)points.push(n.getWorldPosition(new T.Vector3()));
  target=new T.Box3().setFromPoints(points).getCenter(new T.Vector3());target.y+=.22;
  const back=new T.Vector3(1,mode==='low'?.34:.82,1.1).normalize(),right=new T.Vector3(back.z,0,-back.x).normalize(),up=new T.Vector3().crossVectors(back,right);
  const tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*camera.aspect;let distance=6.5;
  for(const point of points){const v=point.clone().sub(target),depth=v.dot(back);distance=Math.max(distance,depth+(Math.abs(v.dot(right))+.40)/(tanH*.88),depth+(Math.abs(v.dot(up))+.40)/(tanV*.72));}
  desired=target.clone().addScaledVector(back,distance);
 }
 const blend=snap?1:1-Math.exp(-dt*3.2);camera.position.lerp(desired,blend);controls.target.lerp(target,blend);controls.update();
 const centre=controls.target;sun.position.set(centre.x+8,14,centre.z+4);sun.target.position.set(centre.x,0,centre.z);sun.target.updateMatrixWorld();
}
function render(){
 if(!sim)return;ball.position.set(sim.ball.x,sim.ball.y,sim.ball.z);ball.rotation.x=sim.ball.s/.135;halo.position.set(sim.ball.x,.008,sim.ball.z);halo.scale.setScalar(1+.10*Math.sin(sim.time*4));
 hurdles.visible=sim.obstacles;traces.forEach(t=>t.line.visible=$('trails').checked);
 for(const [id,value,state] of [['ball',sim.ball.speed,sim.ball.state],...sim.actors.map(a=>[a.id,a.worldSpeed,a.state])]){$(id+'-speed').innerHTML=value.toFixed(2)+' <small>m/s</small>';$(id+'-meter').value=value;$(id+'-state').textContent=state;}
 $('elapsed').textContent=String(Math.floor(sim.time/60)).padStart(2,'0')+':'+String(Math.floor(sim.time%60)).padStart(2,'0');$('jumps').textContent=sim.actors.map(a=>a.jumps).join(' · ');$('seed').textContent=seed;$('status').textContent=(playing?'LIVE':'PAUSED')+' / '+($('lod').value==='1'?'GAME RIGS':'DETAILED MASTERS');
 renderer.render(scene,camera);$('triangles').textContent=renderer.info.render.triangles.toLocaleString();$('draws').textContent=renderer.info.render.calls;
}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';render();};$('burst').onclick=()=>sim.burst();$('restart').onclick=()=>restart();$('new-seed').onclick=()=>restart(seed+1);
$('lod').onchange=()=>load().catch(e=>{$('loading').hidden=false;$('loading').textContent='Unable to load rigs: '+e.message;console.error(e);});
$('camera').onchange=()=>{cameraUpdate(1,true);render();};$('trails').onchange=render;$('obstacles').onchange=()=>{sim.obstacles=$('obstacles').checked;render();};
controls.addEventListener('start',()=>{$('camera').value='free';});document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(e.target.tagName)){e.preventDefault();$('play').click();}});
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);cameraUpdate(1,true);render();}).observe(stage);
await load();let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.08);last=now;if(playing)advance(dt*Number($('speed').value));cameraUpdate(dt);controls.update();render();});
window.quadrupedPlayground={get ready(){return ready},get sim(){return sim},get actors(){return actors},get playing(){return playing},set playing(v){playing=v;$('play').textContent=v?'Pause':'Play'},advance,restart,render,load,renderer,scene,camera,controls,ball,manifest,cameraUpdate};
