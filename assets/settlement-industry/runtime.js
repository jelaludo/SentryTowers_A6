// Deterministic engine-side example; uses no renderer and never advances itself.
// Pass loaded GLTF scenes and the consuming game's THREE namespace.
export const DEMO_DURATION=32;
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=(t,a,b)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v);};
export function demoState(time){
 if(!Number.isFinite(time))throw new TypeError('time must be finite');
 const t=Math.max(0,Math.min(DEMO_DURATION,time)),lift=smooth(t,11,15),slide=smooth(t,15,19),travel=smooth(t,21,29);
 return {time:t,fill:smooth(t,0,10),lift:1.72*lift,slide:-4.8+3.75*slide,travel:8*travel,phase:t<10?'Extracting / filling cassette':t<11?'Clearing / swinging ore chute':t<15?'Collecting / raising forks':t<19?'Stowing / retracting carriage':t<21?'Cargo secured':t<29?'Transporting ore':t<32?'Delivery stop / awaiting refinery':'Collection complete'};
}
export function aimMirror(T,root,sun,receiver){
 const yaw=root.getObjectByName('MIRROR_YAW'),pitch=root.getObjectByName('MIRROR_PITCH');if(!yaw||!pitch)return;
 root.updateMatrixWorld(true);const center=yaw.getWorldPosition(new T.Vector3()),outgoing=receiver.clone().sub(center).normalize(),normal=sun.clone().normalize().add(outgoing).normalize();
 // Convert the desired world normal into the static pedestal's local coordinates.
 normal.applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());yaw.rotation.y=Math.atan2(normal.x,normal.z);pitch.rotation.x=-Math.asin(Math.max(-1,Math.min(1,normal.y)));root.updateMatrixWorld(true);
}
export function applyDemo(T,models,time,lod){
 const state=demoState(time),{drill,hauler,cassette}=models;
 if(lod===2)return {...state,phase:'Static distance proxies / controls retained for lookup only'};
 const t=state.time;
 if(cassette)cassette.getObjectByName('CASSETTE_LEVEL').scale.y=.05+.95*state.fill;
 if(drill){drill.getObjectByName('ORE_CHUTE_SWING').rotation.y=-1.4*smooth(t,10,11);drill.getObjectByName('DRILL_FEED').position.y=2.65-1.2*smooth(t,0,2)*(1-smooth(t,10,12))+.04*Math.sin(t*2)*Math.sin(Math.PI*Math.min(t,10)/10);drill.getObjectByName('DRILL_SPIN').rotation.y=Math.min(t,10)*5;}
 if(hauler){hauler.position.z=4.8+state.travel;hauler.getObjectByName('CARGO_SLIDE').position.z=state.slide;hauler.getObjectByName('CARGO_LIFT').position.y=state.lift;hauler.getObjectByName('LIFT_TELESCOPE').position.y=state.lift;hauler.getObjectByName('LIFT_TELESCOPE').scale.y=Math.max(.04,(1.8-state.lift)/1.8);hauler.getObjectByName('SENSOR_YAW').rotation.y=t<10?-.35:0;
  hauler.traverse(o=>{if(/^WHEEL_(L|R)_(FRONT|MID|REAR)$/.test(o.name))o.rotation.x=state.travel/.98;});
  if(cassette){hauler.updateMatrixWorld(true);const s=hauler.getObjectByName('SOCKET_CARGO'),world=s.getWorldPosition(new T.Vector3());cassette.position.copy(cassette.parent?cassette.parent.worldToLocal(world):world);cassette.quaternion.copy(s.getWorldQuaternion(new T.Quaternion()));}
 }
 return state;
}
