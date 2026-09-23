import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader as RealLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyLaunch,DURATION} from '../../assets/orbital-launcher/runtime.js';
const base=new URL('../../assets/orbital-launcher/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),source=await fs.readFile(new URL('../../orbital-launcher/viewer.js',import.meta.url),'utf8');
const models=new Map();for(const e of manifest.assets){const b=await fs.readFile(new URL(e.file,base));models.set(e.file,(await new RealLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);}
const elements=new Map(),defaults={view:'complex',lod:'1',encoding:'plain',downloadFamily:'launcher',time:'0'},requests=[],errors=[];
function element(id){if(!elements.has(id))elements.set(id,{value:defaults[id]||'',checked:false,textContent:'',clientWidth:1200,clientHeight:850,selectedOptions:[{text:'BOR-01 / Drill'}],prepend(){}});return elements.get(id);}
let loop,watchdog,renderCount=0,clock=performance.now();
class Renderer{shadowMap={};domElement={};setPixelRatio(){}setSize(){}setAnimationLoop(fn){loop=fn;}render(){renderCount++;}}
class Controls{target=new THREE.Vector3();update(){}}
class PMREM{fromScene(){return {texture:null};}dispose(){}}
class Loader{setMeshoptDecoder(){return this;}loadAsync(file){return new Promise((resolve,reject)=>requests.push({file,resolve,reject,done:false}));}}
const sandbox={T:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM},OrbitControls:Controls,GLTFLoader:Loader,RoomEnvironment:class{dispose(){}},MeshoptDecoder:{},applyLaunch,DURATION,
 document:{getElementById:element,querySelectorAll:()=>[]},window:{},devicePixelRatio:1,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},fetch:async()=>({ok:true,json:async()=>manifest}),performance:{now:()=>clock},setInterval:fn=>{watchdog=fn;return 1;},clearInterval(){},console:{error:e=>errors.push(e)}};
const startup=vm.runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',sandbox);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function resolve(r){const file=r.file.split('orbital-launcher/')[1].split('?')[0].replace('derived/meshopt/','').replace('.meshopt.glb','.glb');r.resolve({scene:models.get(file).clone(true)});r.done=true;}
async function drain(){await flush();for(const r of requests.filter(r=>!r.done))resolve(r);await flush();}
await drain();await startup;assert(renderCount>0,'Initial scene paints without animation callbacks');assert.equal(sandbox.window.orbitalLauncher.lod,1);assert.equal(element('draws').textContent,15);
element('time').value='8.2';element('time').oninput();assert.equal(element('phase').textContent,'Accelerating');assert.equal(element('charge').textContent,'100%');
const get=()=>sandbox.window.orbitalLauncher.models;
assert(get().launcher.getObjectByName('LAUNCH_SLED').position.y>2.6);
element('time').value='23';element('time').oninput();assert.equal(element('deploy').textContent,'Deployed');assert.equal(get().satellite.getObjectByName('INSERTION_PLUME').scale.x,1);
element('follow').checked=true;element('follow').onchange();assert(sandbox.window.orbitalLauncher.camera.position.y>40);
element('reset').onclick();assert.equal(sandbox.window.orbitalLauncher.time,0);assert.equal(element('deploy').textContent,'Packed');assert.equal(get().satellite.getObjectByName('INSERTION_PLUME').scale.x,0);
element('play').onclick();clock+=400;watchdog();assert(sandbox.window.orbitalLauncher.time>0,'Playback survives deferred animation frames');loop(clock+20);element('play').onclick();
element('lod').value='0';const old=element('lod').onchange();await flush();const older=requests.filter(r=>!r.done);
element('lod').value='2';const fresh=element('lod').onchange();await flush();for(const r of requests.filter(r=>!r.done&&!older.includes(r)))resolve(r);await fresh;for(const r of older)resolve(r);await old;
assert.equal(sandbox.window.orbitalLauncher.lod,2);assert.equal(element('play').disabled,true);assert.equal(element('draws').textContent,2);assert.equal(element('deploy').textContent,'Packed');
element('lod').value='1';await element('lod').onchange();assert.equal(element('play').disabled,false);
await element('collector').onclick();assert.equal(sandbox.window.orbitalLauncher.view,'satellite');assert.equal(sandbox.window.orbitalLauncher.time,23);assert.equal(get().satellite.position.y,2.1);assert.equal(element('deploy').textContent,'Deployed');
element('wire').checked=true;element('wire').onchange();assert(get().satellite.getObjectByName('SATELLITE_BUS').material.wireframe);
element('encoding').value='meshopt';const fail=element('encoding').onchange();await flush();const req=requests.find(r=>!r.done);req.done=true;req.reject(Error('simulated failure'));await fail;assert.match(element('status').textContent,/simulated failure/);
const retry=element('encoding').onchange();await drain();await retry;assert.match(element('status').textContent,/Decoded Meshopt/);assert.equal(errors.length,1);
console.log('PASS launcher viewer startup, charge/release/deploy/reset, follow camera, stale downloads, static tiers, collector inspection, wireframe and load retry (DOM/WebGL mocked).');
