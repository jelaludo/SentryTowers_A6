import * as T from 'three';
import {CircularTravel} from '../workshop/circular-travel.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),stage=$('stage'),scene=new T.Scene();scene.background=new T.Color('#101b24');
const camera=new T.PerspectiveCamera(40,1,.05,100);camera.position.set(3,2.3,4.5);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=T.SRGBColorSpace;stage.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;
scene.add(new T.HemisphereLight(0xc8e6ff,0x45515b,2.5));const light=new T.DirectionalLight(0xffeccb,3);light.position.set(3,6,4);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:20});light.shadow.normalBias=.01;scene.add(light);const rim=new T.DirectionalLight(0x6bdcff,2);rim.position.set(-3,2,-4);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x1a2a30,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(20,20,0x517684,0x263c48);scene.add(grid);scene.add(new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(.85,.025,0),.9,0x68dbc4,.18,.1));
const travel=new CircularTravel();
let root,mixer,action,helper,entry,clips=[],playing=true,loadId=0;
function travelView(){const moving=$('travel').checked&&['Walk','Run'].includes($('clip').value);travel.reset(root);controls.target.set(moving?travel.radius:0,1,0);camera.position.set(moving?travel.radius+6:3,moving?3.8:2.3,moving?8:4.5);controls.update();}
const manifest=await fetch('../assets/kestrel/manifest.json').then(r=>r.json());
for(const e of manifest.assets)$('role').add(new Option(e.name,e.id));
function chooseClip(){mixer.stopAllAction();const clip=clips.find(c=>c.name===$('clip').value);action=mixer.clipAction(clip);action.reset().play();mixer.update(0);travelView();$('time').value=0;}
async function load(){const id=++loadId;$('status').textContent='Loading KESTREL…';entry=manifest.assets.find(e=>e.id===$('role').value);const gltf=await new GLTFLoader().loadAsync('../assets/kestrel/'+entry.file);if(id!==loadId)return;if(root){scene.remove(root,helper);helper.dispose();root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}root=gltf.scene;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});scene.add(root);clips=gltf.animations;mixer=new T.AnimationMixer(root);helper=new T.SkeletonHelper(root);helper.visible=$('skeleton').checked;scene.add(helper);const old=$('clip').value;$('clip').replaceChildren(...clips.map(c=>new Option(c.name,c.name)));if(clips.some(c=>c.name===old))$('clip').value=old;chooseClip();$('description').textContent=entry.description;$('stats').textContent=`${entry.triangles.toLocaleString()} triangles · ${entry.joints} joints · ${(entry.bytes/1024).toFixed(0)} KB · ${clips.length} clips`;$('download').href='../assets/kestrel/'+entry.file;$('status').textContent=entry.name+' · +Z forward';window.characterLab={root,mixer,clips,entry,travel};}
$('role').onchange=load;$('clip').onchange=chooseClip;$('skeleton').onchange=()=>helper.visible=$('skeleton').checked;$('travel').onchange=travelView;
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};$('time').oninput=()=>{playing=false;$('play').textContent='Play';action.time=Number($('time').value)*action.getClip().duration;mixer.update(0);};
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}).observe(stage);
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05)*Number($('speed').value);if(mixer&&playing){mixer.update(dt);$('time').value=action.time/action.getClip().duration;if($('travel').checked){const speed=entry.animations.find(c=>c.name===$('clip').value).preview_speed_mps;if(speed>0)travel.update(root,dt,speed);}}controls.update();renderer.render(scene,camera);});
await load();
