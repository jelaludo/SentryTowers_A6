// SHUTTLE-01-compatible external interface. Local seal plane Y=0; +Z forward.
import * as T from 'three';
import {prep,box,cyl,ring,node,socket} from './settlement-industry-shape.mjs';
export function lathe(profile,n,color,pos=[0,0,0],rot=[0,0,0]){return prep(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),n),color,pos,rot);}
export function addVentralDock(root,bins,fixed,{z=-2,n=32,C}){
 fixed.push(lathe([[1.52,.32],[1.81,.32],[1.81,1.7],[1.25,1.7],[1.25,1.65],[1.52,1.65],[1.52,.32]],n,C.dark,[0,0,z]));
 fixed.push(lathe([[1.25,1.9],[1.81,1.9],[1.81,2.8],[1.25,2.8],[1.25,1.9]],n,C.dark,[0,0,z]),cyl(1.25,.1,n,[0,2.87,z],C.steel));
 const collar=node(root,'DOCK_EXTEND',[0,0,z]);bins.push({parent:collar,name:'DOCK_COLLAR_SURFACE',parts:[lathe([[1.25,0],[1.7,0],[1.7,.22],[1.48,.35],[1.48,1.65],[1.25,1.65],[1.25,0]],n,C.steel),ring(1.61,.045,n,[0,.05,0],C.amber),ring(1.29,.025,n,[0,.025,0],C.dark)]});socket(collar,'SOCKET_BELLY_DOCK',[0,0,0],'orbital_dock',[0,-1,0]);
 for(const [id,a]of [['E',0],['N',Math.PI/2],['W',Math.PI],['S',Math.PI*1.5]]){const frame=node(collar,'CAPTURE_'+id+'_FRAME',[1.6*Math.cos(a),.14,1.6*Math.sin(a)]);frame.rotation.y=-a;const pivot=node(frame,'CAPTURE_'+id);bins.push({parent:pivot,name:'CAPTURE_'+id+'_SURFACE',parts:[box([.24,.18,.27],[0,0,0],C.amber),box([.08,.09,.29],[.13,.045,0],C.dark)]});}
 for(const side of [-1,1]){const id=side<0?'L':'R',h=node(root,'BELLY_HATCH_'+id,[0,1.75,z]),s=new T.Shape();for(let i=0;i<=n/2;i++){const a=Math.PI/2+i/(n/2)*Math.PI,x=(side<0?1:-1)*1.245*Math.cos(a),y=1.245*Math.sin(a);i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.1,steps:1,bevelEnabled:false});g.rotateX(-Math.PI/2);bins.push({parent:h,name:'BELLY_HATCH_'+id+'_SURFACE',parts:[prep(g,C.hull),box([.055,.025,1.8],[side*.12,-.015,0],C.amber)]});}
}
