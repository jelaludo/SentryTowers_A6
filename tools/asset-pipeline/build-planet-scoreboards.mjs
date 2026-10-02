import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,prune,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const ROOT=fileURLToPath(new URL('../..',import.meta.url)),OUT=path.join(ROOT,'assets/planet-scoreboards');await fs.mkdir(OUT,{recursive:true});
const STYLES={
 beacon:{label:'A6 / Beacon Scoreboard',technology:'seven_segment',accent:0x36edcf,digit:0x82ffe4,off:0x173f42,y:2.96,z:.59},
 flipdot:{label:'A6 / Flip-Dot Scoreboard',technology:'flip_dot',accent:0xe5d654,digit:0xf5e56b,off:0x303639,y:2.7,z:.62},
 splitflap:{label:'A6 / Split-Flap Scoreboard',technology:'split_flap',accent:0xd6a76d,digit:0x203038,off:0x19272e,y:2.86,z:.66}
};
const C={floor:0x24353b,armor:0x738589,frame:0x30454e,dark:0x0b1920,ivory:0xcbd4c8,amber:0xdba253};
const SCORE=12345678,MAX=99999999,PITCH=.66;
globalThis.FileReader=class{result=null;onloadend=null;onerror=null;readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();},e=>this.onerror?.(e));}readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();},e=>this.onerror?.(e));}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function sha(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}
function node(parent,name,pos=[0,0,0],metadata={}){const o=new T.Group();o.name=name;o.position.fromArray(pos);o.userData=metadata;parent.add(o);return o;}
function palette(){return new T.MeshStandardMaterial({name:'SCOREBOARD_VERTEX_PALETTE',color:0xffffff,vertexColors:true,metalness:.35,roughness:.55,side:T.DoubleSide});}
function colorize(g,color){const c=new T.Color(color),a=new Uint8Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=Math.round(c.r*255);a[i+1]=Math.round(c.g*255);a[i+2]=Math.round(c.b*255);}g.setAttribute('color',new T.Uint8BufferAttribute(a,3,true));return g;}
function box(size,pos,color,rot=[0,0,0]){const g=new T.BoxGeometry(...size);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));return colorize(g,color);}
function cyl(radius,height,n,pos,color,rot=[0,0,0]){const g=new T.CylinderGeometry(radius,radius,height,n);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));return colorize(g,color);}
function disc(radius,n,pos,color){const g=new T.CircleGeometry(radius,n);g.translate(...pos);return colorize(g,color);}
function merge(parts){const g=mergeGeometries(parts,false);if(!g)throw Error('Could not merge geometries');parts.forEach(p=>p.dispose());return g;}
function mesh(parent,name,parts,material){const o=new T.Mesh(merge(parts),material);o.name=name;parent.add(o);return o;}
const SEGMENTS={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
const SEG_POS={a:[0,.285],b:[.235,.145],c:[.235,-.145],d:[0,-.285],e:[-.235,-.145],f:[-.235,.145],g:[0,0]};
const FONT={
 '0':['11111','10001','10011','10101','11001','10001','11111'],
 '1':['00100','01100','00100','00100','00100','00100','01110'],
 '2':['11111','00001','00001','11111','10000','10000','11111'],
 '3':['11111','00001','00001','01111','00001','00001','11111'],
 '4':['10001','10001','10001','11111','00001','00001','00001'],
 '5':['11111','10000','10000','11111','00001','00001','11111'],
 '6':['11111','10000','10000','11111','10001','10001','11111'],
 '7':['11111','00001','00010','00100','01000','01000','01000'],
 '8':['11111','10001','10001','11111','10001','10001','11111'],
 '9':['11111','10001','10001','11111','00001','00001','11111'],
 'S':['01111','10000','10000','01110','00001','00001','11110'],
 'C':['01111','10000','10000','10000','10000','10000','01111'],
 'O':['01110','10001','10001','10001','10001','10001','01110'],
 'R':['11110','10001','10001','11110','10100','10010','10001'],
 'E':['11111','10000','10000','11110','10000','10000','11111']
};
function digitX(i){return(i-3.5)*PITCH;}
function staticDigits(style,lod){const p=[],digits=String(SCORE).padStart(8,'0');for(let i=0;i<8;i++){const x=digitX(i),d=digits[i];if(style.technology==='seven_segment'||lod===2&&style.technology==='flip_dot'){for(const segment of SEGMENTS[d]){const [dx,dy]=SEG_POS[segment],horizontal='adg'.includes(segment);p.push(box(horizontal?[.40,.068,.025]:[.065,.235,.025],[x+dx,style.y+dy,style.z+.035],style.digit));}}else{const pattern=FONT[d];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(pattern[r][c]==='1'){const px=x+(c-2)*.09,py=style.y+(3-r)*.09;if(style.technology==='flip_dot')p.push(disc(.035,lod===0?8:6,[px,py,style.z+.035],style.digit));else p.push(box([.073,.073,.014],[px,py,style.z+.035],style.digit));}}}return p;}
function labelParts(style){const p=[],word='SCORE';for(let i=0;i<word.length;i++)for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(FONT[word[i]][r][c]==='1')p.push(box([.026,.026,.012],[-.52+i*.25+c*.04,style.y+.66+(6-r)*.04,style.z+.03],style.accent));return p;}
function boardStructure(root,key,lod,shared){const s=STYLES[key],p=[];p.push(box([7.5,.25,3.9],[0,.125,0],C.floor));
 if(key==='beacon'){p.push(box([6.5,1.8,.48],[0,2.95,.18],C.frame),box([5.75,.88,.045],[0,2.96,.47],C.dark),box([6.68,.13,.58],[0,3.91,.18],s.accent),box([6.68,.17,.58],[0,2.01,.18],C.armor));for(const x of [-2.65,2.65])p.push(box([.44,1.95,.5],[x,1.02,0],C.armor),box([1.35,.28,1.7],[x,.2,0],C.frame));p.push(box([.9,.22,1.5],[0,.2,0],C.frame));}
 else if(key==='flipdot'){p.push(box([6.9,1.95,.55],[0,2.63,.18],C.frame),box([6.12,1.15,.045],[0,2.7,.5],C.dark),box([7.05,.15,.65],[0,3.66,.18],s.accent),box([7.05,.21,.75],[0,1.59,.18],C.armor),box([6.35,1.2,1.7],[0,.93,-.2],C.frame),box([7.05,.3,2.2],[0,.25,-.1],C.armor));}
 else{p.push(box([6.92,1.86,.75],[0,2.8,.12],C.frame),box([6.3,1.1,.045],[0,2.86,.54],C.dark),box([7.1,.2,.9],[0,3.82,.12],C.armor),box([7.1,.22,.9],[0,1.78,.12],C.armor),box([1.6,1.6,1.25],[0,.95,-.25],C.frame),box([3.4,.28,2],[0,.2,-.15],C.armor));}
 p.push(...labelParts(s));
 for(const x of [-3.17,3.17]){p.push(box([.11,1.38,.13],[x,s.y,.51],C.armor));if(lod===0)for(const y of [s.y-.61,s.y+.61])p.push(cyl(.06,.04,8,[x,y,.58],C.amber,[Math.PI/2,0,0]));}
 if(key==='flipdot'&&lod<2)for(let i=0;i<8;i++)for(let r=0;r<7;r++)for(let c=0;c<5;c++)p.push(disc(.038,lod===0?8:6,[digitX(i)+(c-2)*.09,s.y+(3-r)*.09,s.z+.018],s.off));
 if(key==='splitflap'){for(let i=0;i<8;i++){const x=digitX(i);p.push(box([.57,.72,.045],[x,s.y,s.z-.01],C.ivory),box([.58,.025,.05],[x,s.y,s.z+.02],C.frame));if(lod===0){p.push(cyl(.055,.62,8,[x,s.y+.42,s.z-.07],C.armor,[0,0,Math.PI/2]),box([.52,.028,.04],[x,s.y-.38,s.z+.02],s.accent));}}}
 if(key==='beacon')for(const x of [-1.98,.99])p.push(box([.055,.12,.035],[x,s.y-.25,s.z+.04],s.accent));
 if(lod===0){for(const x of [-2.9,-2.4,2.4,2.9])p.push(box([.18,.09,.04],[x,.48,1.91],s.accent));for(const x of [-2.6,2.6])for(const z of [-1.35,1.35])p.push(box([.24,.045,.24],[x,.28,z],C.dark));}
 mesh(root,'SCOREBOARD_STRUCTURE',p,shared);}
function scoreNodes(root,s){node(root,'SCORE_DISPLAY_ORIGIN',[0,s.y,s.z],{role:'runtime_score_anchor',digits:8,max_score:MAX});node(root,'SOCKET_POWER',[0,.35,-1.65],{kind:'power'}).quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(0,0,-1));node(root,'SOCKET_SERVICE',[0,0,1.9],{kind:'human_access'});}
function metrics(root){let triangles=0,draw_calls=0;const materials=new Set();root.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls+=o.geometry.groups.length||1;for(const m of [].concat(o.material))materials.add(m);});return{triangles:Math.round(triangles),draw_calls,materials:materials.size,textures:0};}
function bounds(root){root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root,true);return{min:b.min.toArray(),max:b.max.toArray()};}
async function exportOne(key,lod){const s=STYLES[key],scene=new T.Scene(),root=node(scene,'SCOREBOARD_ROOT',[0,0,0],{family:'planet_scoreboards',variant:key,lod,damage_level:0,score_max:MAX,score_default:SCORE,plot_m:[8,5]}),shared=palette();boardStructure(root,key,lod,shared);const digits=mesh(root,'SCORE_STATIC_DIGITS',staticDigits(s,lod),shared);digits.userData={role:'default_score_snapshot',score:SCORE,hide_when_runtime_active:true};scoreNodes(root,s);
 if(lod===2){root.updateMatrixWorld(true);const parts=[];root.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push(g);}});for(const child of [...root.children])root.remove(child);mesh(root,'SCOREBOARD_DISTANCE_GEOMETRY',parts,shared);scoreNodes(root,s);node(root,'SCORE_STATIC_DIGITS',[0,s.y,s.z],{static_lookup_only:true,score:SCORE});}
 const fileName=`${key}_scoreboard_d0_lod${lod}.glb`,file=path.join(OUT,fileName),data=await new GLTFExporter().parseAsync(scene,{binary:true,trs:true});await fs.writeFile(file,Buffer.from(data));const doc=await io.read(file);await doc.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=file.replace('.glb','.meshopt.glb');await io.write(packed,doc);return{id:`${key}_scoreboard_d0_lod${lod}`,family:'planet_scoreboards',variant:key,name:s.label,file:fileName,meshopt_file:path.basename(packed),lod,quality:['detailed_master','game','distance'][lod],damage_level:0,state:'intact',static:lod===2,derived:lod>0,derived_from:lod>0?`${key}_scoreboard_d0_lod0.glb`:null,bytes:(await fs.stat(file)).size,sha256:await sha(file),meshopt_bytes:(await fs.stat(packed)).size,meshopt_sha256:await sha(packed),...metrics(root),plot_m:[8,5],bounds:bounds(root),sockets:[{id:'POWER',kind:'power',position_m:[0,.35,-1.65],normal:[0,0,-1]},{id:'SERVICE',kind:'human_access',position_m:[0,0,1.9],normal:[0,0,1]}],clips:[],display:{technology:s.technology,digits:8,default_score:SCORE,max_score:MAX,pitch_m:PITCH,center_y_m:s.y,face_z_m:s.z,runtime_node:'SCORE_DISPLAY_ORIGIN',static_node:'SCORE_STATIC_DIGITS'},credit:'Models by jelaludo'};}
const assets=[];for(const key of Object.keys(STYLES))for(const lod of [0,1,2]){const e=await exportOne(key,lod);assets.push(e);console.log(e.file,e.triangles,e.draw_calls,e.bytes);}
const manifest={schema:'jelaludo.asset-family/v2-candidate',version:1,family:'planet_scoreboards',label:'A6 / Planet Scoreboards',status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},reference:{url:'https://kai-denrei.github.io/dexipurei-galore/',note:'Display-technology inspiration only. Geometry and runtime code here are original.'},score:{integer:true,min:0,max:MAX,digits:8,default:SCORE,overflow:'clamp',runtime_adapter:'runtime.js'},budgets:{lod1:{triangles_max:8000,draw_calls_max:10,plain_bytes_max:400000},lod2:{triangles_max:3000,draw_calls_max:1,plain_bytes_max:250000}},lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20},assets};await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await import('./build-rivalry-scoreboards.mjs');
