import * as T from 'three';
import {prep} from './settlement-industry-shape.mjs';
// Revision 3: proportions are measured sole-to-crown / chin-to-crown, excluding the neck.
// Revision 4 adds 16 mm to each leg link and subtracts 32 mm from the head mount; crown height is retained.
export const PROPORTIONS={target_heads:8.25,leg_extension_m:.032,neck_reduction_m:.032,helmet_scale:.8907762061954977,crown_local_y_m:.264,shoulder_outer_extension_m:.018,collar_inner_y_m:.327,collar_side_y_m:.274};
export function proportionHelmet(g){const s=PROPORTIONS.helmet_scale;return g.translate(0,-PROPORTIONS.crown_local_y_m,0).scale(s,s,s).translate(0,PROPORTIONS.crown_local_y_m,0)}
export function broadenCap(g,side){const a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),u=T.MathUtils.clamp((side*x+.058)/.116,0,1),ease=u*u*(3-2*u);a.setX(i,x+side*PROPORTIONS.shoulder_outer_extension_m*ease)}a.needsUpdate=true;g.computeVertexNormals();return g}
// Closed annular collar. Inner neck edge rises gently above the outer shoulder edges.
// Continuous front/rear returns join the existing chest; no separate muscle-like blobs.
export function shoulderYoke(lod,color){
 const n=lod===0?48:lod===1?10:8,profile=[[0,0],[.04,.002],[.20,.003],[.75,.002],[1,0],[1.02,-.003],[1,-.006],[.65,-.006],[.15,-.006],[0,-.006],[-.02,-.003]],p=[],ix=[];
 for(const[q,dy]of profile)for(let i=0;i<n;i++){const a=i/n*Math.PI*2,s=Math.sin(a),c=Math.cos(a),outerY=.2645+.0025*c+.0095*s*s,y=T.MathUtils.lerp(.327,outerY,q)+dy,x=T.MathUtils.lerp(.052,.182,q)*s,z=T.MathUtils.lerp(.044,.0845,q)*c+.0125*q;p.push(x,y,z)}
 for(let r=0;r<profile.length;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n,c=((r+1)%profile.length)*n+i,d=((r+1)%profile.length)*n+(i+1)%n;ix.push(a,c,b,b,c,d)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);
}
