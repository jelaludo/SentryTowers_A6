import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader as RealLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyExtraction} from '../../assets/heptapod-extractor/runtime.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const base=new URL('../../assets/heptapod-extractor/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),source=await fs.readFile(new URL('../../heptapod-extractor/viewer.js',import.meta.url),'utf8');
const models=new Map();for(const e of manifest.assets){const b=await fs.readFile(new URL(e.file,base));models.set(e.file,(await new RealLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);}
const tb=await fs.readFile(new URL('../../assets/hover-tank/mork_hover_tank_low_d0.glb',import.meta.url));const tank=(await new RealLoader().parseAsync(tb.buffer.slice(tb.byteOffset,tb.byteOffset+tb.byteLength),'')).scene;
const elements=new Map(),defaults={lod:'1',encoding:'plain',time:'8',mode:'traffic'},requests=[];
function element(id){if(!elements.has(id))elements.set(id,{value:defaults[id]||'',checked:id==='tank',textContent:'',clientWidth:1200,clientHeight:850,prepend(){}});return elements.get(id);}
let loop,renders=0;
class Renderer{domElement={};setPixelRatio(){}setSize(){}setAnimationLoop(fn){loop=fn;}render(){renders++;}}
class Controls{target=new THREE.Vector3();update(){}addEventListener(){}}
class PMREM{fromScene(){return {texture:null};}dispose(){}}
class Loader{setMeshoptDecoder(){return this;}loadAsync(file){return new Promise((resolve,reject)=>requests.push({file,resolve,reject,done:false}));}}
const sandbox={T:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM},OrbitControls:Controls,GLTFLoader:Loader,RoomEnvironment:class{dispose(){}},MeshoptDecoder:{},applyExtraction,document:{getElementById:element,querySelectorAll:()=>[]},window:{},devicePixelRatio:2,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},fetch:async()=>({ok:true,json:async()=>manifest}),performance,console};
const startup=vm.runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',sandbox);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function resolve(r){if(r.file.includes('hover-tank/'))r.resolve({scene:clone(tank)});else{const file=r.file.split('heptapod-extractor/')[1].replace('derived/meshopt/','').replace('.meshopt.glb','.glb');r.resolve({scene:clone(models.get(file))});}r.done=true;}
async function drain(){await flush();for(const r of requests.filter(r=>!r.done))resolve(r);await flush();}
await drain();await drain();await startup;assert(renders>0);const root=()=>sandbox.window.extractorOperation.root;
assert(!root().getObjectByName('LASER_BEAM').visible);
element('mode').value='mining';element('mode').onchange();assert(root().getObjectByName('LASER_BEAM').visible);assert(!element('tank').checked);
element('tank').checked=true;element('tank').onchange();assert.equal(element('mode').value,'traffic');assert(!root().getObjectByName('LASER_BEAM').visible);
element('mode').value='walk';element('mode').onchange();element('time').value='2';element('time').oninput();root().updateMatrixWorld(true);assert(root().getObjectByName('LEG_01_CONTACT').getWorldPosition(new THREE.Vector3()).y>.6);
element('mode').value='traffic';element('mode').onchange();element('reset').onclick();root().updateMatrixWorld(true);assert(Math.abs(root().getObjectByName('LEG_01_CONTACT').getWorldPosition(new THREE.Vector3()).y)<.001);
element('lod').value='0';const old=element('lod').onchange();await flush();const older=requests.filter(r=>!r.done);element('lod').value='2';const latest=element('lod').onchange();await flush();resolve(requests.at(-1));await latest;older.forEach(resolve);await old;assert(root().getObjectByName('DISTANCE_GEOMETRY'));assert(element('mode').disabled&&element('play').disabled);
element('lod').value='1';element('encoding').value='meshopt';const next=element('encoding').onchange();await drain();await next;assert(!element('mode').disabled);assert(element('download').href.includes('.meshopt.glb'));
element('wire').checked=true;element('wire').onchange();root().traverse(o=>{if(o.isMesh)assert(o.material.wireframe);});element('clearance').checked=true;element('clearance').onchange();
element('play').onclick();loop(performance.now()+100);assert(Number(element('time').value)>0);
console.log('PASS extractor viewer: initial paint, tank/laser interlock, walking, parked reset, load race, static controls, encoding, wireframe, corridor and playback');
