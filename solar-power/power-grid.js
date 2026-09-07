// Deterministic game-side power allocation. A consumer is bound to one source.
export function evaluatePowerGrid(sources, consumers) {
  const supply = new Map(sources.map(s => [s.id, { ...s, remaining: s.enabled ? Math.max(0, s.capacity) : 0 }]));
  return [...consumers].sort((a,b)=>(b.priority||0)-(a.priority||0)||a.id.localeCompare(b.id)).map(c => {
    const s = supply.get(c.sourceId);
    const inRange = !!s && Math.hypot(c.position[0]-s.position[0],c.position[2]-s.position[2]) <= s.radius;
    const powered = !!s && s.enabled && inRange && c.demand <= s.remaining;
    if (powered) s.remaining -= c.demand;
    return { ...c, powered, inRange, canFire: powered, reason: !s ? 'No source' : !s.enabled ? 'Source destroyed' : !inRange ? 'Outside coverage' : !powered ? 'Insufficient power' : 'Powered' };
  });
}
export function solarCapacity(array, station) {
  return array.damage_level === 3 || station.damage_level === 3 ? 0 : Math.max(0,Math.min(array.output_capacity,station.output_capacity));
}
export function requestTowerFire(tower, fire) {
  if (!tower?.powered || !tower.canFire) return false;
  fire(tower); return true;
}
