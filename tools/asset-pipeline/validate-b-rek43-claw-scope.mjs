// Pin the corrected-hand revision and prove only foot geometry changed.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const baseline='2699ab12da480c06b07dc42e927ae4ad9b1b76c6';
const out=new URL('../../assets/b-rek43/',import.meta.url),repo=new URL('../../',import.meta.url);
const foot=n=>/^(ANKLE_|TOE_)/.test(n);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const parse=b=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
function bodyGeometry(g){
 const rows=[];
 g.scene.traverse(o=>{if(!o.isSkinnedMesh)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,si=o.geometry.attributes.skinIndex;
  for(let i=0;i<p.count;i++){const name=o.skeleton.bones[si.getX(i)].name;if(foot(name))continue;rows.push([o.material.name,name,...[p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].map(v=>Math.round(v*1e6))].join(','));}
 });return rows.sort();
}
const report={baseline_commit:baseline,scope:'B-REK43 foot geometry refinement only. Compare ALL bind transforms and animation tracks, plus non-foot geometry/material assignments including the corrected hands, against the pinned hand correction.',assets:[]};
for(const lod of [0,1]){
 const path=`assets/b-rek43/b_rek43_d0_lod${lod}.glb`,oldBytes=execFileSync('git',['show',`${baseline}:${path}`],{cwd:repo,maxBuffer:20000000}),newBytes=await fs.readFile(new URL(`b_rek43_d0_lod${lod}.glb`,out));
 const [old,current]=await Promise.all([parse(oldBytes),parse(newBytes)]);old.scene.updateMatrixWorld(true);current.scene.updateMatrixWorld(true);
 let nodes=0,tracks=0;
 old.scene.traverse(o=>{if(!o.name||o.isMesh)return;const n=current.scene.getObjectByName(o.name);assert(n,'missing '+o.name);for(let i=0;i<16;i++)assert(Math.abs(o.matrixWorld.elements[i]-n.matrixWorld.elements[i])<1e-6,'body bind changed '+o.name);nodes++});
 for(const oldClip of old.animations){const clip=current.animations.find(c=>c.name===oldClip.name);assert(clip);assert.equal(clip.duration,oldClip.duration);
  for(const t of oldClip.tracks){const n=clip.tracks.find(x=>x.name===t.name);assert(n,'missing track '+t.name);assert.equal(n.times.length,t.times.length);assert.equal(n.values.length,t.values.length);for(let i=0;i<t.times.length;i++)assert(Math.abs(n.times[i]-t.times[i])<1e-6);for(let i=0;i<t.values.length;i++)assert(Math.abs(n.values[i]-t.values[i])<1e-6,'body motion changed '+oldClip.name+' '+t.name);tracks++}
 }
 const original=bodyGeometry(old),updated=bodyGeometry(current);assert.deepEqual(updated,original,'non-foot geometry/material assignment changed');report.assets.push({file:path,baseline_sha256:sha(oldBytes),sha256:sha(newBytes),unchanged_bind_nodes:nodes,unchanged_animation_tracks:tracks,unchanged_non_foot_vertices:original.length});
}
report.status='passed';await fs.writeFile(new URL('claw-scope-validation.json',out),JSON.stringify(report,null,2)+'\n');console.log('PASS foot-only scope',report.assets.map(e=>({nodes:e.unchanged_bind_nodes,tracks:e.unchanged_animation_tracks,vertices:e.unchanged_non_foot_vertices})));
