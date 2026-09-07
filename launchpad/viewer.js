import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),stage=$('stage');
const scene=new T.Scene();scene.background=new T.Color('#142129');scene.fog=new T.Fog('#142129',180,420);
const camera=new T.PerspectiveCamera(38,1,.05,180),renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.prepend(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.49;
scene.add(new T.HemisphereLight(0xe5f6ff,0x4f6460,2));const light=new T.DirectionalLight(0xfff4df,3.5);light.position.set(-30,65,35);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:.1,far:180});light.shadow.bias=-.00015;light.shadow.normalBias=.04;scene.add(light);
const fill=new T.DirectionalLight(0x90c9e4,1);fill.position.set(9,5,-7);scene.add(fill);
const ground=new T.Mesh(new T.PlaneGeometry(600,600),new T.MeshStandardMaterial({color:0x1e3036,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(100,100,0x476267,0x2c434b);grid.position.y=-.018;scene.add(grid);
// Fixed 1.8 m worker makes the machine's meter scale visible in every state.
const worker=new T.Group();worker.position.set(-11,0,8);scene.add(worker);
const suit=new T.MeshStandardMaterial({color:0xe6b05b,roughness:.7});
const helmet=new T.MeshStandardMaterial({color:0xdbe2d6,roughness:.5});
function workerPart(size,position,material=suit){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.position.set(...position);m.castShadow=true;worker.add(m);}
workerPart([.46,.58,.28],[0,1.16,0]);workerPart([.36,.3,.32],[0,1.65,0],helmet);
for(const x of [-.15,.15]){workerPart([.17,.8,.19],[x,.5,0],helmet);workerPart([.14,.58,.18],[x*1.9,1.14,0]);}
const neutral=new T.MeshStandardMaterial({color:0xbac5bf,roughness:.7});
let catalog=[],current=null,serial=0,playing=true;
const loader=new GLTFLoader();
function fit(front=false){if(!current)return;const box=new T.Box3();current.group.traverse(o=>{if(o.isMesh&&!o.userData.overlay)box.union(new T.Box3().setFromObject(o));});const sphere=box.getBoundingSphere(new T.Sphere());orbit.target.copy(sphere.center);const angle=Math.min(T.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect));const distance=sphere.radius/Math.sin(angle)*1.15;camera.position.copy(sphere.center).add(new T.Vector3(front?0:.9,front?.05:.4,front?1:1).normalize().multiplyScalar(distance));camera.far=Math.max(200,distance*4);camera.updateProjectionMatrix();orbit.update();}
function dispose(item){if(!item)return;item.mixer?.stopAllAction();item.mixer?.uncacheRoot(item.group);scene.remove(item.group);const geometries=new Set(),materials=new Set();item.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.userData.original||o.material].flat())if(m&&m!==neutral)materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
function overlays(item){item.marks=new T.Group();for(const s of item.entry.sockets){item.marks.add(new T.ArrowHelper(new T.Vector3(...s.normal),new T.Vector3(...s.position_m),.7,s.available?0x63edca:0xfb856a,.18,.1));}item.bounds=new T.Group();for(const c of item.entry.colliders){const wire=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(...c.size_m)),new T.LineBasicMaterial({color:0x70b5e7,depthTest:false,transparent:true,opacity:.7}));wire.position.fromArray(c.center_m);item.bounds.add(wire);}item.group.add(item.marks,item.bounds);}
function appearance(){if(!current)return;current.marks.visible=$('sockets').checked;current.bounds.visible=$('colliders').checked;current.group.traverse(o=>{if(o.userData.original)o.material=$('clay').checked?neutral:o.userData.original;});}
function showTime(){const time=current?.action?current.action.time:0;$('timeline').value=time;$('time').textContent=time.toFixed(1)+' s';}
async function load(){const ticket=++serial;window.launchpadReady=false;const entry=catalog.find(a=>a.family===$('asset').value&&a.damage_level===+$('damage').value);$('status').textContent='Loading module…';let item;
try{const gltf=await loader.loadAsync('../assets/launchpad/'+entry.file);item={group:gltf.scene,entry};if(ticket!==serial){dispose(item);return;}item.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.original=o.material;}});if(gltf.animations.length){item.mixer=new T.AnimationMixer(item.group);item.action=item.mixer.clipAction(gltf.animations[0]);item.action.play();item.duration=gltf.animations[0].duration;}$('motionPanel').hidden=!item.action;$('timeline').max=item.duration||8;overlays(item);dispose(current);current=item;scene.add(item.group);appearance();fit();showTime();$('triangles').textContent=entry.triangles.toLocaleString();$('plot').textContent=entry.plot_m.join(' × ')+' m';$('description').textContent=entry.description;$('status').textContent=entry.name+' / '+entry.state;$('download').href='../assets/launchpad/'+entry.file;window.launchpadKit={current,catalog,scene,camera,orbit};window.launchpadReady=true;}catch(e){if(item)dispose(item);$('status').textContent='Load failed: '+e.message;console.error(e);}}
for(const id of ['asset','damage'])$(id).onchange=load;for(const id of ['sockets','colliders','clay'])$(id).onchange=appearance;
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('rewind').onclick=()=>{current?.mixer?.setTime(0);showTime();};
$('timeline').oninput=()=>{playing=false;$('play').textContent='Play';current?.mixer?.setTime(+$('timeline').value);$('time').textContent=(+$('timeline').value).toFixed(1)+' s';};
$('reset').onclick=()=>fit();$('front').onclick=()=>fit(true);
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);fit();}).observe(stage);
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(current?.mixer&&playing){current.mixer.update(dt*+$('speed').value);showTime();}orbit.update();renderer.render(scene,camera);});
try{const response=await fetch('../assets/launchpad/manifest.json');if(!response.ok)throw Error('Manifest unavailable');catalog=(await response.json()).assets;$('asset').replaceChildren(...catalog.filter(a=>a.damage_level===0).map(a=>new Option(a.name,a.family)));await load();}catch(e){$('status').textContent=e.message;console.error(e);}

for(const button of document.querySelectorAll("[data-phase]"))button.onclick=()=>{if(!current?.mixer)return;playing=false;$("play").textContent="Play";current.mixer.setTime(+button.dataset.phase);showTime();};
