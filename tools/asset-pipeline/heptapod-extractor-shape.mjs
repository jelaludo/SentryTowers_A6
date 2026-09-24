import * as T from 'three';
import {palette as P,box,cyl,ring,beam,armor,node,mesh,socket,merged} from './settlement-industry-shape.mjs';
import {legs,UPPER,LOWER,poseLeg} from '../../assets/heptapod-extractor/runtime.js';
export const definitions={extractor:{label:'HEX-06 / Heptapod resource walker',root:'EXTRACTOR_ROOT',plot:[22,22]}};
export function buildModel(family,lod){
 let root=new T.Group();root.name='EXTRACTOR_ROOT';root.userData={family:'heptapod-extractor',lod,damage_level:0,static:lod===2,plot_m:[22,22],leg_count:6,tank_corridor_m:{width:8,height:6.5,direction:'+Z',mode:'traffic'},swept_envelope_m:{min:[-10,0,-8],max:[10,13,8]}};
 const mat=new T.MeshStandardMaterial({name:'EXTRACTOR_PALETTE',vertexColors:true,roughness:.4,metalness:.5});
 const glow=new T.MeshStandardMaterial({name:'MINING_LASER',vertexColors:true,emissive:0xff6b17,emissiveIntensity:2.3});
 const n=lod===0?40:lod===1?20:6;
 const chassis=[cyl(4.5,1.0,6,[0,9.15,0],P.armor),cyl(4.25,.22,6,[0,9.78,0],P.pale),cyl(3.5,.28,6,[0,8.52,0],P.dark),armor([3.6,.9,4.3],[0,10.2,-.3],P.armor,lod),armor([3.75,.14,4.45],[0,10.72,-.3],P.plate,lod),box([2.2,.24,.12],[0,9.24,3.92],P.cyan)];
 for(const s of [-1,1]){chassis.push(armor([1.6,.75,4.1],[s*2.65,10.2,-.2],P.armor,lod));for(let i=0;i<3;i++)chassis.push(cyl(.49,.18,n,[s*2.65,10.69,-1.5+i*1.2],P.steel),ring(.42,.045,n,[s*2.65,10.8,-1.5+i*1.2],P.cyan));
 chassis.push(cyl(.78,2.3,n,[s*1.6,10.9,-2.8],P.armor),ring(.78,.07,n,[s*1.6,9.85,-2.8],P.pale),cyl(.68,.13,n,[s*1.6,12.13,-2.8],P.pale),box([.1,1.45,.2],[s*1.6+s*.78,10.9,-2.8],P.cyan),beam([s*.5,9.7,0],[s*1.6,10,-2.8],.18,P.steel));}
 if(lod<2){for(let i=0;i<12;i++)chassis.push(box([2.8,.07,.11],[0,10.83,-1.8+i*.27],P.dark));for(const s of [-1,1])chassis.push(beam([s*3.5,10.05,-2.3],[s*3.5,10.05,2.3],.065,P.steel));}
 if(lod===0){for(const s of [-1,1])for(let i=0;i<8;i++)chassis.push(cyl(.055,.035,8,[s*3.45,9.94,-2.3+i*.65],P.amber));chassis.push(beam([0,10.8,-1.5],[0,12.6,-1.5],.05,P.steel),box([.45,.17,.25],[0,12.6,-1.5],P.cyan));}
 // Identical silhouette cap in every tier; the detailed antenna is below this height.
 chassis.push(cyl(.18,1.98,n,[0,11.71,-2.1],P.steel));
 mesh(root,'SUSPENDED_HULL',chassis,mat);
 const bones=[],parts=[];function bone(parent,name,pos){const b=new T.Bone();b.name=name;b.position.fromArray(pos);b.userData={role:'engine_pivot'};parent.add(b);bones.push(b);return b;}
 const rig=bone(root,'LEG_RIG',[0,0,0]);
 function weighted(b,geometry){parts.push({b,geometry});}
 for(const leg of legs){const id='LEG_'+leg.id,mount=bone(rig,id+'_MOUNT',[leg.side*3.2,8.8,leg.z]),hip=bone(mount,id+'_HIP',[0,0,0]),knee=bone(hip,id+'_KNEE',[UPPER,0,0]),ankle=bone(knee,id+'_ANKLE',[LOWER,0,0]);
 weighted(hip,merged([box([UPPER,.62,.68],[UPPER/2,0,0],P.steel),armor([UPPER*.6,.5,.95],[UPPER*.5,.4,0],P.armor,lod),cyl(.53,.9,n,[0,0,0],P.armor,[Math.PI/2,0,0]),cyl(.29,.94,n,[0,0,0],P.amber,[Math.PI/2,0,0]),beam([.45,-.45,0],[UPPER-.35,-.45,0],.15,P.pale)]));
 const lower=[box([LOWER,.35,.46],[LOWER/2,0,0],P.steel),armor([LOWER*.6,.5,.73],[LOWER*.36,.15,0],P.armor,lod),cyl(.51,.95,n,[0,0,0],P.armor,[Math.PI/2,0,0]),cyl(.31,1,n,[0,0,0],P.amber,[Math.PI/2,0,0]),beam([.8,-.38,0],[LOWER-1,-.38,0],.1,P.pale),box([2,.07,.07],[LOWER*.4,.43,.28],P.cyan)];
 if(lod===0)for(let i=0;i<9;i++)lower.push(box([.1,.57,.82],[1+i*.43,.14,0],P.steel));weighted(knee,merged(lower));
 weighted(ankle,merged([armor([1.7,.5,2.1],[0,0,0],P.dark,1),armor([1.2,.22,1.45],[0,.35,0],P.plate,lod),cyl(.25,.6,n,[0,.45,0],P.steel),box([.8,.07,.1],[0,.48,.65],P.amber)]));
 socket(ankle,id+'_CONTACT',[0,-.25,0],'ground_contact',[0,-1,0]);poseLeg(root,leg);
 }
 root.updateMatrixWorld(true);const assembled=[];
 for(const {b,geometry:g} of parts){g.applyMatrix4(b.matrixWorld);if(lod<2){const count=g.attributes.position.count,index=new Uint16Array(count*4),weight=new Float32Array(count*4);for(let i=0;i<count;i++){index[i*4]=bones.indexOf(b);weight[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(index,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weight,4));}assembled.push(g);}
 if(lod<2){const skin=new T.SkinnedMesh(merged(assembled),mat);skin.name=root.name;skin.userData={...root.userData};for(const child of [...root.children])skin.add(child);root=skin;skin.bind(new T.Skeleton(bones));node(root,'ARTICULATED_LEGS',[0,0,0],'lookup');}else mesh(root,'ARTICULATED_LEGS',assembled,mat);
 const yaw=node(root,'LASER_YAW',[0,8.5,0]),pitch=node(yaw,'LASER_PITCH');mesh(pitch,'MINING_HEAD',[cyl(.95,.55,n,[0,-.15,0],P.armor),cyl(.66,.4,n,[0,-.6,0],P.steel),ring(.58,.085,n,[0,-.81,0],P.amber),cyl(.4,.025,n,[0,-.82,0],P.dark),cyl(.22,.03,n,[0,-.84,0],P.cyan)],mat);
 socket(pitch,'SOCKET_LASER',[0,-.86,0],'laser_emitter',[0,-1,0]);
 const laser=node(root,'LASER_BEAM',[0,0,0],'optional_viewer_effect');mesh(laser,'BEAM_CORE',[beam([0,7.64,0],[0,.1,0],.09,0xffa24e)],glow);
 const effect=node(root,'GROUND_EFFECT',[0,0,0],'optional_viewer_effect');const burns=[ring(1.05,.055,n,[0,.075,0],P.amber),ring(.55,.04,n,[0,.085,0],0xffd29e)];if(lod<2)for(let i=0;i<12;i++){const a=i*Math.PI/6;burns.push(beam([Math.cos(a)*.3,.1,Math.sin(a)*.3],[Math.cos(a)*1.35,.4+(i%3)*.17,Math.sin(a)*1.35],.035,P.amber));}mesh(effect,'ABLATION_PREVIEW',burns,glow);
 const stream=node(root,'RESOURCE_STREAM',[0,0,0],'optional_viewer_effect');const chunks=[];for(let i=0;i<8;i++){const a=i*2.4;chunks.push(armor([.14,.24,.14],[Math.cos(a)*.35,1+i*.65,Math.sin(a)*.35],P.amber,lod,[.2,a,.3]));}mesh(stream,'MINERAL_RECOVERY_PREVIEW',chunks,mat);
 socket(root,'SOCKET_RESOURCE_OUTPUT',[0,9.7,-3.7],'mineral_output',[0,0,-1]);socket(root,'SOCKET_POWER',[0,9.8,-2.4],'power',[0,1,0]);socket(root,'SOCKET_TRAFFIC_ENTRY',[0,0,8],'traffic');socket(root,'SOCKET_TRAFFIC_EXIT',[0,0,-8],'traffic',[0,0,-1]);
 if(lod===2){root.updateMatrixWorld(true);const baked=[],remove=[];root.traverse(o=>{if(o.isMesh){if(!['BEAM_CORE','ABLATION_PREVIEW','MINERAL_RECOVERY_PREVIEW'].includes(o.name))baked.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);}});for(const o of remove){const p=new T.Group();p.name=o.name;p.userData={static_lookup_only:true};o.parent.add(p);o.removeFromParent();}mesh(root,'DISTANCE_GEOMETRY',baked,mat);root.traverse(o=>o.userData.static_lookup_only=true);}
 return root;
}
