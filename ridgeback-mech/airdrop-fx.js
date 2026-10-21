// Deterministic viewer-only effects: no particles or carrier merged into mech GLBs.
import * as T from 'three';
export function createAirdropFX(scene){
 const group=new T.Group();group.name='PREVIEW_AIRDROP_FX';scene.add(group);
 const flameMaterial=new T.MeshBasicMaterial({color:0x82c9ff,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending});
 const flame=new T.Mesh(new T.ConeGeometry(.34,1.25,12,1,true),flameMaterial);group.add(flame);
 const core=new T.Mesh(new T.ConeGeometry(.13,.8,8,1,true),new T.MeshBasicMaterial({color:0xe8f3ff,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));group.add(core);
 const glow=new T.PointLight(0x8bcfff,0,5);group.add(glow);
 const dustMat=new T.MeshBasicMaterial({color:0x8e8c7b,transparent:true,opacity:.25,depthWrite:false});
 const dustGeo=new T.IcosahedronGeometry(1,1),dust=[];
 for(let i=0;i<36;i++){const p=new T.Mesh(dustGeo,dustMat);group.add(p);dust.push(p);}
 const cables=[];for(let i=0;i<4;i++){const c=new T.Mesh(new T.CylinderGeometry(.025,.025,1,5),new T.MeshStandardMaterial({color:0x646e70,roughness:.7}));group.add(c);cables.push(c);}
 function update(root,state,carrier,enabled){group.visible=enabled;if(!enabled){if(carrier)carrier.visible=false;return;}
  const {time:t,jet,height}=state;root.updateMatrixWorld(true);const socket=root.getObjectByName('SOCKET_BRAKE_JET'),p=socket.getWorldPosition(new T.Vector3());
  const pulse=.94+.06*Math.sin(t*91);flame.visible=core.visible=jet>.001;flame.scale.set(.6+.4*jet,jet*pulse, .6+.4*jet);flame.position.copy(p).add(new T.Vector3(0,-.625*jet*pulse,0));core.scale.setScalar(jet*pulse);core.position.copy(p).add(new T.Vector3(0,-.4*jet*pulse,0));glow.position.copy(p);glow.intensity=jet*7;
  const impact=t-2.6,burn=t-1.6,age=impact>=0?impact:burn*.5;const groundDust=(impact>=0&&impact<2.7)||(jet>.1&&height<1.4);
  dustMat.opacity=groundDust?(impact>=0?.30*Math.max(0,1-impact/2.7):.09*jet):0;
  for(let i=0;i<dust.length;i++){const a=i*2.39996,r=impact>=0?1.7+impact*(2.2+i%4*.4):.7+Math.max(0,burn)*1.7;const size=(.15+(i%5)*.025)+Math.max(0,age)*.22;dust[i].visible=groundDust;dust[i].position.set(Math.cos(a)*r,.10+Math.max(0,age)*(.16+i%3*.04),Math.sin(a)*r);dust[i].scale.set(size*2,size*.65,size*1.3);}
  if(carrier){carrier.visible=true;carrier.position.set(0,8+Math.max(0,t-.6)*1.7,Math.max(0,t-.6)**2*5);carrier.updateMatrixWorld(true);}
  for(const [i,id] of ['L_REAR','L_FRONT','R_REAR','R_FRONT'].entries()){
   const c=cables[i];c.visible=t<.6&&!!carrier;if(!c.visible)continue;
   const bottom=root.getObjectByName('SOCKET_AIRDROP_'+id).getWorldPosition(new T.Vector3()),top=new T.Vector3(i<2?-.8:.8,3.8,i%2?.8:-.8);carrier.localToWorld(top);const d=bottom.clone().sub(top);c.position.copy(top).add(bottom).multiplyScalar(.5);c.scale.y=d.length();c.quaternion.setFromUnitVectors(c.up,d.normalize());
  }
 }
 return {update};
}
