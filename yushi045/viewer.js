import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createYushiController} from '../assets/yushi045/runtime.js';

const $=id=>document.getElementById(id),stage=$('stage'),scene=new T.Scene();scene.background=new T.Color(0x101c19);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.prepend(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room).texture;scene.environment=environment;pmrem.dispose();room.dispose();
scene.add(new T.HemisphereLight(0xe1f4dc,0x1e302b,2.2));const key=new T.DirectionalLight(0xfff4d2,3);key.position.set(3,6,4);scene.add(key);const rim=new T.DirectionalLight(0x83e3ca,2.5);rim.position.set(-4,2,-3);scene.add(rim);
const grid=new T.GridHelper(50,50,0x35534a,0x20352e);grid.position.y=-.005;scene.add(grid);
const camera=new T.PerspectiveCamera(40,1,.05,180),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1;orbit.maxDistance=65;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let manifest,entry,asset,display,controller,ticket=0,running=false,elapsed=0,lastStatus='',loadError=null,loading=false;
let valveInstances=null,valveBase=null;const placements=[];
const query=new URLSearchParams(location.search);for(const id of ['lod','encoding','sceneMode'])if(query.has(id))$(id).value=query.get(id);
function frame(name='orbit'){
 const yard=$('sceneMode').value==='yard';const poses=yard?{orbit:[[20,18,26],[0,0,0]],front:[[0,9,32],[0,1,0]],top:[[.01,35,0],[0,0,0]],outlet:[[13,4,21],[0,1,0]]}:{orbit:[[4.5,3.4,6.2],[0,1.5,0]],front:[[0,2.1,5.3],[0,1.7,0]],top:[[.01,7,2.3],[0,1.4,0]],outlet:[[1.6,1.0,2.9],[0,.6,.4]]};camera.position.fromArray(poses[name][0]);orbit.target.fromArray(poses[name][1]);orbit.update();
}
function dispose(root){if(!root)return;const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);[].concat(o.material||[]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
function clearDisplay(){controller?.dispose();controller=null;if(display)scene.remove(display);display=null;valveInstances=null;placements.length=0;}
function compose(){
 if(!asset)return;clearDisplay();const yard=$('sceneMode').value==='yard';
 if(yard){display=new T.Group();asset.updateMatrixWorld(true);for(let z=0;z<5;z++)for(let x=0;x<5;x++)placements.push(new T.Matrix4().makeTranslation((x-2)*4.2,0,(z-2)*4.2));
  asset.traverse(object=>{if(!object.isMesh||object.name==='YUSHI_GLASS')return;const instances=new T.InstancedMesh(object.geometry,object.material,25);instances.name=object.name;placements.forEach((m,i)=>instances.setMatrixAt(i,m.clone().multiply(object.matrixWorld)));display.add(instances);if(object.name==='VALVE_HANDLE'){valveInstances=instances;valveBase=object.matrixWorld.clone();}});
 }else display=asset.clone(true);
 scene.add(display);controller=createYushiController(T,display,{fill:+$('fill').value/100,state:$('state').value,glass:$('glass').checked&&!yard});$('glass').disabled=yard||entry.lod===2;
 $('count').textContent=yard?'25':'1';$('triangles').textContent=entry.triangles.toLocaleString();$('detailNote').textContent=entry.lod===2?'Static one-draw geometry; live capacity retained, valve fixed.':yard?'Shared geometry, two opaque instanced draws; glass omitted.':'Two opaque draws plus optional inspection glass. Engine-driven capacity and valve.';applyControls();frame();
}
function applyControls(){if(!controller)return;controller.setFill(+$('fill').value/100);controller.setState($('state').value);controller.setGlass($('glass').checked&&$('sceneMode').value!=='yard');
 display.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(m=>m.wireframe=$('wire').checked);});
 if(valveInstances){const angle=$('state').value==='dispensing'?Math.PI/2:0,rotation=new T.Matrix4().makeRotationZ(angle);placements.forEach((m,i)=>valveInstances.setMatrixAt(i,m.clone().multiply(valveBase).multiply(rotation)));valveInstances.instanceMatrix.needsUpdate=true;}
}
async function load(){const serial=++ticket;loading=true;loadError=null;lastStatus='';$('status').textContent='Loading Bio-Pearl…';const next=manifest.assets.find(e=>e.lod===+$('lod').value),file=$('encoding').value==='plain'?next.file:next.meshopt_file;
 try{const loaded=await loader.loadAsync('../assets/yushi045/'+file+'?v='+next.sha256.slice(0,10));if(serial!==ticket){dispose(loaded.scene);return;}clearDisplay();dispose(asset);asset=loaded.scene;entry=next;loading=false;compose();$('bytes').textContent=((($('encoding').value==='plain'?entry.bytes:entry.meshopt_bytes)/1024).toFixed(1))+' KiB';$('download').href='../assets/yushi045/'+file;window.yushi045={asset,manifest,entry,scene,renderer,camera,get controller(){return controller;}};
 }catch(error){if(serial!==ticket)return;loading=false;loadError=error.message;$('status').textContent='Unable to load: '+error.message;console.error(error);}
}
$('lod').onchange=load;$('encoding').onchange=load;$('sceneMode').onchange=compose;
$('fill').oninput=()=>{running=false;if(+$('fill').value===0)$('state').value='empty';else if($('state').value==='empty')$('state').value='ready';applyControls();};
document.querySelectorAll('[data-fill]').forEach(b=>b.onclick=()=>{$('fill').value=b.dataset.fill;$('fill').oninput();});
$('state').onchange=()=>{running=false;if($('state').value==='empty')$('fill').value=0;applyControls();};
$('play').onclick=()=>{if(!['filling','dispensing'].includes($('state').value))$('state').value=+$('fill').value>=100?'dispensing':'filling';running=true;applyControls();};$('pause').onclick=()=>running=false;
$('glass').onchange=applyControls;$('wire').onchange=applyControls;document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>frame(b.dataset.camera));
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}).observe(stage);
frame();const clock=new T.Clock();renderer.setAnimationLoop(()=>{
 const dt=Math.min(clock.getDelta(),.05);if(running)elapsed+=dt;
 if(controller&&running&&!loading){const direction=$('state').value==='dispensing'?-1:1;const value=T.MathUtils.clamp(controller.fill+direction*dt*.065,0,1);$('fill').value=(value*100).toFixed(3);controller.setFill(value);if(value===0||value===1){running=false;$('state').value=value===0?'empty':'ready';controller.setState($('state').value);applyControls();}}
 controller?.update(elapsed);$('percent').textContent=Math.round(controller?controller.fill*100:+$('fill').value)+'%';orbit.update();renderer.render(scene,camera);$('draws').textContent=Math.max(0,renderer.info.render.calls-1);
 if(entry&&!loading&&!loadError){const state=controller?.fill===0&&$('state').value==='ready'?'empty':$('state').value,text=`Yushi045 · ${state.toUpperCase()} · ${Math.round((controller?.fill||0)*100)}% · LOD${entry.lod} · ${$('sceneMode').value==='yard'?'25 shared-fill instances':'organic binder storage'}`;if(text!==lastStatus){$('status').textContent=text;lastStatus=text;}}
});
try{const response=await fetch('../assets/yushi045/manifest.json',{cache:'no-cache'});if(!response.ok)throw new Error('Manifest unavailable');manifest=await response.json();await load();}catch(error){loadError=error.message;$('status').textContent=error.message;}
