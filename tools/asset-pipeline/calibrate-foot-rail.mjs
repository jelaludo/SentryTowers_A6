// Prints calibrated poses for review; does not mutate the runtime or model.
import * as T from 'three';
import {buildFoot} from './foot-lab-shape.mjs';
import {createRig,TOES,POSES,PIPE,JOINTS} from '../../assets/foot-lab/runtime.js';
const root=buildFoot(1),rig=createRig(root),p={...POSES.rail},v=new T.Vector3(),q=new T.Quaternion();
for(const id of [...TOES.map(d=>d.id),'HALLUX']){
 const keys=id==='HALLUX'?['HALLUX_MTP','HALLUX_IP']:['_MTP','_PIP','_DIP'].map(s=>id+s);
 function score(a){keys.forEach((k,i)=>p[k]=a[i]);rig.pose(p);const node=rig.nodes['SOCKET_'+id+'_PAD'];node.getWorldPosition(v);const radial=new T.Vector3(0,v.y-PIPE.center[1],v.z-PIPE.center[2]),r=radial.length(),normal=new T.Vector3(0,0,1).applyQuaternion(node.getWorldQuaternion(q));
  let cost=((r-PIPE.radius-.0013)*100)**2+(1+normal.dot(radial.normalize()))*3;
  // Keep the linkage outside the pipe as well as the contact pad.
  for(const suffix of id==='HALLUX'?['_MTP','_IP']:['_MTP','_PIP','_DIP']){rig.nodes[id+suffix].getWorldPosition(v);const rr=Math.hypot(v.y-PIPE.center[1],v.z-PIPE.center[2]);cost+=Math.max(0,PIPE.radius+.010-rr)**2*30000;}
  return cost;
 }
 let best=keys.map(k=>p[k]),bestCost=score(best);
 for(let seed=0;seed<12;seed++){
   let a=keys.map((k,i)=>seed===0?best[i]:.2+((seed*7+i*3)%13)/13*1.2),cost=score(a);
   for(let step=.2;step>.000002;step*=.55)for(let repeat=0;repeat<40;repeat++){
     let changed=false;for(let i=0;i<a.length;i++)for(const sign of [-1,1]){const b=[...a],j=JOINTS.find(j=>j.name===keys[i]);b[i]=Math.max(0,Math.min(j.max,b[i]+step*sign));const c=score(b);if(c<cost){cost=c;a=b;changed=true;}}
     if(!changed)break;
   }
   if(cost<bestCost){best=a;bestCost=cost;}
 }
 score(best);console.log(id,best,bestCost);
}
console.log(JSON.stringify(p,null,2));
