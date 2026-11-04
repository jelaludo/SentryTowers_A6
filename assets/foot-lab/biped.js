import {controlsPose} from './runtime.js';

// A compact, softly curled support pose. Heel and ankle remain at neutral height.
// Less flexion than a hanging hand keeps the toe pads above the ground plane.
export const BIPED_REST=controlsPose({splay:.12});
for(const [id,mtp,pip,dip]of [
  ['TOE_02',.10,.18,.12],['TOE_03',.10,.19,.13],
  ['TOE_04',.12,.21,.14],['TOE_05',.14,.23,.15]
])Object.assign(BIPED_REST,{[id+'_MTP']:mtp,[id+'_PIP']:pip,[id+'_DIP']:dip});
Object.assign(BIPED_REST,{HALLUX_OPPOSITION:-.38,HALLUX_MTP:.12,HALLUX_IP:.22});
Object.freeze(BIPED_REST);
