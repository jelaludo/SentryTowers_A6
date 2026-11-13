import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRig} from '../assets/red-witness/runtime.js';
import {loadRedWitnessShowcase} from '../assets/red-witness-action-showcase/red-witness-showcase.js';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/red-witness/',loader=new GLTFLoader();
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#303a3a');const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.035).texture;scene.environmentIntensity=.7;pmrem.dispose();
scene.add(new T.HemisphereLight(0xe8ece2,0x414846,.9));const key=new T.DirectionalLight(0xfff2dd,2.5);key.position.set(2,4,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:10});key.shadow.normalBias=.002;scene.add(key);const rim=new T.DirectionalLight(0xbbd7db,1.5);rim.position.set(-2,3,-2);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x263132,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
const camera=new T.OrthographicCamera(-2,2,2,-2,.01,50),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotateSpeed=.65;controls.minZoom=.5;controls.maxZoom=6;
const ruler=new T.Group();ruler.name='VIEWER_METRE_SCALE';scene.add(ruler);const lines=[];for(let y=0;y<=2.001;y+=.1)lines.push(-.72,y,0,-.72+(Math.round(y*10)%5===0?.08:.035),y,0);lines.push(-.72,0,0,-.72,2,0);const rg=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(lines,3));ruler.add(new T.LineSegments(rg,new T.LineBasicMaterial({color:0x87948a,transparent:true,opacity:.55})));
for(const y of [0,1,2]){const c=document.createElement('canvas');c.width=128;c.height=40;const ctx=c.getContext('2d');ctx.fillStyle='#b6c1b7';ctx.font='22px monospace';ctx.fillText(y+' m',10,29);const texture=new T.CanvasTexture(c),sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(.25,.078,1);sprite.position.set(-.88,y,0);ruler.add(sprite);}
const grid=new T.GridHelper(100,100,0x52625c,0x364340);grid.position.y=-.001;grid.visible=false;scene.add(grid,key.target);
const clay=new T.MeshStandardMaterial({color:0xaaa99e,roughness:.7}),original=new WeakMap();
const actionBase=new URL('../assets/red-witness-action-showcase/',import.meta.url);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let model,rig,entry,manifest,comparison,inspectionModel,inspectionEntry,showcase,showcasePending;
let token=0,extent=2.65,view='hero',activeMode=null,manual=false,last=performance.now(),inspectionLOD='1';
const lastFocus=new T.Vector3(),focus=new T.Vector3(),delta=new T.Vector3(),travelFocus=new T.Vector3();
if(new URLSearchParams(location.search).get('mode')==='inspect')$('mode').value='inspect';
const isActions=()=>activeMode==='actions';
function restoreMaterials(root){root?.traverse(n=>{if(n.isMesh&&original.has(n))n.material=original.get(n);});}
function dispose(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();restoreMaterials(root);
 root?.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])materials.add(m);});
 for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
 for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();root?.removeFromParent();
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight,a=w/h,e=extent*(innerWidth<=740?1.12:1)/Math.min(1,a/.72);renderer.setSize(w,h);camera.left=-e*a/2;camera.right=e*a/2;camera.top=e/2;camera.bottom=-e/2;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);
function actorFocus(){
 focus.set(0,0,0);
 if(isActions()&&showcase){showcase.root.updateMatrixWorld(true);const node=showcase.root.getObjectByName(view==='head'?'HEAD':'MOTION');node.getWorldPosition(focus);if(view!=='head')focus.y=0;}
 return focus;
}
function follow(){
 const next=actorFocus();delta.copy(next).sub(lastFocus);camera.position.add(delta);controls.target.add(delta);lastFocus.copy(next);
 travelFocus.set(0,0,0);if(isActions())showcase.root.getObjectByName('MOTION').getWorldPosition(travelFocus);const {x,z}=travelFocus;
 key.position.set(2+x,4,3+z);key.target.position.set(x,0,z);key.target.updateMatrixWorld();rim.position.set(-2+x,3,-2+z);
 ruler.position.set(x+(innerWidth<=740?1.45:0),0,z);if(comparison)comparison.position.set(x+(isActions()?1.15:1.05),0,z);
}
function setView(next=view){
 view=next;const compare=$('compare').checked;
 extent=view==='head'?(isActions()?.85:.66):isActions()?3.6:compare?3.15:2.65;
 const target=actorFocus().clone();target.x+=compare&&view!=='head'?.45:0;target.y+=view==='head'?(isActions()?.14:1.9):isActions()?1.4:1.08;
 const dir=view==='front'?[0,0,4]:view==='side'?[4,0,0]:view==='rear'?[-1,.3,-4]:[2.5,.5,4];
 camera.position.copy(target).add(new T.Vector3(...dir));controls.target.copy(target);lastFocus.copy(actorFocus());camera.zoom=1;controls.update();follow();resize();
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
}
function appearance(){
 model?.traverse(n=>{if(n.isMesh){if(!original.has(n))original.set(n,n.material);n.material=$('clay').checked?clay:original.get(n);n.material.wireframe=$('wire').checked;n.castShadow=n.receiveShadow=true;}});
 ruler.visible=$('ruler').checked;grid.visible=isActions()&&$('travel').checked;
}
function update(){
 if(!model)return;
 if(!isActions()){rig.pose({headYaw:T.MathUtils.degToRad(+$('head').value),armLift:T.MathUtils.degToRad(+$('arms').value)});for(const id of ['head','arms'])$(id+'-value').textContent=$(id).value+'°';}
 appearance();
}
function clipEntry(){return showcase?.manifest.clips.find(c=>c.name===showcase.current);}
function actionTime(){return showcase?showcase.mixer.clipAction(showcase.clips.get(showcase.current)).time:0;}
function syncActionControls(){
 if(!showcase||!isActions())return;const clip=clipEntry();
 $('movement').value=clip.name;$('pause').textContent=showcase.paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(showcase.paused));
 $('sequence').setAttribute('aria-pressed',String(!!showcase.sequence));$('timeline').max=clip.duration;
 $('status').textContent=`RED WITNESS · ${clip.label.toUpperCase()} · ${showcase.sequence?'PLAY ALL':'SINGLE CLIP'}`;syncTime();
}
function syncTime(){if(!showcase||!isActions())return;const time=actionTime();$('timeline').value=time;$('time-value').textContent=`${time.toFixed(2)} / ${clipEntry().duration.toFixed(2)} s`;}
function refreshControls(){
 const actions=isActions();stage.dataset.mode=activeMode;$('action-controls').hidden=!actions;$('inspection-controls').hidden=actions;$('lod').disabled=actions;$('lod').value=actions?'1':inspectionLOD;
 for(const id of ['head','arms','reset'])$(id).disabled=actions||rig?.static;
 for(const id of ['movement','sequence','pause','restart','timeline'])$(id).disabled=!actions;
 $('metrics').innerHTML=`<div><b>${entry.triangles.toLocaleString()}</b><small>Triangles</small></div><div><b>${entry.draw_calls}</b><small>Model draws</small></div><div><b>${(entry.bytes/1048576).toFixed(2)}</b><small>MiB / file</small></div>`;
 $('download').href=actions?new URL(showcase.manifest.asset,actionBase).href:base+entry.file;
 $('download').textContent=actions?'Download animated GLB ↓':'Download selected GLB ↓';
 if(actions)syncActionControls();else{
  $('pose-note').textContent=rig.static?'Static distance silhouette. Select Game joints to inspect the moving joints.':'Rigid parts follow their joints. Muscles do not stretch; hands and feet have fixed digits. This is a posing study.';
  $('status').textContent=`RED WITNESS · ${['MASTER','GAME','STATIC DISTANCE'][entry.lod]} · 2.08 M`;
 }
}
async function ensureShowcase(){
 if(!showcasePending)showcasePending=(async()=>{
  const [actions,metadata]=await Promise.all([loadRedWitnessShowcase(actionBase,{loader}),fetch(new URL('integration-manifest.json',actionBase)).then(r=>{if(!r.ok)throw Error('Animation metadata unavailable');return r.json();})]);
  showcase=actions;showcase.root.visible=false;scene.add(showcase.root);showcase.entry=metadata.assets[0];
  $('movement').replaceChildren(...showcase.manifest.clips.map(c=>new Option(c.label,c.name)));
  showcase.onChange(syncActionControls);showcase.playSequence();showcase.setPaused(reducedMotion);return showcase;
 })().catch(error=>{showcasePending=null;throw error;});
 return showcasePending;
}
async function load(){
 const current=++token,mode=$('mode').value;window.redWitness.ready=false;$('loading').hidden=false;$('loading').textContent='Preparing Red Witness…';
 try{
  if(mode==='actions')await ensureShowcase();else{
   const selected=manifest.assets.find(a=>a.lod===+$('lod').value);inspectionLOD=String(selected.lod);
   if(inspectionEntry!==selected){const g=await loader.loadAsync(base+selected.file);if(current!==token){dispose(g.scene);return;}dispose(inspectionModel);inspectionModel=g.scene;inspectionEntry=selected;rig=createRig(inspectionModel);scene.add(inspectionModel);$('head').value=$('arms').value=0;}
  }
  if(current!==token)return;activeMode=mode;
  if(inspectionModel)inspectionModel.visible=mode==='inspect';if(showcase)showcase.root.visible=mode==='actions';
  model=mode==='actions'?showcase.root:inspectionModel;entry=mode==='actions'?showcase.entry:inspectionEntry;
  refreshControls();update();setView();$('loading').hidden=true;window.redWitness.ready=true;
 }catch(e){if(current===token){$('loading').textContent='Could not load this view: '+e.message;console.error(e);}}
}
function revealStage(){if(innerWidth<=740)stage.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});}
function startAction(all=false){if(!showcase)return;if(all)showcase.playSequence();else showcase.play($('movement').value);showcase.setPaused(false);syncActionControls();follow();revealStage();}
$('movement').onchange=()=>startAction();$('sequence').onclick=()=>startAction(true);
$('pause').onclick=()=>{showcase.setPaused(!showcase.paused);syncActionControls();};
$('restart').onclick=()=>{const all=!!showcase.sequence;startAction(all);};
$('timeline').oninput=()=>{showcase.setPaused(true);showcase.seek(+$('timeline').value);syncActionControls();follow();};
$('travel').onchange=()=>{showcase?.setCentered(!$('travel').checked);appearance();follow();};
$('compare').onchange=async()=>{
 try{if($('compare').checked&&!comparison){$('compare').disabled=true;const m=await fetch('../assets/robot-assembly/manifest.json').then(r=>r.json()),e=m.assets.find(a=>a.module==='assembly_sensor'&&a.lod===1),g=await loader.loadAsync('../assets/robot-assembly/'+e.file);comparison=g.scene;scene.add(comparison);comparison.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});}if(comparison)comparison.visible=$('compare').checked;setView();}
 catch(e){$('compare').checked=false;console.error(e);}finally{$('compare').disabled=false;}
};
$('mode').onchange=()=>{if($('mode').value==='inspect')$('lod').value=inspectionLOD;load();};$('lod').onchange=load;for(const id of ['head','arms'])$(id).oninput=update;for(const id of ['clay','wire','ruler'])$(id).onchange=appearance;
$('reset').onclick=()=>{$('head').value=$('arms').value=0;update();};$('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',controls.autoRotate);};
$('photo').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=isActions()?`red-witness-${showcase.current}.png`:'red-witness.png';a.href=renderer.domElement.toDataURL();a.click();};
$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen();document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
function advance(dt){if(isActions()&&window.redWitness.ready){showcase.update(dt*+$('speed').value);follow();syncTime();}}
window.redWitness={ready:false,get model(){return model;},get rig(){return rig;},get entry(){return entry;},get comparison(){return comparison;},get showcase(){return showcase;},get mode(){return activeMode;},scene,renderer,camera,controls,setView,update,setManual(value=true){manual=value;},advance,render(){follow();controls.update();renderer.render(scene,camera);}};
renderer.setAnimationLoop(now=>{const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!manual&&!document.hidden)advance(dt);controls.update();renderer.render(scene,camera);});
try{manifest=await fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error('Model manifest unavailable');return r.json();});await load();}catch(e){$('loading').textContent=e.message;console.error(e);}
