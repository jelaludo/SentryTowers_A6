export const SPEC={surface_plot_m:[60,60],surface_height_m:54,small_dome_plot_m:30,comparison_domes:4,hangar_bays:1,hangar_clear_m:[11,5.86,18],hangar_floor_m:.54,hangar_front_z_m:25.15,tether_half_width_m:.55,climber_frame_clear_m:[2.8,1.8],climber_contact_span_m:1.1,roller_radius_m:.5,orbital_dock_origin_m:[0,-8.2,0],demo_duration_s:24};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function poseElevator(root,{door=0,solar=0,dish=0,distance=0}={}){
 if(root.userData.static)return;
 const left=root.getObjectByName('HANGAR_DOOR_L'),right=root.getObjectByName('HANGAR_DOOR_R');
 if(left){left.position.x=-2.75-5.65*clamp(door,0,1);right.position.x=2.75+5.65*clamp(door,0,1);}
 const hatch=root.getObjectByName('CLIMBER_HATCH');if(hatch)hatch.position.y=2.7+3.1*clamp(door,0,1);
 for(const id of ['A','B']){const wing=root.getObjectByName('SOLAR_'+id+'_HINGE');if(wing)wing.rotation.x=clamp(solar,-35,35)*Math.PI/180;}
 const yaw=root.getObjectByName('DISH_YAW');if(yaw)yaw.rotation.y=dish*Math.PI/180;
 for(const id of ['L_LOW','L_HIGH','R_LOW','R_HIGH']){const roller=root.getObjectByName('ROLLER_'+id);if(roller)roller.rotation.z=(id.startsWith('L')?-1:1)*distance/SPEC.roller_radius_m;}
 root.updateMatrixWorld(true);
}
