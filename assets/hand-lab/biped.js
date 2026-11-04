import {controlsPose} from './runtime.js';

// A loose inward curl, with progressively more flexion toward the little finger.
// The wrist/attachment frame stays neutral. This is not a clenched fist.
export const BIPED_REST=controlsPose({spread:.10,opposition:.28});
for(const [id,mcp,pip,dip]of [
  ['INDEX',.32,.58,.30],['MIDDLE',.42,.70,.35],
  ['RING',.49,.80,.40],['LITTLE',.56,.90,.45]
])Object.assign(BIPED_REST,{[id+'_MCP_FLEX']:mcp,[id+'_PIP_FLEX']:pip,[id+'_DIP_FLEX']:dip});
Object.assign(BIPED_REST,{THUMB_CMC_ABDUCTION:.64,THUMB_MCP_FLEX:.35,THUMB_IP_FLEX:.42});
Object.freeze(BIPED_REST);
