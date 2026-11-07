import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {poseElevator} from '../assets/space-elevator/runtime.js';
const $=id=>document.getElementById(id),stage=$('stage'),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive surface station, orbital station and tether climber');
const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pm.fromScene(room,.04);room.dispose();pm.dispose();
const loader=new GLTFLoader(),manifest=await fetch('../assets/space-elevator/manifest.json').then(r=>r.json()),panes={};let ready=false,lod=1,view='pair',running=false,time=0,last=performance.now(),ticket=0;
for(const kind of ['surface','orbital','climber']){
 const scene=new T.Scene();scene.background=new T.Color(kind==='orbital'?0x3b5160:0x617783);scene.environment=environment.texture;scene.environmentIntensity=.3;scene.add(new T.HemisphereLight(0xe5f1ff,0x829198,.65));
 const sun=new T.DirectionalLight(0xffefda,2.6);sun.position.set(-55,95,70);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:230});sun.shadow.normalBias=.035;sun.shadow.bias=-.00005;scene.add(sun,sun.target);
 const camera=new T.PerspectiveCamera(36,1,.1,900),panel=$(kind+'-panel'),controls=new OrbitControls(camera,panel);controls.enableDamping=true;controls.minDistance=kind==='climber'?5:20;controls.maxDistance=400;controls.maxPolarAngle=kind==='surface'?Math.PI*.49:Math.PI;
 panes[kind]={kind,scene,camera,panel,controls,sun};
 if(kind==='surface'){
  scene.fog=new T.Fog(0x617783,180,460);
  const floor=new T.Mesh(new T.PlaneGeometry(1000,1000),new T.MeshStandardMaterial({color:0x85969c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
  const grid=new T.GridHelper(300,60,0x607d88,0x768d96);grid.position.y=-.012;grid.material.transparent=true;grid.material.opacity=.22;scene.add(grid);
 }
 if(kind!=='climber'){
  const tether=new T.Group();tether.name='VIEWER_TETHER';const low=kind==='surface'?54:-65,high=kind==='surface'?130:90;
  for(const x of [-.5075,.5075]){const cable=new T.Mesh(new T.BoxGeometry(.085,high-low,.33),new T.MeshStandardMaterial({color:0xadbfc3,metalness:.7,roughness:.4}));cable.position.set(x,(high+low)/2,0);tether.add(cable);}scene.add(tether);panes[kind].tether=tether;
 }
}
function lightMeshes(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
function dispose(root){if(!root)return;root.removeFromParent();const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.isMesh){gs.add(o.geometry);[].concat(o.material).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function info(){
 const kinds=view==='pair'?['surface','orbital']:[view];$('metrics').innerHTML=kinds.map(k=>{const a=manifest.assets.find(a=>a.module===k&&a.lod===lod);return `<b>${k[0].toUpperCase()+k.slice(1)}</b><br>${a.triangles.toLocaleString()} triangles · ${a.draw_calls} draws · ${(a.bytes/1024).toFixed(0)} KiB`;}).join('<br>');
 const a=manifest.assets.find(a=>a.module===$('module').value&&a.lod===lod);$('download').href='../assets/space-elevator/'+a.file;
 $('status').textContent=lod===2?'Static distance models. Select Game or Master to operate the mechanisms.':$('domes').checked?'Four unscaled 30 m dome plots sit beside the 60 m station plot.':'Doors and solar wings are independent. The 24-second shuttle is a local motion demonstration.';
 $('scene-note').textContent=view==='pair'?'Separate views · Orbital altitude is not shown':view==='surface'?'Surface terminal · 60 × 60 m plot':view==='orbital'?'Orbital terminal · 61.8 × 72.4 m envelope':'Climber · 8 m traction cage';
}
function fit(kind){const p=panes[kind],r=p.panel.getBoundingClientRect();if(!r.width||!r.height)return;const scale=$('domes').checked&&kind==='surface';const target=kind==='surface'?new T.Vector3(scale?-34:0,scale?20:25,0):kind==='orbital'?new T.Vector3(0,11,0):new T.Vector3(0,4,1.7);const radius=kind==='surface'?(scale?76:43):kind==='orbital'?44:6.2;const vfov=p.camera.fov*Math.PI/180,hfov=2*Math.atan(Math.tan(vfov/2)*r.width/r.height),dist=radius/Math.sin(Math.min(vfov,hfov)/2)*1.03;const direction=new T.Vector3(-.83,.54,1).normalize();if(kind==='orbital')direction.set(-.7,.65,1).normalize();p.camera.position.copy(target).addScaledVector(direction,dist);p.controls.target.copy(target);p.controls.update();}
function preset(value){if(value==='hero'){Object.keys(panes).forEach(fit);return;}for(const p of Object.values(panes)){let target=[0,p.kind==='surface'?23:p.kind==='orbital'?12:4,0],offset=[0,5,p.kind==='climber'?20:125];if(value==='top')offset=[0,p.kind==='climber'?24:135,.1];if(value==='detail'){if(p.kind==='surface'){target=[0,3.5,19];offset=[12,3.5,32];}else if(p.kind==='orbital'){target=[0,11,0];offset=[-35,-18,48];}else{target=[0,4,0];offset=[-10,3,-12];}}const narrow=Math.max(1,.9/p.camera.aspect);p.controls.target.set(...target);p.camera.position.copy(p.controls.target).add(new T.Vector3(...offset).multiplyScalar(narrow));p.controls.update();}}
function selectView(value){view=value;document.querySelector('.workspace').classList.toggle('single',view!=='pair');$('camera').value='hero';for(const p of Object.values(panes))p.panel.hidden=!(view===p.kind||view==='pair'&&p.kind!=='climber');document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));if(view!=='pair')$('module').value=view;info();resize(true);}
async function loadTier(value){const id=++ticket;ready=false;$('loading').style.display='grid';try{
 const loaded=await Promise.all(['surface','orbital','climber'].map(async kind=>{const a=manifest.assets.find(a=>a.module===kind&&a.lod===value);return [kind,(await loader.loadAsync('../assets/space-elevator/'+a.file+'?v='+a.sha256.slice(0,12))).scene.getObjectByName(a.root)];}));
 if(id!==ticket){loaded.forEach(([,r])=>dispose(r));return;}
 for(const [kind,root]of loaded){const p=panes[kind];dispose(p.root);p.root=root;p.scene.add(root);lightMeshes(root);}
 for(const kind of ['surface','orbital']){const p=panes[kind];p.climber?.removeFromParent();p.climber=panes.climber.root.clone(true);p.scene.add(p.climber);}
 lod=value;ready=true;if(lod===2){running=false;time=0;$('travel').value=0;}
 for(const id of ['play','travel','door','solar','dish'])$(id).disabled=lod===2;
 $('loading').style.display='none';info();pose();resize(true);
 }catch(error){$('loading').textContent='Could not load the models. Reload to try again.';console.error(error);}}
function pose(){if(!ready)return;const door=Number($('door').value),solar=Number($('solar').value),dish=Number($('dish').value),travel=Number($('travel').value);
 for(const p of Object.values(panes)){poseElevator(p.root,{door:p.kind==='climber'?0:door,solar,dish});p.root.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});}
 for(const kind of ['surface','orbital']){const p=panes[kind],distance=lod===2?0:travel*27;p.climber.position.set(0,kind==='surface'?55+distance:-35.2+distance,0);poseElevator(p.climber,{distance});p.tether.visible=p.climber.visible=$('tether').checked;}
 if(panes.surface.tank)panes.surface.tank.visible=$('tank').checked;
 if(panes.surface.domes)panes.surface.domes.visible=$('domes').checked;
 $('door-value').textContent=lod===2?'Closed / static':door===1?'Open':door===0?'Closed':Math.round(door*100)+'%';$('solar-value').textContent=(lod===2?0:solar)+'°';$('dish-value').textContent=(lod===2?0:dish)+'°';$('travel-value').textContent=Math.round(travel*100)+'%';$('play').textContent=running?'Pause climbers':'Run climbers';
}
function resize(refit=false){renderer.setSize(stage.clientWidth,stage.clientHeight);for(const p of Object.values(panes)){const r=p.panel.getBoundingClientRect();if(!r.width||!r.height)continue;p.camera.aspect=r.width/r.height;p.camera.updateProjectionMatrix();if(refit)fit(p.kind);}render();}
function render(){renderer.setScissorTest(false);renderer.setClearColor(0x263e48);renderer.clear();renderer.setScissorTest(true);const parent=stage.getBoundingClientRect();for(const p of Object.values(panes)){if(p.panel.hidden)continue;const r=p.panel.getBoundingClientRect(),x=r.left-parent.left,y=parent.bottom-r.bottom;renderer.setViewport(x,y,r.width,r.height);renderer.setScissor(x,y,r.width,r.height);renderer.render(p.scene,p.camera);}renderer.setScissorTest(false);}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>selectView(b.dataset.view));$('quality').onchange=()=>loadTier(Number($('quality').value));$('module').onchange=info;$('camera').onchange=()=>preset($('camera').value);
for(const id of ['door','solar','dish','tank','wire','tether'])$(id).oninput=pose;
 $('travel').oninput=()=>{running=false;time=Math.acos(1-2*Number($('travel').value))/Math.PI*12;pose();};$('play').onclick=()=>{running=!running;pose();};$('domes').onchange=()=>{pose();info();fit('surface');};$('reset').onclick=()=>{running=false;time=0;$('travel').value=0;$('door').value=1;$('solar').value=18;$('dish').value=0;pose();Object.keys(panes).forEach(fit);$('camera').value='hero';};
 $('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen();$('photo').onclick=()=>{render();const a=document.createElement('a');a.download='space-elevator-'+view+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();};
new ResizeObserver(()=>resize(true)).observe(stage);
await loadTier(1);
try{const [tank,domes]=await Promise.all([loader.loadAsync('../assets/hover-tank/mork_hover_tank_low_d0.glb'),loader.loadAsync('../assets/dome-colony/habitat_d0_lod2.glb')]);
 panes.surface.tank=tank.scene;tank.scene.position.set(0,.54,14);lightMeshes(tank.scene);panes.surface.scene.add(tank.scene);
 const group=new T.Group();for(const x of [-93,-63])for(const z of [-15,15]){const d=domes.scene.clone(true);d.position.set(x,0,z);lightMeshes(d);group.add(d);}panes.surface.domes=group;panes.surface.scene.add(group);pose();
}catch(error){console.error('Scale references could not load',error);}
function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(ready&&running&&lod<2){time=(time+dt)%24;$('travel').value=(1-Math.cos(time/24*Math.PI*2))/2;pose();}for(const p of Object.values(panes))if(!p.panel.hidden)p.controls.update();render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.elevator={get ready(){return ready;},get lod(){return lod;},get view(){return view;},panes,renderer,manifest,selectView,pose,render,loadTier,preset,setTime(t){running=false;time=t;$('travel').value=(1-Math.cos(t/24*Math.PI*2))/2;pose();},fit};
