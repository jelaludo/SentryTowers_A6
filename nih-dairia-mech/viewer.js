import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyPose,motions,legs} from '../assets/nih-dairia-mech/runtime.js';
const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/nih-dairia-mech/';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.20;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x142633);scene.fog=new T.FogExp2(0x142633,.025);
const pm=new T.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pm.fromScene(env).texture;env.dispose();pm.dispose();
scene.add(new T.HemisphereLight(0xd4e9ef,0x2c3640,1.7));
const key=new T.DirectionalLight(0xffead1,3.4);key.position.set(3,9,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:25});key.shadow.bias=-.00015;key.shadow.normalBias=.015;scene.add(key);
const rim=new T.DirectionalLight(0x91c9ec,2.5);rim.position.set(-6,4,-5);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x142633,roughness:.85,metalness:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(60,60,0x547180,0x304956);grid.position.y=-.009;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
const camera=new T.PerspectiveCamera(35,1,.02,150),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.3;controls.maxDistance=28;controls.maxPolarAngle=Math.PI*.495;controls.enableDamping=true;
const markerGroup=new T.Group();scene.add(markerGroup);markerGroup.visible=false;for(const leg of legs){const o=new T.Mesh(new T.TorusGeometry(.14,.012,4,24),new T.MeshBasicMaterial({color:0xe4b16b}));o.rotation.x=-Math.PI/2;markerGroup.add(o);}
let root,entry,manifest,skeleton,lod=0,encoding='plain',mode='idle',time=0,playing=false,extension=0,generation=0,last=performance.now(),view='hero',width=0,height=0,state;
$('contacts').innerHTML=legs.map(l=>`<span id="contact-${l.id}">${l.id}</span>`).join('');
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;if(width!==w||height!==h){width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();setView(view);}}
function setView(v){view=v;const close=['joint','claw'].includes(v),mobile=camera.aspect<.8,factor=mobile?1.4:1;
 const presets={hero:{p:[7.8,6.1,9.0],t:[0,.65,0]},top:{p:[0,11.8,.001],t:[0,0,0]},front:{p:[0,2.7,12.8],t:[0,.9,0]},side:{p:[12.8,2.7,0],t:[0,.9,0]},joint:{p:[2.4,2.9,4.6],t:[0,1.30,1.85]},claw:{p:[1.30,1.0,4.6],t:[0,.18,3.1]}};
 const p=presets[v]||presets.hero;controls.target.fromArray(p.t);camera.position.fromArray(p.p);if(!close)camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}
function update(){if(!root)return;state=applyPose(root,time,mode,extension);$('phase').textContent=state.phase;$('time').value=time;$('clock').textContent=time.toFixed(2)+' / '+motions[mode].duration_s+' s';$('stroke').textContent=Math.round(state.extension*580)+' mm';for(let i=0;i<6;i++){const f=state.feet?.[i];$('contact-'+legs[i].id).classList.toggle('swing',f&&!f.stance);const contact=root.getObjectByName('LEG_'+legs[i].id+'_CONTACT');if(contact){contact.getWorldPosition(markerGroup.children[i].position);markerGroup.children[i].position.y=.008;}}skeleton?.updateMatrixWorld(true);}
function dispose(r){const gs=new Set(),ms=new Set(),ss=new Set();r.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);if(o.skeleton)ss.add(o.skeleton);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ss.forEach(s=>s.dispose());}
async function load(){const token=++generation,next=Number($('lod').value),format=$('encoding').value;playing=false;$('play').textContent='Play';$('status').textContent='Loading geometry…';try{
 if(!manifest){const res=await fetch(base+'manifest.json');if(!res.ok)throw Error('Manifest HTTP '+res.status);manifest=await res.json();}
 const e=manifest.assets.find(a=>a.lod===next),file=format==='meshopt'?e.meshopt_file:e.file;const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(base+file);
 if(token!==generation){dispose(gltf.scene);return;}
 if(skeleton){scene.remove(skeleton);skeleton.dispose();}if(root){scene.remove(root);dispose(root);}
 root=gltf.scene;entry=e;lod=next;encoding=format;scene.add(root);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;o.material.wireframe=$('wire').checked;}});
 skeleton=new T.SkeletonHelper(root);skeleton.visible=$('skeleton').checked;scene.add(skeleton);
 const stat=lod===2;$('time').disabled=$('extension').disabled=$('play').disabled=stat;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=stat);
 $('download').href=base+file;$('stats').innerHTML=`<div><strong>${e.triangles.toLocaleString()}</strong><small>Triangles</small></div><div><strong>${e.draw_calls}</strong><small>Material draws</small></div><div><strong>${((format==='meshopt'?e.meshopt_bytes:e.bytes)/1024).toFixed(0)} KB</strong><small>Selected file</small></div><div><strong>${stat?'Static':'6 × 8'}</strong><small>${stat?'Distance pose':'Leg controls'}</small></div>`;
 $('status').textContent=`V1 / ${stat?'Static distance':lod===0?'Detailed master':'Articulated game tier'} / ${format==='plain'?'Plain GLB':'Decoded Meshopt'}`;update();
 }catch(e){if(token===generation)$('status').textContent='Load failed: '+e.message+' · Select a tier to retry.';}}
function selectMode(m){mode=m;time=0;playing=false;$('play').textContent='Play';$('time').max=motions[m].duration_s;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));update();}
$('lod').onchange=load;$('encoding').onchange=load;document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('play').onclick=()=>{if(!motions[mode].loop&&time>=motions[mode].duration_s)time=0;playing=!playing;last=performance.now();$('play').textContent=playing?'Pause':'Play';};
$('time').oninput=()=>{playing=false;$('play').textContent='Play';time=Number($('time').value);update();};$('extension').oninput=()=>{extension=Number($('extension').value);update();};
$('wire').onchange=()=>root?.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});$('skeleton').onchange=()=>{if(skeleton)skeleton.visible=$('skeleton').checked;};$('markers').onchange=()=>markerGroup.visible=$('markers').checked;
new ResizeObserver(resize).observe(stage);renderer.setAnimationLoop(now=>{const dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;if(playing&&lod<2){time+=dt;const s=motions[mode];if(time>=s.duration_s){if(s.loop)time%=s.duration_s;else{time=s.duration_s;playing=false;$('play').textContent='Play';}}update();}controls.update();renderer.render(scene,camera);});
window.nihDairia={get root(){return root;},get entry(){return entry;},get encoding(){return encoding;},get time(){return time;},get state(){return state;},scene,camera,renderer,selectMode,setView,scrub(t){playing=false;$('play').textContent='Play';time=t;update();}};
resize();await load();
