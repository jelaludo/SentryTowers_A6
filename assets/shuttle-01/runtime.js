export const SPEC={length_m:37.205,span_m:23.6,belly_z_m:-5.3975,origin_z_offset_m:3.3975,collar_stroke_m:1.2,seal_radius_m:1.7,clear_radius_m:1.25,hatch_travel_m:1.45,station_socket:'SOCKET_DOCK_E',station_port_m:[30.8,15,0],docked_roll_rad:-Math.PI/2,demo_duration_s:72};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function poseShuttle(root,{extension=0,hatch=0,lock=0,gimbal=0}={}){
 if(root.userData.static)return{extension:0,hatch:0,lock:0,gimbal:0};
 hatch=clamp(hatch);extension=hatch>0?1:clamp(extension);lock=clamp(lock);gimbal=clamp(gimbal,-6,6);
 root.getObjectByName('DOCK_EXTEND').position.y=-SPEC.collar_stroke_m*extension;
 root.getObjectByName('BELLY_HATCH_L').position.x=-SPEC.hatch_travel_m*hatch;root.getObjectByName('BELLY_HATCH_R').position.x=SPEC.hatch_travel_m*hatch;
 for(const id of ['N','E','S','W'])root.getObjectByName('CAPTURE_'+id).rotation.z=.55*lock;
 for(const id of ['L','R'])root.getObjectByName('ENGINE_'+id).rotation.x=clamp(gimbal,-6,6)*Math.PI/180;
 root.updateMatrixWorld(true);return{extension,hatch,lock,gimbal};
}
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
export function dockingState(value){const t=clamp(value,0,72),f=(a,b)=>smooth((t-a)/(b-a));const dockZ=-SPEC.belly_z_m;let position=[48,15,dockZ],roll=0,extension=0,lock=0,hatch=0,thrust=0;
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
export function applyDocking(root,time){const s=dockingState(time);root.position.fromArray(s.position);root.rotation.set(0,0,s.roll);poseShuttle(root,s);root.updateMatrixWorld(true);return s;}
