import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as Three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const rootURL=new URL('../../',import.meta.url);
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const elements=new Map();
const html=await fs.readFile(new URL('ridgeback-mech/index.html',rootURL),'utf8');
for(const match of html.matchAll(/id="([^"]+)"/g))elements.set(match[1],{value:'0',checked:false,style:{},parentElement:{},clientWidth:1200,clientHeight:800,prepend(){}});
for(const [id,value] of Object.entries({mode:'agency',lod:'1',damage:'0',encoding:'plain',aggro:'1'}))elements.get(id).value=value;
elements.get('followWalk').checked=true;
globalThis.document={getElementById:id=>elements.get(id),querySelectorAll:()=>[]};globalThis.devicePixelRatio=1;
globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;}observe(){this.fn();}};
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL(path.replace('../',''),rootURL),'utf8'))});
let frame;
class Renderer{constructor(){this.domElement={};}setPixelRatio(){}setSize(){}setAnimationLoop(fn){frame=fn;}render(){}}
class PMREM{fromScene(){return {texture:null};}dispose(){}}
class Loader extends GLTFLoader{async loadAsync(path){const b=await fs.readFile(new URL(path.replace('../',''),rootURL));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}}
globalThis.__viewerThree={...Three,WebGLRenderer:Renderer,PMREMGenerator:PMREM};globalThis.__viewerLoader=Loader;
const runtime=new URL('assets/ridgeback-mech/runtime.js',rootURL).href;
let behavior=await fs.readFile(new URL('ridgeback-mech/behavior.js',rootURL),'utf8');behavior=behavior.replace("'three'",JSON.stringify(import.meta.resolve('three'))).replace("'../assets/ridgeback-mech/runtime.js?v=heavy-gait-1'",JSON.stringify(runtime));
let fx=await fs.readFile(new URL('ridgeback-mech/airdrop-fx.js',rootURL),'utf8');fx=fx.replace("'three'",JSON.stringify(import.meta.resolve('three')));
let viewer=await fs.readFile(new URL('ridgeback-mech/viewer.js',rootURL),'utf8');
viewer=viewer.replace("import * as T from 'three';",'const T=globalThis.__viewerThree;').replace(/import \{OrbitControls\}[^\n]+/,'class OrbitControls{constructor(){this.target=new T.Vector3();}update(){}}').replace(/import \{GLTFLoader\}[^\n]+/,'const GLTFLoader=globalThis.__viewerLoader;').replace(/import \{MeshoptDecoder\}[^\n]+/,'const MeshoptDecoder=null;').replace(/import \{RoomEnvironment\}[^\n]+/,'class RoomEnvironment{dispose(){}}').replace("'../assets/ridgeback-mech/runtime.js?v=heavy-gait-1'",JSON.stringify(runtime)).replace("'./behavior.js?v=bursts1'",JSON.stringify(data(behavior))).replace("'./airdrop-fx.js'",JSON.stringify(data(fx)));
await import(data(viewer));
assert(!/failed|Loading/.test(elements.get('status').textContent),elements.get('status').textContent);
for(let i=0;i<600;i++)frame(performance.now()+i*16.667);
assert(elements.get('time').hidden);assert(/Tracking lure|Aggressive pursuit/.test(elements.get('status').textContent));
console.log('Viewer startup + 600 pursuit frames passed:',elements.get('status').textContent);
