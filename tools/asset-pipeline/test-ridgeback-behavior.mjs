import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const source=(await fs.readFile(new URL('../../ridgeback-mech/behavior.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(import.meta.resolve('three'))).replace("'../assets/ridgeback-mech/runtime.js?v=heavy-gait-1'",JSON.stringify(new URL('../../assets/ridgeback-mech/runtime.js',import.meta.url).href));
const {LureBehavior}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const bytes=await fs.readFile(new URL('../../assets/ridgeback-mech/mx06_d0_lod1.glb',import.meta.url));
const {scene:root}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let seed=26;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const b=new LureBehavior(random),states=new Set();let stopped=0,maxSpeed=0,maxSlip=0,maxLureSpeed=0,maxReaction=0;const before=new Map();
for(let frame=0;frame<7200;frame++){
 b.update(1/60,0,1);maxLureSpeed=Math.max(maxLureSpeed,b.lureSpeed);maxReaction=Math.max(maxReaction,b.reaction);b.pose(root,0);states.add(b.state);maxSpeed=Math.max(maxSpeed,b.speed);if(b.rate===0)stopped++;
 for(const [id,planted] of b.previous){const foot=root.getObjectByName('SOCKET_CLAW_'+id+'_1').getWorldPosition(new T.Vector3());const prior=before.get(id);if(planted&&prior?.planted)maxSlip=Math.max(maxSlip,foot.distanceTo(prior.foot));before.set(id,{foot,planted});assert(Math.abs(foot.y)<.6);}
 root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
}
assert(b.burstCount>=5);assert(maxLureSpeed>1.8);assert(maxReaction>.4);assert.equal(states.size,2);assert.equal(stopped,0);assert(b.phase>4);assert(b.elapsed>119);assert(b.position.length()>1);assert(maxSpeed>.5);assert(maxSlip<.002,`stance slip ${maxSlip}`);
console.log({seconds:120,states:[...states],stoppedFrames:stopped,maxSpeed,maxSlip,bursts:b.burstCount,maxLureSpeed,maxReaction});
