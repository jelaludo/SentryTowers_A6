// Senzai-KK02. Metres, +Y up; pure deterministic helpers shared by build, runtime and effects.
export const SPEC={radius_m:16,center_y_m:25,cycle_s:72,attention_strands:48,plot_m:[100,100]};
export const TIERS=[{lod:0,fibers:5000,segments:6,sides:3,attention_segments:40,attention_sides:5,visual_fibers:36000},{lod:1,fibers:650,segments:4,sides:3,attention_segments:20,attention_sides:3,visual_fibers:18000},{lod:2,fibers:108,segments:3,sides:3,attention_segments:2,attention_sides:3,visual_fibers:0}];
export const FOCI=[[35,36,22],[-38,24,20],[7,34,-42]];
export const hash=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a);};
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const norm=a=>mul(a,1/(Math.hypot(...a)||1));
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function direction(i,n){const y=1-2*(i+.5)/n,a=i*2.399963229728653+.41,r=Math.sqrt(1-y*y);return [r*Math.cos(a),y,r*Math.sin(a)];}
export const attentionDirection=i=>direction(i*19%48,48);
const HOME=[-8,25,3],STOPS=[[10,30,4],[-12,26,3],[2,31,-12]],LEGS=[{at:10,duration:1.5,from:HOME,to:STOPS[0]},{at:29,duration:1.6,from:STOPS[0],to:STOPS[1]},{at:49,duration:1.5,from:STOPS[1],to:STOPS[2]},{at:67,duration:2,from:STOPS[2],to:HOME}];
export function fieldState(seconds=0,awake=1){
 const time=((seconds%72)+72)%72,w=time*Math.PI*2/72;let center=[...HOME],velocity=[0,0,0],swift=0;
 for(const leg of LEGS){if(time>=leg.at){const u=clamp((time-leg.at)/leg.duration),e=ease(u),derivative=30*u*u*(u-1)*(u-1)/leg.duration;center=leg.from.map((v,i)=>v+(leg.to[i]-v)*e);velocity=mul(sub(leg.to,leg.from),derivative);swift=Math.max(swift,Math.sin(Math.PI*u));}}
 center=add(center,[.5*Math.sin(w),.55*Math.sin(w*2),.4*(Math.cos(w)-1)]);
 const events=[{at:8,to:0},{at:27,to:1},{at:47,to:2},{at:65,to:0}];let focus=[...FOCI[0]],index=0;
 for(const e of events){if(time>=e.at){const u=ease((time-e.at)/2),next=FOCI[e.to];focus=focus.map((v,i)=>v+(next[i]-v)*u);index=e.to;}}
 const facing=norm(sub(focus,center));
 return {time,center,velocity,swift,focus,index,facing,awake,phase:swift>.02?'SHIFTING ATTENTION':time<8||time>69?'LISTENING':'ATTENDING',cycle_s:72};
}
export function strandState(i,state){const d=attentionDirection(i),alignment=dot(d,state.facing),w=state.time*Math.PI*2/72,attention=smooth((alignment-.45)/.42),breath=.82+.18*Math.sin(w*3+i*1.7),search=smooth((Math.sin(w*2+i*2.4)-.94)/.06)*.12;const level=Math.max(attention,search)*breath*state.awake;return {level,extension:level*(2.7+hash(i+53)*3.2),alignment};}
export function curve(i,u,state,active=true,count=48){
 const d=active?attentionDirection(i):direction(i,count),a=norm(cross(d,Math.abs(d[1])>.92?[1,0,0]:[0,1,0])),b=cross(d,a),seed=hash(i+7),w=state.time*Math.PI*2/72,ss=active?strandState(i,state):{level:0,extension:0};
 const radius=(active?8.2:3.2)+(active?7.7:12.8)*u+ss.extension*u*u;
 const curveA=(active?2.0:1.5)*Math.sin(Math.PI*u)*(seed-.30)+Math.sin(w*2+seed*9+u*2.3)*(active?.82:.50)*u*u;
 const curveB=Math.sin(Math.PI*u*1.6+seed*4)*Math.sin(Math.PI*u)*(active?1.35:.9)+Math.cos(w*3+seed*13)*(active?.45:.22)*u*u;
 let p=add(mul(d,radius),add(mul(a,curveA),mul(b,curveB)));
 if(active){const tangent=sub(state.facing,mul(d,dot(d,state.facing)));p=add(p,mul(tangent,ss.level*3.5*u*u));}
 return add(p,mul(state.velocity,-.095*u*u*(active?1:.55)));
}
export function curveFrame(i,u,state){const p=curve(i,u,state),t=norm(sub(curve(i,Math.min(1,u+.002),state),curve(i,Math.max(0,u-.002),state))),a=norm(cross(t,Math.abs(t[1])>.92?[1,0,0]:[0,1,0]));return {p,t,a,b:cross(t,a)};}
export function createRig(scene){
 const root=scene.getObjectByName('SENZAI_ROOT'),frame=scene.getObjectByName('FLOAT_FRAME'),mesh=scene.getObjectByName('LIVING_ATTENTION');if(!root||!frame)throw Error('Not Senzai-KK02');
 const tips=Array.from({length:48},(_,i)=>scene.getObjectByName('EYE_'+String(i+1).padStart(2,'0'))),geometry=mesh?.isMesh?mesh.geometry:null,attrs=geometry?.attributes;
 const attr=n=>attrs?.[n]||attrs?.['_'+n.toLowerCase()],ids=attr('fiberId'),along=attr('along'),offset=attr('offset'),localNormal=attr('localNormal'),glow=attr('glow');
 return {root,frame,tips,static:!!root.userData.static,pose(seconds,{awake=1,hdr=false}={}){
  const state=fieldState(this.static?0:seconds,this.static?1:awake),states=Array.from({length:48},(_,i)=>strandState(i,state));
  if(!this.static){frame.position.set(...state.center);for(let i=0;i<48;i++){const f=curveFrame(i,1,state);tips[i].position.set(...f.p);tips[i].quaternion.setFromUnitVectors(tips[i].up,tips[i].position.clone().set(...f.t));}
   if(ids){const cache=new Map();for(let j=0;j<ids.count;j++){const id=Math.round(ids.getX(j)),u=along.getX(j),key=id+':'+u;let f=cache.get(key);if(!f){f=curveFrame(id,u,state);cache.set(key,f);}const axes=[f.a,f.b,f.t],p=[...f.p],n=[0,0,0];for(let a=0;a<3;a++)for(let k=0;k<3;k++){p[k]+=axes[a][k]*offset.getComponent(j,a);n[k]+=axes[a][k]*localNormal.getComponent(j,a);}attrs.position.setXYZ(j,...p);attrs.normal.setXYZ(j,...n);const power=states[id].level*glow.getX(j)*(.72+.28*Math.exp(-Math.pow((u-(state.time/6+id*.13)%1)*7,2)))*(hdr?2.8:1);attrs.color.setXYZ(j,.003+power*.14,.006+power,.005+power*.47);}for(const n of ['position','normal','color'])attrs[n].needsUpdate=true;geometry.computeBoundingSphere();}
  }
  scene.updateMatrixWorld(true);return {...state,states,active:states.filter(s=>s.level>.03).length};
 }};
}
