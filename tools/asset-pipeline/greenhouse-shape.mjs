import * as T from 'three';
import {palette as P,box,cyl,ring,beam,armor,node,mesh,socket,prep} from './settlement-industry-shape.mjs';
export const definitions={greenhouse:{label:'VER-01 / Greenhouse operation',root:'GREENHOUSE_ROOT',plot:[12,14]}};
function leaf(length,width,pos,angle,tilt,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-width,.08,length*.45,0,tilt,length,width,.08,length*.45,0,.13,length*.43,0,.02,length*.43],3));g.setIndex([0,1,4,1,2,4,2,3,4,3,0,4,1,0,5,2,1,5,3,2,5,0,3,5]);g.computeVertexNormals();return prep(g,color,pos,[0,angle,0]);}
export function buildModel(family,lod){
 const root=new T.Group();root.name='GREENHOUSE_ROOT';root.userData={family:'greenhouse',lod,damage_level:0,static:lod===2,plot_m:[12,14],units:'meters',swept_envelope_m:{min:[-5,0,-6],max:[5,5.4,6]}};
 const mat=new T.MeshStandardMaterial({name:'INDUSTRY_PALETTE',vertexColors:true,metalness:.25,roughness:.5});
 const glass=new T.MeshStandardMaterial({name:'CULTIVATION_GLAZING',vertexColors:true,color:0xffffff,transparent:true,opacity:.19,depthWrite:false,metalness:.15,roughness:.22});
 const glow=new T.MeshStandardMaterial({name:'IRRIGATION_PREVIEW',vertexColors:true,emissive:0x4cbccb,emissiveIntensity:.7,transparent:true,opacity:.5,depthWrite:false});
 const n=lod===0?32:lod===1?16:8,body=[armor([10,.28,12],[0,.14,0],P.dark,lod),armor([9.6,.32,11.6],[0,.44,0],P.armor,lod),armor([8.5,.16,9.5],[0,.68,.5],P.plate,lod)];
 const fixed=[box([7.8,.32,8.8],[0,.92,.3],P.armor),box([1.2,.07,8.4],[0,1.115,.3],P.pale)];
 const eave=3.4,peak=5.2,half=3.8,zs=[-4,-2,0,2,4.6];
 for(const z of zs){for(const s of [-1,1]){body.push(beam([s*half,1.05,z],[s*half,eave,z],.15,P.pale),beam([s*half,eave,z],[0,peak,z],.15,P.pale));}if(lod===0)for(const x of [-3.8,3.8])body.push(box([.24,.13,.25],[x,1.15,z],P.amber));}
 for(const x of [-half,half])body.push(box([.17,.18,8.8],[x,eave,.3],P.armor),box([.2,.3,8.8],[x,1.2,.3],P.pale));
 body.push(box([.45,.18,8.9],[0,5.26,.3],P.armor));
 // Opaque rear climate wall; front has a real doorway and separate sliding leaves.
 body.push(box([7.6,2.3,.14],[0,2.2,-4.03],P.armor));
 for(const s of [-1,1])body.push(box([2.7,.35,.15],[s*2.45,1.22,4.6],P.armor),box([.14,2.4,.2],[s*1.08,2.3,4.6],P.pale));
 body.push(box([2.3,.28,.28],[0,3.55,4.6],P.armor),box([2.4,.16,1.0],[0,.82,5.1],P.pale),box([2.4,.18,.8],[0,.55,5.55],P.armor),box([2.4,.18,.5],[0,.28,5.75],P.dark));
 // End gables: fan outlet on rear, glazed triangular front left open at top for geometry below.
 const glazing=[];for(const s of [-1,1]){
 glazing.push(box([.025,2.02,8.5],[s*3.79,2.32,.3],0x8ad5d2));
 const angle=s*Math.atan2(1.8,3.8);glazing.push(box([Math.hypot(3.8,1.8)-.1,.025,8.5],[s*1.9,4.3,.3],0xa1e6da,[0,0,-angle]));
 glazing.push(box([2.53,1.9,.025],[s*2.43,2.34,4.6],0x8ad5d2));
 }
 // Triangular sealed gable panel, normals generated from consistently wound faces.
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-3.7,3.48,4.6,3.7,3.48,4.6,0,5.12,4.6],3));g.setIndex([0,1,2]);g.computeVertexNormals();glazing.push(prep(g,0xa1e6da));
 const rear=new T.BufferGeometry();rear.setAttribute('position',new T.Float32BufferAttribute([-3.7,3.48,-4.03,0,5.12,-4.03,3.7,3.48,-4.03],3));rear.setIndex([0,1,2]);rear.computeVertexNormals();body.push(prep(rear,P.armor));
 const canopy=node(root,'CANOPY',[0,0,0],'hideable_cover');mesh(canopy,'GLAZING',glazing,lod===2?mat:glass);
 // Rear water and nutrient recovery plant.
 for(const x of [-2.7,2.7]){body.push(cyl(.65,2.7,n,[x,2,-5.05],P.armor),ring(.65,.06,n,[x,.8,-5.05],P.pale),ring(.65,.06,n,[x,3.2,-5.05],P.pale),cyl(.43,.15,n,[x,3.43,-5.05],P.pale),box([.08,1.5,.12],[x+.63,2,-5.05],P.cyan));}
 body.push(armor([2.3,1.3,1.1],[0,1.33,-5.1],P.armor,lod),armor([2.4,.15,1.2],[0,2.06,-5.1],P.pale,lod),box([1,.18,.04],[0,1.65,-5.68],P.cyan));
 for(const x of [-2.7,2.7])body.push(beam([x,1.2,-5.05],[0,1.2,-5.05],.14,P.steel));
 const fan=node(root,'CLIMATE_FAN',[0,3.75,-4.2]);const blades=[cyl(.13,.12,n,[0,0,0],P.amber,[Math.PI/2,0,0])];for(let i=0;i<5;i++){const a=i*Math.PI*2/5;blades.push(box([.18,.43,.05],[Math.sin(a)*.31,Math.cos(a)*.31,0],P.steel,[0,0,-a]));}mesh(fan,'FAN_ROTOR',blades,mat);body.push(ring(.65,.09,n,[0,3.75,-4.2],P.pale,[0,0,0]));
 // Roof-mounted collector strips remain legible in the map tier.
 for(const s of [-1,1])for(let i=0;i<(lod===2?2:5);i++)body.push(box([.68,.04,lod===2?3.4:1.35],[s*.7,4.93,-3.05+i*(lod===2?4.15:1.72)],0x263d62,[0,0,-s*Math.atan2(1.8,3.8)]));
 const crop=[],beds=[];for(const x of [-2.25,2.25]){
 beds.push(armor([2.25,.24,7.7],[x,1.46,.3],P.pale,lod),box([2.02,.08,7.45],[x,1.62,.3],P.dark));
 for(const z of [-2.8,.3,3.4])beds.push(box([1.85,.35,.2],[x,1.25,z],P.steel));
 for(const dx of [-.55,.55])for(let i=0;i<6;i++){const z=-2.85+i*1.25;const count=lod===0?10:6;
 if(lod<2){beds.push(cyl(.22,.09,lod===0?16:8,[x+dx,1.68,z],P.armor));crop.push(cyl(.035,.37,6,[x+dx,1.86,z],0x56844c));for(let j=0;j<count;j++)crop.push(leaf(.38+(j%3)*.06,.12,[x+dx,1.76+(j%2)*.13,z],j*Math.PI*2/count+i*.4,.28+(j%2)*.12,j%2?0x64a86b:0x32764f));}
 }
 }
 if(lod<2){fixed.push(...beds);mesh(root,'CROP_CANOPY',crop,mat);}else{node(root,'CROP_CANOPY',[0,0,0],'static_lookup_only');}
 const gantry=node(root,'IRRIGATION_GANTRY',[0,2.95,-2.9]);mesh(gantry,'SERVICE_BRIDGE',[box([6.5,.18,.26],[0,0,0],P.armor),box([5.8,.05,.12],[0,-.13,0],P.cyan),...[-2.8,-1.7,1.7,2.8].map(x=>cyl(.075,.15,n,[x,-.17,0],P.amber))],mat);
 const mist=node(gantry,'IRRIGATION_MIST',[0,0,0],'optional_viewer_effect');const droplets=[];for(const x of [-2.8,-1.7,1.7,2.8])for(let i=0;i<3;i++)droplets.push(beam([x+(i-1)*.12,-.36,0],[x+(i-1)*.2,-.68,0],.022,P.cyan));mesh(mist,'MIST_STREAMS',droplets,glow);
 for(const x of [-3.2,3.2])fixed.push(box([.08,.12,7.7],[x,2.95,.3],P.steel));
 for(const s of [-1,1]){const door=node(root,s<0?'DOOR_L':'DOOR_R',[s*.5,2.22,4.7]);mesh(door,s<0?'DOOR_L_PANEL':'DOOR_R_PANEL',[box([.98,2.25,.12],[0,0,0],P.pale),box([.7,1.22,.025],[0,.2,.073],0x365d68),box([.36,.055,.035],[0,-.65,.078],P.cyan)],mat);}
 if(lod===0){for(let i=0;i<18;i++)fixed.push(box([.85,.016,.05],[0,1.16,-3.6+i*.44],P.steel));for(const x of [-2.25,2.25])for(let i=0;i<7;i++)fixed.push(box([.03,.1,.11],[x+1.14,1.47,-3+i],P.cyan));}
 mesh(root,'GREENHOUSE_FRAME',body,mat);mesh(root,'CULTIVATION_INTERIOR',fixed,mat);
 socket(root,'SOCKET_WATER',[-2.7,.9,-5.75],'water',[0,0,-1]);socket(root,'SOCKET_NUTRIENT',[2.7,.9,-5.75],'nutrient',[0,0,-1]);socket(root,'SOCKET_POWER',[0,.8,-5.75],'power',[0,0,-1]);socket(root,'SOCKET_HARVEST',[0,.76,5.45],'produce');socket(gantry,'SOCKET_IRRIGATION',[0,-.23,0],'irrigation',[0,-1,0]);
 if(lod===2){root.updateMatrixWorld(true);const parts=[],remove=[];root.traverse(o=>{if(o.isMesh){if(!['CULTIVATION_INTERIOR','SERVICE_BRIDGE','MIST_STREAMS','FAN_ROTOR'].includes(o.name))parts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);}});for(const o of remove){const p=new T.Group();p.name=o.name;p.userData={static_lookup_only:true};o.parent.add(p);o.removeFromParent();}mesh(root,'DISTANCE_GEOMETRY',parts,mat);root.traverse(o=>o.userData.static_lookup_only=true);}
 return root;
}
