// Engine-owned poses: no baked clips compete with contact, aim or rolling controls.
// Accept the consuming application's Three namespace to work in Node and r160+ browsers.
export const RADIUS=.8, UPPER=.46, LOWER=.58;
export const LEG_ANGLES=Array.from({length:6},(_,i)=>Math.PI/6+i*Math.PI/3);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function createRig(root,T){
 const get=n=>{const o=root.getObjectByName(n);if(!o)throw Error('Missing TAI node '+n);return o;};
 const body=get('BODY'),shell=get('SHELL_ROLL'),core=get('CORE_GIMBAL'),gyro=get('GYRO_ROTOR'),aim=get('LAUNCHER_AIM'),barrel=get('LAUNCHER_SLIDE'),hook=get('HOOK_HEAD');
 const panels=Array.from({length:32},(_,i)=>get('PANEL_'+String(i+1).padStart(2,'0'))).map(o=>({o,p:o.position.clone(),q:o.quaternion.clone(),n:new T.Vector3(...o.userData.normal)}));
 const legs=LEG_ANGLES.map((angle,i)=>{const id=String(i+1).padStart(2,'0');return {id,angle,mount:get('LEG_'+id+'_MOUNT'),hip:get('LEG_'+id+'_HIP'),knee:get('LEG_'+id+'_KNEE'),ankle:get('LEG_'+id+'_ANKLE'),foot:get('SOCKET_FOOT_'+id),pads:[1,2,3].map(j=>get('LEG_'+id+'_PAD_'+j))};});
 const jaws=[1,2,3].map(i=>get('HOOK_JAW_'+String(i).padStart(2,'0')));
 const isStatic=root.getObjectByName('TAI09_ROOT')?.userData.static||root.userData.static;
 function pose({deploy=0,gecko=0,height=RADIUS,phase=0,stride=0,direction=[0,1],explode=0,grapple=0,grappleDirection=[0,0,1],time=0,air=0}={}){
  if(isStatic)return;
  // Shell stops at a mechanical registration orientation before its doors retract.
  panels.forEach(({o,p,q,n})=>{let port=0;for(const a of LEG_ANGLES){const d=new T.Vector3(Math.sin(a)*.84,-.54,Math.cos(a)*.84);port=Math.max(port,smooth((n.dot(d)-.64)/.25));}const aperture=grapple*smooth((n.dot(new T.Vector3(...grappleDirection))-.70)/.20),open=Math.max(o.userData.front_port?0:port*deploy,aperture);o.position.copy(p).addScaledVector(n,explode*.28-open*.13);o.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),open*1.1));});
  gyro.rotation.z=time*.65;
  const contacts=[];
  for(let i=0;i<legs.length;i++){
   const leg=legs[i],a=leg.angle,p=(phase+(i%2)*.5)%1,swing=stride>.01&&p>.65;
   // Stance velocity cancels chassis travel; swing returns through a raised sinusoid.
   const travel=swing?(-.5+smooth((p-.65)/.35)): (.5-p/.65);
   const lift=swing?Math.sin((p-.65)/.35*Math.PI)*.16*stride:0;
   const radius=1.02+(gecko*.08),mx=.55*Math.sin(a),mz=.55*Math.cos(a);
   const tx=Math.sin(a)*radius+direction[0]*travel*.34*stride,tz=Math.cos(a)*radius+direction[1]*travel*.34*stride;
   const dx=tx-mx,dz=tz-mz,x=Math.hypot(dx,dz),y=-height+.06+.16+lift+air*.18,d=Math.min(UPPER+LOWER-.002,Math.hypot(x,y));
   const knee=-Math.acos(clamp((d*d-UPPER*UPPER-LOWER*LOWER)/(2*UPPER*LOWER),-1,1));
   const hip=Math.atan2(y,x)-Math.atan2(LOWER*Math.sin(knee),UPPER+LOWER*Math.cos(knee));
   leg.mount.position.set(Math.sin(a)*(.32+.23*deploy),-.1-.06*deploy,Math.cos(a)*(.32+.23*deploy));
   // Replace the entire Euler: imported yaw > 90° may decompose into X/Z = pi.
   let yaw=Math.atan2(-dz,dx),baseYaw=a-Math.PI/2;while(yaw-baseYaw>Math.PI)yaw-=2*Math.PI;while(yaw-baseYaw<-Math.PI)yaw+=2*Math.PI;
   leg.mount.rotation.set(0,baseYaw+(yaw-baseYaw)*deploy,0);
   // Unwrap angles through the shorter angular route, retaining rigid segment lengths.
   leg.hip.rotation.z=deploy<.5?-2.62+3.27*smooth(deploy*2):.65+(hip-.65)*smooth((deploy-.5)*2);
   leg.knee.rotation.z=2.18+(knee-2.18)*smooth(deploy);
   leg.ankle.rotation.z=-(leg.hip.rotation.z+leg.knee.rotation.z);
   leg.pads.forEach((pad,j)=>{pad.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),j*2*Math.PI/3);pad.rotateZ((1-deploy)*1.1);});
   contacts.push(deploy>.98&&!swing&&air<.05);
  }
  barrel.position.z=.46+grapple*.30;
  jaws.forEach((j,i)=>{j.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),i*2*Math.PI/3);j.rotateY(grapple*.85);});
  root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  return {contacts};
 }
 return {root,body,shell,core,gyro,aim,barrel,hook,panels,legs,jaws,pose,isStatic};
}

// Deterministic arena controller, separate from Three/rendering and asset exports.
// Planar adhesion and tether pull are a playable kinematic prototype, not a force solver.
export class TAIController{
 constructor(){this.reset();}
 reset(){this.mode='roll';this.surface='floor';this.center=[0,.8,1.2];this.velocity=[0,0,0];this.deploy=0;this.height=.8;this.phase=0;this.time=0;this.speed=0;this.air=0;this.landing=0;this.grapple=null;this.lastDelta=[0,0,0];this.event='Ready';this.wall=-4.5;this.roof=4.6;}
 setMode(mode){if(!['roll','walk','gecko'].includes(mode))throw Error('Invalid mode');if(this.grapple)this.release();if(mode!=='gecko'&&this.surface!=='floor'){this.surface='floor';this.center[1]=Math.max(.8,this.center[1]);this.air=1;this.velocity[1]=0;}this.mode=mode;this.grapple=null;this.event=mode==='gecko'?'Approach the far wall with W':'Mode: '+mode;}
 jump(){if(this.surface==='floor'&&!this.air&&!this.grapple){this.mode='walk';this.velocity[1]=5.8;this.air=1;this.event='Jump / legs ready';return true;}return false;}
 attach(point,normal){if(!point.every(Number.isFinite)||!normal.every(Number.isFinite))return false;const validSurface=(normal[1]>.8&&point[1]<.1)||(normal[1]<-.8&&Math.abs(point[1]-this.roof)<.15)||(normal[2]>.8&&Math.abs(point[2]-this.wall)<.25);if(!validSurface||Math.abs(point[0])>3||point[2]>5||point[2]<this.wall-.25){this.event='Choose an anchor inside the test fixture';return false;}const d=Math.hypot(...point.map((v,i)=>v-this.center[i]));if(d<1.2||d>16)return false;this.grapple={target:[...point],normal:[...normal],origin:[...this.center],age:0,stage:'firing'};this.event='Hook outbound';return true;}
 release(){this.grapple=null;this.event='Tether released';if(this.surface==='floor'&&this.center[1]>this.height+.01)this.air=1;}
 step(dt,input={}){
  dt=clamp(dt,0,1/30);this.time+=dt;const old=[...this.center],want=this.mode==='roll'&&!this.air?0:1;
  this.deploy+=clamp(want-this.deploy,-dt/1.1,dt/1.1);this.landing=Math.max(0,this.landing-dt*1.7);this.height=.8+.14*smooth(this.deploy)-.12*Math.sin(this.landing*Math.PI);
  let x=(input.right?1:0)-(input.left?1:0),f=(input.forward?1:0)-(input.back?1:0);const len=Math.hypot(x,f);if(len>1){x/=len;f/=len;}
  const max=this.mode==='roll'?(input.fast?4.8:2.8):this.mode==='walk'?1.15:.8,rate=Math.min(1,dt*7);this.velocity[0]+=(x*max-this.velocity[0])*rate;this.velocity[2]+=(f*max-this.velocity[2])*rate;
  if(this.grapple){const g=this.grapple;g.age+=dt;if(g.age>=.45){g.stage='pulling';const end=g.target.map((v,i)=>v+g.normal[i]*(this.height+.08));end[1]=Math.max(this.height,end[1]);end[2]=Math.max(this.wall+this.height,end[2]);if(this.mode==='gecko'&&g.normal[2]>.8)end[2]=this.wall+this.height;if(this.mode==='gecko'&&g.normal[1]<-.8)end[1]=this.roof-this.height;const diff=end.map((v,i)=>v-this.center[i]),dist=Math.hypot(...diff);this.event='Latched / reeling in';const move=Math.min(dist,dt*3.4);if(dist>1e-6)this.center=this.center.map((v,i)=>v+diff[i]/dist*move);if(dist<.04){if(this.mode==='gecko'&&g.normal[2]>.8){this.surface='wall';this.center[2]=this.wall+this.height;this.air=0;}else if(this.mode==='gecko'&&g.normal[1]<-.8){this.surface='ceiling';this.center[1]=this.roof-this.height;this.air=0;}else if(g.normal[1]>.8){this.surface='floor';this.air=0;}this.event='Anchor reached / G releases';g.stage='anchored';}}
  }else{
   this.center[0]+=this.velocity[0]*dt;
   if(this.surface==='floor'){
    this.center[2]-=this.velocity[2]*dt;
    if(this.air){this.velocity[1]-=9.81*dt;this.center[1]+=this.velocity[1]*dt;if(this.center[1]<=this.height){this.center[1]=this.height;this.air=0;this.velocity[1]=0;this.landing=1;this.event='Landing / suspension absorbing';}}
    else this.center[1]=this.height;
    if(this.center[2]<this.wall+this.height){this.center[2]=this.wall+this.height;if(this.mode==='gecko'&&!this.air&&this.deploy>.98){this.surface='wall';this.event='Adhered to wall / W climbs';}}
   }else if(this.surface==='wall'){
    this.center[2]=this.wall+this.height;this.center[1]+=this.velocity[2]*dt;
    if(this.center[1]>this.roof-this.height){this.center[1]=this.roof-this.height;this.surface='ceiling';this.event='Ceiling / W traverses outward';}
    if(this.center[1]<this.height){this.center[1]=this.height;this.surface='floor';this.event='Ground contact';}
   }else{
    this.center[1]=this.roof-this.height;this.center[2]+=this.velocity[2]*dt;
    if(this.center[2]<this.wall+this.height){this.center[2]=this.wall+this.height;this.surface='wall';this.event='Returning down wall';}
    if(this.center[2]>-1){this.center[2]=-1;this.velocity[2]=Math.min(0,this.velocity[2]);this.event='Ceiling edge / S returns';}
   }
  }
  this.center[0]=clamp(this.center[0],-3,3);this.center[2]=clamp(this.center[2],this.wall+this.height,5);this.center[1]=Math.max(this.height,this.center[1]);
  this.lastDelta=this.center.map((v,i)=>v-old[i]);this.speed=Math.hypot(this.lastDelta[0],this.lastDelta[2])/dt||0;if(this.surface==='wall')this.speed=Math.hypot(this.lastDelta[0],this.lastDelta[1])/dt||0;
  this.phase=(this.phase+this.speed*dt/(.34/.65))%1;
 }
}
