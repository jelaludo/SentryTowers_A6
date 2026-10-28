// Engine-owned poses: no baked clips compete with contact, aim or rolling controls.
// Accept the consuming application's Three namespace to work in Node and r160+ browsers.
export const RADIUS=.8, UPPER=.46, LOWER=.58, STAND_HEIGHT=1.04;
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
 function pose({deploy=0,height=RADIUS,phase=0,stride=0,direction=[0,1],explode=0,grapple=0,grappleDirection=[0,0,1],time=0,air=0,tuck=air,plant=0}={}){
  if(isStatic)return;
  // Shell stops at a mechanical registration orientation before its doors retract.
  panels.forEach(({o,p,q,n})=>{let port=0;for(const a of LEG_ANGLES){const d=new T.Vector3(Math.sin(a)*.84,-.54,Math.cos(a)*.84);port=Math.max(port,smooth((n.dot(d)-.64)/.25));}const aperture=grapple*smooth((n.dot(new T.Vector3(...grappleDirection))-.70)/.20),open=Math.max(o.userData.front_port?0:port*deploy,aperture);o.position.copy(p).addScaledVector(n,explode*.28-open*.13);o.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),open*1.1));});
  gyro.rotation.z=time*.65;
  const contacts=[];
  for(let i=0;i<legs.length;i++){
   const leg=legs[i],a=leg.angle,p=(phase+(i%2)*.5)%1,swing=!plant&&stride>.01&&p>.65;
   // Stance velocity cancels chassis travel; swing returns through a raised sinusoid.
   const travel=swing?(-.5+smooth((p-.65)/.35)): (.5-p/.65);
   const lift=swing?Math.sin((p-.65)/.35*Math.PI)*.16*stride:0;
   const radius=1.08,mx=.56*Math.sin(a),mz=.56*Math.cos(a);
   const tx=Math.sin(a)*radius+direction[0]*travel*.34*stride,tz=Math.cos(a)*radius+direction[1]*travel*.34*stride;
   const dx=tx-mx,dz=tz-mz,x=Math.hypot(dx,dz),y=-height+.06+.40+lift+tuck*.08,d=Math.min(UPPER+LOWER-.002,Math.hypot(x,y));
   const knee=-Math.acos(clamp((d*d-UPPER*UPPER-LOWER*LOWER)/(2*UPPER*LOWER),-1,1));
   const hip=Math.atan2(y,x)-Math.atan2(LOWER*Math.sin(knee),UPPER+LOWER*Math.cos(knee));
   leg.mount.position.set(Math.sin(a)*(.32+.24*deploy),-.22-.18*deploy,Math.cos(a)*(.32+.24*deploy));
   // Replace the entire Euler: imported yaw > 90° may decompose into X/Z = pi.
   let yaw=Math.atan2(-dz,dx),baseYaw=a-Math.PI/2;while(yaw-baseYaw>Math.PI)yaw-=2*Math.PI;while(yaw-baseYaw<-Math.PI)yaw+=2*Math.PI;
   leg.mount.rotation.set(0,baseYaw+(yaw-baseYaw)*deploy,0);
   // Unwrap angles through the shorter angular route, retaining rigid segment lengths.
   leg.hip.rotation.z=deploy<.5?-2.85+3.50*smooth(deploy*2):.65+(hip-.65)*smooth((deploy-.5)*2);
   leg.knee.rotation.z=2.50+(knee-2.50)*smooth(deploy);
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

// The movement model and orientation planning run at a fixed timestep, including
// while tests advance without rendering. No renderer-frame slerp controls contact.
export const ARENA={halfWidth:42,front:48,wall:-38,roof:24,ceilingFront:-24};
export const TARGETS=[
 {id:'wall_03',label:'Wall · 3 m',point:[-13,3,-38],normal:[0,0,1],kind:'wall'},
 {id:'wall_07',label:'Wall · 7 m',point:[-4,7,-38],normal:[0,0,1],kind:'wall'},
 {id:'wall_12',label:'Wall · 12 m',point:[6,12,-38],normal:[0,0,1],kind:'wall'},
 {id:'wall_18',label:'Wall · 18 m',point:[15,18,-38],normal:[0,0,1],kind:'wall'},
 {id:'sky_06',label:'Sky ring · 6 m → free fall',point:[-6,6,8],normal:[0,1,0],kind:'sky'},
 {id:'sky_11',label:'Sky ring · 11 m → free fall',point:[6,11,5],normal:[0,1,0],kind:'sky'},
 {id:'sky_16',label:'Sky ring · 16 m → free fall',point:[-3,16,4],normal:[0,1,0],kind:'sky'},
 {id:'ceiling_24',label:'Ceiling · 24 m',point:[0,24,-30],normal:[0,-1,0],kind:'ceiling'},
 {id:'ground',label:'Ground pad · 0 m',point:[11,0,14],normal:[0,1,0],kind:'floor'}
];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=a=>Math.hypot(...a),scale=(a,s)=>a.map(v=>v*s),add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const unit=a=>scale(a,1/(length(a)||1));
const qnorm=q=>scale(q,1/length(q));
function qmul(a,b){const [x,y,z,w]=a,[X,Y,Z,W]=b;return [w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z];}
export function slerp(a,b,t){let c=dot(a,b);if(c<0){b=scale(b,-1);c=-c;}if(c>.9995)return qnorm(a.map((v,i)=>v+(b[i]-v)*t));const angle=Math.acos(clamp(c,-1,1)),s=Math.sin(angle);return a.map((v,i)=>(v*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/s);}
function upQuaternion(n){if(n[1]<-.999999)return [0,0,1,0];return qnorm([n[2],0,-n[0],1+n[1]]);}
const normals={floor:[0,1,0],wall:[0,0,1],ceiling:[0,-1,0]};
export function rotateVector(v,q){const p=qmul(qmul(q,[...v,0]),[-q[0],-q[1],-q[2],q[3]]);return p.slice(0,3);}

export class TAIController{
 constructor(){this.reset();}
 reset(){
  this.mode='roll';this.surface='floor';this.center=[0,RADIUS,9];this.velocity=[0,0,0];
  this.orientation=[0,0,0,1];this.shellRotation=[0,0,0,1];this.deploy=0;this.height=RADIUS;
  this.phase=0;this.time=0;this.speed=0;this.air=0;this.runup=0;this.grapple=null;this.flight=null;
  this.recoil=0;this.landing=null;this.lastLanding=null;this.landingCount=0;this.lastDelta=[0,0,0];this.event='Ready · build momentum';
  this.wall=ARENA.wall;this.roof=ARENA.roof;this.winchAcceleration=0;this.preparation=0;
 }
 setMode(mode){
  if(mode==='walk')mode='gecko'; // Compatibility for external callers; only one leg mode exists.
  if(!['roll','gecko'].includes(mode))throw Error('Unknown mobility mode');
  if(mode==='roll'&&this.landing){this.event='Landing recovery · gecko feet remain planted';return;}
  if(mode==='roll'&&this.surface!=='floor'&&!this.air)this.jump();
  this.mode=mode;this.event=mode==='roll'?'Ball drive · hold WASD to accelerate':'Gecko feet · walk, climb and hang';
 }
 beginFlight(){
  this.air=1;this.flight={age:0,from:[...this.orientation],shell:[...this.shellRotation],blend:0,departed:this.center[1]>STAND_HEIGHT+.1||this.surface!=='floor'};this.preparation=0;this.landing=null;
 }
 jump(){
  if(this.air)return false;
  const n=normals[this.surface];this.grapple=null;this.velocity=add(this.velocity,scale(n,this.surface==='floor'?6.4:4));
  if(this.surface!=='floor')this.velocity[1]+=2.2;
  this.mode='gecko';this.beginFlight();this.event='Airborne · feet-first landing armed';return true;
 }
 attach(point,normal,kind){
  if(!point.every(Number.isFinite)||!normal.every(Number.isFinite))return false;
  kind??=normal[2]>.8?'wall':normal[1]<-.8?'ceiling':'floor';
  const valid=kind==='sky'||(kind==='wall'&&Math.abs(point[2]-this.wall)<.35&&point[1]>1.4&&point[1]<this.roof-1.4)||(kind==='ceiling'&&Math.abs(point[1]-this.roof)<.2&&point[2]<ARENA.ceilingFront-1.4)||(kind==='floor'&&Math.abs(point[1])<.1);
  const distance=length(sub(point,this.center));
  if(!valid||distance<2||distance>75||Math.abs(point[0])>ARENA.halfWidth-1.5||point[2]>ARENA.front-1.5||point[2]<this.wall-.35){this.event='Choose a reachable anchor inside the arena';return false;}
  this.grapple={target:[...point],normal:unit(normal),kind,origin:[...this.center],age:0,pullAge:0,stage:'firing',force:0,launchTime:this.time};
  this.event='Hook outbound';return true;
 }
 release(){
  if(!this.grapple)return false;
  const attached=!this.air&&this.surface!=='floor';this.grapple=null;this.winchAcceleration=0;
  if(attached){this.velocity=add(this.velocity,scale(normals[this.surface],2));this.beginFlight();}
  else if(this.air){this.beginFlight();}
  this.event='Tether released · righting for the ground';return true;
 }
 groundETA(){const dy=Math.max(0,this.center[1]-STAND_HEIGHT),vy=this.velocity[1];return Math.max(0,(vy+Math.sqrt(vy*vy+19.62*dy))/9.81);}
 planFlight(dt){
  const f=this.flight;if(!f)return;f.age+=dt;
  const g=this.grapple,landingSurface=g&&g.kind!=='sky'?g.kind:'floor',normal=normals[landingSurface];
  let eta=this.groundETA();
  if(g&&g.stage!=='firing'&&g.kind!=='sky'){
   const goal=add(g.target,scale(g.normal,STAND_HEIGHT)),d=length(sub(goal,this.center)),speed=Math.max(.2,dot(this.velocity,unit(sub(goal,this.center))));
   eta=(Math.sqrt(speed*speed+24*d)-speed)/12;
  }
  // Airborne cruise banks into travel; the final approach monotonically rights the feet.
  const target=upQuaternion(normal),bank=upQuaternion(unit([this.velocity[0],4,this.velocity[2]]));
  const cruise=slerp(f.from,bank,smooth(f.age/.6)*.65);
  const preparing=g?.kind==='sky'?0:smooth((1.25-eta)/1.05);
  f.blend=Math.max(f.blend,preparing);this.preparation=f.blend;
  this.orientation=slerp(cruise,target,f.blend);
  this.deploy=Math.max(this.deploy,this.mode==='gecko'?Math.min(1,this.deploy+dt/.55):f.blend);
  this.shellRotation=slerp(f.shell,[0,0,0,1],f.blend);
 }
 land(surface,point,impact){
  const normal=normals[surface],alignment=dot(rotateVector([0,1,0],this.orientation),normal);
  this.lastLanding={surface,point:[...point],impact_speed:impact,alignment,deploy:this.deploy,time:this.time};this.landingCount++;
  this.air=0;this.flight=null;this.mode='gecko';this.surface=surface;this.deploy=1;this.preparation=1;
  this.orientation=upQuaternion(normal);this.shellRotation=[0,0,0,1];
  this.velocity=[0,0,0]; // Adhesive contact arrests tangential travel; recovery feet stay planted.
  this.landing={age:0,amplitude:clamp(.065+impact*.012,.075,.18),point:[...point],surface};
  this.height=STAND_HEIGHT;this.center=add(point,scale(normal,this.height));this.recoil=0;
  if(this.grapple){this.grapple.stage='anchored';this.grapple.force=0;}this.winchAcceleration=0;
  this.event=(surface==='floor'?'Ground':'Wall / ceiling')+' contact · legs absorbing impact';
 }
 updateRecoil(dt){
  if(!this.landing){this.recoil=0;return;}
  const l=this.landing;l.age+=dt;
  // Fast hydraulic compression, damped recovery and a smaller second compression.
  const u=l.age/1.05;
  this.recoil=l.amplitude*(Math.exp(-Math.pow((u-.17)/.12,2))+.20*Math.exp(-Math.pow((u-.58)/.17,2)));
  if(u>=1.2){this.landing=null;this.recoil=0;}
 }
 step(dt,input={}){
  dt=clamp(dt,0,1/30);if(!dt)return;this.time+=dt;const old=[...this.center];this.updateRecoil(dt);
  let x=Number(!!input.right)-Number(!!input.left),f=Number(!!input.forward)-Number(!!input.back),l=Math.hypot(x,f);if(l>1){x/=l;f/=l;}
  const moving=l>0;this.runup=moving?Math.min(6,this.runup+dt):Math.max(0,this.runup-dt*2);
  if(!this.air){const want=this.mode==='gecko'?1:0;this.deploy+=clamp(want-this.deploy,-dt/.85,dt/.85);}
  this.height=RADIUS+(STAND_HEIGHT-RADIUS)*smooth(this.deploy)-this.recoil;
  const g=this.grapple;
  if(g){g.age+=dt;if(g.stage==='firing'&&g.age>=.30){g.stage='pulling';this.beginFlight();this.event='Winch engaged · pull building';}}
  if(this.air){
   if(g?.stage==='pulling'){
    g.pullAge+=dt;const goal=g.kind==='sky'?g.target:add(g.target,scale(g.normal,STAND_HEIGHT));
    const diff=sub(goal,this.center),distance=length(diff),dir=unit(diff),closing=dot(this.velocity,dir);
    g.force=6+24*smooth(g.pullAge/1.8);this.winchAcceleration=g.force;
    const safeSpeed=g.kind==='sky'?18:Math.min(18,Math.sqrt(2.3**2+2*13*Math.max(0,distance-.10)));
    const along=closing>safeSpeed?-Math.min(42,(closing-safeSpeed)*18):g.force;
    const lateral=sub(this.velocity,scale(dir,closing));
    const acceleration=add(scale(dir,along),scale(lateral,-5));acceleration[1]-=1.2; // Assisted winch supports most weight.
    this.velocity=add(this.velocity,scale(acceleration,dt));
    if(length(this.velocity)>18)this.velocity=scale(unit(this.velocity),18);
    this.center=add(this.center,scale(this.velocity,dt));
    if(g.kind==='sky'&&distance<Math.max(.7,length(this.velocity)*dt*2)){
     this.grapple=null;this.winchAcceleration=0;this.beginFlight();this.event='Sky ring passed · free flight / cat landing';
    }
    this.planFlight(dt);
    if(g.kind!=='sky'&&this.grapple===g&&distance<Math.max(.13,length(this.velocity)*dt*1.5)){
     // Preparation is complete before the contact threshold, independently of the renderer.
     this.land(g.kind,g.target,Math.abs(dot(this.velocity,g.normal)));
    }
   }else{
    this.velocity[1]-=9.81*dt;this.velocity[0]+=x*.8*dt;this.velocity[2]-=f*.8*dt;
    this.center=add(this.center,scale(this.velocity,dt));this.planFlight(dt);
   }
   if(this.flight&&this.center[1]>STAND_HEIGHT+.10)this.flight.departed=true;
   if(this.flight&&!this.flight.departed&&this.grapple&&this.center[1]<this.height){this.center[1]=this.height;this.velocity[1]=Math.max(0,this.velocity[1]);}
   // Floor contacts are real crossings, including releases during a pull.
   if(this.air&&this.center[1]<=STAND_HEIGHT&&this.velocity[1]<0&&(!this.grapple||this.flight?.departed)){
    const point=[this.center[0],0,this.center[2]];this.grapple=null;this.planFlight(dt);this.land('floor',point,-this.velocity[1]);
   }
   if(this.air&&this.center[2]<this.wall+RADIUS){this.center[2]=this.wall+RADIUS;this.velocity[2]=Math.max(0,this.velocity[2]);}
   if(this.air&&this.center[1]>this.roof-RADIUS&&this.center[2]<ARENA.ceilingFront){this.center[1]=this.roof-RADIUS;this.velocity[1]=Math.min(0,this.velocity[1]);}
  }else if(g?.stage==='anchored'){
   this.height=STAND_HEIGHT-this.recoil;this.center=add(g.target,scale(normals[this.surface],this.height));this.velocity=[0,0,0];
  }else{
   const surface=this.surface,normal=normals[surface];
   const direction=surface==='wall'?[x,f,0]:surface==='ceiling'?[x,0,f]:[x,0,-f];
   const ball=this.mode==='roll',max=ball?(input.fast?20:14):surface==='floor'?4.8:3.5;
   const acceleration=ball?2.2+this.runup*.45:1.25+this.runup*.18;
   const drag=input.brake?8:moving?.12:ball?.34:2.3;
   this.velocity=add(scale(this.velocity,Math.exp(-drag*dt)),scale(direction,acceleration*dt));
   this.velocity=sub(this.velocity,scale(normal,dot(this.velocity,normal)));
   if(this.landing&&this.landing.age<.42)this.velocity=[0,0,0];
   if(length(this.velocity)>max)this.velocity=scale(unit(this.velocity),max);
   this.center=add(this.center,scale(this.velocity,dt));
   if(surface==='floor'){
    this.center[1]=this.height;
    if(this.center[2]<this.wall+this.height){this.center[2]=this.wall+this.height;if(this.mode==='gecko'&&this.deploy>.99){this.surface='wall';this.velocity=[this.velocity[0],Math.max(0,-this.velocity[2]),0];this.event='Gecko feet gripping wall';}else this.velocity[2]=0;}
   }else if(surface==='wall'){
    this.center[2]=this.wall+this.height;
    if(this.center[1]>this.roof-this.height){this.center[1]=this.roof-this.height;this.surface='ceiling';this.velocity=[this.velocity[0],0,Math.max(0,this.velocity[1])];this.event='Hanging from ceiling';}
    if(this.center[1]<this.height){this.center[1]=this.height;this.surface='floor';this.velocity=[this.velocity[0],0,Math.max(0,-this.velocity[1])];}
   }else{
    this.center[1]=this.roof-this.height;
    if(this.center[2]<this.wall+this.height){this.center[2]=this.wall+this.height;this.surface='wall';this.velocity=[this.velocity[0],-Math.abs(this.velocity[2]),0];}
    if(this.center[2]>ARENA.ceilingFront-1.5){this.center[2]=ARENA.ceilingFront-1.5;this.velocity[2]=Math.min(0,this.velocity[2]);}
   }
   this.orientation=slerp(this.orientation,upQuaternion(normals[this.surface]),1-Math.exp(-dt*12));
   if(this.deploy>.001)this.shellRotation=slerp(this.shellRotation,[0,0,0,1],1-Math.exp(-dt*8));
  }
  const boundary=ARENA.halfWidth-1.5;
  if(Math.abs(this.center[0])>boundary){this.center[0]=clamp(this.center[0],-boundary,boundary);this.velocity[0]=0;}
  if(this.center[2]>ARENA.front-1.5){this.center[2]=ARENA.front-1.5;this.velocity[2]=Math.min(0,this.velocity[2]);}
  if(this.center[2]<this.wall+RADIUS){this.center[2]=this.wall+RADIUS;this.velocity[2]=Math.max(0,this.velocity[2]);}
  this.lastDelta=sub(this.center,old);this.speed=length(this.velocity);
  if(!this.air&&this.mode==='roll'&&this.deploy<.001){const d=[this.lastDelta[0],0,this.lastDelta[2]],distance=length(d);if(distance>1e-9){const axis=unit([d[2],0,-d[0]]),a=distance/RADIUS;this.shellRotation=qnorm(qmul([...scale(axis,Math.sin(a/2)),Math.cos(a/2)],this.shellRotation));}}
  if(!this.air)this.phase=(this.phase+this.speed*dt/(.34/.65))%1;
 }
}
