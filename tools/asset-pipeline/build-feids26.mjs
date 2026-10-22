import fs from 'node:fs/promises';import crypto from 'node:crypto';import * as T from 'three';import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';import {dedup,reorder} from '@gltf-transform/functions';import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';import {PROFILE,CENTER_Y,applyShell} from '../../assets/feids26/runtime.js';
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});const out=new URL('../../assets/feids26/',import.meta.url);await fs.mkdir(new URL('derived/meshopt/',out),{recursive:true});const assets=[];
function build(lod,damage){const root=new T.Group();root.name='FEIDS26_ROOT';root.userData={family:'feids26',lod,damage_level:damage,static:lod===2};const mat=new T.MeshStandardMaterial({name:'FEIDS_CERAMIC_PALETTE',vertexColors:true,roughness:.8,metalness:.25});
 const colorize=(g,c)=>{if(g.index)g=g.toNonIndexed();g.deleteAttribute('uv');const color=new T.Color(c),v=new Float32Array(g.attributes.position.count*3);for(let i=0;i<v.length;i+=3){v[i]=color.r;v[i+1]=color.g;v[i+2]=color.b;}g.setAttribute('color',new T.BufferAttribute(v,3));return g;};
 const part=(name,parent,gs)=>{const merged=mergeGeometries(gs);merged.deleteAttribute('normal');const geometry=mergeVertices(merged);geometry.computeVertexNormals();const m=new T.Mesh(geometry,mat);m.name=name;parent.add(m);return m;};
 const box=(size,pos,c)=>{const g=new T.BoxGeometry(...size);g.translate(...pos);return colorize(g,c);};
 for(let k=0;k<4;k++){const node=new T.Group();node.name='SHELL_QUADRANT_'+(k+1);node.position.y=CENTER_Y;root.add(node);const gs=[],segments=[16,8,4][lod],sub=[2,1,1][lod],positions=[],colors=[];
 const tri=(a,b,c,tint)=>{positions.push(...a,...b,...c);const col=new T.Color(tint);for(let i=0;i<3;i++)colors.push(col.r,col.g,col.b);};
 const quad=(a,b,c,d,tint)=>{tri(a,b,c,tint);tri(a,c,d,tint);};
 const point=(j,f,a,inside=false)=>{let z=PROFILE[j][0]*(1-f)+PROFILE[j+1][0]*f,r=PROFILE[j][1]*(1-f)+PROFILE[j+1][1]*f;if(inside)r=Math.max(.035,r-.13);if(damage>=2&&k===0&&j===4)r*=.92;return [Math.cos(a)*r,Math.sin(a)*r,z];};
 for(let j=0;j<PROFILE.length-1;j++)for(let q=0;q<sub;q++)for(let n=0;n<segments;n++){
  if(damage===3&&k===0&&j>=3&&j<=4&&n>segments*.2&&n<segments*.8)continue;
  const a=k*Math.PI/2+.008+n*(Math.PI/2-.016)/segments,b=k*Math.PI/2+.008+(n+1)*(Math.PI/2-.016)/segments,f=q/sub,h=(q+1)/sub;
  const tint=damage>0&&(j+n+q)%7===0?0x37342f:j>=6?0x373a3b:0x77786f;
  quad(point(j,f,a),point(j,f,b),point(j,h,b),point(j,h,a),tint);
  quad(point(j,f,a,true),point(j,h,a,true),point(j,h,b,true),point(j,f,b,true),0x242e31);
  if(n===0)quad(point(j,f,a),point(j,h,a),point(j,h,a,true),point(j,f,a,true),0xbba77e);
  if(n===segments-1)quad(point(j,f,b),point(j,f,b,true),point(j,h,b,true),point(j,h,b),0xbba77e);
  if(j===0&&q===0)quad(point(j,f,a),point(j,f,a,true),point(j,f,b,true),point(j,f,b),0x333a3b);
  if(j===7&&q===sub-1)quad(point(j,h,a),point(j,h,b),point(j,h,b,true),point(j,h,a,true),0x333a3b);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();gs.push(g);
 part('SHELL_ARMOR_'+(k+1),node,gs);
 }
 const tail=new T.CylinderGeometry(.16,.24,.4,8);tail.rotateX(Math.PI/2);tail.translate(0,CENTER_Y,-7.9);part('TAIL_TELEMETRY',root,[colorize(tail,0xb48b50)]);
 for(const [i,z] of [-2.2,2.2].entries()){const s=new T.Group();s.name='SOCKET_CARGO_'+(i+1);s.position.set(0,2.05,z);s.userData={cargo:'MX06',scale:.75};root.add(s);}
 const c=new T.Group();c.name='SOCKET_CENTER';c.position.y=CENTER_Y;root.add(c);
 if(lod===2){root.updateMatrixWorld(true);const gs=[],meshes=[];root.traverse(o=>{if(o.isMesh){gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);}});for(const m of meshes){const g=new T.Group();g.name=m.name;m.parent.add(g);m.removeFromParent();}part('FEIDS_STATIC',root,gs);}
 return root;
}
for(const damage of [0,1,2,3])for(const lod of [0,1,2]){const root=build(lod,damage),animations=[];
 if(lod<2&&damage<3){const tracks=[],times=Array.from({length:481},(_,i)=>i/120);for(let k=1;k<=4;k++){const ps=[],qs=[];for(const t of times){applyShell(root,t);const n=root.getObjectByName('SHELL_QUADRANT_'+k);ps.push(...n.position);qs.push(...n.quaternion);}tracks.push(new T.VectorKeyframeTrack(`SHELL_QUADRANT_${k}.position`,times,ps),new T.QuaternionKeyframeTrack(`SHELL_QUADRANT_${k}.quaternion`,times,qs));}animations.push(new T.AnimationClip('Shell_Separate',4,tracks).optimize());applyShell(root,0);}
 let triangles=0,draw_calls=0;const required_nodes=[],sockets=[];root.traverse(o=>{required_nodes.push(o.name);if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls++;}if(o.name.startsWith('SOCKET_'))sockets.push({node:o.name,position_m:o.position.toArray()});});
 const file=`feids26_d${damage}_lod${lod}.glb`,bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true,animations}));await fs.writeFile(new URL(file,out),bytes);
 const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=Buffer.from(await io.writeBinary(doc)),meshopt_file=`derived/meshopt/feids26_d${damage}_lod${lod}.meshopt.glb`;await fs.writeFile(new URL(meshopt_file,out),packed);
 const bounds=new T.Box3().setFromObject(root);assets.push({file,lod,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),dimensions_m:bounds.getSize(new T.Vector3()).toArray()},damage_level:damage,static:lod===2,bytes:bytes.length,triangles,draw_calls,plot_m:[8,16],sockets,required_nodes,clips:animations.map(c=>({name:c.name,duration_s:c.duration,loop:false})),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),meshopt_file,meshopt_bytes:packed.length,meshopt_derived:true,credit:'Models by jelaludo'});console.log(file,triangles,draw_calls,bytes.length);
}
await fs.writeFile(new URL('manifest.json',out),JSON.stringify({family:'feids26',label:'FEIDS-26 / Fusiform Expendable Interplanetary Delivery System',plain_glb_source_of_truth:true,coordinate_system:{units:'metres',up:'+Y',forward:'+Z',origin:'ground below shell centre'},dimensions_m:assets[0].bounds.dimensions_m,cargo:{count:2,family:'MX06 Ridgeback',scale:.75,layout:'tandem; folded legs; separate referenced assets'},damage_states:{D0:'Intact',D1:'Scorched tiles',D2:'Dented quadrant and scorching',D3:'Breached shell; no animation'},lod_selection:{initial:2,approach_distance_m:150,hysteresis_m:20,lod0:'Recording master',lod1:'Animated release shell',lod2:'Static closed distance; swap before opening'},assets},null,2)+'\n');
