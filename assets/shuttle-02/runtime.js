export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const SPEC={length_m:42,span_m:25.2,belly_z_m:-2,collar_stroke_m:1.2,seal_radius_m:1.7,clear_radius_m:1.25,hatch_travel_m:1.45,station_socket:'SOCKET_DOCK_E',station_port_m:[30.8,15,0],docked_roll_rad:-Math.PI/2,demo_duration_s:72,vtol_duration_s:24,thruster_centres_m:[[-7.2,4.5,0],[7.2,4.5,0]],thruster_tilt_deg:[0,90]};
export const PHASES=[
 {id:'approach',start:0,end:10,title:'Approach the terminal'},
 {id:'roll',start:10,end:16,title:'Roll belly toward the port'},
 {id:'extend',start:16,end:20,title:'Extend the docking collar'},
 {id:'capture',start:20,end:30,title:'Close to soft capture'},
 {id:'lock',start:30,end:32,title:'Engage four capture latches'},
 {id:'open',start:32,end:35,title:'Open the underbelly hatch'},
 {id:'transfer',start:35,end:42,title:'Docked / airlock exposed'},
 {id:'close',start:42,end:45,title:'Close the underbelly hatch'},
 {id:'unlock',start:45,end:47,title:'Release capture latches'},
 {id:'backoff',start:47,end:54,title:'Back away from the terminal'},
 {id:'retract',start:54,end:57,title:'Retract the docking collar'},
 {id:'level',start:57,end:63,title:'Return to level attitude'},
 {id:'depart',start:63,end:72,title:'Depart the terminal'}
];
function baseDocking(value){const t=clamp(value,0,72),f=(a,b)=>smooth((t-a)/(b-a));const dockZ=-SPEC.belly_z_m;let position=[48,15,dockZ],roll=0,extension=0,lock=0,hatch=0,thrust=0;
 if(t<10){const u=f(0,10);position=[50-2*u,15,-80+(80+dockZ)*u];thrust=.3*(1-u);}
 if(t>=10)roll=-Math.PI/2*f(10,16);
 if(t>=16)extension=f(16,20);
 if(t>=20)position=[48-16*f(20,30),15,dockZ];
 if(t>=30)lock=f(30,32);
 if(t>=32)hatch=f(32,35);
 if(t>=42)hatch=1-f(42,45);
 if(t>=45)lock=1-f(45,47);
 if(t>=47)position=[32+16*f(47,54),15,dockZ];
 if(t>=54)extension=1-f(54,57);
 if(t>=57)roll=-Math.PI/2*(1-f(57,63));
 if(t>=63){const u=f(63,72);position=[48+4*u,15+5*u,dockZ+(90-dockZ)*u];thrust=.65*Math.sin(u*Math.PI);}
 return{time:t,phase:PHASES.find(p=>t<p.end)||PHASES.at(-1),position,roll,extension,lock,hatch,thrust,gimbal:0};
}

export function poseShuttle(root,{extension=0,hatch=0,lock=0,tiltL=0,tiltR=tiltL}={}){
 if(root.userData.static)return{extension:0,hatch:0,lock:0,tiltL:0,tiltR:0};
 hatch=clamp(hatch);extension=hatch>0?1:clamp(extension);lock=clamp(lock);tiltL=clamp(tiltL,0,90);tiltR=clamp(tiltR,0,90);
 root.getObjectByName('DOCK_EXTEND').position.y=-SPEC.collar_stroke_m*extension;
 for(const [id,side]of [['L',-1],['R',1]])root.getObjectByName('BELLY_HATCH_'+id).position.x=side*SPEC.hatch_travel_m*hatch;
 for(const id of ['N','E','S','W'])root.getObjectByName('CAPTURE_'+id).rotation.z=.55*lock;
 root.getObjectByName('THRUSTER_L_TILT').rotation.x=tiltL*Math.PI/180;root.getObjectByName('THRUSTER_R_TILT').rotation.x=tiltR*Math.PI/180;
 root.updateMatrixWorld(true);return{extension,hatch,lock,tiltL,tiltR};
}
export function dockingState(time){const s=baseDocking(time);return{...s,tiltL:90,tiltR:90};}
export function applyDocking(root,time){const s=dockingState(time);root.position.fromArray(s.position);root.rotation.set(0,0,s.roll);poseShuttle(root,s);return s;}
export const VTOL_PHASES=[{id:'lift',start:0,end:5,title:'Vertical lift'},{id:'transition',start:5,end:11,title:'Rotate to forward thrust'},{id:'cruise',start:11,end:15,title:'Cruise attitude'},{id:'return',start:15,end:21,title:'Return to hover'},{id:'settle',start:21,end:24,title:'Settle into hover'}];
export function vtolState(value){const t=clamp(value,0,24),f=(a,b)=>smooth((t-a)/(b-a)),tilt=90*f(5,11)*(1-f(15,21)),lift=5*f(0,5)*(1-f(21,24));return{time:t,phase:VTOL_PHASES.find(p=>t<p.end)||VTOL_PHASES.at(-1),position:[0,lift,0],roll:0,tiltL:tilt,tiltR:tilt,extension:0,hatch:0,lock:0,thrust:.65};}
export function applyVTOL(root,time){const s=vtolState(time);root.position.fromArray(s.position);root.rotation.set(0,0,0);poseShuttle(root,s);return s;}
