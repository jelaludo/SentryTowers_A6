// Aerodynamic motorcycle / military hybrid, in the inspected HEAD bind frame.
// +Z is anatomical forward. Crown height is retained; the chin and rear are swept.
import * as T from 'three';
import {prep} from './settlement-industry-shape.mjs';
import {roundedGrid} from './nisoku03-shells.mjs';

export const HELMET_PROFILE=[
  [.005,.060,.115,-.050], [.033,.088,.150,-.097],
  [.075,.106,.155,-.123], [.115,.110,.143,-.132],
  [.160,.110,.134,-.138], [.198,.106,.128,-.145],
  [.222,.095,.115,-.138], [.245,.068,.073,-.104],
  [.260,.030,.027,-.049]
];
export function helmetSurface(y,theta,offset=0){
  let i=0;while(i<HELMET_PROFILE.length-2&&HELMET_PROFILE[i+1][0]<y)i++;
  const a=HELMET_PROFILE[i],b=HELMET_PROFILE[i+1],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
  const before=HELMET_PROFILE[Math.max(0,i-1)],after=HELMET_PROFILE[Math.min(HELMET_PROFILE.length-1,i+2)],dy=b[0]-a[0];
  const smooth=k=>{const m0=(b[k]-before[k])/(b[0]-before[0])*dy,m1=(after[k]-a[k])/(after[0]-a[0])*dy;return (2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*m1};
  const width=smooth(1),front=smooth(2),rear=smooth(3);
  return new T.Vector3((width+offset)*Math.sin(theta),y,(front+rear)/2+((front-rear)/2+offset)*Math.cos(theta));
}
export function helmetShell(lod){
  const n=lod===0?48:lod===1?16:8,rows=lod===0?48:lod===1?11:9,p=[],ix=[];
  for(let r=0;r<rows;r++)for(let i=0;i<n;i++)p.push(...helmetSurface(T.MathUtils.lerp(.005,.260,r/(rows-1)),i/n*Math.PI*2).toArray());
  for(let r=0;r<rows-1;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n;ix.push(a,b,a+n,b,b+n,a+n)}
  const bottom=p.length/3;p.push(0,.005,.0325);const top=p.length/3;p.push(0,.264,-.010);
  for(let i=0;i<n;i++){const j=(i+1)%n,k=(rows-1)*n;ix.push(bottom,j,i,top,k+i,k+j)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,0x30383e);
}
const limits=theta=>{const u=Math.abs(theta)/1.32;return [.086+.025*u**1.5,.194-.025*u**1.7]};
export function helmetVisor(lod){
  const cols=lod===0?41:lod===1?13:7,rows=lod===0?7:lod===1?4:3,p=[],ix=[],perimeter=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const theta=T.MathUtils.lerp(-1.32,1.32,c/(cols-1)),[lo,hi]=limits(theta),y=T.MathUtils.lerp(hi,lo,r/(rows-1));p.push(...helmetSurface(y,theta,.0025).toArray());}
  for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){const a=r*cols+c,b=a+1,k=a+cols;ix.push(a,k,b,b,k,k+1)}
  for(let c=0;c<cols;c++)perimeter.push(new T.Vector3(...p.slice(c*3,c*3+3)));
  for(let r=1;r<rows;r++){const i=r*cols+cols-1;perimeter.push(new T.Vector3(...p.slice(i*3,i*3+3)))}
  for(let c=cols-2;c>=0;c--){const i=(rows-1)*cols+c;perimeter.push(new T.Vector3(...p.slice(i*3,i*3+3)))}
  for(let r=rows-2;r>0;r--){const i=r*cols;perimeter.push(new T.Vector3(...p.slice(i*3,i*3+3)))}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();
  const curve=new T.CatmullRomCurve3(perimeter,true,'centripetal');
  return {glass:prep(g,0x08121d),rim:prep(new T.TubeGeometry(curve,lod===0?80:lod===1?27:16,.0012,4,true),0x627078)};
}
export function helmetBrow(lod){
  const cols=lod===0?25:lod===1?9:5,grid=[];
  for(let r=0;r<2;r++)for(let c=0;c<cols;c++){
    const theta=T.MathUtils.lerp(-1.34,1.34,c/(cols-1)),[,hi]=limits(theta),v=helmetSurface(hi+.008-r*.003,theta,.001+r*.015);
    grid.push(v);
  }
  return roundedGrid(grid,cols,0x3d474d,.004,lod===2?1:3);
}
