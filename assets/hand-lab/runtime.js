// Original AUREL-01 articulation. Metres, +Y fingertips, +Z palm-facing normal.
export const DIGITS=[
 {id:'INDEX',x:-.031,y:.143,lengths:[.038,.024,.021],width:.019,spread:.055},
 {id:'MIDDLE',x:-.010,y:.149,lengths:[.043,.027,.022],width:.020,spread:0},
 {id:'RING',x:.012,y:.146,lengths:[.040,.026,.022],width:.0185,spread:-.035},
 {id:'LITTLE',x:.0315,y:.135,lengths:[.032,.021,.019],width:.016,spread:-.10}
];
export const WRIST_Y=.061,THUMB={base:[-.042,.038,.004],lengths:[.032,.031,.024]};
export const JOINTS=[{name:'WRIST_FLEX',axis:'x',min:-.5,max:.5},{name:'WRIST_DEVIATION',axis:'z',min:-.3,max:.3},...DIGITS.flatMap(d=>[{name:d.id+'_MCP_SPREAD',axis:'z',min:-.22,max:.22},{name:d.id+'_MCP_FLEX',axis:'x',min:0,max:1.4},{name:d.id+'_PIP_FLEX',axis:'x',min:0,max:1.65},{name:d.id+'_DIP_FLEX',axis:'x',min:0,max:1.15}]),{name:'THUMB_CMC_OPPOSITION',axis:'y',min:-.2,max:2.2},{name:'THUMB_CMC_ABDUCTION',axis:'z',min:-.35,max:1.15},{name:'THUMB_AXIAL_ROLL',axis:'y',min:-2.2,max:2.2},{name:'THUMB_MCP_FLEX',axis:'x',min:0,max:1.5},{name:'THUMB_IP_FLEX',axis:'x',min:0,max:1.5}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
export function controlsPose({curl=0,spread=.15,opposition=0,wrist=0,deviation=0,digits={}}={}){
 const p={WRIST_FLEX:wrist,WRIST_DEVIATION:deviation,THUMB_CMC_OPPOSITION:1.35*opposition,THUMB_CMC_ABDUCTION:mix(.9,.42,opposition),THUMB_AXIAL_ROLL:-.4*opposition,THUMB_MCP_FLEX:.12+curl*.45,THUMB_IP_FLEX:.06+curl*.62};
 for(const [i,d]of DIGITS.entries()){const c=clamp(digits[d.id]??curl,0,1);p[d.id+'_MCP_SPREAD']=d.spread*spread*3;p[d.id+'_MCP_FLEX']=1.28*c;p[d.id+'_PIP_FLEX']=1.50*c;p[d.id+'_DIP_FLEX']=.94*c;}
 return p;
}
const relaxed=controlsPose({curl:.12,spread:.18}),open=controlsPose({spread:.12}),spread=controlsPose({spread:1}),fist=controlsPose({curl:1,opposition:.87}),point=controlsPose({curl:.9,opposition:.75,digits:{INDEX:.04}}),pinch=controlsPose({curl:.30,opposition:1,digits:{INDEX:.72}});
// A precise opposition target is calibrated against the exported fingertip sockets.
Object.assign(pinch,{THUMB_CMC_OPPOSITION:1.7898107823,THUMB_CMC_ABDUCTION:1.15,THUMB_AXIAL_ROLL:1.5036072792,THUMB_MCP_FLEX:.3590873932,THUMB_IP_FLEX:1.2092803343,INDEX_MCP_FLEX:.2450287276,INDEX_PIP_FLEX:1.3238264045,INDEX_DIP_FLEX:1.15});
export const POSES={relaxed,open,spread,fist,pinch,point};
export const MOTIONS={showcase:{name:'Dexterity_Showcase',duration_s:28,loop:true},flex:{name:'Finger_Flexion_Cycle',duration_s:6,loop:true},ripple:{name:'Independent_Fingers_Cycle',duration_s:8,loop:true},opposition:{name:'Thumb_Opposition_Cycle',duration_s:10,loop:true},wrist:{name:'Wrist_Gimbal_Cycle',duration_s:8,loop:true}};
function blend(a,b,t){return Object.fromEntries(JOINTS.map(j=>[j.name,mix(a[j.name]??0,b[j.name]??0,t)]));}
export function sampleMotion(time,mode){
 const m=MOTIONS[mode];if(!m)return {...POSES[mode]??relaxed};const t=((time%m.duration_s)+m.duration_s)%m.duration_s,u=t/m.duration_s;
 if(mode==='showcase'){const seq=['relaxed','open','spread','fist','open','pinch','point','relaxed'],step=4,k=Math.min(seq.length-2,Math.floor(t/step));return blend(POSES[seq[k]],POSES[seq[k+1]],smooth((t-k*step-.7)/2.6));}
 if(mode==='flex')return controlsPose({curl:(1-Math.cos(u*Math.PI*2))*.5,opposition:.7});
 if(mode==='ripple')return controlsPose({spread:.35,opposition:.3,digits:Object.fromEntries(DIGITS.map((d,i)=>[d.id,.48-.45*Math.cos(u*Math.PI*2-i*.65)]))});
 if(mode==='opposition')return blend(open,pinch,(1-Math.cos(u*Math.PI*2))*.5);
 return {...relaxed,WRIST_FLEX:.45*Math.sin(u*Math.PI*2),WRIST_DEVIATION:.25*Math.sin(u*Math.PI*2+.7)};
}
const rigs=new WeakMap();
export function createRig(root){
 if(rigs.has(root))return rigs.get(root);const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o;});const rest=new Map(Object.values(nodes).map(o=>[o,{p:o.position.clone(),q:o.quaternion.clone()}])),staticTier=Object.values(nodes).some(o=>o.userData.family==='aurel01'&&o.userData.static);
 const rig={root,nodes,static:staticTier,pose(p=relaxed,{explode=0}={}){
  if(staticTier)return {static:true,angles:{}};
  for(const [o,r]of rest){o.position.copy(r.p);o.quaternion.copy(r.q);}
  const angles={};for(const j of JOINTS){const o=nodes[j.name];if(o){const value=clamp(p[j.name]??0,j.min,j.max);o.rotation[j.axis]=value;angles[j.name]=value;}}
  for(const o of Object.values(nodes)){if(o.userData.explode){const e=o.userData.explode;o.position.x+=e[0]*explode;o.position.y+=e[1]*explode;o.position.z+=e[2]*explode;}}
  root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});return {static:false,angles};
 }};rigs.set(root,rig);return rig;
}
