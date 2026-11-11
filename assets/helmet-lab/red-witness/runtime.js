export const MODULES={SHELL:{label:'Complete authored shell',offset:[0,0,0]}};
export const SPEC={height_m:.34013,head_envelope:{center:[0,.17,0],radii:[.078,.108,.095]},robot_head_offset_m:[0,-1.49,0]};
export function createRig(scene){return {static:!!scene.getObjectByName('RED_WITNESS_HELMET_ROOT')?.userData.static,pose(){scene.updateMatrixWorld(true);}};}
