export const SHELL_DURATION=4,CENTER_Y=3.8;
export const PROFILE=[[-8,.08],[-6.5,.65],[-4.5,2.35],[-2,3.45],[0,3.75],[2.2,3.4],[4,2.65],[5.5,1.5],[6.2,.08]];
export function radiusAt(z){for(let i=1;i<PROFILE.length;i++)if(z<=PROFILE[i][0]){const [a,r]=PROFILE[i-1],[b,s]=PROFILE[i];return r+(s-r)*(z-a)/(b-a);}return .08;}
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function applyShell(root,time=0){const t=Math.max(0,Math.min(SHELL_DURATION,time)),u=(1-Math.exp(-t*14)),asset=root.getObjectByName('FEIDS26_ROOT');if(asset?.userData.static)return u;
 for(let k=0;k<4;k++){const n=root.getObjectByName('SHELL_QUADRANT_'+(k+1)),a=(k+.5)*Math.PI/2;n.position.set(Math.cos(a)*(u*4+t*2),CENTER_Y+Math.sin(a)*(u*4+t*2),-u*.8-t*.5);n.rotation.z=(k%2?1:-1)*u*.2+t*.35;}root.updateMatrixWorld(true);return u;}
