// Thin curved enclosures in local bind space. Analytic surfaces with rounded perimeter rims.
import * as T from 'three';import {prep} from './settlement-industry-shape.mjs';
// Grid rows run top to bottom, columns left to right; outward is row tangent × column tangent.
export function roundedGrid(grid,columns,color,thickness=.006,steps=3){
 const rows=grid.length/columns,p=[],norm=[],ix=[],N=[];
 for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
  const col=grid[r*columns+Math.min(columns-1,c+1)].clone().sub(grid[r*columns+Math.max(0,c-1)]),row=grid[Math.min(rows-1,r+1)*columns+c].clone().sub(grid[Math.max(0,r-1)*columns+c]);N.push(row.cross(col).normalize());
 }
 const count=grid.length,h=thickness/2;for(const s of [1,-1])for(let i=0;i<count;i++){const v=grid[i].clone().addScaledVector(N[i],s*h);p.push(...v.toArray());norm.push(...N[i].clone().multiplyScalar(s).toArray())}
 for(let r=0;r<rows-1;r++)for(let c=0;c<columns-1;c++){const a=r*columns+c,b=a+1,k=a+columns,d=k+1;ix.push(a,k,b,b,k,d,count+a,count+b,count+k,count+b,count+d,count+k)}
 const border=[];for(let c=0;c<columns;c++)border.push(c);for(let r=1;r<rows;r++)border.push(r*columns+columns-1);for(let c=columns-2;c>=0;c--)border.push((rows-1)*columns+c);for(let r=rows-2;r>0;r--)border.push(r*columns);
 const base=p.length/3,len=border.length;for(let s=0;s<=steps;s++)for(let k=0;k<len;k++){const i=border[k],tangent=grid[border[(k+1)%len]].clone().sub(grid[border[(k+len-1)%len]]).normalize(),out=N[i].clone().cross(tangent).normalize(),a=Math.PI*s/steps,n=N[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(out,Math.sin(a)).normalize();p.push(...grid[i].clone().addScaledVector(n,h).toArray());norm.push(...n.toArray())}
 for(let s=0;s<steps;s++)for(let k=0;k<len;k++){const a=base+s*len+k,b=base+s*len+(k+1)%len,c=a+len,d=b+len;ix.push(a,b,c,b,d,c)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setIndex(ix);return prep(g,color);
}
// Rows: y, half-width, front-edge z, crown projection, return depth.
export function enclosure(rows,color,lod,{thickness=.006,columns=lod===0?29:lod===1?13:7,subdivisions=lod===0?3:1}={}){
 const grid=[];for(let r=0;r<(rows.length-1)*subdivisions+1;r++){
  const f=r/subdivisions,i=Math.min(rows.length-2,Math.floor(f)),t=f-i,a=rows[i],b=rows[i+1],[y,w,z,bow,ret]=a.map((v,k)=>T.MathUtils.lerp(v,b[k],t));
  const controls=[[-w*.94,z-ret],[-w*1.005,z-ret*.55],[-w*.98,z],[-w*.62,z+bow*.72],[0,z+bow],[w*.62,z+bow*.72],[w*.98,z],[w*1.005,z-ret*.55],[w*.94,z-ret]].map(([x,z])=>new T.Vector3(x,y,z));
  const curve=new T.CatmullRomCurve3(controls,false,'centripetal');for(let c=0;c<columns;c++)grid.push(curve.getPoint(c/(columns-1)));
 }
 return roundedGrid(grid,columns,color,thickness,lod===2?1:3);
}
// Elliptical clamshell, continuous depth and narrow seams at ±X; no flat strips.
export function limbShell(stations,angle0,angle1,color,lod){
 const cols=lod===0?25:lod===1?7:5,grid=[];for(const[y,rx,rz]of stations)for(let c=0;c<cols;c++){const a=T.MathUtils.lerp(angle0,angle1,c/(cols-1));grid.push(new T.Vector3(rx*Math.sin(a),y,rz*Math.cos(a)))}
 return roundedGrid(grid,cols,color,lod===2?.005:.006,lod===2?1:3);
}
