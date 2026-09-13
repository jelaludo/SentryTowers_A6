import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),DIRECTORY=path.join(ROOT,'assets/solar-power');

function read(file){
  const bytes=fs.readFileSync(file),chunks=[];let offset=12,json=null;
  if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw new Error(`${file}: expected GLB 2.0`);
  while(offset<bytes.length){const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4),data=bytes.subarray(offset+8,offset+8+length);chunks.push({type,data});if(type===0x4e4f534a)json=JSON.parse(data.toString('utf8').replace(/\0+$/,''));offset+=8+length;}
  return{json,chunks};
}

function write(file,{json,chunks}){
  const raw=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,0x20)]);chunks.find(chunk=>chunk.type===0x4e4f534a).data=padded;
  const total=12+chunks.reduce((sum,chunk)=>sum+8+chunk.data.length,0),header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);const output=[header];
  for(const chunk of chunks){const chunkHeader=Buffer.alloc(8);chunkHeader.writeUInt32LE(chunk.data.length,0);chunkHeader.writeUInt32LE(chunk.type,4);output.push(chunkHeader,chunk.data);}fs.writeFileSync(file,Buffer.concat(output));
}

const added=[];
for(const manifestName of ['manifest.json','lod1/manifest.json','lod2/manifest.json']){
  const manifestFile=path.join(DIRECTORY,manifestName),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  for(const family of ['solar_power_complex','solar_array','solar_panel_rack']){
    const sourceEntry=manifest.assets.find(entry=>entry.family===family&&entry.damage_level===0),targetEntry=manifest.assets.find(entry=>entry.family===family&&entry.damage_level===3),sourceFile=path.join(path.dirname(manifestFile),sourceEntry.file),targetFile=path.join(path.dirname(manifestFile),targetEntry.file),source=read(sourceFile),target=read(targetFile);
    for(const [sourceIndex,node] of source.json.nodes.entries()){
      if(!node.name?.startsWith('TRACKER_TILT')||target.json.nodes.some(candidate=>candidate.name===node.name))continue;
      const sourceParentIndex=source.json.nodes.findIndex(candidate=>candidate.children?.includes(sourceIndex)),sourceParent=source.json.nodes[sourceParentIndex];if(!sourceParent)throw new Error(`${sourceFile}: parent missing for ${node.name}`);
      const targetParent=target.json.nodes.find(candidate=>candidate.name===sourceParent.name);if(!targetParent)throw new Error(`${targetFile}: parent ${sourceParent.name} missing`);
      const clone=structuredClone(node);delete clone.children;delete clone.mesh;delete clone.skin;delete clone.camera;clone.extras={...(clone.extras||{}),lookup_only:true,static_in_damage_state:true};const targetIndex=target.json.nodes.push(clone)-1;(targetParent.children??=[]).push(targetIndex);added.push({file:path.relative(ROOT,targetFile).split(path.sep).join('/'),node:clone.name,parent:targetParent.name});
    }
    write(targetFile,target);targetEntry.bytes=fs.statSync(targetFile).size;
  }
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
}
const reportFile=path.join(DIRECTORY,'name-migration-v1.json'),report=JSON.parse(fs.readFileSync(reportFile,'utf8'));if(added.length)report.lookup_nodes_added=added;fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(`Added ${added.length} static D3 lookup nodes with D0 parent and rest-transform parity.`);
