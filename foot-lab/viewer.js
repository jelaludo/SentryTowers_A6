import * as T from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRig,POSES,MOTIONS,JOINTS,TOES,controlsPose,sampleMotion,PIPE} from '../assets/foot-lab/runtime.js?v=footlab-v1';
import {BIPED_REST} from '../assets/foot-lab/biped.js?v=biped-v1';
const $=id=>document.getElementById(id),base='../assets/foot-lab/',stage=$('stage'),scene=new T.Scene();scene.background=new T.Color(0x253740);scene.fog=new T.FogExp2(0x253740,.55);
const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;stage.prepend(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
const camera=new T.PerspectiveCamera(32,1,.001,10),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=.07;orbit.maxDistance=2.4;orbit.maxPolarAngle=Math.PI*.92;
scene.add(new T.HemisphereLight(0xe7f4ee,0x35464b,.75));const key=new T.DirectionalLight(0xffecd0,2.5);key.position.set(-.35,.5,-.4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=key.shadow.camera.bottom=-.4;key.shadow.camera.right=key.shadow.camera.top=.4;key.shadow.camera.near=.01;key.shadow.camera.far=2;key.shadow.bias=-.0001;scene.add(key);const rim=new T.DirectionalLight(0xcee8ff,1.8);rim.position.set(.3,.25,.3);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshStandardMaterial({color:0x101a20,metalness:.05,roughness:.9,envMapIntensity:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-.001;floor.receiveShadow=true;scene.add(floor);const grid=new T.GridHelper(1.4,28,0x537078,0x344e57);grid.material.opacity=.28;grid.material.transparent=true;grid.position.y=-.0006;scene.add(grid);
const actor=new T.Group();scene.add(actor);
// Scene fixture: a brushed steel pipe, held clear of the heel by two low saddles.
const fixture=new T.Group();fixture.name='METAL_PIPE_TEST_FIXTURE';scene.add(fixture);
const metal=new T.MeshStandardMaterial({color:0x9eafb8,metalness:.94,roughness:.30}),standMat=new T.MeshStandardMaterial({color:0x273941,metalness:.7,roughness:.36});
const pipe=new T.Mesh(new T.CylinderGeometry(PIPE.radius,PIPE.radius,PIPE.length,64,1,true),metal);pipe.rotation.z=Math.PI/2;pipe.position.fromArray(PIPE.center);pipe.castShadow=pipe.receiveShadow=true;fixture.add(pipe);
const innerPipe=new T.Mesh(new T.CylinderGeometry(PIPE.radius-.002,PIPE.radius-.002,PIPE.length,64,1,true),new T.MeshStandardMaterial({color:0x64747c,metalness:.9,roughness:.4,side:T.BackSide}));innerPipe.rotation.z=Math.PI/2;innerPipe.position.fromArray(PIPE.center);fixture.add(innerPipe);
for(const side of [-1,1]){
 const lip=new T.Mesh(new T.RingGeometry(PIPE.radius-.002,PIPE.radius,64),metal);lip.rotation.y=side*Math.PI/2;lip.position.set(side*PIPE.length/2,PIPE.center[1],PIPE.center[2]);fixture.add(lip);
 const stand=new T.Mesh(new T.BoxGeometry(.022,.080,.062),standMat);stand.position.set(side*.132,.04,PIPE.center[2]);stand.castShadow=stand.receiveShadow=true;fixture.add(stand);
 const ring=new T.Mesh(new T.TorusGeometry(PIPE.radius+.001,.002,8,40),new T.MeshStandardMaterial({color:0xc5a164,metalness:.8,roughness:.3}));ring.rotation.y=Math.PI/2;ring.position.set(side*.141,PIPE.center[1],PIPE.center[2]);fixture.add(ring);
}
const manifest=await fetch(base+'manifest.json?v=biped-v1').then(r=>r.json());
let root,rig,skeleton,entry,state,encoding='plain',generation=0,playing=false,time=0,last=performance.now(),pose={...POSES.plant},view='hero',selectedPose='plant';
function dispose(r){const gs=new Set(),ms=new Set(),ss=new Set();r.traverse(o=>{if(o.isMesh){gs.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]))ms.add(m);if(o.skeleton)ss.add(o.skeleton);}});gs.forEach(x=>x.dispose());ms.forEach(x=>x.dispose());ss.forEach(x=>x.dispose());}
function applyVisibility(){root?.traverse(o=>{if(o.isMesh){o.visible=entry?.static||o.material.name!=='CERAMIC_IVORY'||$('armor').checked;if(o.material.name==='TACTILE_ELASTOMER')o.visible=$('pads').checked;for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.wireframe=$('wire').checked;}});if(skeleton)skeleton.visible=$('rig').checked&&!entry.static;}
function update(){
 if(!rig)return;state=rig.pose(pose,{explode:Number($('explode').value)});
 fixture.visible=!entry.static&&(pose.fixture==='pipe'||selectedPose==='rail');fixture.position.y=-.22*(1-(pose.fixtureRise??1));
 $('phase-label').textContent=entry.static?(entry.variant==='biped'?'Static / natural toe curl':'Static plantigrade silhouette'):pose.phase??({biped_rest:'Natural inward toe curl',plant:'Heel / arch / forefoot',splay:'Short toes / broad support',reach:'Toe clearance',curl:'Independent flexion',rail:'Metal pipe / opposed hold',opposed:'Great-toe saddle rotation'}[selectedPose]??'Joint inspection');
 $('time').value=time;$('clock').textContent=time.toFixed(2)+' / '+MOTIONS[$('motion').value].duration_s+' s';$('explode-value').textContent=Math.round(Number($('explode').value)*100)+'%';
 const j=JOINTS.find(x=>x.name===$('joint').value);if(j){$('angle').min=j.min;$('angle').max=j.max;$('angle').value=pose[j.name]??0;$('angle-value').textContent=((pose[j.name]??0)*180/Math.PI).toFixed(1)+'°';}
}
function pause(){playing=false;$('play').textContent='Play';}
function clearPreset(){selectedPose='custom';document.querySelectorAll('[data-pose]').forEach(b=>b.classList.remove('active'));}
function syncControls(){for(const [id,v]of [['curl',(pose.TOE_02_MTP??0)/.65],['spread',(pose.TOE_05_SPLAY??0)/.26],['opposition',(-(pose.HALLUX_OPPOSITION??-.55)-.55)/2.5]]){$(id).value=Math.max(0,Math.min(1,v));$(id+'-value').textContent=Math.round(Number($(id).value)*100)+'%';}$('digit-curl').value=(pose[$('digit').value+'_MTP']??0)/.65;}
function setPose(name){pause();pose={...POSES[name]};selectedPose=name;document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',b.dataset.pose===name));syncControls();update();setView(view);}
function setView(name){
 view=name;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(!root)return;
 actor.updateMatrixWorld(true);root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root,true);
 // Reserve the entire motion envelope to keep the lifting foot and rail framed.
 if(selectedPose==='motion'||playing){bounds.expandByPoint(new T.Vector3(-.16,0,-.14));const mode=$('motion').value,ceiling={balance:.20,agility:.27,opposition:.26,step:.28}[mode]??.39;bounds.expandByPoint(new T.Vector3(.16,ceiling,.15));}
 if(fixture.visible){fixture.updateMatrixWorld(true);bounds.union(new T.Box3().setFromObject(fixture,true));}
 let target=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),direction=new T.Vector3(-.8,.7,1);
 if(name==='top')direction.set(0,1,.001);if(name==='sole')direction.set(0,-1,.15);if(name==='side')direction.set(-1,.22,.05);
 if(name==='toe'){target=rig.nodes.HALLUX_MTP.getWorldPosition(new T.Vector3());size.set(.18,.16,.18);direction.set(-1,.45,.8);}
 const radius=Math.max(size.y*.59,size.x*.62/camera.aspect,size.z*.65),distance=radius/Math.tan(T.MathUtils.degToRad(camera.fov/2))*1.3;
 orbit.target.copy(target);camera.position.copy(target).addScaledVector(direction.normalize(),distance);orbit.update();
 const fitBounds=name==='toe'?new T.Box3().setFromCenterAndSize(target,size):bounds;
 for(let attempt=0;attempt<4;attempt++){
  camera.updateMatrixWorld(true);let extent=0;
  for(const x of [fitBounds.min.x,fitBounds.max.x])for(const y of [fitBounds.min.y,fitBounds.max.y])for(const z of [fitBounds.min.z,fitBounds.max.z]){const p=new T.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}
  if(extent<=.86)break;camera.position.sub(target).multiplyScalar(extent/.86).add(target);orbit.update();
 }
 floor.visible=name!=='sole';grid.visible=name!=='sole';
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();setView(view);}
async function load(){
 const token=++generation,resume=playing;pause();$('status').textContent='Loading foot…';
 try{const lod=Number($('lod').value),format=$('encoding').value,variant=$('variant').value,e=manifest.assets.find(x=>x.lod===lod&&(x.variant??'original')===variant),g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(base+(format==='plain'?e.file:e.meshopt_file));
  if(token!==generation){dispose(g.scene);return;}if(root){actor.remove(root);dispose(root);}if(skeleton){scene.remove(skeleton);skeleton.dispose();}
  root=g.scene;entry=e;encoding=format;actor.add(root);root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});rig=createRig(root);skeleton=new T.SkeletonHelper(root);scene.add(skeleton);
  for(const id of ['play','time','motion','speed','curl','spread','opposition','digit','digit-curl','joint','angle','explode','armor','pads','rig','export-pose'])$(id).disabled=e.static;document.querySelectorAll('[data-pose]').forEach(b=>b.disabled=e.static);for(const id of ['armor','pads'])$(id).disabled=e.static||e.merged_palette;$('biped-rest').disabled=e.static;
  document.querySelector('.specimen-tag').innerHTML=variant==='biped'?'02 / BIPED VARIANT<br>'+(e.static?'CURLED DISTANCE MODEL':'MINIMAL MOTION RIG'):'01 / ORIGINAL STUDY<br>TACTILE / PREHENSILE FOOT';$('download').href=base+(format==='plain'?e.file:e.meshopt_file);$('stats').innerHTML=`<div><strong>${e.triangles.toLocaleString()}</strong><small>Triangles</small></div><div><strong>${e.draw_calls}</strong><small>Draws</small></div><div><strong>${Math.round((format==='plain'?e.bytes:e.meshopt_bytes)/1024)}</strong><small>KiB</small></div>`;
  $('status').textContent='NISOKU-02 / '+(variant==='biped'?(e.static?'Curled static / Biped':'Economical game / Biped'):e.static?'Static distance':lod===0?'Detailed master':'Articulated game')+' / '+(format==='plain'?'Plain GLB':'Decoded Meshopt');
  playing=resume&&!e.static;$('play').textContent=playing?'Pause':'Play';last=performance.now();syncControls();update();applyVisibility();setView(view);
 }catch(e){$('status').textContent='Load failed: '+e.message;console.error(e);}
}
for(const j of JOINTS){const o=document.createElement('option');o.value=j.name;o.textContent=j.name.replaceAll('_',' ').toLowerCase();$('joint').append(o);}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>setPose(b.dataset.pose));
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';last=performance.now();if(playing){clearPreset();selectedPose='motion';pose=sampleMotion(time,$('motion').value);update();setView(view);}};
$('motion').onchange=()=>{time=0;$('time').max=MOTIONS[$('motion').value].duration_s;pose=sampleMotion(0,$('motion').value);clearPreset();selectedPose='motion';playing=true;$('play').textContent='Pause';last=performance.now();syncControls();update();setView(view);};
function scrub(t){pause();time=t;pose=sampleMotion(time,$('motion').value);clearPreset();selectedPose='motion';syncControls();update();setView(view);}
$('time').oninput=()=>scrub(Number($('time').value));
function manual(){pause();clearPreset();delete pose.fixture;delete pose.fixtureRise;delete pose.phase;pose.lift=.11;pose.pitch=pose.roll=pose.travel=0;}
for(const id of ['curl','spread','opposition'])$(id).oninput=()=>{manual();const v=Number($(id).value);if(id==='curl')for(const d of TOES){pose[d.id+'_MTP']=v*.65;pose[d.id+'_PIP']=v*1.05;pose[d.id+'_DIP']=v*.85;}if(id==='spread')for(const d of TOES)pose[d.id+'_SPLAY']=d.spread*v;if(id==='opposition')pose.HALLUX_OPPOSITION=-.55-2.5*v;syncControls();update();setView(view);};
$('digit').onchange=syncControls;$('digit-curl').oninput=()=>{manual();const id=$('digit').value,v=Number($('digit-curl').value);pose[id+'_MTP']=v*.65;pose[id+'_PIP']=v*1.05;pose[id+'_DIP']=v*.85;syncControls();update();setView(view);};
$('joint').onchange=update;$('angle').oninput=()=>{manual();pose[$('joint').value]=Number($('angle').value);syncControls();update();setView(view);};
$('explode').oninput=()=>{pause();update();setView(view);};for(const id of ['armor','pads','wire','rig'])$(id).onchange=applyVisibility;$('lod').onchange=load;$('encoding').onchange=load;
$('export-pose').onclick=()=>{const payload={schema:'nisoku02foot.pose/v1',family:'nisoku02foot',units:'radians_and_meters',variant:entry.variant??'original',model_file:entry.file,angles:{...state.angles},placement:{...state.placement}},url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='nisoku02-foot-pose.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function variantUI(){const economy=$('variant').value==='biped';$('lod').querySelector('[value="0"]').disabled=economy;if(economy&&$('lod').value==='0')$('lod').value='1';$('lod').querySelector('[value="1"]').textContent=economy?'Game / economical':'Game / articulated';$('lod').querySelector('[value="2"]').textContent=economy?'Distance / curled':'Distance / static';$('biped-rest').hidden=!economy;$('variant-note').textContent=economy?'One palette, all joint axes. Static version holds the natural curl; material-layer visibility is unavailable.':'Original detail levels, with separate material inspection.';}
function bipedRest(){pause();clearPreset();pose={...BIPED_REST};selectedPose='biped_rest';syncControls();update();setView(view);}
$('biped-rest').onclick=bipedRest;
$('variant').onchange=()=>{pause();variantUI();$('explode').value=0;clearPreset();pose={...($('variant').value==='biped'?BIPED_REST:POSES.plant)};selectedPose=$('variant').value==='biped'?'biped_rest':'custom';load();};
const query=new URLSearchParams(location.search);if(query.get('variant')==='biped'){$('variant').value='biped';pose={...BIPED_REST};selectedPose='biped_rest';}if(['0','1','2'].includes(query.get('lod')))$('lod').value=query.get('lod');variantUI();
new ResizeObserver(resize).observe(stage);document.addEventListener('visibilitychange',()=>{last=performance.now();});
renderer.setAnimationLoop(now=>{const dt=Math.min(.10,Math.max(0,(now-last)/1000));last=now;if(playing&&rig&&!entry.static){time=(time+dt*Number($('speed').value))%MOTIONS[$('motion').value].duration_s;pose=sampleMotion(time,$('motion').value);syncControls();update();}orbit.update();renderer.render(scene,camera);});
window.footLab={scene,camera,renderer,actor,fixture,get root(){return root;},get rig(){return rig;},get entry(){return entry;},get encoding(){return encoding;},get state(){return state;},get pose(){return {...pose};},get time(){return time;},get playing(){return playing;},get selectedPose(){return selectedPose;},setPose,setView,scrub};resize();await load();
