export const DURATION=12;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function writeState(time){
 const t=((time%DURATION)+DURATION)%DURATION;
 if(t<1){const a=smooth(t);return {phase:'Align wafer',writing:false,x:-.4*a,z:-.35*a};}
 if(t>=10){const a=1-smooth((t-10)/2);return {phase:'Return to datum',writing:false,x:-.4*a,z:.35*a};}
 const p=(t-1)/1.5,row=Math.min(5,Math.floor(p)),u=p-row,turn=u>.85&&row<5;
 return {phase:turn?'Index next row':'Writing die row '+(row+1),writing:!turn,x:((row%2?1-smooth(u/.85):smooth(u/.85))-.5)*.8,z:(row-2.5)*.14+(turn?.14*smooth((u-.85)/.15):0)};
}
export function applyWrite(root,time,lod,showBeam=true){const s=writeState(time);if(lod===2)return {...s,phase:'Static distance tier'};root.getObjectByName('WAFER_STAGE').position.set(1.5+s.x,1.52,-.6+s.z);root.getObjectByName('LASER_PATH').visible=showBeam&&s.writing;return s;}
