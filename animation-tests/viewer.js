import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const $=id=>document.getElementById(id),scene=new T.Scene();scene.background=new T.Color('#17202b');
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.01,100);camera.position.set(2.8,1.8,3.7);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1,0);orbit.enableDamping=true;
scene.add(new T.HemisphereLight(0xffffff,0x536475,2.5));const key=new T.DirectionalLight(0xffffff,2.5);key.position.set(2,4,5);scene.add(key);scene.add(new T.GridHelper(8,40,0x607c84,0x2b414c));
let mixer,action,helper,model,wrapper,clips=[],paused=false,serial=0,catalog=[];
function select(){if(!mixer)return;mixer.stopAllAction();const clip=clips.find(c=>c.name===$('clip').value);if(!clip)return;action=mixer.clipAction(clip);action.reset();const loop=!['Hide','Crouch','Jump'].includes(clip.name);action.setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);action.clampWhenFinished=true;action.play();paused=false;$('pause').textContent='Pause';}
function dispose(root){const geometry=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.source.data?.close?.();t.dispose();});}
async function load(){const ticket=++serial,entry=catalog.find(c=>c.id===$('asset').value);const url=new URL(location.href);url.searchParams.set('asset',entry.id);history.replaceState(null,'',url);$('status').textContent='Loading…';try{
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(entry.file);if(ticket!==serial){dispose(gltf.scene);return;}
 if(model){mixer.stopAllAction();mixer.uncacheRoot(model);scene.remove(wrapper,helper);helper.dispose();dispose(model);}
 model=gltf.scene;clips=gltf.animations;wrapper=new T.Group();wrapper.add(model);scene.add(wrapper);
 model.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false;});
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=2/size.y;
 wrapper.scale.setScalar(scale);wrapper.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
 mixer=new T.AnimationMixer(model);mixer.timeScale=+$('speed').value;helper=new T.SkeletonHelper(model);helper.visible=$('rig').checked;scene.add(helper);
 $('clip').replaceChildren();for(const clip of clips)$('clip').add(new Option(clip.name,clip.name));$('clip').value=clips.find(c=>/idle/i.test(c.name))?.name||clips[0]?.name;select();
 const joints=new Set();let triangles=0;model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.bones.forEach(b=>joints.add(b));if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 $('status').textContent=`${clips.length} clips · ${joints.size} bones · ${Math.round(triangles).toLocaleString()} triangles`;
 $('download').href=entry.file;$('note').textContent=entry.note;$('author').textContent=entry.author;$('author').href=entry.source;$('changes').textContent=entry.changes;
 window.shelly={scene:model,mixer,clips,camera,orbit};window.characterLab={...window.shelly,id:entry.id};
 }catch(e){$('status').textContent='Load failed: '+e.message;console.error(e);}}
$('asset').onchange=load;$('clip').onchange=select;$('rig').onchange=()=>{if(helper)helper.visible=$('rig').checked;};$('speed').oninput=()=>{if(mixer)mixer.timeScale=+$('speed').value;};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Play':'Pause';};$('replay').onclick=select;
$('timeline').oninput=()=>{if(!action)return;paused=true;$('pause').textContent='Play';action.paused=false;action.time=+$('timeline').value*action.getClip().duration;mixer.update(0);};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(mixer&&!paused)mixer.update(dt);if(action)$('timeline').value=action.time/action.getClip().duration;orbit.update();renderer.render(scene,camera);});
try{const response=await fetch('catalog.json');if(!response.ok)throw Error('Cannot load character catalog');catalog=await response.json();for(const entry of catalog)$('asset').add(new Option(entry.name,entry.id));const requested=new URLSearchParams(location.search).get('asset');if(catalog.some(entry=>entry.id===requested))$('asset').value=requested;await load();}catch(e){$('status').textContent=e.message;}
