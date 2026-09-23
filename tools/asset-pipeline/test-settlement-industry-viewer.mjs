import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader as RealLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyDemo,aimMirror,DEMO_DURATION} from '../../assets/settlement-industry/runtime.js';
const base=new URL('../../assets/settlement-industry/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),source=await fs.readFile(new URL('../../settlement-industry/viewer.js',import.meta.url),'utf8');
const models=new Map();for(const e of manifest.assets){const b=await fs.readFile(new URL(e.file,base));models.set(e.file,(await new RealLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);}
const elements=new Map(),defaults={view:'site',lod:'1',encoding:'plain',downloadFamily:'drill',time:'0'},requests=[],errors=[];
function element(id){if(!elements.has(id))elements.set(id,{value:defaults[id]||'',checked:false,textContent:'',clientWidth:1200,clientHeight:850,selectedOptions:[{text:'BOR-01 / Drill'}],prepend(){}});return elements.get(id);}
let loop;
class Renderer{shadowMap={};domElement={};setPixelRatio(){}setSize(){}setAnimationLoop(fn){loop=fn;}render(){}}
class Controls{target=new THREE.Vector3();update(){}}
class PMREM{fromScene(){return {texture:null};}dispose(){}}
class Loader{setMeshoptDecoder(){return this;}loadAsync(file){return new Promise((resolve,reject)=>requests.push({file,resolve,reject,done:false}));}}
const sandbox={T:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM},OrbitControls:Controls,GLTFLoader:Loader,RoomEnvironment:class{dispose(){}},MeshoptDecoder:{},applyDemo,aimMirror,DEMO_DURATION,
 document:{getElementById:element,querySelectorAll:()=>[]},window:{},devicePixelRatio:1,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},fetch:async()=>({ok:true,json:async()=>manifest}),performance,console:{error:e=>errors.push(e)}};
const startup=vm.runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',sandbox);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function resolve(r){const file=r.file.split('settlement-industry/')[1].replace('derived/meshopt/','').replace('.meshopt.glb','.glb');r.resolve({scene:models.get(file).clone(true)});r.done=true;}
async function drain(){await flush();for(const r of requests.filter(r=>!r.done))resolve(r);await flush();}
await drain();await startup;assert.equal(sandbox.window.industry.lod,1);assert.equal(element('draws').textContent,43);assert.equal(sandbox.window.industry.mirrors.length,7);
element('time').value='19';element('time').oninput();assert.equal(sandbox.window.industry.time,19);assert.equal(element('fill').textContent,'100%');
const truck=sandbox.window.industry.models.hauler;assert(Math.abs(truck.getObjectByName('CARGO_SLIDE').position.z+1.05)<1e-6);assert.equal(truck.getObjectByName('CARGO_LIFT').position.y,1.72);
element('play').onclick();loop(performance.now()+20);assert(sandbox.window.industry.time>19);element('play').onclick();
element('lod').value='0';const old=element('lod').onchange();await flush();const older=requests.filter(r=>!r.done);
element('lod').value='2';const fresh=element('lod').onchange();await flush();for(const r of requests.filter(r=>!r.done&&!older.includes(r)))resolve(r);await fresh;for(const r of older)resolve(r);await old;
assert.equal(sandbox.window.industry.lod,2);assert.equal(element('play').disabled,true);assert.equal(element('draws').textContent,11);assert.equal(element('fill').textContent,'Static');
element('lod').value='1';await element('lod').onchange();assert.equal(element('play').disabled,false);assert(sandbox.window.industry.time>19);assert.equal(element('fill').textContent,'100%');
element('reset').onclick();assert.equal(sandbox.window.industry.time,0);assert.equal(element('fill').textContent,'0%');
element('wire').checked=true;element('wire').onchange();assert(sandbox.window.industry.models.drill.getObjectByName('DRILL_CHASSIS').material.wireframe);
element('view').value='hauler';await element('view').onchange();element('time').value='19';element('time').oninput();assert.equal(sandbox.window.industry.models.hauler.position.z,0);assert.equal(sandbox.window.industry.models.hauler.getObjectByName('LIFT_TELESCOPE').position.y,1.72);
element('encoding').value='meshopt';const fail=element('encoding').onchange();await flush();const req=requests.find(r=>!r.done);req.done=true;req.reject(Error('simulated network failure'));await fail;assert.match(element('status').textContent,/simulated network failure/);
const retry=element('encoding').onchange();await drain();await retry;assert.match(element('status').textContent,/Decoded Meshopt/);assert.equal(errors.length,1);
console.log('PASS viewer startup, 7 mirrors, controls, pickup timeline, stale downloads, static tiers, time preservation, isolated truck, wireframe and load retry. DOM/WebGL mocked; GPU/browser review remains pending.');
