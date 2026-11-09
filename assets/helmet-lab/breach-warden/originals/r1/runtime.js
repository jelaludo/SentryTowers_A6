export const SPEC = Object.freeze({height_m:.367,head_envelope:{center:[0,.207,0],radii:[.087,.117,.111]},head_datum_m:[0,.09,0],neck_radius_m:.049,robot_head_offset_m:[0,-1.465,0],temple_bar_clearance_design_m:.012});
export const MODULES = {
  SHELL:{label:'Crown + rear shell',offset:[0,.07,-.035]},
  BROW:{label:'Flattened brow / impact scars',offset:[0,.035,.075]},
  VISOR:{label:'Recessed visor + seal',offset:[0,0,.10]},
  CHEEK_L:{label:'Left overlapping cheek armor',offset:[.09,0,.015]},
  CHEEK_R:{label:'Right overlapping cheek armor',offset:[-.09,0,.015]},
  JAW_L:{label:'Replacement jaw plate',offset:[.08,-.025,.04]},
  JAW_R:{label:'Original jaw plate',offset:[-.08,-.025,.04]},
  RESPIRATOR:{label:'Compact respirator cassette',offset:[0,-.025,.12]},
  TEMPLE_BAR:{label:'Suspended ceramic temple bar',offset:[.10,.025,0]},
  COLLAR:{label:'Neck seal + locking collar',offset:[0,-.065,0]},
  LINER:{label:'Inner impact liner',offset:[0,.02,-.08]}
};
export function createRig(scene){
  const root=scene.getObjectByName('BREACH_WARDEN_ROOT');
  if(!root)throw new Error('Not a Breach Warden helmet');
  const nodes=Object.fromEntries(Object.keys(MODULES).map(id=>[id,scene.getObjectByName('PART_'+id)]));
  return {root,nodes,static:!!root.userData.static,pose({spread=0}={}){
    if(root.userData.static)return;
    for(const[id,node]of Object.entries(nodes))node.position.fromArray(MODULES[id].offset).multiplyScalar(Math.max(0,Math.min(1,spread)));
    scene.updateMatrixWorld(true);
  }};
}
