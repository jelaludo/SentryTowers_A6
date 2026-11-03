import fs from 'node:fs/promises';import path from 'node:path';import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';import {buildModel} from './rokuroku66-shape.mjs';import {applyPose} from '../../assets/rokuroku66/runtime.js';
const dir=process.env.ROKU_REVIEW_DIR||'/tmp/rokuroku66-review';await fs.mkdir(dir,{recursive:true});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
for(const [mode,t]of [['mixed',0],['extended',0],['spiral',6],['wrap',6]]){const root=buildModel(0);applyPose(root,t,mode);root.updateMatrixWorld(true);await fs.writeFile(path.join(dir,mode+'.glb'),Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true})));console.log('Derived review pose',mode);}
