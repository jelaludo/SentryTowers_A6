// Deterministic, turn-based design prototype. Units and travel times are game rules,
// not physical claims about the existing GLBs, orbital transfers or laser performance.
export const PLANET_DEFS=[
 {id:'eos',name:'Eos',x:15,y:56,rate:4,ships:18,owner:'player',color:'#73dcc3',blurb:'First terraformed world · Stålheart, AFR-01 and the first receiver.'},
 {id:'iona',name:'Iona',x:32,y:25,rate:2,ships:4,owner:'neutral',color:'#9abbd2',blurb:'Cold mineral world · a fast first foothold.'},
 {id:'talus',name:'Talus',x:43,y:77,rate:3,ships:6,owner:'neutral',color:'#d4a77d',blurb:'Ore-rich world · stronger shipbuilding once terraformed.'},
 {id:'vesper',name:'Vesper',x:68,y:22,rate:3,ships:13,owner:'rival',color:'#d27b87',blurb:'Rival garrison · a candidate for an orbital-laser opening.'},
 {id:'kora',name:'Kora',x:65,y:72,rate:2,ships:5,owner:'neutral',color:'#b3d692',blurb:'Volatile world · another receiver site after terraforming.'},
 {id:'nadir',name:'Nadir',x:86,y:52,rate:4,ships:17,owner:'rival',color:'#b27491',blurb:'Fortified outer world · costly to take without light and laser support.'}
];
export const COLLECTORS=[
 {id:'hel1',name:'HEL-01 / A',yield:16,options:['eos','iona'],x:45,y:40},
 {id:'hel2',name:'HEL-01 / B',yield:18,options:['eos','talus'],x:56,y:39},
 {id:'seed1',name:'SEED-01 / C',yield:22,options:['iona','vesper','kora'],x:56,y:60},
 {id:'seed2',name:'SEED-01 / D',yield:26,options:['talus','kora','nadir'],x:45,y:61}
];
export const TERRAFORM_COST=40, LASER_COST=24, LASER_DAMAGE=7, POWER_CAP=240;
export function makeGame(mode='frontier'){
 if(!['frontier','optics'].includes(mode))throw new Error('Unknown mode');
 const planets=PLANET_DEFS.map(p=>({...p,terraform:p.id==='eos',ships:p.ships}));
 if(mode==='optics')for(const p of planets)if(['iona','talus','kora'].includes(p.id)){p.owner='player';p.terraform=true;p.ships=8;}
 return{mode,turn:1,power:35,planets,fleets:[],collectors:[{id:'hel1',target:'eos'},{id:'hel2',target:'eos'},{id:'seed1',target:'vesper'},{id:'seed2',target:'nadir'}],log:['Eos is terraformed. The stellar map is now yours.'],won:false};
}
export function planet(state,id){return state.planets.find(p=>p.id===id);}
export function beamLinks(state){const used=new Set();return COLLECTORS.map(def=>{const target=state.collectors.find(c=>c.id===def.id)?.target,p=planet(state,target),eligible=p?.owner==='player'&&p.terraform,active=eligible&&!used.has(target);if(active)used.add(target);return{collector:def.id,target,yield:def.yield,active,reason:active?'linked':!eligible?'receiver offline':'receiver saturated'};});}
export function powerOutput(state){return beamLinks(state).reduce((sum,link)=>sum+(link.active?link.yield:0),0);}
export function terraformedCount(state){return state.planets.filter(p=>p.owner==='player'&&p.terraform).length;}
export function objective(state){return state.mode==='optics'?{worlds:terraformedCount(state),requiredWorlds:4,output:powerOutput(state),requiredOutput:80}:{worlds:terraformedCount(state),requiredWorlds:4,output:powerOutput(state),requiredOutput:75};}
function note(state,message){state.log.unshift(message);state.log.length=Math.min(state.log.length,7);}
function checkWin(state){const o=objective(state);if(!state.won&&o.worlds>=o.requiredWorlds&&o.output>=o.requiredOutput){state.won=true;note(state,state.mode==='optics'?'All four stellar paths reach separate receivers. Peak output achieved.':'Four terraformed worlds join the stellar grid. The next chapter opens.');}}
export function rotateCollector(state,id){if(state.won)return{ok:false,message:'The objective is complete. Start a new run to reroute light.'};const def=COLLECTORS.find(c=>c.id===id),unit=state.collectors.find(c=>c.id===id);if(!def||!unit)return{ok:false,message:'Collector unavailable.'};unit.target=def.options[(def.options.indexOf(unit.target)+1)%def.options.length];note(state,`${def.name} points to ${planet(state,unit.target).name}.`);checkWin(state);return{ok:true,message:state.log[0]};}
function distance(a,b){return Math.hypot((a.x-b.x)/100,(a.y-b.y)/100);}
function travelTurns(a,b){return Math.max(1,Math.ceil(distance(a,b)*4));}
function resolveArrival(state,fleet){const target=planet(state,fleet.to);if(!target)return;const count=fleet.ships;if(target.owner==='player'){target.ships+=count;note(state,`${count} ships reinforce ${target.name}.`);return;}if(count>target.ships){target.ships=count-target.ships;target.owner='player';target.terraform=false;note(state,`${target.name} is secured. Terraform it to bring its receiver online.`);}else{target.ships-=count;note(state,`${fleet.from.toUpperCase()} fleet reached ${target.name}; ${target.ships} defenders remain.`);}}
export function advanceTurn(state){if(state.won)return;state.turn++;for(const p of state.planets){if(p.owner==='player'&&p.terraform)p.ships+=p.rate;else if(p.owner==='rival'&&state.turn%2===0)p.ships+=1;}state.power=Math.min(POWER_CAP,state.power+powerOutput(state));const arrived=[];for(const f of state.fleets){f.eta--;if(f.eta<=0)arrived.push(f);}state.fleets=state.fleets.filter(f=>f.eta>0);for(const f of arrived)resolveArrival(state,f);checkWin(state);}
export function launchFleet(state,fromId,toId,amount){if(state.mode!=='frontier')return{ok:false,message:'Fleet orders are disabled in the optics challenge.'};if(state.won)return{ok:false,message:'The campaign is complete.'};const from=planet(state,fromId),to=planet(state,toId),ships=Math.trunc(Number(amount));if(!from||from.owner!=='player')return{ok:false,message:'Choose one of your worlds as the source.'};if(!to||to.id===from.id)return{ok:false,message:'Choose a different destination.'};if(!Number.isFinite(ships)||ships<1||ships>from.ships)return{ok:false,message:'Choose an available fleet size.'};from.ships-=ships;const eta=travelTurns(from,to);state.fleets.push({from:from.id,to:to.id,ships,eta,total:eta});note(state,`${ships} ships depart ${from.name} for ${to.name} · ${eta} turn${eta===1?'':'s'}.`);advanceTurn(state);return{ok:true,message:state.log[0]};}
export function terraform(state,id){if(state.mode!=='frontier')return{ok:false,message:'All optics-challenge receivers are already built.'};if(state.won)return{ok:false,message:'The campaign is complete.'};const p=planet(state,id);if(!p||p.owner!=='player'||p.terraform)return{ok:false,message:'Select a secured world awaiting terraforming.'};if(state.power<TERRAFORM_COST)return{ok:false,message:`Terraforming needs ${TERRAFORM_COST} stored power.`};state.power-=TERRAFORM_COST;p.terraform=true;note(state,`${p.name} is terraformed. Its shipyard and receiver are online.`);advanceTurn(state);return{ok:true,message:state.log[0]};}
export function laserPulse(state,id){if(state.mode!=='frontier')return{ok:false,message:'Orbital lasers are disabled in the optics challenge.'};if(state.won)return{ok:false,message:'The campaign is complete.'};const p=planet(state,id);if(!p||p.owner!=='rival')return{ok:false,message:'Select a rival garrison for the laser.'};if(state.power<LASER_COST)return{ok:false,message:`The pulse needs ${LASER_COST} stored power.`};state.power-=LASER_COST;p.ships=Math.max(0,p.ships-LASER_DAMAGE);note(state,`SOL orbital pulse weakens ${p.name} by ${LASER_DAMAGE}.`);advanceTurn(state);return{ok:true,message:state.log[0]};}
export function waitTurn(state){if(state.mode!=='frontier'||state.won)return{ok:false,message:'No turn to advance.'};note(state,'One turn passes. Fleets travel and powered worlds build ships.');advanceTurn(state);return{ok:true,message:state.log[0]};}
