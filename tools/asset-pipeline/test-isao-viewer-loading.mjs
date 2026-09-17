import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';

// Exercise the real viewer module with deliberately delayed asset downloads.
// WebGL and DOM surfaces are stubbed; scene graph and animation objects are real Three.js.
const source=await fs.readFile(new URL('../../isao-birudoron/viewer.js',import.meta.url),'utf8');
const ids=['detailed','game','distance','concept'];
const assets=ids.map((id,lod)=>({id,file:id+'.glb',lod,production_lod:lod<2,static:lod===2,triangles:12,draw_calls:1,bytes:100,clips:[],animations:[]}));
const elements=new Map(),requests=[],errors=[];
const context2d={fillRect(){}};
function element(id){
  if(!elements.has(id))elements.set(id,{value:id==='model'?'detailed':'',checked:true,textContent:'',innerHTML:'',clientWidth:800,clientHeight:600,prepend(){},getContext:()=>context2d,classList:{toggle(){}}});
  return elements.get(id);
}
let loop=null,renderCount=0;
class Renderer{setPixelRatio(){}setSize(){}setAnimationLoop(callback){loop=callback;}render(){renderCount++;}}
class Loader{loadAsync(url){return new Promise((resolve,reject)=>requests.push({url,resolve,reject}));}}
class Controls{target=new THREE.Vector3();update(){}}
const window={addEventListener(){}};
const sandbox={
  T:{...THREE,WebGLRenderer:Renderer},GLTFLoader:Loader,OrbitControls:Controls,
  document:{getElementById:element,createElement:element,querySelectorAll:()=>[]},window,
  fetch:async()=>({json:async()=>({assets})}),ResizeObserver:class{observe(){}},devicePixelRatio:1,
  console:{error:e=>errors.push(e),log(){}},performance
};
const ready=vm.runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',sandbox);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const tick=()=>{assert.equal(typeof loop,'function','render loop must stay alive');loop();assert.equal(typeof loop,'function','rendering must not stop after a load race');assert.equal(errors.length,0);};
function model(){const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));return{scene,animations:[]};}
async function select(id){element('model').value=id;const done=element('model').onchange();await flush();return{done,request:requests.at(-1)};}

await flush();assert.equal(requests.length,1);
tick();element('hover').checked=false;element('hover').onchange();element('fabricate').onclick();tick();
assert.match(element('hud').innerHTML,/Loading ISAO/);
requests[0].resolve(model());await ready;tick();assert.equal(window.isaoViewer.entry.id,'detailed');assert.equal(window.isaoViewerReady,true);

const first=await select('concept');tick();
const second=await select('game');tick();
second.request.resolve(model());await second.done;tick();
const obsolete=model();let disposed=false;obsolete.scene.children[0].geometry.addEventListener('dispose',()=>disposed=true);
first.request.resolve(obsolete);await first.done;tick();
assert.equal(window.isaoViewer.entry.id,'game','stale response must not replace latest selection');assert.equal(disposed,true);

const failed=await select('distance');tick();failed.request.reject(new Error('simulated network failure'));await failed.done;
tick();assert.equal(window.isaoViewerReady,false);assert.match(element('hud').textContent,/simulated network failure/);
const retry=await select('distance');retry.request.resolve(model());await retry.done;tick();assert.equal(window.isaoViewer.entry.id,'distance');assert.equal(window.isaoViewerReady,true);

const staleFailure=await select('detailed'),concept=await select('concept');
concept.request.resolve(model());await concept.done;tick();staleFailure.request.reject(new Error('obsolete failure'));await staleFailure.done;tick();
assert.equal(window.isaoViewer.entry.id,'concept');assert.equal(window.isaoViewerReady,true);assert(!element('hud').textContent.includes('obsolete failure'));
assert(renderCount>=10);
console.log('PASS ISAO delayed startup, controls during loading, rapid switches, stale responses, failed download, retry, production/static/concept rendering.');
