// Visual choreography, not a launch/orbit physics solver. +Y up, +Z launch direction.
export const DURATION=30, RADIUS=40, SWEEP=1.05;
export const LAUNCH_START=8, LAUNCH_SECONDS=.4, RELEASE=LAUNCH_START+LAUNCH_SECONDS;
const clamp=v=>Math.min(1,Math.max(0,v));
const ease=(t,a,b)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
export function railPose(u){const a=SWEEP*u;return {position:[0,2.6+RADIUS*(1-Math.cos(a)),-20+RADIUS*Math.sin(a)],pitch:-a};}
export function extensionPose(distance){const p=railPose(1);p.position[1]+=Math.sin(SWEEP)*distance;p.position[2]+=Math.cos(SWEEP)*distance;return p;}
export function launchState(seconds){
 if(!Number.isFinite(seconds))throw new TypeError('seconds must be finite');const t=Math.min(DURATION,Math.max(0,seconds));
 let sled;
 if(t<LAUNCH_START){sled=railPose(0);sled.position[2]-=4*(1-ease(t,0,LAUNCH_START));}
 else if(t<RELEASE)sled=railPose(((t-LAUNCH_START)/LAUNCH_SECONDS)**2);
 else if(t<16)sled=extensionPose(3.2*(1-(1-clamp((t-RELEASE)/(6.4/210)))**2));
 else if(t<18)sled=extensionPose(3.2*(1-ease(t,16,18)));
 else if(t<26)sled=railPose(1-ease(t,18,26));
 else {sled=railPose(0);sled.position[2]-=4*ease(t,26,29);}
 const payload=t<RELEASE?{position:[...sled.position],pitch:sled.pitch}:extensionPose(35*(1-(1-clamp((t-RELEASE)/(1/3)))**2));
 const phase=t<4?'Loading collector':t<8?'Loading / charging accelerator':t<RELEASE?'Accelerating':t<17?'Payload released / sled recovery':t<21?'Unfolding collector':t<26?'Insertion-stage demonstration':'Collector deployed / launcher reset';
 return {time:t,sled,payload,charge:t<8?ease(t,4,8):t<RELEASE?1:1-ease(t,RELEASE,RELEASE+2),clamp:1-ease(t,RELEASE-.04,RELEASE),deploy:ease(t,17,21),burn:t>=21&&t<26,phase};
}
// One emissive strip texture addresses all 16 white accelerator crosspieces in one draw.
const passageTextures=new WeakMap();
export function passagePulse(seconds,index){
 const station=index/15,passage=LAUNCH_START+LAUNCH_SECONDS*Math.sqrt(station);
 if(seconds<passage)return 0;
 // Latch on until the descending sled crosses this station again.
 return seconds>=18&&1-ease(seconds,18,26)<=station?0:1;
}
function lightPassage(T,launcher,seconds){
 const gates=launcher.getObjectByName('PASSAGE_GATES');if(!gates?.isMesh)return;
 let texture=passageTextures.get(gates);
 if(!texture){
  texture=new T.DataTexture(new Uint8Array(16*4),16,1,T.RGBAFormat);
  texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
  const tint=new T.DataTexture(new Uint8Array(16*4),16,1,T.RGBAFormat);
  tint.magFilter=tint.minFilter=T.NearestFilter;tint.generateMipmaps=false;
  gates.material.map=tint;
  gates.material.emissive.set(0x00eaff);gates.material.emissiveIntensity=4;
  gates.material.emissiveMap=texture;gates.material.needsUpdate=true;
  gates.material.addEventListener('dispose',()=>{texture.dispose();tint.dispose();});passageTextures.set(gates,texture);
 }
 const pixels=texture.image.data;
 for(let i=0;i<16;i++){const value=Math.round(255*passagePulse(seconds,i));pixels.set([value,value,value,255],i*4);gates.material.map.image.data.set([255-value,255,255,255],i*4);}
 texture.needsUpdate=true;gates.material.map.needsUpdate=true;
}
export function applyLaunch(T,launcher,satellite,seconds,lod){
 const state=launchState(seconds);if(lod===2)return {...state,phase:'Static loading proxies / switch to game tier for motion'};
 if(launcher){lightPassage(T,launcher,state.time);const sled=launcher.getObjectByName('LAUNCH_SLED');sled.position.fromArray(state.sled.position);sled.rotation.x=state.sled.pitch;
  for(const [name,side] of [['CLAMP_L',-1],['CLAMP_R',1]])launcher.getObjectByName(name).position.x=side*(1.47-.15*state.clamp);
  const glow=launcher.getObjectByName('ACCELERATOR_LIGHTS');if(glow?.material)glow.material.emissiveIntensity=.25+state.charge*2;
 }
 if(satellite){satellite.position.fromArray(state.payload.position);satellite.rotation.x=state.payload.pitch;satellite.position.add(new T.Vector3(0,.43,0).applyEuler(satellite.rotation));
  for(let i=1;i<=6;i++)satellite.getObjectByName('PETAL_'+i+'_HINGE').rotation.x=(1-state.deploy)*Math.PI/2;
  satellite.getObjectByName('INSERTION_PLUME').scale.setScalar(state.burn?1:0);
 }
 return state;
}
