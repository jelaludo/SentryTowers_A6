import fs from 'node:fs';import {sample,profiles,phases} from '../../missile-lab/flight.mjs';
const clips=Object.entries(profiles).map(([id,p])=>({id,...p,frames:Array.from({length:Math.round(p.duration*60)+1},(_,i)=>({time:i/60,...sample(i/(p.duration*60),id)}))}));
fs.writeFileSync(new URL('../../assets/missile-kit/flight-samples.json',import.meta.url),JSON.stringify({phases,clips}));
