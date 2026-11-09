export const SPEC=Object.freeze({height_m:.379,head_envelope:{center:[0,.207,0],radii:[.087,.117,.111]},head_datum_m:[0,.09,0],neck_radius_m:.049,robot_head_offset_m:[0,-1.465,0]});
export const MODULES={
 SHELL:{label:'Honeycomb cowl',offset:[0,.07,-.045]},
 CROWN_BAND:{label:'Continuous crown band',offset:[0,.11,0]},
 FACEPLATE:{label:'Recessed sensor faceplate',offset:[0,0,.065]},
 OPTICS:{label:'Five-lens optical array',offset:[0,0,.125]},
 JAW:{label:'Curved jaw armor',offset:[0,-.035,.06]},
 RESPIRATOR:{label:'Vented chin cassette',offset:[0,-.025,.125]},
 COLLAR:{label:'Neck seal and collar',offset:[0,-.07,0]},
 LINER:{label:'Interior liner',offset:[0,.015,-.10]}
};
export function createRig(scene){const root=scene.getObjectByName('HEX_WITNESS_ROOT');if(!root)throw new Error('Not a Hex Witness helmet');const nodes=Object.fromEntries(Object.keys(MODULES).map(id=>[id,scene.getObjectByName('PART_'+id)]));return{root,nodes,static:!!root.userData.static,pose({spread=0}={}){if(root.userData.static)return;for(const[id,n]of Object.entries(nodes))n.position.fromArray(MODULES[id].offset).multiplyScalar(Math.max(0,Math.min(1,spread)));scene.updateMatrixWorld(true);}};}
