import * as T from 'three';
import {palette as P,box,cyl,ring,beam,armor,node,mesh,socket,merged} from './settlement-industry-shape.mjs';
export const opticalPath=[[-2.8,3.5,-1.6],[-1.3,3.5,-1.6],[-1.3,3.5,.6],[1.5,3.5,.6],[1.5,3.5,-.6],[1.5,1.815,-.6]];
export const definitions={writer:{label:'LIT-01 / Chip manufacturing unit',root:'LITHOGRAPHY_ROOT',plot:[9,7]}};
export function buildModel(family,lod){
 const root=new T.Group();root.name='LITHOGRAPHY_ROOT';root.userData={family:'chip-manufacturing',lod,damage_level:0,static:lod===2,plot_m:[9,7],units:'meters'};
 const mat=new T.MeshStandardMaterial({name:'INDUSTRY_PALETTE',vertexColors:true,roughness:.4,metalness:.45});
 const optic=new T.MeshStandardMaterial({name:'OPTICAL_METAL',vertexColors:true,roughness:.15,metalness:.85});
 const light=new T.MeshStandardMaterial({name:'LASER_CYAN',vertexColors:true,emissive:0x20cfff,emissiveIntensity:2.5});
 const n=lod===0?48:lod===1?24:12;
 const fixed=[armor([8,.28,6],[0,.14,0],P.dark,lod),armor([7.65,.3,5.65],[0,.43,0],P.armor,lod),armor([7.1,.18,5.1],[0,.67,0],P.plate,lod),armor([3.0,.64,3.9],[1.35,1.08,-.3],P.dark,lod),armor([1.55,1.5,3.8],[-2.7,1.52,0],P.armor,lod),armor([1.67,.16,3.9],[-2.7,2.35,0],P.pale,lod),box([.9,.4,.06],[-2.7,1.9,1.94],P.dark),box([.65,.06,.07],[-2.7,1.9,1.98],P.cyan),armor([1.1,.65,1.1],[-2.8,3.5,-1.6],P.armor,lod),cyl(.18,.32,n,[-2.12,3.5,-1.6],P.amber,[0,0,Math.PI/2])];
 for(const x of [-3.35,3.35])for(const z of [-2.35,2.35])fixed.push(cyl(.32,.14,n,[x,.07,z],P.steel));
 // Elevated optical bench: pillars are behind the folded beam, leaving its front readable.
 for(const x of [-3.25,2.35])fixed.push(box([.22,2.8,.22],[x,2.14,-2.05],P.steel));
 fixed.push(box([5.85,.2,.3],[-.45,3.64,-2.05],P.pale));
 for(let i=1;i<=4;i++){const p=opticalPath[i];fixed.push(beam([p[0],3.22,-2.05],[p[0],3.22,p[2]],.12,P.steel),cyl(.1,.28,12,[p[0],3.32,p[2]],P.amber));
 const incoming=new T.Vector3(...p).sub(new T.Vector3(...opticalPath[i-1])).normalize(),outgoing=new T.Vector3(...opticalPath[i+1]).sub(new T.Vector3(...p)).normalize(),normal=incoming.sub(outgoing).normalize();
 const pivot=node(root,`MIRROR_${i}_PIVOT`,p);pivot.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);pivot.userData.optical_normal=normal.toArray();
 mesh(pivot,`MIRROR_${i}_ASSEMBLY`,[cyl(.36,.065,lod===0?32:12,[0,0,-.045],P.armor,[Math.PI/2,0,0]),cyl(.3,.018,lod===0?32:12,[0,0,-.009],P.mirror,[Math.PI/2,0,0]),ring(.335,.025,lod===0?32:12,[0,0,-.006],P.amber,[0,0,0])],optic);
 }
 // Open focusing collar: the beam passes through the empty optical bore.
 fixed.push(ring(.24,.08,n,[1.5,2.85,-.6],P.pale),ring(.19,.055,n,[1.5,2.62,-.6],P.steel),beam([2.35,3.2,-2.05],[2.35,2.85,-.6],.12,P.armor),beam([2.35,2.85,-.6],[1.8,2.85,-.6],.12,P.armor));
 for(const z of [-1.95,1.35])fixed.push(box([3.5,.1,.1],[1.35,1.45,z],P.steel));
 const stage=node(root,'WAFER_STAGE',[1.5,1.52,-.6]);mesh(stage,'STAGE_CARRIAGE',[armor([2.75,.16,2.75],[0,0,0],P.armor,lod),cyl(1.18,.18,n,[0,.17,0],P.dark),ring(1.15,.04,n,[0,.27,0],P.amber)],mat);
 const wafer=node(stage,'WAFER_CHUCK',[0,.28,0]);const waferParts=[cyl(1.08,.03,n,[0,0,0],0x354a83)];
 if(lod<2){for(let x=-.84;x<=.85;x+=.24)for(let z=-.84;z<=.85;z+=.24)if(Math.hypot(x,z)<.94){waferParts.push(box([.205,.006,.205],[x,.019,z],(Math.round((x+.84)/.24)+Math.round((z+.84)/.24))%2?0x688bb6:0x466c9c));if(lod===0)waferParts.push(box([.13,.004,.012],[x,.024,z],P.cyan),box([.012,.004,.13],[x,.024,z],P.amber));}}
 mesh(wafer,'PATTERNED_WAFER',waferParts,optic);
 // Twin cassette ports and visible stacked wafer edges.
 for(const x of [-.65,.45]){fixed.push(armor([.88,.65,.8],[x,1.04,2.0],P.armor,lod),box([.65,.43,.04],[x,1.04,2.43],P.dark));for(let j=0;j<(lod===2?2:5);j++)fixed.push(box([.57,.025,.09],[x,.89+j*.075,2.47],P.plate));}
 if(lod<2){for(let i=0;i<10;i++)fixed.push(box([.65,.035,.08],[-2.7,2.45,-1.25+i*.25],P.dark));for(const x of [-3.65,3.65])for(let i=0;i<5;i++)fixed.push(box([.25,.012,.09],[x,.767,1.35+i*.2],P.amber,[0,.5,0]));}
 if(lod===0){for(const x of [-3.4,3.4])for(const z of [-2.3,2.3])fixed.push(cyl(.05,.025,12,[x,.778,z],P.dark));for(let i=0;i<12;i++)fixed.push(box([.04,.8,.12],[-3.49,1.48,-1.4+i*.22],P.steel));}
 mesh(root,'MACHINE_CHASSIS',fixed,mat);
 const laser=node(root,'LASER_PATH',[0,0,0],'optional_viewer_effect');mesh(laser,'LASER_SEGMENTS',opticalPath.slice(1).map((p,i)=>beam(opticalPath[i],p,.022,P.cyan)),light);
 socket(root,'SOCKET_POWER',[-4,.5,-1.8],'power',[-1,0,0]);socket(root,'SOCKET_WAFER_INPUT',[-.65,1.0,2.55],'wafer_input');socket(root,'SOCKET_CHIP_OUTPUT',[.45,1.0,2.55],'chip_output');socket(root,'SOCKET_BEAM_FOCUS',[1.5,1.815,-.6],'optical_focus',[0,-1,0]);
 if(lod===2){root.updateMatrixWorld(true);const parts=[],remove=[];root.traverse(o=>{if(o.isMesh){parts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);}});for(const o of remove){const placeholder=new T.Group();placeholder.name=o.name;placeholder.userData={static_lookup_only:true};o.parent.add(placeholder);o.removeFromParent();}mesh(root,'DISTANCE_GEOMETRY',parts,mat);root.traverse(o=>o.userData.static_lookup_only=true);}
 return root;
}
