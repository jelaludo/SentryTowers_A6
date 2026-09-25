// Derived distance head for the cinematic; canonical HEL-01 GLBs stay untouched.
// Same MIRROR_PITCH coordinates, 1.55 outer radius and +Z optical direction.
// The rim has a real opening: no backing cap or second optical cap under the face.
export function createMirrorHead(T,source){
 const backSource=source.getObjectByName('MIRROR_BACK'),faceSource=source.getObjectByName('OPTICAL_FACE');
 if(!backSource||!faceSource)throw Error('HEL-01 source head is missing');
 const outer=1.55,inner=1.492,front=.067,rear=-.0525,back=[],face=[];
 const point=(radius,i,z)=>[Math.sin(i*Math.PI/3)*radius,Math.cos(i*Math.PI/3)*radius,z];
 const triangle=(out,a,b,c)=>out.push(...a,...b,...c);
 for(let i=0;i<6;i++){
  const j=(i+1)%6,a=point(outer,i,front),b=point(outer,j,front),c=point(inner,i,front),d=point(inner,j,front),ar=point(outer,i,rear),br=point(outer,j,rear);
  triangle(face,[0,0,front],d,c); // +Z, single optical surface
  triangle(back,a,d,b);triangle(back,a,c,d); // +Z open rim
  triangle(back,a,b,br);triangle(back,a,br,ar); // outward side wall
  triangle(back,[0,0,rear],ar,br); // -Z rear cap
 }
 return [[back,backSource,'MIRROR_BACK'],[face,faceSource,'OPTICAL_FACE']].map(([vertices,original,name])=>{
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const color=original.geometry.attributes.color,colors=[];for(let i=0;i<vertices.length/3;i++)colors.push(color.getX(0),color.getY(0),color.getZ(0));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const material=original.material.clone();material.side=T.FrontSide;
  if(name==='OPTICAL_FACE'){material.roughness=Math.max(material.roughness,.32);material.metalness=Math.min(material.metalness,.8);}
  return {geometry,material,name};
 });
}
