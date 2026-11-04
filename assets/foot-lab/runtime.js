// NISOKU-02 prehensile right foot. Original Isao / Mechanism Atelier geometry.
// Metres, +Y up, +Z toes, -X medial. Angles are absolute local radians.
export const TOES = [
  {id:'TOE_02',x:-.026,z:.060,lengths:[.030,.022,.018],width:.027,spread:-.10},
  {id:'TOE_03',x:.005,z:.058,lengths:[.028,.021,.018],width:.026,spread:0},
  {id:'TOE_04',x:.034,z:.052,lengths:[.026,.019,.017],width:.023,spread:.12},
  {id:'TOE_05',x:.059,z:.041,lengths:[.023,.017,.016],width:.020,spread:.26}
];
export const HALLUX={base:[-.057,.029,.024],lengths:[.041,.034],width:.033};
export const PIPE={center:[0,.110,.037],radius:.027,length:.29};
export const JOINTS=[
  {name:'ANKLE_PITCH',axis:'x',min:-.45,max:.45},
  {name:'ANKLE_ROLL',axis:'z',min:-.30,max:.30},
  ...TOES.flatMap(d=>[
    {name:d.id+'_SPLAY',axis:'y',min:-.30,max:.40},
    {name:d.id+'_MTP',axis:'x',min:-.55,max:1.45},
    {name:d.id+'_PIP',axis:'x',min:0,max:1.65},
    {name:d.id+'_DIP',axis:'x',min:0,max:1.45}
  ]),
  {name:'HALLUX_OPPOSITION',axis:'y',min:-3.10,max:.25},
  {name:'HALLUX_ROLL',axis:'z',min:-.35,max:.35},
  {name:'HALLUX_MTP',axis:'x',min:-.35,max:1.50},
  {name:'HALLUX_IP',axis:'x',min:0,max:1.65}
];
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const mix=(a,b,t)=>a+(b-a)*t;
export function controlsPose({curl=0,splay=.25,opposition=0,toes={}}={}) {
  const p={lift:0,pitch:0,roll:0,ANKLE_PITCH:0,ANKLE_ROLL:0,HALLUX_OPPOSITION:-.55-2.5*opposition,HALLUX_ROLL:0,HALLUX_MTP:curl*.65,HALLUX_IP:curl*1.15};
  for(const d of TOES){const c=toes[d.id]??curl;p[d.id+'_SPLAY']=d.spread*splay;p[d.id+'_MTP']=c*.65;p[d.id+'_PIP']=c*1.05;p[d.id+'_DIP']=c*.85;}
  return p;
}
const plant=controlsPose(),splay=controlsPose({splay:1}),curl={...controlsPose({curl:1,opposition:.6}),lift:.11},reach={...controlsPose({splay:.6}),lift:.10},rail={...controlsPose({splay:0,opposition:1}),lift:.132};
for(const d of TOES){reach[d.id+'_MTP']=-.35;rail[d.id+'_MTP']=.65;rail[d.id+'_PIP']=.95;rail[d.id+'_DIP']=.75;}
Object.assign(rail,{HALLUX_MTP:.64,HALLUX_IP:1.13});
// Rail contact angles are calibrated by tools/asset-pipeline/calibrate-foot-rail.mjs.
Object.assign(rail,{"HALLUX_MTP":0.8527979686,"HALLUX_IP":0.6659853379,"TOE_02_MTP":1.0981974413,"TOE_02_PIP":0.3435608834,"TOE_02_DIP":0.3356363873,"TOE_03_MTP":1.0176442709,"TOE_03_PIP":0.401620167,"TOE_03_DIP":0.258597977,"TOE_04_MTP":0.8762036371,"TOE_04_PIP":0.4340773206,"TOE_04_DIP":0.1886115732,"TOE_05_MTP":0.7588835126,"TOE_05_PIP":0.1484013263,"TOE_05_DIP":0.3037400227});
export const POSES={plant,splay,reach,curl,rail,opposed:{...controlsPose({opposition:1,curl:.4}),lift:.10}};
export const MOTIONS={
  showcase:{name:'Prehensile_Foot_Showcase',duration_s:36,loop:true},
  rail:{name:'Metal_Pipe_Grasp_Cycle',duration_s:12,loop:true},
  step:{name:'Heel_To_Toe_Step_Cycle',duration_s:4,loop:true},
  agility:{name:'Independent_Toe_Agility_Cycle',duration_s:8,loop:true},
  opposition:{name:'Great_Toe_Opposition_Cycle',duration_s:8,loop:true},
  balance:{name:'Ankle_Balance_Cycle',duration_s:6,loop:true}
};
const keys=[...JOINTS.map(j=>j.name),'lift','pitch','roll','travel'];
export function blend(a,b,t){return Object.fromEntries(keys.map(k=>[k,mix(a[k]??0,b[k]??0,t)]));}
function railMotion(t){
  // The ankle starts above the rail, lowers onto it, closes, holds, releases, retreats.
  const above={...reach,lift:.23,HALLUX_OPPOSITION:-3.05};
  const contact={...plant,lift:rail.lift,HALLUX_OPPOSITION:-3.05};
  const frames=[[0,above,'Approach'],[2,contact,'Set sole'],[4,rail,'Wrap toes'],[7,rail,'Opposed hold'],[9,contact,'Release'],[12,above,'Lift away']];
  const i=Math.min(frames.length-2,frames.findIndex((f,k)=>k<frames.length-1&&t>=f[0]&&t<frames[k+1][0]));
  const a=frames[Math.max(0,i)],b=frames[Math.max(0,i)+1];return {...blend(a[1],b[1],smooth((t-a[0])/(b[0]-a[0]))),fixture:'pipe',phase:a[2]};
}
export function sampleMotion(time,mode='showcase') {
  const m=MOTIONS[mode];if(!m)return {...POSES[mode]??plant};
  const t=((time%m.duration_s)+m.duration_s)%m.duration_s,u=t/m.duration_s,w=u*Math.PI*2;
  if(mode==='rail')return railMotion(t);
  if(mode==='showcase'){
    if(t<6)return {...sampleMotion(t,'balance'),phase:'01 / Feel the ground'};
    if(t<14)return {...sampleMotion(t-6,'agility'),phase:'02 / Independent toes'};
    if(t<18)return {...sampleMotion(t-14,'step'),phase:'03 / Heel to toe'};
    if(t<20)return {...blend(plant,railMotion(0),smooth((t-18)/2)),fixture:'pipe',fixtureRise:smooth((t-18)/2),phase:'04 / Rail approach'};
    if(t<32)return railMotion(t-20);
    return {...blend(railMotion(12-1e-9),plant,smooth((t-32)/4)),fixture:'pipe',fixtureRise:1-smooth((t-32)/2),phase:'05 / Return to ground'};
  }
  if(mode==='agility'){
    const envelope=Math.sin(Math.PI*u)**2,p={...plant,lift:.11*envelope,phase:'Splay / ripple / settle'};
    for(const [i,d]of TOES.entries()){const c=(.5-.5*Math.cos(w*2-i*.85))*envelope;p[d.id+'_SPLAY']=d.spread*(.25+.75*envelope);p[d.id+'_MTP']=c*.7;p[d.id+'_PIP']=c*1.2;p[d.id+'_DIP']=c*.85;}
    p.HALLUX_OPPOSITION=-.55-1.7*envelope;p.HALLUX_MTP=.4*envelope;p.HALLUX_IP=.7*envelope;return p;
  }
  if(mode==='opposition')return {...blend(plant,POSES.opposed,Math.sin(Math.PI*u)**2),phase:'Rotate / oppose / unfurl'};
  if(mode==='balance'){const e=Math.sin(Math.PI*u)**2,pitch=.14*Math.sin(w)*e,roll=.11*Math.sin(w*2)*e;return {...plant,pitch,roll,lift:.134*Math.abs(Math.sin(pitch))+.094*Math.abs(Math.sin(roll)),ANKLE_PITCH:-pitch*.7,ANKLE_ROLL:-roll*.8,phase:'Heel / lateral edge / forefoot'};}
  // Toe-off, clear swing, heel-first return. Smooth root and independently delayed toe hinges.
  const frames=[[0,plant],[.8,{...plant,pitch:.34,lift:.046,ANKLE_PITCH:-.25}],
    [1.65,{...reach,pitch:-.18,lift:.12,travel:.025}],
    [2.7,{...plant,pitch:-.23,lift:.033,travel:.015}], [4,plant]];
  const k=frames.findIndex((f,i)=>i<frames.length-1&&t>=f[0]&&t<frames[i+1][0]),a=frames[k],b=frames[k+1];
  return {...blend(a[1],b[1],smooth((t-a[0])/(b[0]-a[0]))),phase:t<1?'Toe-off':t<2.7?'Swing / clear the toes':'Heel strike / settle'};
}
const cache=new WeakMap();
export function createRig(root){
  if(cache.has(root))return cache.get(root);
  const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o;});
  const rest=new Map(Object.values(nodes).map(o=>[o,{p:o.position.clone(),q:o.quaternion.clone()}]));
  const staticTier=Object.values(nodes).some(o=>o.userData.family==='nisoku02foot'&&o.userData.static);
  const rig={root,nodes,static:staticTier,pose(p=plant,{explode=0}={}){
    if(staticTier)return {static:true,angles:{}};
    for(const [o,r]of rest){o.position.copy(r.p);o.quaternion.copy(r.q);}
    const angles={};for(const j of JOINTS){const v=clamp(p[j.name]??0,j.min,j.max);nodes[j.name].rotation[j.axis]=v;angles[j.name]=v;}
    const f=nodes.FOOT_PLACEMENT;f.position.y=clamp(p.lift??0,0,.35);f.position.z=clamp(p.travel??0,-.1,.1);f.rotation.set(clamp(p.pitch??0,-.5,.5),0,clamp(p.roll??0,-.3,.3));
    for(const o of Object.values(nodes))if(o.userData.explode){const e=o.userData.explode;o.position.x+=e[0]*explode;o.position.y+=e[1]*explode;o.position.z+=e[2]*explode;}
    root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
    return {static:false,angles,placement:{lift:f.position.y,travel:f.position.z,pitch:f.rotation.x,roll:f.rotation.z}};
  }};cache.set(root,rig);return rig;
}
