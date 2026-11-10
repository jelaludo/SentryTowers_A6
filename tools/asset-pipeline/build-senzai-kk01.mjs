import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {BEHAVIORS} from '../../assets/senzai-kk01/behaviors.js';

const root=new URL('../../',import.meta.url),out=new URL('assets/senzai-kk01/',root);
const source=new URL('assets/senzai-kk02/',root),base=JSON.parse(await fs.readFile(new URL('manifest.json',source)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const credit='Senzai models, animation, code and concepts by Jelaludo. Attribution required for reuse. https://jelaludo.github.io/SentryTowers_A6/';
// Preserve the authored binary geometry and engine identifiers. Add attribution to
// the GLB asset header so a separately downloaded model still carries its credit.
function creditedGLB(bytes){
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
  json.asset.copyright=credit;
  const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
  const rest=bytes.subarray(20+length),header=Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+rest.length,8);
  header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  return Buffer.concat([header,padded,rest]);
}
const assets=[];
for(const entry of base.assets){
  const original=await fs.readFile(new URL(entry.file,source)),bytes=creditedGLB(original),file=entry.file.replace('kk02','kk01');
  await fs.writeFile(new URL(file,out),bytes);
  assets.push({...entry,file,derived:true,source_file:'assets/senzai-kk02/'+entry.file,source_sha256:sha(original),bytes:bytes.length,sha256:sha(bytes),credit});
}
await fs.copyFile(new URL('runtime.js',source),new URL('runtime.js',out));
const source_sha256={};
for(const path of ['assets/senzai-kk01/runtime.js','assets/senzai-kk01/behaviors.js','tools/asset-pipeline/build-senzai-kk01.mjs'])source_sha256[path]=sha(await fs.readFile(new URL(path,root)));
const manifest={...base,family:'senzai-kk01',label:'Senzai-KK01 / Developer edition',revision:1,
  status:'Derived from Senzai-KK02 / reusable animation study',
  based_on:{family:'senzai-kk02',commit:'6312e75',policy:'KK02 geometry and motion retained; model asset headers add Jelaludo attribution; original LATENT sources preserved',preserved_v1:base.based_on.preserved_v1},
  assets,source_sha256,
  runtime:{...base.runtime,behaviors_file:'behaviors.js',behavior_cues:BEHAVIORS,originals:{commit:'6312e75',folder:'assets/senzai-kk02/',note:'Original source family retained; KK01 is a derived distribution'}},
  space:{...base.space,source:'senzai-kk01/space.js'},viewer_effects:{...base.viewer_effects,source:'senzai-kk01/effects.js'},
  attribution:{required:true,author:'Jelaludo',credit,license:'LICENSE.md',notice:'ATTRIBUTIONS.md',applies_to:['models','animations','runtime','shaders','viewer','lore','documentation','adaptations']},
  package:{file:'senzai-kk01-developer-package.zip',derived:true,offline_viewer:true,lore:'LORE.md'},
  handoff:{folder:'assets/senzai-kk01/',viewer:'senzai-kk01/',pending:['Visual acceptance','Consuming-game shader/packing and decoded release validation','LOD selection and device profiling','Target AI, collision and damage states']}};
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(assets.map(({file,triangles,draw_calls,bytes})=>({file,triangles,draw_calls,bytes}))));
