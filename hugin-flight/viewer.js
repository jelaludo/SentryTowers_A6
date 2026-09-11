import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),stage=$('stage');
let renderer,root,mixer,action,clips=[],playing=false;
const scene=new T.Scene();scene.background=new T.Color('#101b24');
const camera=new T.PerspectiveCamera(38,1,.05,300);camera.position.set(29,21,38);
try{renderer=new T.WebGLRenderer({antialias:true});}catch(e){$('status').textContent='3D needs WebGL. Enable hardware acceleration in your browser and reload.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','3D rocket. Drag to orbit, scroll to zoom.');
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,10,0);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=100;controls.maxPolarAngle=Math.PI*.93;
scene.add(new T.HemisphereLight(0xd5e8ff,0x56616c,2.6));
const key=new T.DirectionalLight(0xffe7c8,3.2);key.position.set(12,30,22);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:26,bottom:-15,near:.1,far:90});key.shadow.normalBias=.035;scene.add(key);
const rim=new T.DirectionalLight(0x91ddec,2);rim.position.set(-15,18,-12);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:0x17272e,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(60,60,0x49616d,0x273e48);grid.position.y=-.018;scene.add(grid);
const clock=new T.Clock();
function timeLabel(){const duration=action?.getClip().duration||0,time=action?.time||0;$('time').value=duration?time/duration:0;$('timeLabel').textContent=`${time.toFixed(2)} / ${duration.toFixed(2)} s`;}
function setPlaying(value){playing=value;$('play').textContent=value?'Pause':'Play';}
function chooseClip(autoplay=true){
  if(!mixer)return;mixer.stopAllAction();action=null;
  const clip=clips.find(c=>c.name===$('clip').value);
  if(clip){action=mixer.clipAction(clip);action.reset();action.setLoop($('loop').checked?T.LoopRepeat:T.LoopOnce,Infinity);action.clampWhenFinished=true;action.play();mixer.update(0);}
  $('play').disabled=$('restart').disabled=$('time').disabled=!action;
  setPlaying(Boolean(action)&&autoplay);$('poseName').textContent=$('clip').selectedOptions[0].textContent;timeLabel();
}
$('clip').onchange=()=>chooseClip();
$('play').onclick=()=>{if(!action)return;if(action.time>=action.getClip().duration)chooseClip();else setPlaying(!playing);};
$('restart').onclick=()=>chooseClip();
$('time').oninput=()=>{if(!action)return;setPlaying(false);action.paused=false;action.time=Number($('time').value)*action.getClip().duration;mixer.update(0);timeLabel();};
$('loop').onchange=()=>{if(action)action.setLoop($('loop').checked?T.LoopRepeat:T.LoopOnce,Infinity);};
$('grid').onchange=()=>grid.visible=$('grid').checked;
$('wireframe').onchange=()=>root?.traverse(o=>{if(o.isMesh&&!o.name.startsWith('MARKING_'))for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=$('wireframe').checked;});
const views={whole:[[29,21,38],[0,10,0]],legs:[[12,7,16],[0,3.2,0]],door:[[8,25,11],[0,19.5,0]]};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{const [position,target]=views[button.dataset.view];camera.position.fromArray(position);controls.target.fromArray(target);controls.update();for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b===button));};
// Keep the original mesh lettering until edited. Replacement labels remain proper
// textured meshes in the downloaded GLB, under the same optional MARKINGS node.
function updateMarking(){
  if(!root)return;const group=root.getObjectByName('MARKINGS');group.visible=$('markings').checked;
  const label=$('designation').value.trim();
  group.userData.text=label;
  for(const name of ['MARKING_BODY','MARKING_CARGO']){
    const mesh=root.getObjectByName(name);if(!mesh)continue;
    const h=name==='MARKING_BODY'?.469:.224;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');
    ctx.font='144px Arial';const width=ctx.measureText(label).width;
    ctx.fillStyle='#17272e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,512,100,1000);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    const w=Math.min(3.5,Math.max(.6,width/144*h*1.25));
    // Canvas contains horizontal whitespace; crop to the lettering width.
    const fraction=Math.min(1,(width+32)/1024);texture.repeat.x=fraction;texture.offset.x=(1-fraction)/2;
    mesh.geometry.dispose();if(mesh.userData.previewLabel){mesh.material.map?.dispose();mesh.material.dispose();}mesh.userData.previewLabel=true;
    mesh.geometry=new T.PlaneGeometry(w,h*1.3).rotateX(-Math.PI/2).translate(0,.018,-h/2);
    mesh.material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide});mesh.visible=Boolean(label);mesh.castShadow=false;
  }
  const asset=root.getObjectByName('SH_ROCKET');asset.userData.designation=label;asset.userData.designation_visible=group.visible;
}
$('designation').oninput=updateMarking;$('markings').onchange=()=>{root.getObjectByName('MARKINGS').visible=$('markings').checked;root.getObjectByName('SH_ROCKET').userData.designation_visible=$('markings').checked;};
$('export').onclick=async()=>{
  const button=$('export');button.disabled=true;button.textContent='Preparing model…';
  try{
    // Export a clean deployed rest pose; all authored clips remain embedded.
    const selected=$('clip').value,t=action?.time||0,resume=playing;
    setPlaying(false);mixer.stopAllAction();mixer.update(0);
    let data;
    try{data=await new GLTFExporter().parseAsync(root,{binary:true,animations:clips,onlyVisible:true});}
    finally{$('clip').value=selected;chooseClip(false);if(action){action.time=t;action.paused=false;mixer.update(0);}setPlaying(resume);timeLabel();}
    const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'})),a=document.createElement('a');a.href=url;a.download=($('designation').value.trim().replace(/[^a-z0-9_-]/gi,'_')||'rocket')+'.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('status').textContent='Downloaded 3D model with all five animations.';
  }catch(e){$('status').textContent='Could not export the model. Please reload and try again.';console.error(e);}
  finally{button.disabled=false;button.textContent='Download current 3D model';}
};
new ResizeObserver(()=>{if(!stage.clientWidth||!stage.clientHeight)return;camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}).observe(stage);
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(mixer&&playing){mixer.update(dt*Number($('speed').value));timeLabel();}controls.update();renderer.render(scene,camera);});
try{
  const gltf=await new GLTFLoader().loadAsync('../assets/sh-rocket/sh_rocket.glb');root=gltf.scene;clips=gltf.animations;
  let triangles=0;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});scene.add(root);
  mixer=new T.AnimationMixer(root);mixer.addEventListener('finished',()=>setPlaying(false));$('controls').disabled=false;chooseClip(false);
  $('stats').textContent=`${Math.round(triangles).toLocaleString()} triangles · 5 animations · 21.4 m tall`;$('status').textContent='';
}catch(e){$('status').textContent='The 3D model could not load. Check your connection and reload.';console.error(e);}
