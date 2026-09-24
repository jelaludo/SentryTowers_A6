import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader as RealLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyCultivation} from '../../assets/greenhouse/runtime.js';
const base=new URL('../../assets/greenhouse/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),source=await fs.readFile(new URL('../../greenhouse/viewer.js',import.meta.url),'utf8');
const models=new Map();for(const e of manifest.assets){const b=await fs.readFile(new URL(e.file,base));models.set(e.file,(await new RealLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);}
const elements=new Map(),defaults={lod:'1',encoding:'plain',time:'3'},requests=[];
function element(id){if(!elements.has(id))elements.set(id,{value:defaults[id]||'',checked:['beam','canopy'].includes(id),textContent:'',clientWidth:1200,clientHeight:850,prepend(){}});return elements.get(id);}
let loop,renders=0;
class Renderer{domElement={};setPixelRatio(){}setSize(){}setAnimationLoop(fn){loop=fn;}render(){renders++;}}
class Controls{target=new THREE.Vector3();update(){}addEventListener(){}}
class PMREM{fromScene(){return {texture:null};}dispose(){}}
class Loader{setMeshoptDecoder(){return this;}loadAsync(file){return new Promise((resolve,reject)=>requests.push({file,resolve,reject,done:false}));}}
const sandbox={T:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM},OrbitControls:Controls,GLTFLoader:Loader,RoomEnvironment:class{dispose(){}},MeshoptDecoder:{},applyCultivation,document:{getElementById:element,querySelectorAll:()=>[]},window:{},devicePixelRatio:2,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},fetch:async()=>({ok:true,json:async()=>manifest}),performance,console};
const startup=vm.runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',sandbox);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function resolve(r){const file=r.file.split('greenhouse/')[1].replace('derived/meshopt/','').replace('.meshopt.glb','.glb');r.resolve({scene:models.get(file).clone(true)});r.done=true;}
async function drain(){await flush();for(const r of requests.filter(r=>!r.done))resolve(r);await flush();}
await drain();await startup;assert(renders>0);const root=()=>sandbox.window.greenhouseOperation.root;
assert(root().getObjectByName('IRRIGATION_MIST').visible);element('canopy').checked=false;element('canopy').onchange();assert(!root().getObjectByName('CANOPY').visible);
element('time').value='18';element('time').oninput();assert(Math.abs(root().getObjectByName('DOOR_L').position.x+1.54)<.001);
element('reset').onclick();assert.equal(root().getObjectByName('IRRIGATION_GANTRY').position.z,-2.9);assert.equal(root().getObjectByName('DOOR_R').position.x,.5);
element('lod').value='0';const old=element('lod').onchange();await flush();const older=requests.filter(r=>!r.done);element('lod').value='2';const latest=element('lod').onchange();await flush();resolve(requests.at(-1));await latest;older.forEach(resolve);await old;assert(root().getObjectByName('DISTANCE_GEOMETRY'));assert(element('canopy').disabled&&element('play').disabled);
element('lod').value='1';element('encoding').value='meshopt';const next=element('encoding').onchange();await drain();await next;assert(!element('canopy').disabled);assert(!root().getObjectByName('CANOPY').visible);assert(element('download').href.includes('.meshopt.glb'));
element('wire').checked=true;element('wire').onchange();root().traverse(o=>{if(o.isMesh)assert(o.material.wireframe);});
element('play').onclick();loop(performance.now()+100);assert.notEqual(root().getObjectByName('IRRIGATION_GANTRY').position.z,-2.9);
console.log('PASS greenhouse viewer: initial paint, canopy, harvest doors, reset, load race, tier controls, encoding, wireframe and playback');
