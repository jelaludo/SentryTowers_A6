import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createCourse,clamp,smooth,wrap,trackSample} from './course.js?v=2';
import {PosePlayer,clipName,clipTime,disposeModel} from './actor.js?v=2';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/nisoku03-kimodo/',loader=new GLTFLoader();
const scene=new T.Scene();scene.background=new T.Color(0xa5ada6);scene.fog=new T.Fog(0xa5ada6,37,90);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;stage.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(40,1,.04,150),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.49;
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xf1f2e8,0x61706b,1.1));
const sun=new T.DirectionalLight(0xfff0d2,2.5);sun.position.set(7,15,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:45});sun.shadow.normalBias=.012;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
const fill=new T.DirectionalLight(0xc8e4eb,.9);fill.position.set(-8,6,-8);scene.add(fill);
const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x89978e,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.46;ground.receiveShadow=true;scene.add(ground);
let ready=false,playing=true,time=0,mode='story',cameraMode='follow',libraryLoaded=false,libraryPromise=null,selected=null,lastBeat=-1,modeRequest=0;
let course,paths,contact,manifest,human,cat,holder,catHolder,court,route,skeleton,libraryFloor;
const up=new T.Vector3(0,1,0),qA=new T.Quaternion(),qB=new T.Quaternion(),humanPosition=new T.Vector3(),catPosition=new T.Vector3();
function clock(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`}
function yawQuaternion(s){const q=new T.Quaternion().setFromAxisAngle(up,s.yaw);if(s.rotation)q.setFromAxisAngle(up,s.rotation.yaw).multiply(new T.Quaternion().fromArray(s.rotation.quaternion).normalize());return q}
function poseStory(t){
 const n=course.sample(t),b=n.beat,name=clipName(b),local=clipTime(human,b,n.local),samples=[{name,time:local,weight:1}],fade=.20;
 holder.position.fromArray(n.position);holder.quaternion.copy(yawQuaternion(n));
 if(n.local<fade){const prev=course.beats[(n.index-1+course.beats.length)%course.beats.length],w=smooth(n.local/fade);samples[0].weight=w;samples.push({name:clipName(prev),time:clipTime(human,prev,prev.duration-.0001),weight:1-w});holder.quaternion.copy(yawQuaternion(course.sample(b.start-.0001))).slerp(yawQuaternion(n),w)}
 // Turn into the side-step before contact, then return to the route after recovery.
 const next=course.beats[(n.index+1)%course.beats.length];if(next.kind==='contact'&&b.duration-n.local<.45){const w=smooth(1-(b.duration-n.local)/.45);holder.quaternion.slerp(yawQuaternion(course.sample(next.start+.001)),w)}
 human.pose(samples);humanPosition.copy(holder.position);humanPosition.y+=.9;
 const k=course.lure(t),a=course.lure(t-.018),z=course.lure(t+.018),dx=z.position[0]-a.position[0],dz=z.position[2]-a.position[2],catSpeed=Math.hypot(dx,dz)/.036;
 catHolder.position.fromArray(k.position);catHolder.rotation.set(0,catSpeed>.035?Math.atan2(dx,dz):Math.atan2(holder.position.x-catHolder.position.x,holder.position.z-catHolder.position.z),0);
 const gallop={name:'Gallop_Cycle',time:wrap(k.s/2.6888888743,.4)},walk={name:'Feline_Walk_Cycle',time:wrap(k.s/.2383333,1.6)};
 let poses=catSpeed>.65?[gallop]:catSpeed>.035?[walk]:[{name:'Watch_Idle',time:t%3}];
 if(k.jump){const w=smooth(k.jump.u/.16)*smooth((1-k.jump.u)/.16);poses[0].weight=1-w;poses.push({name:'Chase_Pounce',time:.55+k.jump.u*1.25,weight:w})}
 cat.pose(poses);catPosition.copy(catHolder.position);catPosition.y+=.23;
 const prev=course.sample(t-.016),after=course.sample(t+.016),speed=Math.hypot(after.position[0]-prev.position[0],after.position[2]-prev.position[2])/.032;
 $('human-speed').textContent=speed.toFixed(1);$('cat-speed').textContent=catSpeed.toFixed(1);$('separation').textContent=Math.hypot(catHolder.position.x-holder.position.x,catHolder.position.z-holder.position.z).toFixed(1)+' m apart';
 $('chapter-no').textContent=String(n.index+1).padStart(2,'0')+' / '+course.beats.length;$('chapter-title').textContent=b.label;$('chapter-note').textContent=b.note;
 if(lastBeat!==n.index){document.querySelectorAll('[data-beat]').forEach(el=>el.classList.toggle('active',el.dataset.beat===b.id));lastBeat=n.index}
 return {human:n,lure:k,speed,catSpeed};
}
function poseLibrary(t){
 holder.position.set(0,0,0);holder.quaternion.identity();let name=selected.clip,local=Math.min(t,selected.duration_s-.00001);
 if(selected.record){const p=paths[selected.record];holder.position.fromArray(trackSample(p.times,p.positions,3,local));holder.quaternion.fromArray(trackSample(p.rotation_times,p.quaternions,4,local)).normalize();name='recorded-'+selected.record}
 else if(selected.jump?.valid_airborne_detection){const j=selected.jump;if(local>j.takeoff_s&&local<j.landing_s){const u=local<j.apex_s?(local-j.takeoff_s)/(j.apex_s-j.takeoff_s):(j.landing_s-local)/(j.landing_s-j.apex_s);holder.position.y=j.source_height_rise_m*(1-(1-u)**2)}}
 human.pose([{name,time:local}]);humanPosition.copy(holder.position);humanPosition.y+=.9;catPosition.copy(humanPosition);
 $('chapter-no').textContent=selected.record?'RECORDED ROOT MOTION':'CLIP LAB / '+selected.seed;$('chapter-title').textContent=selected.label;$('chapter-note').textContent=selected.record?'Original recording, recentered. No additional controller travel.':'Original in-place pose. Controller arc shown for detected jumps.';
 $('human-speed').textContent='—';$('cat-speed').textContent='—';$('separation').textContent=selected.record?'Recorded example':'In-place take';
}
function cameraUpdate(dt,snap=false){
 if(!ready||cameraMode==='free')return;
 let target,desired;
 if(cameraMode==='overview'&&mode==='story'){target=new T.Vector3(0,.1,0);desired=new T.Vector3(25,28,32).multiplyScalar(Math.max(1,1.15/camera.aspect))}
 else{
  const close=cameraMode==='close'||mode==='library';target=humanPosition.clone();if(!close)target.lerp(catPosition,.32);
  const back=new T.Vector3(1,.68,1.25).normalize(),right=new T.Vector3(back.z,0,-back.x).normalize(),upV=new T.Vector3().crossVectors(back,right);
  const points=[humanPosition.clone().add(new T.Vector3(0,1.05,0)),humanPosition.clone().add(new T.Vector3(0,-1.05,0))];if(!close)points.push(catPosition.clone().add(new T.Vector3(.5,.3,.5)),catPosition.clone().add(new T.Vector3(-.5,-.3,-.5)));
  let distance=close?5.2:6.5;const tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*camera.aspect;
  for(const p of points){const v=p.sub(target),depth=v.dot(back);distance=Math.max(distance,depth+(Math.abs(v.dot(right))+.5)/(tanH*.8),depth+(Math.abs(v.dot(upV))+.45)/(tanV*.78))}
  desired=target.clone().addScaledVector(back,distance);
 }
 const blend=snap?1:1-Math.exp(-dt*5);camera.position.lerp(desired,blend);controls.target.lerp(target,blend);controls.update();sun.position.copy(controls.target).add(new T.Vector3(7,15,8));sun.target.position.copy(controls.target);sun.target.updateMatrixWorld();
}
function draw(render=true){if(!ready)return;window.nisokuChase.state=mode==='story'?poseStory(time):poseLibrary(time);court.visible=mode==='story';catHolder.visible=mode==='story';route.visible=mode==='story'&&$('route').checked;libraryFloor.visible=mode==='library';skeleton.visible=$('skeleton').checked;skeleton.updateMatrixWorld(true);$('time').value=time;$('clock').textContent=clock(time)+' / '+clock(mode==='story'?course.duration:selected.duration_s);if(render)renderer.render(scene,camera);$('render-stats').textContent=renderer.info.render.triangles.toLocaleString()+' tris / '+renderer.info.render.calls+' draws'}
function seek(t,snap=true){time=clamp(t,0,(mode==='story'?course.duration:selected.duration_s)-.00001);draw();cameraUpdate(1,snap);renderer.render(scene,camera)}
async function ensureLibrary(){if(libraryLoaded)return;if(!libraryPromise){$('loading').hidden=false;$('loading').textContent='Loading all 207 takes and 5 recordings…';libraryPromise=loader.loadAsync(base+'derived/library.glb').then(g=>{human.add(g.animations);disposeModel(g.scene);libraryLoaded=true}).finally(()=>{$('loading').hidden=true})}return libraryPromise}
function populateTake(){const id=$('motion').value;$('take').replaceChildren();
 if(id.startsWith('recorded-')){const record=id.slice(9),p=paths[record];selected={record,clip:id,label:record.replaceAll('-',' '),duration_s:p.duration_s,note:p.note};const o=new Option('Original baked example',id);$('take').add(o)}
 else {const takes=manifest.takes.filter(t=>t.motion===id);for(const t of takes)$('take').add(new Option('Seed '+t.seed+(t.automatic_eligible?'':' · REVIEW ONLY'),t.id));const m=manifest.motions.find(m=>m.id===id);$('take').value=m.default_take;selected=manifest.takes.find(t=>t.id===$('take').value)}
 showTake();
}
function showTake(){if(!$('motion').value.startsWith('recorded-'))selected=manifest.takes.find(t=>t.id===$('take').value);$('time').max=selected.duration_s;
 const review=selected.automatic_eligible===false||selected.record==='hero-landing';$('take-note').classList.toggle('review',review);$('take-note').textContent=(review?'Review only · ':'')+(selected.note||selected.prompt||'')+(selected.record==='hero-landing'?' The original recovery passes below the floor. The story uses a separate repaired landing cut.':'');seek(0);}
async function setMode(next){const request=++modeRequest;if(next==='library')await ensureLibrary();if(request!==modeRequest)return;mode=next;$('story-mode').setAttribute('aria-pressed',next==='story');$('library-mode').setAttribute('aria-pressed',next==='library');$('story-panel').hidden=next!=='story';$('library-panel').hidden=next!=='library';if(next==='story'){$('time').max=course.duration;seek(0)}else{populateTake()}cameraMode='follow';cameraUpdate(1,true)}
window.nisokuChase={get ready(){return ready},get course(){return course},get time(){return time},get mode(){return mode},get human(){return human},get holder(){return holder},get cat(){return cat},get playing(){return playing},set playing(v){playing=v;$('play').textContent=v?'Pause':'Play'},seek,setMode,draw,cameraUpdate,renderer,scene,camera,controls};
try{
 [manifest,paths,contact]=await Promise.all(['manifest.json','derived/recorded-paths.json','derived/chase-actions.json?v=2'].map(f=>fetch(base+f).then(r=>{if(!r.ok)throw Error(f+': '+r.status);return r.json()})));course=createCourse(paths,contact);
 const [rig,moves,k0,courtGLB,contactGLB]=await Promise.all([loader.loadAsync(base+'rig.glb'),loader.loadAsync(base+'derived/chase.glb'),loader.loadAsync('../assets/k0-tech-01/k0_tech_01_d0_lod1.glb'),loader.loadAsync('court_d0_lod1.glb?v=2'),loader.loadAsync(base+'derived/chase-actions.glb?v=2')]);
 holder=new T.Group();holder.name='NISOKU_CHASE_ACTOR';holder.add(rig.scene);scene.add(holder);human=new PosePlayer(rig.scene,[...moves.animations,...contactGLB.animations]);disposeModel(moves.scene);disposeModel(contactGLB.scene);
 const pounce=k0.animations.find(c=>c.name==='Pounce').clone();pounce.name='Chase_Pounce';const mt=pounce.tracks.find(t=>t.name==='MOTION.position');if(mt)mt.values.fill(0);
 catHolder=new T.Group();catHolder.name='K0_CHASE_LURE';catHolder.add(k0.scene);scene.add(catHolder);cat=new PosePlayer(k0.scene,[...k0.animations,pounce]);
 court=courtGLB.scene;court.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(court);
 const pts=Array.from({length:1001},(_,i)=>new T.Vector3(...course.at(course.length*i/1000))).map(p=>{p.y+=.006;return p});route=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0xf3cb7a,transparent:true,opacity:.8}));scene.add(route);
 libraryFloor=new T.Group();const f=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({color:0x89978e,roughness:1}));f.rotation.x=-Math.PI/2;f.receiveShadow=true;libraryFloor.add(f);const grid=new T.GridHelper(70,70,0x657d71,0x7f9385);grid.position.y=.002;libraryFloor.add(grid);scene.add(libraryFloor);
 skeleton=new T.SkeletonHelper(rig.scene);skeleton.material.depthTest=false;skeleton.renderOrder=10;scene.add(skeleton);
 for(const id of course.beats.map(b=>b.id).filter(id=>['jump-a','roll-left','roll-right','ukemi-forward','ukemi-backward','crouch-down','climb','hero-landing','balance','sprint'].includes(id))){const b=course.beats.find(b=>b.id===id),button=document.createElement('button');button.dataset.beat=id;const small=document.createElement('small');small.textContent=clock(b.start);button.append(small,b.label);button.onclick=()=>seek(b.start);$('chapters').append(button)}
 const groups=new Map();for(const m of manifest.motions){if(!groups.has(m.group)){const g=document.createElement('optgroup');g.label=m.group;groups.set(m.group,g);$('motion').append(g)}groups.get(m.group).append(new Option(m.label,m.id))}const group=document.createElement('optgroup');group.label='Recorded contact examples';for(const id of Object.keys(paths))group.append(new Option(id.replaceAll('-',' '),'recorded-'+id));$('motion').append(group);
 $('time').max=course.duration;ready=true;$('loading').hidden=true;$('play').disabled=false;$('restart').disabled=false;
 $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play'};$('restart').onclick=()=>seek(0);$('time').oninput=()=>{playing=false;$('play').textContent='Play';seek(Number($('time').value))};
 $('story-mode').onclick=()=>setMode('story');$('library-mode').onclick=()=>setMode('library').catch(fail);$('motion').onchange=populateTake;$('take').onchange=showTake;
 for(const id of ['follow','overview','close'])$(id).onclick=()=>{cameraMode=id;cameraUpdate(1,true);draw()};controls.addEventListener('start',()=>{cameraMode='free'});
 for(const id of ['route','skeleton'])$(id).onchange=draw;$('wire').onchange=()=>{for(const root of [holder,catHolder])root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=$('wire').checked});draw()};
 $('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen();
 document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(e.target.tagName)){e.preventDefault();$('play').click()}});
 new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);draw();cameraUpdate(1,true);draw()}).observe(stage);
 seek(0);let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.06);last=now;if(playing){const duration=mode==='story'?course.duration:selected.duration_s;time=wrap(time+dt*Number($('speed').value),duration)}draw(false);cameraUpdate(dt);controls.update();renderer.render(scene,camera)});
}catch(e){fail(e)}
function fail(e){$('loading').hidden=false;$('loading').textContent='Motion lab could not load: '+e.message;console.error(e)}
