import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DIRECTORY=path.join(ROOT,'assets/solar-power');

function canonical(name){
  return String(name||'NODE').replace(/\.\d+$/,'').normalize('NFKD').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').toUpperCase()||'NODE';
}

function rewriteGlb(file){
  const bytes=fs.readFileSync(file);
  if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw new Error(`${file}: expected GLB 2.0`);
  const chunks=[];let offset=12,json=null;
  while(offset<bytes.length){const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4),data=bytes.subarray(offset+8,offset+8+length);chunks.push({type,data});if(type===0x4e4f534a)json=JSON.parse(data.toString('utf8').replace(/\0+$/,''));offset+=8+length;}
  if(!json)throw new Error(`${file}: missing JSON chunk`);
  const used=new Set(),changes=[];
  for(const [index,node] of (json.nodes||[]).entries()){
    const from=node.name||'',stem=canonical(from);let to=stem,suffix=1;
    while(used.has(to))to=`${stem}_${String(suffix++).padStart(3,'0')}`;
    used.add(to);node.name=to;if(from!==to)changes.push({node:index,from,to});
  }
  const jsonBytes=Buffer.from(JSON.stringify(json)),padding=(4-jsonBytes.length%4)%4,padded=Buffer.concat([jsonBytes,Buffer.alloc(padding,0x20)]);
  chunks.find(chunk=>chunk.type===0x4e4f534a).data=padded;
  const total=12+chunks.reduce((sum,chunk)=>sum+8+chunk.data.length,0),header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);
  const output=[header];for(const chunk of chunks){const chunkHeader=Buffer.alloc(8);chunkHeader.writeUInt32LE(chunk.data.length,0);chunkHeader.writeUInt32LE(chunk.type,4);output.push(chunkHeader,chunk.data);}fs.writeFileSync(file,Buffer.concat(output));return changes;
}

const manifests=['manifest.json','lod1/manifest.json','lod2/manifest.json'],migration=[];
for(const manifestName of manifests){
  const manifestFile=path.join(DIRECTORY,manifestName),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  for(const entry of manifest.assets){const file=path.join(path.dirname(manifestFile),entry.file),changes=rewriteGlb(file);entry.bytes=fs.statSync(file).size;migration.push({file:path.relative(ROOT,file).split(path.sep).join('/'),changes});}
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
}
const report={schema:'sentry_node_name_migration',version:1,date:'2026-09-13',family:'solar_power',policy:'uppercase snake case, unique and dot-free per GLB',compatibility:'This coordinated migration updates every Solar LOD and damage export. The old-to-new map is retained below for consuming-game review before pinning the new commit.',files:migration};
fs.writeFileSync(path.join(DIRECTORY,'name-migration-v1.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Migrated ${migration.length} Solar GLBs; ${migration.reduce((sum,item)=>sum+item.changes.length,0)} node identifiers changed.`);
