// Original editable procedural masters. Metres, +Y up, +Z forward.
import * as T from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
export const palette={armor:0x29464f,plate:0x819fa5,pale:0xc6d4d0,dark:0x101e25,steel:0x526a72,cyan:0x8ce8f0,amber:0xe8b75f,tire:0x18252b,mirror:0xc1d9df};
const P=palette, Y=new T.Vector3(0,1,0);
function prep(g,color,pos=[0,0,0],rot=[0,0,0]){
 const a=g.index?g.toNonIndexed():g.clone();g.dispose();for(const k of Object.keys(a.attributes))if(!['position','normal'].includes(k))a.deleteAttribute(k);
 a.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));
 const c=new T.Color(color),n=a.attributes.position.count,v=new Uint8Array(n*3);for(let i=0;i<n;i++){v[i*3]=Math.round(c.r*255);v[i*3+1]=Math.round(c.g*255);v[i*3+2]=Math.round(c.b*255);}a.setAttribute('color',new T.Uint8BufferAttribute(v,3,true));a.clearGroups();return a;
}
const box=(s,p,c,r)=>prep(new T.BoxGeometry(...s),c,p,r);
const cyl=(r,h,n,p,c,rot)=>prep(new T.CylinderGeometry(r,r,h,n),c,p,rot);
const ring=(r,t,n,p,c,rot=[Math.PI/2,0,0])=>prep(new T.TorusGeometry(r,t,4,n),c,p,rot);
function beam(a,b,w,c){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va),g=box([w,d.length(),w],[0,0,0],c);return g.applyMatrix4(new T.Matrix4().compose(va.add(vb).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(Y,d.normalize()),new T.Vector3(1,1,1)));}
function augerFlight(segments){
 const p=[],indices=[];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*6,y=-1+i/segments*1.6;for(const [r,h] of [[.13,-.025],[.31,-.025],[.31,.025],[.13,.025]])p.push(Math.cos(a)*r,y+h,Math.sin(a)*r);}
 for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=b+4,d=a+4;indices.push(a,b,d,b,c,d);}indices.push(0,3,1,1,3,2);const k=segments*4;indices.push(k,k+1,k+3,k+1,k+2,k+3);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return prep(g,P.steel);
}
function armor(s,p,c,lod=1,rot=[0,0,0]){
 const [w,h,d]=s,b=Math.min(w,d)*.13,pts=[[-w/2+b,-d/2],[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]],shape=new T.Shape();pts.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
 const bevel=lod===0?Math.min(.045,h*.18):0,g=new T.ExtrudeGeometry(shape,{depth:h-2*bevel,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);g.scale(w/(w+2*bevel),1,d/(d+2*bevel));g.translate(0,-h/2+bevel,0);return prep(g,c,p,rot);
}
function merged(parts){const g=mergeGeometries(parts,false);if(!g)throw Error('Incompatible geometry');const out=mergeVertices(g,1e-6);g.dispose();parts.forEach(p=>p.dispose());return out;}
function node(parent,name,pos=[0,0,0],role='engine_pivot'){const o=new T.Group();o.name=name;o.position.fromArray(pos);o.userData={role};parent.add(o);return o;}
function mesh(parent,name,parts,material){const o=new T.Mesh(merged(parts),material);o.name=name;parent.add(o);return o;}
function socket(parent,name,pos,kind,normal=[0,0,1]){const o=node(parent,name,pos,'socket');o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal));o.userData={role:'socket',kind,interface:kind==='cargo'?'INDUSTRY_CASSETTE_A':undefined};return o;}
function vents(parts,pos,count=7,axis='z'){for(let i=0;i<count;i++){const p=[...pos];p[axis==='z'?2:0]+=(i-(count-1)/2)*.16;parts.push(box(axis==='z'?[.7,.035,.055]:[.055,.035,.6],p,P.dark));}}
function bolts(parts,xs,y,zs,n){for(const x of xs)for(const z of zs)parts.push(cyl(.045,.025,n,[x,y,z],P.dark));}
function buildCassette(lod,root,mat){
 const s=lod===0?16:8,parts=[armor([1.65,.18,2.2],[0,.09,0],P.dark,lod),armor([1.48,.96,1.98],[0,.66,0],P.armor,lod),armor([1.59,.12,2.1],[0,1.2,0],P.plate,lod),box([.68,.035,.9],[0,1.278,0],P.dark)];
 // Side-wall faces lie at x=±0.74. Give the corner strips a real 20 mm
 // stand-off so they cannot fight those faces, including after compression.
 for(const x of [-.68,.68])parts.push(box([.16,1.06,.2],[x,.7,.76],P.plate),box([.16,1.06,.2],[x,.7,-.76],P.plate));
 for(const x of [-.66,.66])parts.push(beam([x,1.32,-.45],[x,1.32,.45],.065,P.steel));
 parts.push(box([.07,.52,.6],[.751,.65,0],P.dark),box([.42,.12,.03],[0,.97,1.0],P.amber));
 const level=node(root,'CASSETTE_LEVEL',[.797,.41,0]);mesh(level,'CAPACITY_INDICATOR',[box([.02,.46,.44],[0,.23,0],P.cyan)],mat);level.scale.y=.05;
 if(lod===0){vents(parts,[0,1.29,-.72],5,'x');bolts(parts,[-.55,.55],1.273,[-.86,.86],s);}
 mesh(root,'CASSETTE_SHELL',parts,mat);socket(root,'SOCKET_CARGO',[0,0,0],'cargo');socket(root,'SOCKET_FILL',[0,1.28,0],'ore_inlet',[0,1,0]);
}
function buildDrill(lod,root,mat){
 const n=lod===0?24:lod===1?12:8,fixed=[armor([3.6,.5,3.0],[0,1.05,0],P.armor,lod),armor([3.1,.22,2.65],[0,1.42,0],P.plate,lod),armor([1.2,1.05,1.6],[-1.05,2.05,.15],P.armor,lod),armor([1.07,.12,1.45],[-1.05,2.64,.15],P.pale,lod),box([.75,.34,.05],[-1.05,2.25,1.0],P.dark),box([.55,.065,.06],[-1.05,2.24,1.035],P.cyan),cyl(.72,.36,n,[.35,.47,0],P.dark),ring(.64,.09,n,[.35,.65,0],P.amber)];
 // Three independently retractable landing/anchoring feet; fixed braces stay with the frame.
 for(let i=0;i<3;i++){const a=(i/3)*Math.PI*2+Math.PI,x=Math.cos(a)*2.15,z=Math.sin(a)*2.15;
 fixed.push(beam([x*.55,1.25,z*.55],[x,1.0,z],.24,P.armor),cyl(.19,.68,n,[x,.69,z],P.steel));
 const f=node(root,`ANCHOR_${i+1}`,[x,0,z]);mesh(f,`ANCHOR_${i+1}_MESH`,[armor([.95,.17,.82],[0,.085,0],P.dark,lod),armor([.68,.11,.59],[0,.22,0],P.plate,lod),cyl(.095,.45,n,[0,.32,0],P.steel)],mat);
 }
 const mast=node(root,'MAST_FOLD',[.35,1.48,-.52]);const rails=[armor([1.05,.3,.9],[0,.14,0],P.armor,lod)];
 for(const x of [-.39,.39]){rails.push(box([.17,4.65,.22],[x,2.45,0],P.armor),box([.045,4.2,.055],[x,2.5,.135],P.steel));}
 rails.push(armor([1.04,.38,.63],[0,4.74,0],P.plate,lod),box([.5,.12,.06],[0,4.76,.35],P.amber));
 for(let i=0;i<(lod===2?3:6);i++)rails.push(beam([-.32,.45+i*.7,-.1],[.32,1.0+i*.7,-.1],.085,P.steel));
 mesh(mast,'MAST_FRAME',rails,mat);
 const feed=node(mast,'DRILL_FEED',[0,2.65,.52]);mesh(feed,'DRIVE_HEAD',[armor([1.02,.7,.91],[0,0,0],P.armor,lod),armor([1.08,.13,.95],[0,.39,0],P.plate,lod),box([.56,.075,.035],[0,.05,.48],P.cyan),cyl(.32,.24,n,[0,-.43,0],P.steel)],mat);
 const spin=node(feed,'DRILL_SPIN',[0,-1.8,0]);const cutting=[cyl(.13,2.42,n,[0,.1,0],P.steel),cyl(.26,.22,n,[0,-1.1,0],P.dark)];
 cutting.push(augerFlight(lod===0?144:lod===1?60:24));
 mesh(spin,'AUGER',cutting,mat);socket(spin,'SOCKET_DRILL_TIP',[0,-1.21,0],'tool',[0,-1,0]);
 // Ore leaves the collar through a protected screw-conveyor into a removable cassette.
 const chute=node(root,'ORE_CHUTE_SWING',[.82,.72,0]);mesh(chute,'ORE_CHUTE',[beam([0,0,0],[1.53,.92,0],.37,P.armor),armor([.8,.3,.8],[1.78,1.1,0],P.plate,lod)],mat);
 for(let i=0;i<(lod===2?2:4);i++)fixed.push(cyl(.10,2.6,n,[.68+i*.24,2.92,-1.03],P.steel),ring(.105,.025,n,[.68+i*.24,2.2,-1.03],P.amber));
 if(lod<2){vents(fixed,[-1.05,2.715,.12],7);fixed.push(beam([-1.72,1.58,-1.25],[-1.72,2.9,-1.25],.075,P.steel),box([.15,.16,.15],[-1.72,3.0,-1.25],P.amber));}
 if(lod===0){bolts(fixed,[-1.38,-.72],2.715,[-.45,.7],8);for(let i=0;i<9;i++)fixed.push(box([.42,.045,.05],[-1.05,1.63+i*.065,-.69],P.dark));for(const z of [-1.13,1.13])fixed.push(beam([-1.5,1.75,z],[-.48,1.75,z],.055,P.steel));}
 mesh(root,'DRILL_CHASSIS',fixed,mat);socket(root,'SOCKET_CASSETTE',[2.6,0,0],'cargo');socket(root,'SOCKET_POWER',[-1.81,1.05,-.5],'power',[-1,0,0]);
 root.userData.swept_envelope_m={min:[-2.9,0,-3.0],max:[3.5,6.5,3.0]};
}
function buildHauler(lod,root,mat){
 const n=lod===0?32:lod===1?16:8,parts=[armor([2.62,.5,6.7],[0,1.4,.3],P.armor,lod),armor([.78,.18,4.35],[0,1.72,-1.18],P.plate,lod),armor([.7,.18,4.35],[-1.04,1.72,-1.18],P.plate,lod),armor([.7,.18,4.35],[1.04,1.72,-1.18],P.plate,lod),armor([2.48,.84,2.4],[0,1.94,2.27],P.armor,lod),armor([2.1,.14,1.6],[0,2.46,2.08],P.plate,lod),armor([2.3,.23,1.05],[0,1.77,3.42],P.plate,lod,[.19,0,0]),box([1.76,.38,.13],[0,2.14,3.5],P.dark),box([.98,.07,.14],[0,2.16,3.575],P.cyan),box([2.5,.22,.28],[0,1.14,3.67],P.dark)];
 for(const x of [-.97,.97]){parts.push(box([.35,.12,.1],[x,1.86,3.91],P.cyan),box([.3,.08,.08],[x,1.34,3.82],P.amber),box([.13,.12,4.22],[x,1.88,-1.13],P.dark));}
 for(const z of [-2.55,-.2,2.35]){parts.push(cyl(.15,3.4,n,[0,.98,z],P.steel,[0,0,Math.PI/2]));for(const s of [-1,1]){
  const id=`${s<0?'L':'R'}_${z===-2.55?'REAR':z===-.2?'MID':'FRONT'}`,susp=node(root,`SUSPENSION_${id}`,[s*1.53,.98,z]);
  // Suspension is parented to its wheel group, preserving six independently usable modules.
  const steer=node(susp,`STEER_${id}`),wheel=node(steer,`WHEEL_${id}`);
  const w=[cyl(lod===2?.98:.94,.64,n,[0,0,0],P.tire,[0,0,Math.PI/2]),cyl(.6,.67,n,[0,0,0],P.steel,[0,0,Math.PI/2]),cyl(.35,.70,n,[0,0,0],P.armor,[0,0,Math.PI/2]),cyl(.13,.73,n,[0,0,0],P.amber,[0,0,Math.PI/2])];
  if(lod<2){for(let i=0;i<(lod===0?24:12);i++){const a=i/(lod===0?24:12)*Math.PI*2;w.push(box([.67,.10,.08],[0,Math.sin(a)*.9387,Math.cos(a)*.9387],P.tire,[-a,0,0]));}for(let i=0;i<6;i++){const a=i/6*Math.PI*2;w.push(cyl(.042,.72,6,[0,Math.sin(a)*.43,Math.cos(a)*.43],P.pale,[0,0,Math.PI/2]));}}
  mesh(wheel,`WHEEL_${id}_MESH`,w,mat);
  parts.push(armor([.86,.18,1.7],[s*1.5,2.11,z],P.armor,lod),box([.05,.09,.46],[s*1.94,2.13,z+.35],P.amber));
  if(lod===0)parts.push(beam([s*.9,1.42,z-.3],[s*1.48,1.1,z+.3],.12,P.steel));
 }}
 const sensor=node(root,'SENSOR_YAW',[0,2.66,2.0]);mesh(sensor,'SENSOR_HEAD',[cyl(.16,.36,n,[0,0,0],P.steel),armor([.75,.34,.44],[0,.26,0],P.armor,lod),box([.56,.19,.045],[0,.26,.24],P.dark),box([.32,.065,.05],[0,.26,.266],P.cyan)],mat);
 const slide=node(root,'CARGO_SLIDE',[0,0,-4.8]),lift=node(slide,'CARGO_LIFT',[0,0,0]);
 mesh(lift,'LIFT_FORKS',[box([.15,.12,2.15],[-.51,.06,.05],P.steel),box([.15,.12,2.15],[.51,.06,.05],P.steel),box([1.47,.2,.22],[0,.32,1.25],P.armor)],mat);
 // Telescoping rails travel with the cargo slide; the long upper bed rails remain fixed.
 const telescope=node(slide,'LIFT_TELESCOPE');mesh(telescope,'LIFT_RAILS',[box([.12,1.8,.12],[-.51,.9,1.25],P.steel),box([.12,1.8,.12],[.51,.9,1.25],P.steel)],mat);
 socket(lift,'SOCKET_CARGO',[0,.12,0],'cargo');socket(root,'SOCKET_BED',[0,1.84,-1.05],'cargo');socket(root,'SOCKET_TOW',[0,1.15,3.95],'tow');
 if(lod<2){vents(parts,[0,2.55,2.1],7,'x');for(const x of [-1.08,1.08])parts.push(beam([x,2.62,1.35],[x,2.62,2.8],.055,P.steel));}
 if(lod===0){bolts(parts,[-.84,.84],1.822,[-2.85,-1.5,-.1,.65],8);parts.push(beam([-.91,2.52,1.37],[-.91,3.07,1.37],.028,P.steel));}
 mesh(root,'HAULER_CHASSIS',parts,mat);
 root.userData.swept_envelope_m={min:[-2.15,0,-5.9],max:[2.15,3.2,4.0]};
}
function buildMirror(lod,root,mat,mirror){
 const n=lod===0?24:lod===1?12:8;
 mesh(root,'MIRROR_PEDESTAL',[armor([1.32,.14,1.2],[0,.07,0],P.armor,lod),cyl(.22,1.58,n,[0,.89,0],P.steel),armor([.58,.5,.58],[0,1.55,0],P.armor,lod),box([.24,.07,.035],[0,1.56,.31],P.amber)],mat);
 const yaw=node(root,'MIRROR_YAW',[0,2.2,0]),pitch=node(yaw,'MIRROR_PITCH');pitch.rotation.x=-.65;
 // Optical face points local +Z. Root pitch has enough ground clearance for the full range.
 const back=[cyl(1.55,.105,6,[0,0,0],P.armor,[Math.PI/2,0,0]),cyl(.24,.27,n,[0,0,-.16],P.steel,[Math.PI/2,0,0]),beam([0,-.38,-.24],[0,0,-.24],.13,P.steel)];
 if(lod<2)for(let i=0;i<6;i++){const a=i/6*Math.PI*2;back.push(beam([0,0,-.19],[Math.sin(a)*1.32,Math.cos(a)*1.32,-.075],.045,P.steel));}
 if(lod===0)for(let i=0;i<6;i++){const a=i/6*Math.PI*2;back.push(cyl(.035,.04,8,[Math.sin(a)*1.48,Math.cos(a)*1.48,.064],P.amber,[Math.PI/2,0,0]));}
 mesh(pitch,'MIRROR_BACK',back,mat);mesh(pitch,'OPTICAL_FACE',[cyl(1.492,.012,6,[0,0,.061],P.mirror,[Math.PI/2,0,0])],mirror);
 socket(pitch,'SOCKET_OPTICAL_CENTER',[0,0,.068],'optical_normal');socket(root,'SOCKET_POWER',[0,.21,-.6],'power',[0,0,-1]);
}
function buildFurnace(lod,root,mat){
 const n=lod===0?32:lod===1?16:8,parts=[armor([3.35,.3,3.0],[0,.15,0],P.dark,lod),armor([2.6,1.85,2.25],[0,1.32,0],P.armor,lod),armor([2.76,.15,2.4],[0,2.34,0],P.plate,lod),armor([1.6,.5,1.46],[0,2.66,0],P.armor,lod),cyl(.68,.25,n,[0,3.18,-1.05],P.dark,[-1.16,0,0]),ring(.60,.06,n,[0,3.24,-1.188],P.amber,[-Math.PI/2-1.16,0,0]),cyl(.50,.01,n,[0,3.24,-1.20],P.dark,[-1.16,0,0]),box([.95,.35,.07],[0,1.43,1.15],P.dark),box([.63,.065,.08],[0,1.44,1.19],P.cyan)];
 for(const s of [-1,1]){parts.push(armor([.4,1.3,1.8],[s*1.48,1.05,-.1],P.steel,lod));for(let i=0;i<(lod===2?3:8);i++)parts.push(box([.12,.8,.065],[s*1.72,1.04,-.74+i*(lod===2?.61:.175)],P.dark));}
 const hatch=node(root,'CRUCIBLE_HATCH',[0,.64,1.22]);mesh(hatch,'CRUCIBLE_DOOR',[armor([1.35,.52,.16],[0,0,0],P.plate,lod),box([.58,.08,.075],[0,0,.12],P.amber)],mat);
 if(lod<2){for(const s of [-1,1])parts.push(beam([s*1.02,.35,-.92],[s*1.02,2.28,-.92],.08,P.steel));vents(parts,[0,2.43,-.92],8,'x');}
 if(lod===0){bolts(parts,[-1.17,1.17],2.43,[-.94,.94],8);parts.push(cyl(.12,.36,n,[1.24,1.9,.8],P.amber,[0,0,Math.PI/2]));}
 mesh(root,'FURNACE_BODY',parts,mat);socket(root,'SOCKET_RECEIVER',[0,3.24,-1.20],'solar_receiver',[0,Math.cos(1.16),-Math.sin(1.16)]);socket(root,'SOCKET_FEED',[-1.8,.25,0],'material_input',[-1,0,0]);socket(root,'SOCKET_PRODUCT',[0,.3,1.75],'material_output');
}
export const definitions={
 drill:{label:'BOR-01 / Automated bore rig',root:'BOR_ROOT',category:'landmark',plot:[7,6],build:buildDrill},
 hauler:{label:'TRK-01 / Planetary hauler',root:'TRK_ROOT',category:'unit',plot:[4.4,12],build:buildHauler},
 mirror:{label:'HEL-01 / Hexagonal heliostat',root:'HEL_ROOT',category:'landmark',plot:[3.4,3.4],build:buildMirror},
 furnace:{label:'CRU-01 / Solar crucible',root:'CRU_ROOT',category:'landmark',plot:[4,4],build:buildFurnace},
 cassette:{label:'CAS-01 / Ore cassette',root:'CAS_ROOT',category:'base_kit',plot:[1.8,2.4],build:buildCassette}
};
export function buildModel(family,lod){
 const d=definitions[family],root=new T.Group();root.name=d.root;root.userData={family,designation:d.label,lod,damage_level:0,manufacturer_lineage:'ISAO / MORK / KORP',static:lod===2};
 const mat=new T.MeshStandardMaterial({name:'CORPORATE_SLATE',vertexColors:true,metalness:.45,roughness:.42}),mirror=new T.MeshStandardMaterial({name:'OPTICAL_ALUMINUM',vertexColors:true,metalness:.96,roughness:.16});
 d.build(lod,root,mat,mirror);
 if(lod===2){root.updateMatrixWorld(true);const parts=[],meshes=[];root.traverse(o=>{if(o.isMesh){parts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);}});
  // Keep the hierarchy as empty lookup nodes; none of these articulate distance geometry.
  for(const m of meshes){const empty=new T.Group();empty.name=m.name;empty.position.copy(m.position);empty.quaternion.copy(m.quaternion);empty.scale.copy(m.scale);empty.userData={role:'static_lookup'};for(const c of [...m.children])empty.add(c);m.parent.add(empty);m.removeFromParent();}
  mesh(root,'DISTANCE_STATIC',parts,mat);
 }
 return root;
}
