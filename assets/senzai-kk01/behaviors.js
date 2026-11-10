// Senzai-KK01 behavior cues by Jelaludo. Attribution required for reuse.
// Cues enter the deterministic animation at its lead-in, then continue the cycle.
export const BEHAVIORS = Object.freeze({
  cycle: {label:'Living cycle', time:null, duration_s:null, awake:1, note:'A mind searching through possibility.'},
  foraging: {label:'Foraging', time:0, duration_s:7.4, awake:1, note:'Independent tendrils explore; the field sways and breathes.'},
  focus_lock: {label:'Focus Lock', time:7.45, duration_s:5.35, awake:1, note:'A shared signal gathers the attention of many strands.'},
  examining: {label:'Examining', time:26.5, duration_s:7.3, awake:1, note:'Fifteen tips converge on one small, fixed spot and study it.'},
  following: {label:'Following', time:9.9, duration_s:2.1, awake:1, note:'Curiosity draws the whole field toward its focus.'},
  dormant: {label:'Dormant', time:null, duration_s:null, awake:0, note:'Emerald attention rests. The fibers keep breathing.'},
});

export function behaviorCue(id, currentTime=0) {
  const behavior=BEHAVIORS[id];
  if(!behavior)throw new RangeError(`Unknown Senzai behavior: ${id}`);
  return {...behavior,id,time:behavior.time??currentTime};
}
