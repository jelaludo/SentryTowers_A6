// Size the weapon to the rover, allowing barrel overhang beyond the support pad.
export function equipmentFit(bounds,size=1){
 const [a,b]=[bounds.min,bounds.max];
 const halfWidth=Math.max(Math.abs(a[0]),Math.abs(b[0]));
 const radius=Math.hypot(halfWidth,Math.max(Math.abs(a[2]),Math.abs(b[2])));
 const scale=Math.min(.70,.55/Math.max(halfWidth,1e-6),1.25/Math.max(b[1]-a[1],1e-6),1.75/Math.max(b[2],1e-6),2.5/Math.max(b[2]-a[2],1e-6))*Math.max(.6,Math.min(1,size));
 return {scale,yOffset:-a[1]*scale,radius:radius*scale,height:(b[1]-a[1])*scale,width:2*halfWidth*scale,length:(b[2]-a[2])*scale,forward:b[2]*scale};
}
