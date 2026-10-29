// EVA-K8 runtime materials. The plain GLB carries a palette only (no images, per the collaboration
// contract); everything worn and textured here is generated at load time: tileable noise textures,
// per-vertex masks from the geometry, and a triplanar PBR shader patch mapped in bind-pose space so it
// holds still on the skinned suit. Five surface kinds plus visor glass and a stencil decal.
import * as T from 'three';

// ---- Tileable value noise on a wrapping lattice.
function hash(x,y,s){let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function noise(x,y,cells,seed){const fx=x*cells,fy=y*cells,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);const x0=((ix%cells)+cells)%cells,x1=(x0+1)%cells,y0=((iy%cells)+cells)%cells,y1=(y0+1)%cells;const a=hash(x0,y0,seed),b=hash(x1,y0,seed),c=hash(x0,y1,seed),d=hash(x1,y1,seed);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;}
function noiseXY(x,y,cx,cy,seed){const fx=x*cx,fy=y*cy,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);const x0=((ix%cx)+cx)%cx,x1=(x0+1)%cx,y0=((iy%cy)+cy)%cy,y1=(y0+1)%cy;const a=hash(x0,y0,seed),b=hash(x1,y0,seed),c=hash(x0,y1,seed),d=hash(x1,y1,seed);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;}
function fbm(x,y,cells,octaves,seed,gain=.5){let s=0,a=1,n=0;for(let o=0;o<octaves;o++){s+=a*noise(x,y,cells<<o,seed+o*17);n+=a;a*=gain;}return s/n;}
const clamp01=v=>v<0?0:v>1?1:v;

function heightToNormal(h,size,strength,alpha){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const l=h[y*size+((x-1+size)%size)],r=h[y*size+((x+1)%size)],d=h[((y-1+size)%size)*size+x],u=h[((y+1)%size)*size+x];
  let nx=-(r-l)*strength,ny=-(u-d)*strength,nz=1;const len=Math.hypot(nx,ny,nz);nx/=len;ny/=len;nz/=len;const i=(y*size+x)*4;
  data[i]=(nx*.5+.5)*255;data[i+1]=(ny*.5+.5)*255;data[i+2]=(nz*.5+.5)*255;data[i+3]=(alpha?clamp01(alpha[y*size+x]):1)*255;
 }
 const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;return t;
}

// Carbon twill weave: alternating thread direction per cell, thread bulge plus fine fibre strands.
// Alpha carries a medium-frequency roughness variation.
export function carbonTexture(size=512,cells=24){
 const h=new Float32Array(size*size),a=new Float32Array(size*size),cell=size/cells;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const cx=Math.floor(x/cell),cy=Math.floor(y/cell),horizontal=((cx+cy)&1)===0;const u=(x%cell)/cell,v=(y%cell)/cell;
  const across=horizontal?v:u,along=horizontal?u:v;
  let height=Math.sin(Math.PI*across)*.9*(.85+.15*Math.sin(Math.PI*along));
  height+=.08*Math.sin((horizontal?y:x)*Math.PI*2*5/cell);
  height+=.05*(fbm(x/size,y/size,8,3,3)-.5);
  h[y*size+x]=height;a[y*size+x]=.35+.65*fbm(x/size,y/size,6,4,11);
 }
 return heightToNormal(h,size,2.4,a);
}

// Quilted diamonds with stitch seams and low-frequency wrinkles. Alpha = quilt height (0 in creases).
export function quiltTexture(size=512,diamonds=9){
 const h=new Float32Array(size*size),a=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const fx=x/size,fy=y/size;const u=(fx+fy)*diamonds,v=(fx-fy+1)*diamonds;const du=Math.abs(u-Math.floor(u)-.5)*2,dv=Math.abs(v-Math.floor(v)-.5)*2;
  const pillow=Math.pow(Math.max(0,1-Math.max(du,dv)),.6);
  const seam=Math.exp(-Math.pow(Math.min(1-du,1-dv)*18,2));
  const wrinkle=(fbm(fx,fy,3,4,21)-.5)*3.2;
  const fuzz=(fbm(fx,fy,48,2,31)-.5)*.12;
  h[y*size+x]=pillow*1.0-seam*.25+wrinkle+fuzz;a[y*size+x]=pillow*.8+.2-seam*.3;
 }
 return heightToNormal(h,size,1.25,a);
}

// Detail pack: R grime (low frequency), G scratches (thin bright streaks), B brushed metal streaks, A speckle/dust.
export function detailTexture(size=512){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const fx=x/size,fy=y/size;
  const grime=clamp01(fbm(fx,fy,2,5,41,.55)*1.25-.15);
  let scratch=0;
  for(let k=0;k<3;k++){const ang=[.35,-.9,1.9][k];const c=Math.cos(ang),si=Math.sin(ang);const p=((fx*c+fy*si)%1+1)%1,q=((fx*-si+fy*c)%1+1)%1;const line=noiseXY(p,q,5,[140,200,260][k],51+k);const w=noise(p,q,[3,5,7][k],61+k);scratch=Math.max(scratch,clamp01((line-.80)*7)*clamp01((w-.5)*3.5));}
  const brushed=clamp01(.5+(noiseXY(fx,fy,3,96,71)-.5)*1.1+(noiseXY(fx,fy,6,192,73)-.5)*.6);
  const speckle=clamp01((fbm(fx,fy,32,3,91)-.42)*2.2);
  const i=(y*size+x)*4;data[i]=grime*255;data[i+1]=scratch*255;data[i+2]=brushed*255;data[i+3]=speckle*255;
 }
 const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;return t;
}

// ---- Per-vertex masks: x part height (0 at the bottom of the part), y edge curvature, z cavity.
export function applyMasks(meshes){
 const ranges=new Map();const tmp=new T.Vector3();
 for(const m of meshes){const p=m.geometry.attributes.position,si=m.geometry.attributes.skinIndex;for(let i=0;i<p.count;i++){const b=si?si.getX(i):-1;const y=p.getY(i);const r=ranges.get(b)||[Infinity,-Infinity];if(y<r[0])r[0]=y;if(y>r[1])r[1]=y;ranges.set(b,r);}}
 for(const m of meshes){
  const g=m.geometry,p=g.attributes.position,n=g.attributes.normal,si=g.attributes.skinIndex,idx=g.index,count=p.count,mask=new Float32Array(count*3);
  const groups=new Map();
  for(let i=0;i<count;i++){const key=Math.round(p.getX(i)*5000)+','+Math.round(p.getY(i)*5000)+','+Math.round(p.getZ(i)*5000);let list=groups.get(key);if(!list)groups.set(key,list=[]);list.push(i);}
  const concave=new Float32Array(count),weight=new Float32Array(count);const tri=idx?idx.count:count;
  for(let t=0;t<tri;t+=3){const ids=[0,1,2].map(k=>idx?idx.getX(t+k):t+k);for(let a=0;a<3;a++){const ia=ids[a];for(let b=0;b<3;b++)if(b!==a){const ib=ids[b];tmp.set(p.getX(ib)-p.getX(ia),p.getY(ib)-p.getY(ia),p.getZ(ib)-p.getZ(ia));const l=tmp.length();if(l>1e-7){concave[ia]+=(tmp.x*n.getX(ia)+tmp.y*n.getY(ia)+tmp.z*n.getZ(ia))/l;weight[ia]++;}}}}
  for(const list of groups.values()){
   let minDot=1,sumC=0,sumW=0;
   for(let a=0;a<list.length;a++){sumC+=concave[list[a]];sumW+=weight[list[a]];for(let b=a+1;b<list.length;b++){const i=list[a],j=list[b];const d=n.getX(i)*n.getX(j)+n.getY(i)*n.getY(j)+n.getZ(i)*n.getZ(j);if(d<minDot)minDot=d;}}
   const edge=clamp01(Math.acos(Math.max(-1,Math.min(1,minDot)))/(Math.PI/5));const cavity=clamp01((sumW?sumC/sumW:0)*4);
   for(const i of list){const r=ranges.get(si?si.getX(i):-1);const span=Math.max(r[1]-r[0],.02);mask[i*3]=clamp01((p.getY(i)-r[0])/span);mask[i*3+1]=edge;mask[i*3+2]=cavity;}
  }
  g.setAttribute('aMask',new T.BufferAttribute(mask,3));
 }
}

// ---- Shader patch.
const VERT_HEAD=`attribute vec3 aMask;varying vec3 vRest;varying vec3 vRestN;varying vec3 vMask;varying mat3 vNormalMat;`;
const FRAG_HEAD=`varying vec3 vRest;varying vec3 vRestN;varying vec3 vMask;varying mat3 vNormalMat;
uniform sampler2D uNormalTex;uniform sampler2D uDetail;uniform float uTileN;uniform float uTileD;uniform float uNormalScale;uniform float uTextured;
uniform vec3 uEdgeColor;uniform float uGrime;uniform float uDust;uniform float uWear;uniform float uBrushed;uniform float uCrease;uniform float uRoughVar;uniform float uWearMetal;uniform float uKind;
vec3 k8w(){vec3 w=pow(abs(vRestN),vec3(4.0));return w/(w.x+w.y+w.z+1e-5);}
vec4 k8tri(sampler2D s,float tile){vec3 w=k8w();return texture2D(s,vRest.zy/tile)*w.x+texture2D(s,vRest.xz/tile)*w.y+texture2D(s,vRest.xy/tile)*w.z;}
struct K8{float grime;float dust;float wear;float crease;float brushed;float rough;};
K8 k8surface(float upness){K8 k;vec4 d=k8tri(uDetail,uTileD);vec4 d2=k8tri(uDetail,uTileD*2.7);float nA=k8tri(uNormalTex,uTileN).a;
 float low=1.0-vMask.x;float grimeNoise=d.r*0.6+d2.r*0.4;
 k.grime=clamp(uGrime*(0.55*grimeNoise*grimeNoise+0.9*low*low*grimeNoise+1.2*vMask.z+0.35*max(0.0,-upness)*grimeNoise),0.0,1.0);
 k.dust=clamp(uDust*max(0.0,upness)*(0.35+0.65*d.a)*(0.6+0.4*d2.r),0.0,1.0)*(1.0-k.grime*0.7);
 float scratch=max(d.g,d2.g*0.8);float pw=d2.r*d2.r*1.6+0.15;k.wear=clamp(uWear*(vMask.y*vMask.y*(0.35*pw+1.1*scratch)+scratch*0.13*(1.0-vMask.x*0.5)),0.0,1.0);
 k.crease=(uKind==1.0)?(1.0-nA)*uCrease:(1.0-nA)*uCrease*0.5;k.brushed=d.b;k.rough=(nA-0.5)*uRoughVar+(d2.r-0.5)*0.08;return k;}`;

export function patchMaterial(mat,params,textures){
 const u={uNormalTex:{value:params.normalTex===null?textures.detail:params.normalTex||textures.carbon},uDetail:{value:textures.detail},uTileN:{value:params.tileN??.1},uTileD:{value:params.tileD??.55},uNormalScale:{value:params.normalScale??1},uTextured:{value:1},uEdgeColor:{value:new T.Color(params.edgeColor||'#9a9ea4')},uGrime:{value:params.grime??1},uDust:{value:params.dust??.5},uWear:{value:params.wear??.6},uBrushed:{value:params.brushed??0},uCrease:{value:params.crease??0},uRoughVar:{value:params.roughVar??.12},uWearMetal:{value:params.wearMetal??0},uKind:{value:params.kind??0}};
 mat.userData.k8=u;mat.customProgramCacheKey=()=>'evak8-surface';
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,u);
  shader.vertexShader=VERT_HEAD+'\n'+shader.vertexShader
   .replace('#include <skinnormal_vertex>','#include <skinnormal_vertex>\n#ifdef USE_SKINNING\n vNormalMat=normalMatrix*mat3(skinMatrix);\n#else\n vNormalMat=normalMatrix;\n#endif')
   .replace('#include <begin_vertex>','#include <begin_vertex>\n vRest=position;vRestN=normal;vMask=aMask;');
  shader.fragmentShader=FRAG_HEAD+'\n'+shader.fragmentShader
   .replace('#include <normal_fragment_maps>',`
 if(uTextured>0.5){vec3 w=k8w();vec3 rn=normalize(vRestN);
  vec3 nx=texture2D(uNormalTex,vRest.zy/uTileN).xyz*2.0-1.0;vec3 ny=texture2D(uNormalTex,vRest.xz/uTileN).xyz*2.0-1.0;vec3 nz=texture2D(uNormalTex,vRest.xy/uTileN).xyz*2.0-1.0;
  nx.xy*=uNormalScale;ny.xy*=uNormalScale;nz.xy*=uNormalScale;
  nx=vec3(nx.xy+rn.zy,abs(nx.z)*rn.x);ny=vec3(ny.xy+rn.xz,abs(ny.z)*rn.y);nz=vec3(nz.xy+rn.xy,abs(nz.z)*rn.z);
  vec3 nObj=normalize(nx.zyx*w.x+ny.xzy*w.y+nz.xyz*w.z);
  // Blend with the geometric normal so hard bevels keep their own shading.
  vec3 mapped=normalize(vNormalMat*nObj);normal=normalize(mix(normal,mapped,0.85));}`)
   .replace('#include <map_fragment>',`
 { vec3 base=diffuseColor.rgb;
   if(uTextured>0.5){float upness=dot(normalize(vNormal),(viewMatrix*vec4(0.0,1.0,0.0,0.0)).xyz);K8 k=k8surface(upness);
    vec3 c=base*(1.0-k.crease*0.55);
    if(uKind==2.0||uKind==3.0)c*=0.92+0.16*k.brushed;
    c=mix(c,uEdgeColor,k.wear);
    c=mix(c,c*vec3(0.42,0.41,0.40),k.grime);
    c=mix(c,vec3(0.56,0.54,0.50),k.dust*0.55);
    diffuseColor.rgb=c;}}`)
   .replace('#include <roughnessmap_fragment>',`
 float roughnessFactor=roughness;
 if(uTextured>0.5){float upness=dot(normalize(vNormal),(viewMatrix*vec4(0.0,1.0,0.0,0.0)).xyz);K8 k=k8surface(upness);
  roughnessFactor=roughness+k.rough+(k.brushed-0.5)*uBrushed*0.3+k.grime*0.18+k.dust*0.25-k.wear*0.28+k.crease*0.08;
  roughnessFactor=clamp(roughnessFactor,0.08,0.98);}`)
   .replace('#include <metalnessmap_fragment>',`
 float metalnessFactor=metalness;
 if(uTextured>0.5){float upness=dot(normalize(vNormal),(viewMatrix*vec4(0.0,1.0,0.0,0.0)).xyz);K8 k=k8surface(upness);
  metalnessFactor=clamp(mix(metalness,uWearMetal,k.wear)*(1.0-k.grime*0.5)*(1.0-k.dust*0.6),0.0,1.0);}`);
 };
 mat.needsUpdate=true;return mat;
}

// ---- Material set keyed by the GLB palette names.
export function createMaterials(size=512){
 const textures={carbon:carbonTexture(size),quilt:quiltTexture(size),detail:detailTexture(size)};
 const phys=o=>new T.MeshPhysicalMaterial(o);
 const mats={
  EVAK8_Carbon_plate:patchMaterial(phys({name:'EVAK8_Carbon_plate',color:'#2d2f33',roughness:.62,metalness:.12,envMapIntensity:1}),{kind:0,normalTex:textures.carbon,tileN:.06,tileD:.6,normalScale:.8,edgeColor:'#7f8389',grime:1,dust:.5,wear:.6,roughVar:.16,wearMetal:.75},textures),
  EVAK8_Quilted_suit:patchMaterial(phys({name:'EVAK8_Quilted_suit',color:'#9e988d',roughness:.9,metalness:0,envMapIntensity:.85,sheen:.3,sheenRoughness:.85,sheenColor:new T.Color('#4c4944')}),{kind:1,normalTex:textures.quilt,tileN:.28,tileD:.7,normalScale:.9,edgeColor:'#b3ada2',grime:1.05,dust:.35,wear:.12,crease:.8,roughVar:.06},textures),
  EVAK8_Steel:patchMaterial(phys({name:'EVAK8_Steel',color:'#8e9195',roughness:.42,metalness:1,envMapIntensity:1}),{kind:2,normalTex:null,tileN:.25,tileD:.4,normalScale:0,edgeColor:'#c3c6ca',grime:.9,dust:.4,wear:.5,brushed:1,roughVar:.1,wearMetal:1},textures),
  EVAK8_Brass_fittings:patchMaterial(phys({name:'EVAK8_Brass_fittings',color:'#6f665b',roughness:.5,metalness:1,envMapIntensity:1}),{kind:3,normalTex:null,tileN:.2,tileD:.3,normalScale:0,edgeColor:'#8c8275',grime:1.0,dust:.3,wear:.55,brushed:.6,roughVar:.1,wearMetal:1},textures),
  EVAK8_Rubber_seals:patchMaterial(phys({name:'EVAK8_Rubber_seals',color:'#151618',roughness:.82,metalness:0,envMapIntensity:.6}),{kind:4,normalTex:textures.quilt,tileN:.12,tileD:.45,normalScale:.2,edgeColor:'#3e3f43',grime:.8,dust:.15,wear:.2,roughVar:.1},textures),
  EVAK8_Decal_stencil:patchMaterial(phys({name:'EVAK8_Decal_stencil',color:'#c9c3b6',roughness:.72,metalness:0,envMapIntensity:.9}),{kind:5,normalTex:textures.carbon,tileN:.06,tileD:.3,normalScale:.5,edgeColor:'#3a3c40',grime:.7,dust:.4,wear:.45,roughVar:.12},textures),
  EVAK8_Visor_glass:phys({name:'EVAK8_Visor_glass',color:'#0a0b0d',roughness:.06,metalness:0,transparent:true,opacity:.93,envMapIntensity:1.2,specularIntensity:1,specularColor:new T.Color('#e8c48c'),clearcoat:.4,clearcoatRoughness:.08,ior:1.7,depthWrite:true}),
 };
 const distance=new T.MeshStandardMaterial({name:'EVAK8_distance',vertexColors:true,roughness:.72,metalness:.25,envMapIntensity:.9});
 return {textures,mats,distance,
  assign(root){const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});applyMasks(meshes);for(const o of meshes){const name=o.material.name;o.userData.gltfMaterial=o.material;if(o.material.vertexColors&&meshes.length===1)o.material=distance;else if(mats[name])o.material=mats[name];}return meshes;},
  setTextured(on){for(const m of Object.values(mats))if(m.userData.k8)m.userData.k8.uTextured.value=on?1:0;},
  dispose(){for(const t of Object.values(textures))t.dispose();for(const m of Object.values(mats))m.dispose();distance.dispose();}};
}
