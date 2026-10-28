// Transient posed GLBs for offline rendering. Authoritative exports remain closed D0 assets.
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildTAI} from './tai09-shape.mjs';
import {createRig} from '../../assets/tai09/runtime.js';
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await fs.mkdir('/tmp/tai09-review',{recursive:true});
for(const mode of ['closed','walk','grapple']){const root=buildTAI(0),rig=createRig(root,T);if(mode==='walk'){rig.pose({deploy:1,height:.94});rig.body.position.y=.94;}else if(mode==='grapple'){rig.pose({grapple:1});rig.hook.position.z=2.7;}else rig.pose();root.updateMatrixWorld(true);const bytes=await new GLTFExporter().parseAsync(root,{binary:true,trs:true});await fs.writeFile('/tmp/tai09-review/'+mode+'.glb',Buffer.from(bytes));}
