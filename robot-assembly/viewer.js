import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRig,DIM,MOTIONS,assemblySpread} from '../assets/robot-assembly/runtime.js';
import {attachHelmet,HELMET_FITS,DEFAULT_HELMET} from '../assets/robot-assembly/helmet-fit/runtime.js?v=red-witness-r4';
import {createMuscleRig} from '../assets/robot-assembly/muscles/runtime.js';
const $=id=>document.getElementById(id),base='../assets/robot-assembly/',muscleBase=base+'muscles/',helmetRoot='../assets/helmet-lab/',stage=$('stage'),loader=new GLTFLoader();
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#283c46');scene.fog=new T.Fog('#283c46',7,17);const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.65;
scene.add(new T.HemisphereLight(0xdceef4,0x60727a,1.7));const key=new T.DirectionalLight(0xffedd3,3);key.position.set(2.5,4,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:12});key.shadow.bias=-.00025;key.shadow.normalBias=.002;scene.add(key);const fill=new T.DirectionalLight(0xaad6ed,1.5);fill.position.set(-3,2,-2);scene.add(fill);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x2c404a,roughness:.93,metalness:.1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(10,100,0x415660,0x334852);grid.position.y=-.006;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const camera=new T.OrthographicCamera(-1,1,1,-1,.01,50);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minZoom=.35;controls.maxZoom=8;controls.maxPolarAngle=Math.PI*.95;
let model,rig,manifest,entry,muscleModel,muscleRig,muscleManifest,muscleEntry,helmetModel,helmetFit,helmetManifest,helmetEntry,helmetBase,helmetManifests={},loadToken=0,view='hero',playing=false,time=0,modeActive=false,extent=2.14;
const guides=new T.Group();scene.add(guides);const guideMarks=[];
for(const [y,label]of [[0,'GROUND / 0.00'],[DIM.hipY,'HIP / 0.945'],[DIM.shoulderY,'SHOULDER / 1.475'],[DIM.height,'CROWN / 1.800']]){const g=new T.BufferGeometry().setFromPoints([new T.Vector3(-.52,y,-.07),new T.Vector3(.52,y,-.07)]),m=new T.LineBasicMaterial({color:0xa29e87,transparent:true,opacity:.26});guides.add(new T.Line(g,m));const el=document.createElement('span');el.className='guide-label';el.textContent=label;$('labels').append(el);guideMarks.push({pos:new T.Vector3(.53,y,-.07),el});}
const descriptions={all:'An open thoracic cage, a defined lumbar interval and compact shoulder hardware establish the proportions before armor is added.',ribcage:'Twelve paired ribs, sternum, clavicles, scapular supports and a curved lumbar–thoracic spine. The last two rib pairs end freely.',pelvis:'Iliac arcs and open pelvic loops carry the hip bearings. The lumbar mount stays visible above the sacral block.',head:'A compact adult cranial envelope with a restrained optical strip. Both head modules share the same neck attachment.',arm:'A single upper-arm shaft and paired forearm rails, with recessed elbow bearings and exposed actuator rods.',leg:'Long thigh and shin segments with compact hip and knee bearings, a separate lateral rail and rear actuator.',hand:'The original AUREL-01 mechanism, uniformly scaled to 82%. All 23 hand axes remain available in the articulated tiers.',foot:'The original AUREL-02 prehensile foot at its source scale, with five articulated digits and a named ankle connection.'};
const closestPart=n=>{if(n.userData.helmet_fit)return 'head';if(n.userData.module)return n.userData.module.toLowerCase();while(n&&!n.name.startsWith('PART_'))n=n.parent;return n?.name.slice(5).toLowerCase();};
function dispose(root){const materials=new Set(),textures=new Set();root?.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of [n.material].flat()){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});for(const t of textures)t.dispose();for(const m of materials)m.dispose();}
function pause(){playing=false;$('play').textContent='Play';}
function selectedEntry(){const p=$('part').value,id=p==='all'?($('head').value==='sensor'?'assembly_sensor':'assembly'):p==='head'&&$('head').value==='sensor'?'head_sensor':p;return manifest.assets.find(a=>a.module===id&&a.lod===Number($('lod').value));}
function visibility(){
 if(!model)return;
 const part=$('part').value,layer=$('layer').value;
 for(const [object,enabled]of [[model,layer!=='muscles'],[muscleModel,layer!=='skeleton']])object?.traverse(n=>{if(n.isMesh){n.visible=enabled&&(part==='all'||closestPart(n)===part);for(const m of Array.isArray(n.material)?n.material:[n.material])m.wireframe=$('wire').checked;}});
 helmetModel?.traverse(n=>{if(n.isMesh){n.visible=!n.userData.helmet_fit_hidden&&(part==='all'||part==='head');n.material.wireframe=$('wire').checked;}});
 guides.visible=$('guides').checked&&part==='all'&&Number($('spread').value)<.01;floor.visible=part==='all'&&Number($('spread').value)<.01;grid.visible=floor.visible;$('labels').hidden=!guides.visible;
 $('part-label').textContent=(part==='all'?'COMPLETE ASSEMBLY':$('part').selectedOptions[0].textContent.toUpperCase())+' / '+(layer==='both'?'MUSCLE LAYER':layer.toUpperCase());
 $('description').textContent=descriptions[part]||descriptions[part.split('_')[0]];
 const e=selectedEntry(),addition=part==='all'?muscleEntry:muscleEntry.modules[part],showBase=layer!=='muscles',showLayer=layer!=='skeleton'&&!!addition;
 const showHelmet=!!helmetModel&&(part==='all'||part==='head'),removed=showHelmet&&showBase?helmetFit.body_removed_cost.triangles:0,triangles=(showBase?e.triangles:0)-removed+(showLayer?addition.triangles:0)+(showHelmet?helmetFit.visible_cost.triangles:0),calls=(showBase?e.draw_calls:0)+(showLayer?addition.draw_calls:0)+(showHelmet?helmetFit.visible_cost.draw_calls:0),bytes=(showBase?e.bytes:0)+(showLayer?muscleEntry.bytes:0)+(showHelmet?helmetEntry.bytes:0);
 $('metrics').innerHTML=`<div><b>${triangles.toLocaleString()}</b><small>Triangles</small></div><div><b>${calls}</b><small>Draws</small></div><div><b>${Math.round(bytes/1024)}</b><small>KiB / files</small></div>`;
 $('download').href=base+e.file;$('download').textContent=`Download ${part==='all'?'skeleton':part.replace('_',' ')} GLB ↓`;
 $('download-muscles').href=muscleBase+muscleEntry.file;
 const animationLod=Number($('lod').value)===0?0:1;
 $('download-character').href=base+`animation-kit/models/aurel03_${$('head').value}_lod${animationLod}.glb`;
 $('download-character').textContent=`${helmetModel?'Original robot':'Complete robot'} GLB / ${animationLod===0?'Master':'Game'} ↓`;
 $('status').textContent=`AUREL-03 / ${Number($('lod').value)===0?'Detailed master':Number($('lod').value)===1?'Articulated game':'Static rest pose'} / ${layer==='both'?'Skeleton + muscles':layer==='muscles'?'Muscles only':'Original skeleton'}`;
 $('download-kit').textContent=helmetModel?'Original animation kit · ZIP ↓':'Download animation kit · ZIP ↓';$('helmet-download').hidden=!helmetModel;$('helmet-download').href=helmetEntry?helmetBase+helmetEntry.file+'?r='+helmetManifest.revision:'#';$('helmet-download').textContent=`Download original ${helmetFit?.label.replace(' / Carbon','')||'helmet'} GLB ↓`;$('helmet-note').textContent=helmetModel?`${helmetFit.label} / ${Math.round(helmetFit.scale[0]*100)}% of standalone size. Replaces the original head and uses AUREL’s neck joint. Source downloads remain separate.`:'Choose a helmet head or inspect the original AUREL head.';$('head').disabled=!!helmetModel;
 $('status').textContent+=helmetModel?' + '+helmetFit.label:'';
 $('layer-note').textContent=layer==='skeleton'?'Original skeleton. The muscle layer is hidden.':part!=='all'&&!addition?'This module retains its original mechanism; no muscle sheath is added.':`${muscleManifest.muscles.length} muscle bundles / charcoal sheaths and braided tendons. Separate, removable geometry.`;
}
function update(){
 if(!rig)return;const spread=Number($('spread').value);rig.pose({spread,time,articulation:modeActive&&$('motion').value==='inspection'?1:0,openHands:Number($('hands').value)});muscleRig?.update({spread});
 $('spread-value').textContent=Math.round(spread*100)+'%';$('hands-value').textContent=Math.round(Number($('hands').value)*100)+'%';$('time').value=time;$('time-label').textContent=`${time.toFixed(1)} / ${MOTIONS[$('motion').value].duration_s} s`;visibility();
}
function visibleBounds(){
 const box=new T.Box3();for(const root of [model,muscleModel]){root?.updateMatrixWorld(true);root?.traverse(n=>{if(n.isMesh&&n.visible){n.computeBoundingBox?.();box.union(new T.Box3().setFromObject(n,true));}});}return box;
}
function setView(v=view){if(!model)return;view=v;const p=$('part').value,box=visibleBounds(),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),all=p==='all',wide=Number($('spread').value)>.1;extent=all?(wide?3.35:2.18):Math.max(size.y*1.45,size.x*1.7,size.z*1.8,.22);if(all)center.set(0,wide?.99:.92,0);if(v==='head'&&helmetModel){const b=new T.Box3().setFromObject(helmetModel,true);center.copy(b.getCenter(new T.Vector3()));center.y-=.065;extent=.64;}controls.target.copy(center);const dir=v==='front'?[0,0,4]:v==='side'?[4,0,0]:v==='back'?[0,0,-4]:[2.5,.85,4];camera.position.copy(center).add(new T.Vector3(...dir));camera.zoom=1;camera.lookAt(center);controls.update();resize();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));}
function resize(){const w=stage.clientWidth,h=stage.clientHeight,a=w/h;renderer.setSize(w,h);const e=extent/Math.min(1,a/.75);camera.left=-e*a/2;camera.right=e*a/2;camera.top=e/2;camera.bottom=-e/2;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);
async function load(){
 window.anatomyLab.ready=false;const token=++loadToken;pause();$('loading').hidden=false;
 try{
  const lod=Number($('lod').value),helmetId=$('helmet').value;entry=manifest.assets.find(a=>a.module===($('head').value==='sensor'?'assembly_sensor':'assembly')&&a.lod===lod);muscleEntry=muscleManifest.assets.find(a=>a.lod===lod);
  const selectedManifest=helmetManifests[helmetId],selectedHelmet=selectedManifest?.assets.find(a=>a.lod===lod),selectedBase=helmetRoot+helmetId+'/';const [g,m,h]=await Promise.all([loader.loadAsync(base+entry.file),loader.loadAsync(muscleBase+muscleEntry.file),selectedHelmet?loader.loadAsync(selectedBase+selectedHelmet.file+'?r='+selectedManifest.revision):Promise.resolve(null)]);
  if(token!==loadToken){dispose(g.scene);dispose(m.scene);dispose(h?.scene);return;}
  for(const old of [model,muscleModel])if(old){old.removeFromParent();dispose(old);}
  helmetManifest=selectedManifest;helmetEntry=selectedHelmet;helmetBase=selectedBase;model=g.scene;muscleModel=m.scene;scene.add(model,muscleModel);
  for(const object of [model,muscleModel])object.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;n.frustumCulled=false;}});
  rig=createRig(model);muscleRig=createMuscleRig(muscleModel,model);helmetModel=h?.scene||null;helmetFit=helmetModel?attachHelmet(model,helmetModel,helmetId):null;
  for(const id of ['spread','play','time','motion','hands','exploded'])$(id).disabled=rig.static;$('part').disabled=rig.static;
  if(rig.static){$('part').value='all';$('spread').value=0;time=0;modeActive=false;}
  update();setView();$('loading').hidden=true;window.anatomyLab.ready=true;
 }catch(e){$('loading').textContent='Could not load the model: '+e.message;console.error(e);}
}
$('lod').onchange=load;
$('helmet').onchange=async()=>{const url=new URL(location.href);url.searchParams.set('helmet',$('helmet').value);history.replaceState(null,'',url);await load();};
$('part').onchange=()=>{pause();modeActive=false;if($('layer').value==='muscles'&&!muscleEntry.modules[$('part').value]&&$('part').value!=='all')$('layer').value='both';update();setView();};
$('layer').onchange=()=>{if($('layer').value==='muscles'&&!muscleEntry.modules[$('part').value]&&$('part').value!=='all')$('part').value='all';update();setView();};
$('head').onchange=async()=>{const url=new URL(location.href);url.searchParams.set('head',$('head').value);history.replaceState(null,'',url);await load();};$('wire').onchange=visibility;$('guides').onchange=visibility;
for(const id of ['spread','hands'])$(id).oninput=()=>{pause();modeActive=false;update();if(id==='spread')setView();};
function setSpread(value){pause();modeActive=false;$('spread').value=value;$('part').value='all';update();setView();$('assembled').setAttribute('aria-pressed',value===0);$('exploded').setAttribute('aria-pressed',value===1);}
$('assembled').onclick=()=>setSpread(0);$('exploded').onclick=()=>setSpread(1);$('reset').onclick=()=>{time=0;$('hands').value=0;setSpread(0);};
$('motion').onchange=()=>{pause();time=0;modeActive=false;$('time').max=MOTIONS[$('motion').value].duration_s;$('spread').value=0;update();setView();};
function seek(t){time=t;modeActive=true;if($('motion').value==='assembly')$('spread').value=assemblySpread(t);update();}
$('time').oninput=()=>{pause();seek(Number($('time').value));setView();};$('play').onclick=()=>{if(playing){pause();return;}$('part').value='all';modeActive=true;playing=true;$('play').textContent='Pause';if($('motion').value==='assembly')$('spread').value=assemblySpread(time);update();setView();if($('motion').value==='assembly'){extent=3.35;resize();}};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen();$('photo').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=`aurel03-${$('part').value}.png`;a.href=renderer.domElement.toDataURL();a.click();};
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(playing){const d=MOTIONS[$('motion').value].duration_s;seek((time+dt*Number($('speed').value))%d);}controls.update();renderer.render(scene,camera);if(guides.visible)for(const{pos,el}of guideMarks){const a=pos.clone().project(camera),b=pos.clone();b.x*=-1;b.project(camera);const v=a.x>b.x?a:b;el.style.left=Math.min(stage.clientWidth-100,(v.x*.5+.5)*stage.clientWidth+12)+'px';el.style.top=(-v.y*.5+.5)*stage.clientHeight+'px';}});
window.anatomyLab={ready:false,get model(){return model;},get rig(){return rig;},get muscleModel(){return muscleModel;},get muscleRig(){return muscleRig;},get helmetModel(){return helmetModel;},get helmetFit(){return helmetFit;},get scene(){return scene;},get renderer(){return renderer;},get camera(){return camera;},seek,setView,update,visibleBounds};
const query=new URLSearchParams(location.search),requestedHelmet=query.get('helmet');$('helmet').value=requestedHelmet==='none'?'none':Object.hasOwn(HELMET_FITS,requestedHelmet)?requestedHelmet:DEFAULT_HELMET;if($('helmet').value!=='none'){$('head').value='sensor';$('guides').checked=false;}if(['frame','sensor'].includes(query.get('head')))$('head').value=query.get('head');
const requestedLayer=query.get('layer');if(['skeleton','both','muscles'].includes(requestedLayer))$('layer').value=requestedLayer;
try{const read=path=>fetch(path+'manifest.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});[manifest,muscleManifest]=await Promise.all([base,muscleBase].map(read));await Promise.all(Object.keys(HELMET_FITS).map(async id=>{helmetManifests[id]=await read(helmetRoot+id+'/');}));await load();}catch(e){$('loading').textContent=e.message;console.error(e);}
