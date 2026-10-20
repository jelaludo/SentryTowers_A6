// Library-neutral placement calculation. Keep the original sentry model and pivots intact.
export function equipmentFit(bounds,size=1){
 const [a,b]=[bounds.min,bounds.max];
 const radius=Math.hypot(Math.max(Math.abs(a[0]),Math.abs(b[0])),Math.max(Math.abs(a[2]),Math.abs(b[2])));
 const scale=Math.min(.45,.34/Math.max(radius,1e-6),.8/Math.max(b[1]-a[1],1e-6))*Math.max(.6,Math.min(1,size));
 return {scale,yOffset:-a[1]*scale,radius:radius*scale,height:(b[1]-a[1])*scale};
}
