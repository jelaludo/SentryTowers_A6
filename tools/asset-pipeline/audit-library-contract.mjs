import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ASSETS=path.join(ROOT,'assets');
const OUTPUT_JSON=path.join(ROOT,'docs/generated/asset-contract-audit.json');
const OUTPUT_MD=path.join(ROOT,'docs/ASSET-AUDIT.md');
const ENGINE_NAME=/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const FILE_NAME=/^[a-z0-9]+(?:_[a-z0-9]+)*(?:\.meshopt)?\.glb$/;

function walk(directory,predicate){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(directory,entry.name);
    return entry.isDirectory()?walk(full,predicate):predicate(full)?[full]:[];
  });
}

function relative(file){return path.relative(ROOT,file).split(path.sep).join('/');}

function readGlbJSON(file){
  const bytes=fs.readFileSync(file);
  if(bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67)throw new Error('not a GLB 2.0 file');
  if(bytes.readUInt32LE(4)!==2)throw new Error(`unsupported GLB version ${bytes.readUInt32LE(4)}`);
  const length=bytes.readUInt32LE(12);
  if(bytes.readUInt32LE(16)!==0x4e4f534a)throw new Error('first GLB chunk is not JSON');
  return {json:JSON.parse(bytes.subarray(20,20+length).toString('utf8').replace(/\0+$/,'')),bytes};
}

function triangleCount(json){
  let triangles=0;
  for(const mesh of json.meshes||[])for(const primitive of mesh.primitives||[]){
    const count=primitive.indices!==undefined?json.accessors?.[primitive.indices]?.count:json.accessors?.[primitive.attributes?.POSITION]?.count;
    if(!Number.isFinite(count))continue;
    const mode=primitive.mode??4;
    if(mode===4)triangles+=Math.floor(count/3);
    else if(mode===5||mode===6)triangles+=Math.max(0,count-2);
  }
  return triangles;
}

function manifestAssets(value){
  if(Array.isArray(value))return value;
  return Array.isArray(value?.assets)?value.assets:[];
}

const manifestFiles=walk(ASSETS,file=>/^manifest(?:-[^.]+)?\.json$/.test(path.basename(file))).sort();
const claims=new Map();
const missingManifestFiles=[];
for(const manifestFile of manifestFiles){
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  for(const asset of manifestAssets(manifest)){
    if(!asset||typeof asset!=='object'||!asset.file)continue;
    for(const [kind,name] of [['plain',asset.file],['meshopt',asset.meshopt_file]]){
      if(!name)continue;
      let resolved=path.resolve(path.dirname(manifestFile),name);
      if(!fs.existsSync(resolved)&&String(name).startsWith('assets/'))resolved=path.resolve(ROOT,name);
      const key=relative(resolved);
      if(!fs.existsSync(resolved)){missingManifestFiles.push({manifest:relative(manifestFile),file:key});continue;}
      const engineNames=[...new Set([...(asset.engine_nodes||[]),...(asset.required_nodes||[])])].filter(value=>typeof value==='string');
      const review=String(asset.review_status||manifest.status||'').toLowerCase();
      const claim={
        manifest:relative(manifestFile),kind,id:asset.id||path.basename(name,'.glb'),
        family:asset.family||manifest.family||path.basename(path.dirname(manifestFile)),
        lod:Number.isInteger(asset.lod)?asset.lod:null,damage_level:Number.isInteger(asset.damage_level)?asset.damage_level:null,
        engine_names:engineNames,review_status:review,
      };
      const previous=claims.get(key);
      if(!previous||engineNames.length>previous.engine_names.length||review.includes('contract_candidate'))claims.set(key,claim);
    }
  }
}

function readiness(file,claim){
  if(file.includes('/initial_concept'))return 'original';
  if(file.startsWith('assets/game-ready/')||file.startsWith('assets/base-kit-game/'))return 'legacy_derivative';
  if(claim?.review_status.includes('contract_candidate'))return 'contract_candidate';
  if(/^assets\/(fabrication-lab|korp)\//.test(file))return 'contract_candidate';
  if(/^assets\/isao-birudoron\/isao_birudoron_lod[012]\.glb$/.test(file))return 'contract_candidate';
  if(/^assets\/hover-tank\/mork_hover_tank_d0_lod2\.glb$/.test(file))return 'contract_candidate';
  if(/^assets\/solar-power\//.test(file))return 'contract_candidate';
  return 'original';
}

const files=walk(ASSETS,file=>file.endsWith('.glb')).sort();
const records=[];
for(const full of files){
  const file=relative(full),claim=claims.get(file)||null;
  try{
    const {json,bytes}=readGlbJSON(full);
    const nodeNames=(json.nodes||[]).map(node=>typeof node.name==='string'?node.name:'');
    const named=nodeNames.filter(Boolean),counts=new Map();
    for(const name of named)counts.set(name,(counts.get(name)||0)+1);
    const duplicateNames=[...counts].filter(([,count])=>count>1).map(([name])=>name).sort();
    const dottedNames=[...new Set(named.filter(name=>name.includes('.'))) ].sort();
    const readinessStatus=readiness(file,claim);
    const engineNameErrors=(claim?.engine_names||[]).filter(name=>!ENGINE_NAME.test(name));
    const missingEngineNames=(claim?.engine_names||[]).filter(name=>!counts.has(name));
    const filenameOk=FILE_NAME.test(path.basename(file));
    const lodPathOk=claim?.lod===null||claim?.lod===undefined||claim.lod===0||new RegExp(`(?:_lod${claim.lod}(?:\\.meshopt)?\\.glb$|/lod${claim.lod}/)`).test(file);
    const enforced=readinessStatus==='contract_candidate';
    const violations=[];
    if(!filenameOk)violations.push('noncanonical_filename');
    if(!lodPathOk)violations.push('missing_lod_filename_or_directory');
    if(nodeNames.length-named.length)violations.push('unnamed_nodes');
    if(duplicateNames.length)violations.push('duplicate_node_names');
    if(dottedNames.length)violations.push('dotted_node_names');
    if(engineNameErrors.length)violations.push('noncanonical_engine_names');
    if(missingEngineNames.length)violations.push('missing_engine_names');
    records.push({
      file,readiness:readinessStatus,enforced,manifest:claim?.manifest||null,id:claim?.id||null,
      family:claim?.family||file.split('/')[1],lod:claim?.lod??null,damage_level:claim?.damage_level??null,
      bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
      triangles:triangleCount(json),draw_calls:(json.meshes||[]).reduce((sum,mesh)=>sum+(mesh.primitives?.length||0),0),
      materials:json.materials?.length||0,textures:json.textures?.length||0,animations:json.animations?.map(animation=>animation.name||'')||[],skins:json.skins?.length||0,
      nodes:nodeNames.length,unnamed_nodes:nodeNames.length-named.length,duplicate_names:duplicateNames,dotted_names:dottedNames,
      engine_names:claim?.engine_names||[],noncanonical_engine_names:engineNameErrors,missing_engine_names:missingEngineNames,
      filename_ok:filenameOk,lod_path_ok:lodPathOk,violations,
    });
  }catch(error){records.push({file,readiness:readiness(file,claim),enforced:true,error:error.message,violations:['unreadable_glb']});}
}

const parity=[];
const families=new Map();
for(const record of records.filter(item=>item.enforced&&item.engine_names?.length)){
  const set=[...record.engine_names].sort();
  if(!families.has(record.family))families.set(record.family,[]);
  families.get(record.family).push({file:record.file,names:set});
}
for(const [family,entries] of families){
  const variants=new Map(entries.map(entry=>[entry.names.join('\n'),entry.names]));
  parity.push({family,files:entries.length,consistent:variants.size===1,variants:variants.size});
}

const collectionOf=file=>{const parts=file.split('/');return parts.length===2?'sentries':parts[1];};
const collectionMap=new Map();
for(const record of records){
  const key=collectionOf(record.file);
  if(!collectionMap.has(key))collectionMap.set(key,{collection:key,files:0,original:0,legacy_derivative:0,contract_candidate:0,enforced_failures:0,reported_legacy_issues:0});
  const row=collectionMap.get(key);row.files++;row[record.readiness]++;
  if(record.enforced&&record.violations.length)row.enforced_failures++;
  if(!record.enforced&&record.violations.length)row.reported_legacy_issues++;
}
const collections=[...collectionMap.values()].sort((a,b)=>a.collection.localeCompare(b.collection));
const enforcedFailures=records.filter(record=>record.enforced&&record.violations.length);
const legacyIssues=records.filter(record=>!record.enforced&&record.violations.length);
const report={
  schema:'sentry_asset_contract_audit',version:1,audit_date:'2026-09-13',
  policy:{engine_name_pattern:ENGINE_NAME.source,filename_pattern:FILE_NAME.source,readiness_states:['original','legacy_derivative','contract_candidate','reviewed_runtime'],reviewed_runtime_definition:'Explicit game-camera, selection-threshold and reference-phone acceptance evidence. No file currently carries this state.'},
  summary:{glb_files:records.length,manifest_files:manifestFiles.length,manifest_claims:claims.size,contract_candidate_files:records.filter(record=>record.enforced).length,enforced_failures:enforcedFailures.length,legacy_or_original_issues:legacyIssues.length,missing_manifest_files:missingManifestFiles.length,naming_parity_families:parity.length,naming_parity_failures:parity.filter(item=>!item.consistent).length},
  missing_manifest_files:missingManifestFiles,parity,collections,files:records,
};
fs.mkdirSync(path.dirname(OUTPUT_JSON),{recursive:true});
fs.writeFileSync(OUTPUT_JSON,JSON.stringify(report,null,2)+'\n');

const table=collections.map(row=>`| ${row.collection} | ${row.files} | ${row.original} | ${row.legacy_derivative} | ${row.contract_candidate} | ${row.enforced_failures} | ${row.reported_legacy_issues} |`).join('\n');
const failures=enforcedFailures.length?enforcedFailures.map(row=>`- \`${row.file}\`: ${row.violations.join(', ')}`).join('\n'):'- None.';
const parityFailures=parity.filter(item=>!item.consistent);
const parityText=parityFailures.length?parityFailures.map(item=>`- \`${item.family}\`: ${item.variants} required-name sets across ${item.files} files.`).join('\n'):'- None.';
fs.writeFileSync(OUTPUT_MD,`# Asset contract audit\n\nGenerated by \`node tools/asset-pipeline/audit-library-contract.mjs\` on 13 September 2026. The machine-readable per-file evidence is in \`docs/generated/asset-contract-audit.json\`.\n\nThis report audits all ${records.length} GLBs without modifying them. Contract candidates are enforcement scope. Preserved originals and legacy derivatives remain visible as a migration backlog; they are not silently renamed or promoted. “Reviewed runtime” requires explicit game-camera, swap-threshold and reference-phone acceptance evidence, and no library file currently claims that state.\n\n## Summary\n\n- ${records.length} GLBs and ${manifestFiles.length} manifests inspected.\n- ${report.summary.contract_candidate_files} contract-candidate GLBs enforced.\n- ${enforcedFailures.length} enforced naming/file failures.\n- ${report.summary.naming_parity_failures} required engine-name parity failures across ${report.summary.naming_parity_families} candidate families with declared lookup sets.\n- ${legacyIssues.length} original/legacy files have reported naming debt; these are migration findings, not passing runtime claims.\n- ${missingManifestFiles.length} manifest file references are missing.\n\n## Collection inventory\n\n| Collection | GLBs | Original | Legacy derivative | Contract candidate | Enforced failures | Original/legacy issues |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${table}\n\n## Enforced failures\n\n${failures}\n\n## Required-name parity failures\n\n${parityText}\n\n## Interpretation\n\nA clean enforcement result means current contract candidates use canonical filenames, unique named nodes, dot-free node names and canonical declared engine lookup names, and that every declared lookup exists. It does not mean art direction, performance, collision, camera thresholds or game integration has been accepted. Original/legacy issue details and exact names are retained in the JSON report so later migrations can publish precise old-to-new maps.\n`);

console.log(JSON.stringify(report.summary,null,2));
if(enforcedFailures.length||missingManifestFiles.length||parityFailures.length)process.exitCode=1;
