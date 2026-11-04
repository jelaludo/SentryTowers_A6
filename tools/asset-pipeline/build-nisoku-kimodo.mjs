// Derived playback bundles only. The user-supplied source files remain byte-identical.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const base=new URL('../../assets/nisoku03-kimodo/',import.meta.url);
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.()})}};
async function load(file){const b=await fs.readFile(new URL(file,base));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
const [rig,moves]=await Promise.all([load('rig.glb'),load('moveset-variants.glb')]);
const meshes=[];rig.scene.traverse(o=>{if(o.isMesh)meshes.push(o)});meshes.forEach(o=>o.removeFromParent());
const baked={},clips=[...moves.animations];
for(const id of ['side-roll-left','side-roll-right','hero-landing','ledge-grab','movement-controls']){
 const g=await load('baked/'+id+'.glb'),src=g.animations[0],root=src.tracks.find(t=>t.name==='RecordedActor.position'),rot=src.tracks.find(t=>t.name==='RecordedActor.quaternion');
 if(!root||!rot)throw Error('Missing recorded root '+id);
 const origin=Array.from(root.values.slice(0,3)),position=Array.from(root.values, (v,i)=>v-(i%3===1?0:origin[i%3]));
 baked[id]={duration_s:src.duration,origin_m:origin,times:Array.from(root.times),positions:position,rotation_times:Array.from(rot.times),quaternions:Array.from(rot.values),root_motion:'XZ recentered; original ground-relative Y retained; external path sampled once, baked actor transform removed from pose clip',automatic_eligible:id.startsWith('side-roll'),note:id==='hero-landing'?'Source recovery sinks below floor; review only.':'Source recording preserved; props not supplied.'};
 clips.push(new T.AnimationClip('recorded-'+id,src.duration,src.tracks.filter(t=>!t.name.startsWith('RecordedActor.')).map(t=>t.clone())));
}
await fs.writeFile(new URL('derived/recorded-paths.json',base),JSON.stringify(baked));
const chaseNames=['game-idle-seed411','game-walk-forward-seed411','game-jog-forward-seed411','game-run-forward-seed411','game-sprint-forward-seed411','game-balance-seed411','game-jump-run-seed411'];
const chase=clips.filter(c=>chaseNames.some(n=>c.name===n+'-nisoku03')||['recorded-side-roll-left','recorded-side-roll-right'].includes(c.name));
if(chase.length!==9)throw Error('Unexpected chase clips '+chase.map(c=>c.name));
const assets=[];
for(const [file,animations] of [['chase.glb',chase],['library.glb',clips]]){
 const b=new Uint8Array(await new GLTFExporter().parseAsync(rig.scene,{binary:true,trs:true,animations}));await fs.writeFile(new URL('derived/'+file,base),b);
 assets.push({file:'derived/'+file,derived:true,lod:1,damage_level:0,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),triangles:0,draw_calls:0,clips:animations.map(c=>({name:c.name,duration_s:c.duration})),credit:'User-supplied Kimodo motions; animation-only derivative for the original Isao NISOKU-03 r4 rig'});
 console.log(file,b.length,animations.length);
}
await fs.writeFile(new URL('derived/bundles.json',base),JSON.stringify({schema:'jelaludo.motion-bundles/1',assets},null,2)+'\n');
