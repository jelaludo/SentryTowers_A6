// Metres; +Y up, +Z forward. Engine-driven pivots, no baked clips.
export const SPEC=Object.freeze({radius_m:16,center_y_m:25,root_radius_m:8.4,attention_strands:48,cycle_s:48,max_tip_radius_m:20.2,float_amplitude_m:.55,plot_m:[50,50]});
export const TIERS=[{lod:0,fibers:16000,sides:3,segments:2,radius:.009,visual_fibers:48000},{lod:1,fibers:3000,sides:3,segments:1,radius:.013,visual_fibers:24000},{lod:2,fibers:384,sides:3,segments:1,radius:.042,visual_fibers:0}];
export const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};
export function direction(i,n){const y=1-2*(i+.5)/n,a=i*2.399963229728653+.37,r=Math.sqrt(1-y*y);return [r*Math.cos(a),y,r*Math.sin(a)];}
export function attentionDirection(i){const d=direction(Math.floor(i/2)*7%24,24),s=i%2?-1:1;return d.map(x=>x*s);}
export function strandState(i,time,awake=1){const phase=((time/SPEC.cycle_s+i/48)%1+1)%1,u=phase/.29,smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};const life=u<1?smooth(u/.15)*smooth((1-u)/.22):0,extension=u<1?smooth(u/.38)*smooth((1-u)/.35):0,level=life*awake*(.93+.07*Math.sin(u*9+i));return {phase,u,level,extension:extension*awake,length:7.58+(2.2+hash(i+90)*2.0)*extension*awake};}
export function createRig(scene){
 const root=scene.getObjectByName('LATENT_ROOT'),frame=scene.getObjectByName('FLOAT_FRAME'),mesh=scene.getObjectByName('ATTENTION_FIBERS');if(!root||!frame)throw Error('Not a latent field');
 const items=Array.from({length:48},(_,i)=>({shaft:scene.getObjectByName('FIBER_'+String(i+1).padStart(2,'0')),eye:scene.getObjectByName('EYE_'+String(i+1).padStart(2,'0'))}));
 const staticTier=!!root.userData.static,colors=mesh?.isMesh?mesh.geometry.attributes.color:null,ids=mesh?.isMesh?(mesh.geometry.attributes.fiberId||mesh.geometry.attributes._fiberid):null,glow=mesh?.isMesh?(mesh.geometry.attributes.glow||mesh.geometry.attributes._glow):null,along=mesh?.isMesh?(mesh.geometry.attributes.along||mesh.geometry.attributes._along):null;
 return {root,frame,items,static:staticTier,pose(time=0,{awake=1,hdr=false}={}){
  const t=staticTier?0:time,states=items.map((_,i)=>strandState(i,t,staticTier?1:awake));
  if(!staticTier){const w=t*Math.PI*2/48;frame.position.y=SPEC.center_y_m+.55*Math.sin(w);frame.rotation.set(.018*Math.sin(w),.12*Math.sin(w),.027*Math.sin(w));
   for(let i=0;i<items.length;i++){items[i].shaft.scale.y=states[i].length;items[i].eye.position.y=states[i].length;}
   if(colors&&ids&&glow&&along){for(let j=0;j<colors.count;j++){const s=states[Math.round(ids.getX(j))],a=along.getX(j),travel=.66+.34*Math.exp(-Math.pow((a-((s.u*1.4)%1))*6,2)),power=s.level*glow.getX(j)*travel*(hdr?2.8:1),dormant=.004;colors.setXYZ(j,dormant+power*.18,dormant*1.8+power,dormant*1.4+power*.40);}colors.needsUpdate=true;}
  }
  scene.updateMatrixWorld(true);if(mesh?.isSkinnedMesh)mesh.skeleton.update();return {states,active:states.filter(s=>s.level>.02).length};
 }};
}
