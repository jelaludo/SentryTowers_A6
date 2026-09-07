import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),stage=$('stage');
const scene=new T.Scene();scene.background=new T.Color('#142129');
const camera=new T.PerspectiveCamera(38,1,.05,500),renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.prepend(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.49;
scene.add(new T.HemisphereLight(0xe5f6ff,0x4f6460,2));
const light=new T.DirectionalLight(0xfff4df,3.5);light.position.set(-30,65,35);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-75,right:75,top:55,bottom:-55,near:.1,far:200});light.shadow.normalBias=.035;scene.add(light);
const fill=new T.DirectionalLight(0x90c9e4,1);fill.position.set(20,10,-20);scene.add(fill);
const ground=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshStandardMaterial({color:0x1e3036,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(200,200,0x476267,0x2c434b);grid.position.y=-.018;scene.add(grid);
const neutral=new T.MeshStandardMaterial({color:0xbac5bf,roughness:.7});
const loader=new GLTFLoader();let catalog=[],items=[],serial=0,playing=true,time=0;
const title=e=>e.source_family==='hugin_launchpad'?'HUGIN':'Stålheart';
function dispose(item){item.mixer?.stopAllAction();item.mixer?.uncacheRoot(item.group);scene.remove(item.group);const meshes=new Set(),materials=new Set();item.group.traverse(o=>{if(o.geometry)meshes.add(o.geometry);for(const m of [o.userData.original||o.material].flat())if(m&&m!==neutral)materials.add(m);});meshes.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
function fit(front=false){
 if(!items.length)return;const b=new T.Box3();for(const item of items)b.union(new T.Box3().setFromObject(item.group,true));const center=b.getCenter(new T.Vector3());
 const direction=new T.Vector3(front?0:.6,front?.08:.4,1).normalize();const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize();const up=new T.Vector3().crossVectors(direction,right);
 const tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;let distance=0;
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new T.Vector3(x,y,z).sub(center);distance=Math.max(distance,v.dot(direction)+Math.max(Math.abs(v.dot(right))/tanH,Math.abs(v.dot(up))/tanV));}
 orbit.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance*1.12);camera.far=Math.max(500,distance*4);camera.updateProjectionMatrix();orbit.update();
}
function appearance(){for(const item of items)item.group.traverse(o=>{if(o.userData.original)o.material=$('clay').checked?neutral:o.userData.original;});}
function showTime(){$('timeline').value=time;$('time').textContent=time.toFixed(1)+' s';}
function pose(){for(const item of items)item.mixer?.setTime(time);showTime();}
async function load(){
 const ticket=++serial;window.gameReady=false;$('status').textContent='Loading assets…';const families=$('asset').value==='both'?['hugin_launchpad','terraformer_3000']:[$('asset').value];
 const entries=families.map(f=>catalog.find(e=>e.source_family===f&&e.damage_level===+$('damage').value));const quality=$('quality').value;
 const results=await Promise.allSettled(entries.map(async(e)=>{const url=quality==='game'?'../assets/game-ready/'+e.file:'../assets/game-ready/'+e.source_file;const gltf=await loader.loadAsync(url);const item={group:gltf.scene,entry:e,url};item.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.original=o.material;}});if(gltf.animations.length){item.mixer=new T.AnimationMixer(item.group);item.mixer.clipAction(gltf.animations[0]).play();}return item;}));
 const loaded=results.filter(r=>r.status==='fulfilled').map(r=>r.value);const failed=results.find(r=>r.status==='rejected');
 if(ticket!==serial||failed){loaded.forEach(dispose);if(failed&&ticket===serial)$('status').textContent='Load failed: '+failed.reason.message;return;}
 items.forEach(dispose);items=loaded;items.forEach((item,i)=>{item.group.position.x=items.length===2?(i===0?-24:24):0;scene.add(item.group);});
 appearance();pose();fit();$('motionPanel').hidden=!items.some(i=>i.mixer);
 const rows=items.map(({entry:e})=>`<tr><td>${title(e)}</td><td>${(quality==='game'?e.triangles:e.source_triangles).toLocaleString()}</td><td>${quality==='game'?e.draw_calls:e.source_draw_calls}</td></tr>`).join('');
 $('stats').innerHTML='<table><thead><tr><th>Asset</th><th>Triangles</th><th>Draws*</th></tr></thead><tbody>'+rows+'</tbody></table>';
 $('downloads').replaceChildren(...items.flatMap(item=>{const a=document.createElement('a');a.href=item.url;a.download='';a.textContent='Download '+title(item.entry)+' GLB';const b=document.createElement('a');const kit=item.entry.source_family==='hugin_launchpad'?'launchpad':'terraformer';b.href='../source/blender/a6-'+kit+(quality==='game'?'-game':'')+'.blend';b.download='';b.textContent=title(item.entry)+' / editable Blender';return[a,b]}));
 $('description').textContent=quality==='game'?'Reduced geometry with original animation, pivots, material palette and destruction states. *Draws counts mesh material batches before shadow passes.':'Detailed source geometry for comparison. Switch to Game to inspect the reduced versions at the same scale.';
 $('status').textContent=items.map(i=>title(i.entry)).join(' + ')+' / '+(quality==='game'?'Game ~40K':'Detailed')+' / '+entries[0].state;
 window.gameKit={items,catalog,scene,camera,orbit,quality};window.gameReady=true;
}
for(const id of ['asset','quality','damage'])$(id).onchange=load;
$('clay').onchange=appearance;$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('rewind').onclick=()=>{time=0;pose();};$('timeline').oninput=()=>{playing=false;$('play').textContent='Play';time=+$('timeline').value;pose();};
$('front').onclick=()=>fit(true);$('reset').onclick=()=>fit();
new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);fit();}).observe(stage);
const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(playing&&items.some(i=>i.mixer)){time=(time+dt)%20;pose();}orbit.update();renderer.render(scene,camera);});
try{const r=await fetch('../assets/game-ready/manifest.json');if(!r.ok)throw Error('Manifest unavailable');catalog=(await r.json()).assets;await load();}catch(e){$('status').textContent=e.message;console.error(e);}
