import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import validator from 'gltf-validator';
const root=new URL('../../',import.meta.url),folder=new URL('assets/red-witness-action-showcase/',root);
const read=name=>fs.readFile(new URL(name,folder)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=JSON.parse(await read('manifest.json')),bytes=await read(source.asset);
let files=0;
for(const line of (await read('CHECKSUMS.sha256')).toString().trim().split(/\r?\n/)){const [,hash,name]=line.match(/^([a-f0-9]{64})\s+\*?(.+)$/);assert.equal(sha(await read(name)),hash,name);files++;}
const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:source.asset});
assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));assert.equal(validation.issues.numWarnings,0,JSON.stringify(validation.issues));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(new Uint8Array(bytes)),r=doc.getRoot(),nodes=r.listNodes(),names=nodes.map(n=>n.getName());
assert.equal(new Set(names).size,names.length);assert(names.every(n=>n&&!n.includes('.')));assert(names.includes('MOTION'));assert(r.getAsset().copyright.includes('Jelaludo'));
let triangles=0,draws=0;for(const n of nodes)for(const p of n.getMesh()?.listPrimitives()||[]){draws++;triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;for(const a of p.listAttributes())assert([...a.getArray()].every(Number.isFinite));}
assert.equal(triangles,21032);assert.equal(draws,17);assert.equal(r.listSkins().length,17);assert.equal(r.listTextures().length,7);
const original=await fs.readFile(new URL('assets/red-witness/red_witness_d0_lod1.glb',root));assert.equal(sha(original),source.source.asset_sha256);
const originalDoc=await io.readBinary(new Uint8Array(original));assert.deepEqual(r.listTextures().map(t=>sha(t.getImage())).sort(),originalDoc.getRoot().listTextures().map(t=>sha(t.getImage())).sort());
const animations=r.listAnimations();assert.equal(animations.length,10);assert.deepEqual(animations.map(a=>a.getName()),source.clips.map(c=>c.name));
for(const [i,a]of animations.entries()){
 const duration=Math.max(...a.listSamplers().map(s=>Math.max(...s.getInput().getArray())));assert(Math.abs(duration-source.clips[i].duration)<1e-5);
 for(const s of a.listSamplers()){assert([...s.getInput().getArray()].every(Number.isFinite));assert([...s.getOutput().getArray()].every(Number.isFinite));}
}
const archive='red-witness-action-showcase-v1.zip',zip=await read(archive);
const entry={file:source.asset,lod:1,damage_level:0,derived:true,static:false,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls:draws,materials:r.listMaterials().length,plot_m:[1.2,1],plot_note:'Rest stance only; moving display needs additional space. Baked travel reaches over 10 m in Run.',sockets:names.filter(n=>n.startsWith('SOCKET_')),clips:source.clips,credit:source.credit};
const manifest={schema:'jelaludo.asset-family/v2-candidate',family:'red-witness-action-showcase',revision:1,label:source.label,plain_glb_source_of_truth:true,coordinate_system:{units:'metres',up:'+Y',forward:'+Z',origin:'Original Red Witness ground datum; MOTION contains baked travel and floor support'},assets:[entry],lod_selection:{default:1,animation:'Game geometry only. Master and static distance remain in assets/red-witness and have no baked clips. Switch to model inspection to use those tiers.'},source_archive:{file:archive,bytes:zip.length,sha256:sha(zip),payload:'All supplied files are retained byte-for-byte; CHECKSUMS.sha256 verifies the original payload.'},source:source.source,limitations:source.limitations,release:'No compressed export supplied. Consuming-game gltfpack release and decoded animation validation remain pending.'};
await fs.writeFile(new URL('integration-manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');
const report={status:'passed',scope:'Independent import checks: archive payload checksums, glTF validation, decoded geometry/skin/clip metadata, finite keys, original game source hash and embedded texture byte preservation. Browser motion and controls are checked separately.',source_payload_files:files,gltf_errors:validation.issues.numErrors,gltf_warnings:validation.issues.numWarnings,triangles,draw_calls:draws,bytes:bytes.length,nodes:names.length,skins:r.listSkins().length,images:r.listTextures().length,clips:source.clips.map(c=>({name:c.name,duration:c.duration,loop:c.loop})),original_game_sha256:sha(original),source_archive_sha256:sha(zip)};
await fs.writeFile(new URL('integration-validation.json',folder),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
