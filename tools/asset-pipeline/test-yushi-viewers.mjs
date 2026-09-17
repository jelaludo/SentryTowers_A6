import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader as RealLoader} from 'three/addons/loaders/GLTFLoader.js';

// Real model graph and capacity adapter; mocked DOM/WebGL/download scheduling.
// This tests control/loading behavior, not GPU shader compilation or browser FPS.
for(const family of ['yushi037','yushi045']){
 const base=new URL(`../../assets/${family}/`,import.meta.url);
 const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base),'utf8'));
 const {createYushiController}=await import(new URL('runtime.js',base));
 const source=await fs.readFile(new URL(`../../${family}/viewer.js`,import.meta.url),'utf8');
 const models=await Promise.all(manifest.assets.map(async entry=>{
  const bytes=await fs.readFile(new URL(entry.file,base));
  return (await new RealLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 }));
 const elements=new Map(),requests=[],errors=[],defaults={lod:'1',encoding:'plain',sceneMode:'single',fill:'50',state:'ready'};
 function element(id){if(!elements.has(id))elements.set(id,{value:defaults[id]||'',checked:id==='glass',textContent:'',clientWidth:800,clientHeight:600,prepend(){}});return elements.get(id);}
 let loop,renderCount=0;
 class Renderer{
  info={render:{calls:0}};setPixelRatio(){}setSize(){}setAnimationLoop(callback){loop=callback;}
  render(scene){renderCount++;let calls=0;scene.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.visible)calls++;});this.info.render.calls=calls;}
 }
 class Loader{setMeshoptDecoder(){return this;}loadAsync(url){return new Promise((resolve,reject)=>requests.push({url,resolve,reject}));}}
 class Controls{target=new THREE.Vector3();update(){}}
 class PMREM{fromScene(){return {texture:null};}dispose(){}}
 const window={addEventListener(){}};
 const sandbox={T:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM,Clock:class{getDelta(){return .05;}}},GLTFLoader:Loader,MeshoptDecoder:{},OrbitControls:Controls,RoomEnvironment:class{dispose(){}},createYushiController,
  document:{getElementById:element,querySelectorAll:()=>[]},window,URLSearchParams,location:{search:''},devicePixelRatio:1,ResizeObserver:class{observe(){}},fetch:async()=>({ok:true,json:async()=>manifest}),console:{error:error=>errors.push(error)},performance};
 const ready=vm.runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',sandbox);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const tick=()=>{assert.equal(typeof loop,'function');loop();};
 async function select(lod){element('lod').value=String(lod);const done=element('lod').onchange();await flush();return {done,request:requests.at(-1),lod};}
 async function resolve(request,lod){request.resolve({scene:models[lod].clone(true)});await flush();}
 await flush();tick();element('fill').value='100';element('fill').oninput();tick();
 await resolve(requests[0],1);await ready;tick();
 assert.equal(window[family].controller.fill,1);assert.equal(element('percent').textContent,'100%');assert.equal(element('draws').textContent,3);
 element('fill').value='50';element('fill').oninput();element('play').onclick();tick();const moving=window[family].controller.fill;assert(moving>.5);element('pause').onclick();tick();assert.equal(window[family].controller.fill,moving);
 const older=await select(0),latest=await select(2);tick();await resolve(latest.request,2);await latest.done;await resolve(older.request,0);await older.done;tick();assert.equal(window[family].entry.lod,2);assert.equal(window[family].controller.fill,moving);assert.equal(element('draws').textContent,1);
 const failed=await select(1);failed.request.reject(new Error('simulated download failure'));await failed.done;tick();assert.match(element('status').textContent,/simulated download failure/);
 const retry=await select(1);await resolve(retry.request,1);await retry.done;tick();assert.equal(window[family].entry.lod,1);
 element('sceneMode').value='yard';element('sceneMode').onchange();tick();assert.equal(element('count').textContent,'25');assert.equal(element('draws').textContent,2);assert.equal(element('glass').disabled,true);
 element('fill').value='0';element('fill').oninput();tick();assert.equal(window[family].controller.fill,0);assert.equal(element('percent').textContent,'0%');
 assert.equal(errors.length,1);assert(renderCount>=10);
 console.log('PASS',family,'startup, full/empty, flow/pause, LOD fill preservation, stale downloads, failure/retry, yard batching (mock renderer)');
}
