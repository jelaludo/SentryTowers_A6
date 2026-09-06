import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),stage=$('stage');
const scene=new T.Scene();scene.background=new T.Color('#142129');scene.fog=new T.Fog('#142129',65,140);
const camera=new T.PerspectiveCamera(38,1,.05,180),renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.prepend(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.49;
scene.add(new T.HemisphereLight(0xe5f6ff,0x4f6460,2));const light=new T.DirectionalLight(0xfff4df,3.5);light.position.set(-7,13,9);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:50});light.shadow.bias=-.00015;light.shadow.normalBias=.04;scene.add(light);
const fill=new T.DirectionalLight(0x90c9e4,1);fill.position.set(9,5,-7);scene.add(fill);
const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.MeshStandardMaterial({color:0x1e3036,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.405;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(100,100,0x476267,0x2c434b);grid.position.y=-.397;scene.add(grid);
const neutral=new T.MeshStandardMaterial({color:0xbac5bf,roughness:.7});let catalog=[],instances=[],serial=0,gateTarget=null,selected='wall';
function spec(){return catalog.find(a=>a.id===`${$('asset').value}_d${$('damage').value}`);}
function reset(front=false){
 const bounds=new T.Box3();for(const i of instances)bounds.union(new T.Box3().setFromObject(i.group));
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const plot=instances[0]?.entry.plot_m||[8,8];const distance=Math.max(size.x,size.y,size.z,...plot)*1.8+3;orbit.target.copy(center);
 camera.far=Math.max(180,distance*5);camera.updateProjectionMatrix();
 camera.position.copy(center).add(new T.Vector3(front?0:.55,front?.08:.55,front?1:.82).normalize().multiplyScalar(distance));orbit.update();
}
function dispose(instance){instance.mixer?.stopAllAction();instance.mixer?.uncacheRoot(instance.group);scene.remove(instance.group);const materials=new Set();instance.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=o.userData.original||o.material;for(const item of Array.isArray(m)?m:[m])if(item!==neutral)materials.add(item);}});materials.forEach(m=>m.dispose());}
function overlays(instance){const {entry,group}=instance;const marks=new T.Group();marks.name='Socket overlays';for(const s of entry.sockets){const arrow=new T.ArrowHelper(new T.Vector3(...s.normal),new T.Vector3(...s.position_m).add(new T.Vector3(0,.05,0)),.65,s.available?0x60ecc3:0xff795c,.15,.1);marks.add(arrow);const dot=new T.Mesh(new T.SphereGeometry(.06,8,6),new T.MeshBasicMaterial({color:s.available?0x60ecc3:0xff795c,depthTest:false}));dot.position.fromArray(s.position_m);marks.add(dot);}group.add(marks);instance.marks=marks;
 const bounds=new T.Group();for(const box of entry.colliders){const wire=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(...box.size_m)),new T.LineBasicMaterial({color:box.condition==='gate_closed'?0xffb962:0x6cadfa,transparent:true,opacity:.8,depthTest:false}));wire.position.fromArray(box.center_m);wire.userData.condition=box.condition;bounds.add(wire);}group.add(bounds);instance.bounds=bounds;}
function appearance(){for(const instance of instances){instance.marks.visible=$('sockets').checked;instance.bounds.visible=$('colliders').checked;instance.bounds.children.forEach(o=>o.visible=o.userData.condition!=='gate_closed'||+$('gate').value<.99);instance.group.traverse(o=>{if(o.isMesh&&o.userData.original)o.material=$('clay').checked?neutral:o.userData.original;});}}
function gatePose(){for(const i of instances){if(i.action){i.action.time=+$('gate').value*i.action.getClip().duration;i.mixer.update(0);}}$('gateButton').textContent=+$('gate').value>.5?'Close gate':'Open gate';appearance();}
async function instantiate(entry,pos=[0,0,0],rotation=0){const gltf=await new GLTFLoader().loadAsync('../assets/research-outpost/'+entry.file),group=gltf.scene;group.position.fromArray(pos);group.rotation.y=rotation;group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.original=o.material;}});const instance={entry,group};if(gltf.animations.length){instance.mixer=new T.AnimationMixer(group);instance.action=instance.mixer.clipAction(gltf.animations[0]);instance.action.setLoop(T.LoopOnce,1);instance.action.clampWhenFinished=true;instance.action.play();instance.action.paused=true;}overlays(instance);return instance;}
async function load(){const ticket=++serial,mode=$('asset').value;selected=mode;$('status').textContent='Loading geometry…';window.baseKitReady=false;gateTarget=null;const previousMode=load.previous;load.previous=mode;
 $('damagePanel').hidden=false;$('gatePanel').hidden=!['gate','assembly'].includes(mode);$('download').hidden=mode==='assembly';
 const placement=[[spec(),[0,0,0],0]];
 const pending=await Promise.allSettled(placement.map(([entry,pos,rot])=>instantiate(entry,pos,rot)));const loaded=pending.filter(r=>r.status==='fulfilled').map(r=>r.value);if(ticket!==serial){loaded.forEach(dispose);return;}const failed=pending.find(r=>r.status==='rejected');if(failed){loaded.forEach(dispose);$('status').textContent='Load failed — '+failed.reason.message;console.error(failed.reason);return;}
 instances.forEach(dispose);instances=loaded;instances.forEach(i=>scene.add(i.group));ground.position.y=-.325;grid.position.y=ground.position.y+.008;gatePose();if(previousMode!==mode)reset();
 const triangles=instances.reduce((sum,i)=>sum+i.entry.triangles,0);$('triangles').textContent=triangles.toLocaleString();
 if(mode==='assembly'){$('plot').textContent='28 × 8 m';$('description').textContent='Gate, two wall states, corners and return walls on tiled foundations. Socket positions align exactly in the intact assembly. Destroyed walls lose their connection availability.';$('status').textContent='Connection study / wall state D'+$('damage').value;}
 else{const entry=spec();$('plot').textContent=entry.plot_m.join(' × ')+' m';$('description').textContent=entry.description;$('download').href='../assets/research-outpost/'+entry.file;$('status').textContent=entry.name+' / '+entry.state;}
 window.baseKit={instances,catalog,camera,orbit,mode};window.baseKitReady=true;
}
for(const id of ['asset','damage'])$(id).onchange=load;for(const id of ['sockets','colliders','clay'])$(id).onchange=appearance;$('gate').oninput=()=>{gateTarget=null;gatePose();};$('gateButton').onclick=()=>gateTarget=+$('gate').value>.5?0:1;$('reset').onclick=()=>reset();$('front').onclick=()=>reset(true);
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}).observe(stage);
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(gateTarget!==null){const value=+$('gate').value,step=dt/1.6;const next=Math.abs(gateTarget-value)<step?gateTarget:value+Math.sign(gateTarget-value)*step;$('gate').value=next;gatePose();if(next===gateTarget)gateTarget=null;}orbit.update();renderer.render(scene,camera);});
try{const response=await fetch('../assets/research-outpost/manifest.json');if(!response.ok)throw Error('Manifest unavailable');catalog=(await response.json()).assets;const families=catalog.filter(a=>a.damage_level===0);$('asset').replaceChildren(...families.map(a=>new Option(a.name,a.family)));await load();}catch(e){$('status').textContent=e.message;console.error(e);}
