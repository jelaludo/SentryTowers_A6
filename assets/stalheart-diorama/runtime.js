import {applyKidou} from '../stalheart-kidou/runtime.js';

export const DURATION = 144;
export const DOME_SCALE = .5;
export const SITE_DISTANCE = 52;
export const ASSEMBLY = {
  leg_top_m:28.0, roof_base_m:33.2,
  phases:[
    {id:'left',start:6,end:13,label:'Print the left leg',part:0},
    {id:'cross',start:13,end:15,label:'Move to the right leg',printing:false},
    {id:'right',start:15,end:22,label:'Print the right leg',part:1},
    {id:'rise',start:22,end:24,label:'Position above the two legs',printing:false},
    {id:'bridge',start:24,end:26,label:'Connect the top span',part:2},
    {id:'roof',start:26,end:28,label:'Complete the roof and silos',part:3},
    {id:'arm',start:28,end:30,label:'Finish the suspended arm',part:4},
    {id:'hold',start:30,end:34,label:'Complete gantry wireframe',printing:false},
  ],
};
export const CHAPTERS = [
  {id:'arrival',start:0,end:6,title:'ISAO arrives',detail:'A construction drone prepares the first work site.'},
  {id:'assembly',start:6,end:34,title:'Build the builder',detail:'Left leg, right leg, then the connecting top and suspended arm.'},
  {id:'materials',start:34,end:44,title:'The machine takes shape',detail:'The gantry’s original surfaces appear through the wireframe.'},
  {id:'ready',start:44,end:50,title:'Workshop online',detail:'ISAO clears the bay. The fabrication arm takes over.'},
  {id:'tank',start:50,end:72,title:'Print a MÖRK',detail:'The first build rises in cyan linework, layer by layer.'},
  {id:'retract',start:72,end:78,title:'Clear the finished tank',detail:'The wireframe stays behind as the tool retracts.'},
  {id:'travel',start:78,end:98,title:'Move the workshop',detail:'Eight wheels carry STALHEART 52 metres to the second site.'},
  {id:'position',start:98,end:104,title:'Set the second work site',detail:'The carriage aligns over the habitat foundation.'},
  {id:'dome',start:104,end:132,title:'Print a dome city element',detail:'A half-scale habitat dome grows beneath the gantry.'},
  {id:'complete',start:132,end:144,title:'From one builder, a settlement',detail:'The finished tank and habitat remain as complete wireframes.'},
];
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function stateAt(t){
  t=clamp(t,0,DURATION);
  const chapter=CHAPTERS.find(c=>t<c.end)||CHAPTERS.at(-1),travel=smooth((t-78)/20);
  const left=clamp((t-6)/7),right=clamp((t-15)/7),top=clamp((t-24)/6),phase=ASSEMBLY.phases.find(p=>t<p.end)||ASSEMBLY.phases.at(-1);
  const assembly={left,right,top,phase:phase.id,label:phase.label,printing:t>=phase.start&&phase.part!==undefined,progress:clamp((t-phase.start)/(phase.end-phase.start))};
  return {time:t,chapter,assembly,wire:(left+right+top)/3,surface:clamp((t-34)/10),tank:clamp((t-50)/22),dome:clamp((t-104)/28),z:SITE_DISTANCE*travel,
    speed:t>78&&t<98?SITE_DISTANCE*6*((t-78)/20)*(1-(t-78)/20)/20:0};
}

// Lines are derived review geometry. Canonical GLBs and their material palettes stay intact.
export function wireFrom(T,root,name,color,construction=false){
  root.updateMatrixWorld(true);const positions=[],parts=[];
  root.traverse(o=>{if(!o.isMesh)return;const e=new T.EdgesGeometry(o.geometry,10),p=e.attributes.position,v=new T.Vector3();
    const hanging=/^(GANTRY_SURFACE_(J[1-6]_|TOOL_LIFT_Z|CARRIAGE_TRAVEL_X)|FEED_HOSE_)/.test(o.name);
    for(let i=0;i<p.count;i+=2){
      const a=v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).clone(),b=v.fromBufferAttribute(p,i+1).applyMatrix4(o.matrixWorld).clone(),cuts=[0,1];
      // Split at section boundaries so an edge cannot interpolate into an unbuilt leg.
      if(construction&&!hanging)for(const [axis,value]of [['y',ASSEMBLY.leg_top_m],['y',ASSEMBLY.roof_base_m],['x',0]]){
        const d=b[axis]-a[axis],f=(value-a[axis])/d;if(Math.abs(d)>1e-8&&f>1e-6&&f<1-1e-6)cuts.push(f);
      }
      cuts.sort((x,y)=>x-y);
      for(let j=1;j<cuts.length;j++){
        if(cuts[j]-cuts[j-1]<1e-7)continue;
        const from=a.clone().lerp(b,cuts[j-1]),to=a.clone().lerp(b,cuts[j]),mid=from.clone().add(to).multiplyScalar(.5);
        const part=!construction?-1:hanging?4:mid.y<ASSEMBLY.leg_top_m?(mid.x<0?0:1):mid.y<ASSEMBLY.roof_base_m?2:3;
        positions.push(...from.toArray(),...to.toArray());parts.push(part,part);
      }
    }e.dispose();});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeBoundingBox();
  const bounds=Array.from({length:5},()=>new T.Box3());for(let i=0;i<parts.length;i++)if(parts[i]>=0)bounds[parts[i]].expandByPoint(new T.Vector3(...positions.slice(i*3,i*3+3)));
  const born=parts.map((part,i)=>{
    const x=positions[i*3],y=positions[i*3+1];
    if(part===0)return 6+7*clamp(y/ASSEMBLY.leg_top_m);
    if(part===1)return 15+7*clamp(y/ASSEMBLY.leg_top_m);
    if(part===2)return 24+2*clamp((x-bounds[2].min.x)/(bounds[2].max.x-bounds[2].min.x));
    if(part===3)return 26+2*clamp((y-ASSEMBLY.roof_base_m)/(bounds[3].max.y-ASSEMBLY.roof_base_m));
    if(part===4)return 28+2*clamp((bounds[4].max.y-y)/(bounds[4].max.y-bounds[4].min.y));
    return 0;
  });
  g.setAttribute('buildAt',new T.Float32BufferAttribute(born,1));g.setAttribute('buildPart',new T.Float32BufferAttribute(parts,1));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{top:{value:-1},bottom:{value:-1},buildTime:{value:1000},construction:{value:construction?1:0},tint:{value:new T.Color(color)}},
    vertexShader:'attribute float buildAt;varying float height;varying float birth;void main(){vec4 w=modelMatrix*vec4(position,1.0);height=w.y;birth=buildAt;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform float top;uniform float bottom;uniform float buildTime;uniform float construction;uniform vec3 tint;varying float height;varying float birth;void main(){if(height>top||height<bottom||birth>buildTime)discard;float d=construction>.5?abs(buildTime-birth)*4.0:abs(top-height);float front=1.0-smoothstep(0.0,0.55,d);gl_FragColor=vec4(mix(tint,vec3(0.9,1.0,1.0),front*.8),.78+front*.22);\n#include <colorspace_fragment>\n}',toneMapped:false});
  const wire=new T.LineSegments(g,material);wire.name=name;wire.frustumCulled=false;wire.userData.derived=true;
  if(construction)wire.userData.assembly_sections=bounds.map((b,part)=>({part,bounds:{min:b.min.toArray(),max:b.max.toArray()},segments:parts.filter(p=>p===part).length/2}));
  return wire;
}
function layerBounds(T,wire){
  const p=wire.geometry.attributes.position,b=wire.geometry.boundingBox,levels=[];
  for(let j=0;j<=128;j++){
    const y=b.min.y+(b.max.y-b.min.y)*j/128,points=[];
    for(let i=0;i<p.count;i+=2){const a=new T.Vector3().fromBufferAttribute(p,i),c=new T.Vector3().fromBufferAttribute(p,i+1);
      if(y>=Math.min(a.y,c.y)-.04&&y<=Math.max(a.y,c.y)+.04){const f=Math.abs(c.y-a.y)<1e-5?.5:clamp((y-a.y)/(c.y-a.y));points.push(a.lerp(c,f));}}
    const slice=points.length?new T.Box3().setFromPoints(points):b.clone();levels.push({x:(slice.min.x+slice.max.x)/2,z:(slice.min.z+slice.max.z)/2,rx:(slice.max.x-slice.min.x)/2,rz:(slice.max.z-slice.min.z)/2});
  }
  return levels;
}
function assemblyTargets(T,wire){
  const p=wire.geometry.attributes.position,born=wire.geometry.attributes.buildAt,part=wire.geometry.attributes.buildPart,result={};
  for(const phase of ASSEMBLY.phases.filter(p=>p.part!==undefined)){
    const indices=[];for(let i=0;i<p.count;i+=2)if(part.getX(i)===phase.part)indices.push(i);
    const bounds=wire.userData.assembly_sections[phase.part].bounds,path=[];
    for(let j=0;j<=128;j++){
      const f=j/128,time=phase.start+(phase.end-phase.start)*f;
      const wanted=phase.part<2?new T.Vector3(phase.part===0?-16:16,ASSEMBLY.leg_top_m*f,10*Math.cos(Math.PI*f)):
        phase.part===2?new T.Vector3(bounds.min[0]+(bounds.max[0]-bounds.min[0])*f,31,-2):
        phase.part===3?new T.Vector3(0,ASSEMBLY.roof_base_m+(bounds.max[1]-ASSEMBLY.roof_base_m)*f,-2):
        new T.Vector3(0,bounds.max[1]-(bounds.max[1]-bounds.min[1])*f,2.6);
      let nearest=wanted,score=Infinity;
      for(const i of indices){
        const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),ta=born.getX(i),tb=born.getX(i+1);
        const q=a.lerp(b,Math.abs(tb-ta)<1e-7?.5:clamp((time-ta)/(tb-ta))),delay=Math.max(Math.min(ta,tb)-time,time-Math.max(ta,tb),0);
        const d=q.distanceToSquared(wanted)+delay*delay*100000;if(d<score){score=d;nearest=q;}
      }
      path.push(nearest);
    }result[phase.id]=path;
  }return result;
}
function assemblyFlight(T,story,t){
  const bounds=story.kw.userData.assembly_sections;
  const position=(id,p)=>{
    if(id==='left'||id==='right'){const side=id==='left'?-1:1;return new T.Vector3(side*(20.5+1.4*Math.sin(p*Math.PI*2)),1.6+ASSEMBLY.leg_top_m*p,10*Math.cos(p*Math.PI));}
    if(id==='bridge')return new T.Vector3(bounds[2].bounds.min[0]+(bounds[2].bounds.max[0]-bounds[2].bounds.min[0])*p,34.8,-7);
    if(id==='roof')return position('bridge',1).lerp(new T.Vector3(0,story.gantryHeight+1.6,-7),smooth(p));
    return position('roof',1).lerp(new T.Vector3(-7,bounds[4].bounds.min[1]+1.6,9),smooth(p));
  };
  const target=(id,p)=>{const path=story.assemblyTargets[id],f=clamp(p)*128,i=Math.min(127,Math.floor(f));return path[i].clone().lerp(path[i+1],f-i);};
  const phase=story.state.assembly.phase,p=story.state.assembly.progress;
  let work,aim;
  if(t<6){work=new T.Vector3(-27,8,18).lerp(position('left',0),smooth(t/6));aim=target('left',0);}
  else if(phase==='cross'||phase==='rise'){
    const a=phase==='cross'?'left':'right',b=phase==='cross'?'right':'bridge',f=smooth(p);
    work=position(a,1).lerp(position(b,0),f);if(phase==='cross')work.z-=12*Math.sin(Math.PI*f);else work.y+=5*Math.sin(Math.PI*f);
    aim=target(a,1).lerp(target(b,0),f);
  }else if(t<30){work=position(phase,p);aim=target(phase,p);}
  else{work=position('arm',1);aim=target('arm',1);}
  if(t>=34){const f=smooth((t-34)/10);work=position('arm',1).lerp(new T.Vector3(-25,4,-17),f);work.y+=8*Math.sin(Math.PI*f);aim=target('arm',1).lerp(new T.Vector3(0,15,0),f);}
  if(t>=44){work.set(-25,4+.15*Math.sin((t-44)*2),story.state.z-17);aim.set(0,15,story.state.z);}
  return{work,aim};
}
export function createStory(T,models,lod=1){
  if(![0,1].includes(lod))throw new Error('The animated diorama supports detailed and game tiers only.');
  const root=new T.Group();root.name='STALHEART_DIORAMA_ROOT';
  const kidou=models.kidou.scene.getObjectByName('STALHEART_KIDOU_ROOT');root.add(kidou);
  if(lod<2)applyKidou(T,kidou);
  const kw=wireFrom(T,kidou,'STALHEART_ASSEMBLY_WIREFRAME',0x7ad8e1,true);root.add(kw);
  const tankSource=models.tank.scene;tankSource.position.set(0,0,2.6);
  const tw=wireFrom(T,tankSource,'MORK_BUILD_WIREFRAME',0x68e7e0);root.add(tw);
  const domeSource=models.dome.scene;domeSource.scale.setScalar(DOME_SCALE);domeSource.position.set(0,0,SITE_DISTANCE+2.6);
  const dw=wireFrom(T,domeSource,'HABITAT_BUILD_WIREFRAME',0xb3df98);root.add(dw);
  const isao=models.isao.scene;isao.name='ISAO_INSTANCE';root.add(isao);
  const mixer=new T.AnimationMixer(isao);
  for(const name of ['Rotor_Cycle','Emotion_Working','Tool_Fabricate']){const clip=models.isao.animations.find(c=>c.name===name);if(clip)mixer.clipAction(clip).play();}
  const surfacePlane=new T.Plane(new T.Vector3(0,-1,0),-1),materials=new Map();
  kidou.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.material=[].concat(o.material).map(m=>{if(!materials.has(m)){const n=m.clone();n.clippingPlanes=[surfacePlane];n.clipShadows=true;materials.set(m,n);}return materials.get(m);});if(o.material.length===1)o.material=o.material[0];}});
  isao.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  const laserMat=new T.MeshBasicMaterial({color:0xa8fff0,toneMapped:false}),laser=new T.Mesh(new T.CylinderGeometry(.035,.035,1,8),laserMat);laser.name='ACTIVE_BUILD_BEAM';root.add(laser);
  const spark=new T.Mesh(new T.IcosahedronGeometry(.17,1),new T.MeshBasicMaterial({color:0xeaffce,toneMapped:false}));spark.name='ACTIVE_BUILD_POINT';root.add(spark);
  const ringPoints=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;ringPoints.push(new T.Vector3(Math.cos(a),0,Math.sin(a)));}
  const ring=new T.Line(new T.BufferGeometry().setFromPoints(ringPoints),new T.LineBasicMaterial({color:0x9cdfdc,transparent:true,opacity:.45}));ring.name='BUILD_LAYER_GUIDE';root.add(ring);
  const story={root,kidou,isao,mixer,kw,tw,dw,laser,spark,ring,surfacePlane,lod,materials:[...materials.values()],tankLayers:layerBounds(T,tw),domeLayers:layerBounds(T,dw),assemblyTargets:assemblyTargets(T,kw),models};
  story.gantryHeight=kw.geometry.boundingBox.max.y;story.tankHeight=tw.geometry.boundingBox.max.y;story.domeHeight=dw.geometry.boundingBox.max.y;
  story.printTarget=new T.Vector3();story.printTip=new T.Vector3();story.isaoTarget=new T.Vector3();
  return story;
}

// A carriage and a two-link planar solve drive the existing six-joint rig.
// Links remain rigid, the wrist counter-rotates, and the nozzle stays vertical.
function posePrint(T,story,c,target){
  const shoulder=c.j[1],tip=story.kidou.getObjectByName('EXTRUSION_TIP');
  c.carriage.position.x=target.x;c.j[0].rotation.y=-Math.PI/2;
  const a=6-.000000476837158,b=5.600000858306884,tool=3.699999332427979;
  const tipY=Math.max(4.5,target.y+.8),shoulderY=Math.min(26,Math.max(17,tipY+12.5));
  story.root.updateMatrixWorld(true);c.lift.position.y+=shoulderY-shoulder.getWorldPosition(new T.Vector3()).y;
  const reach=target.z-(story.kidou.position.z+2.5999999046325684),drop=shoulderY-tipY-tool;
  const elbow=Math.acos(clamp((reach*reach+drop*drop-a*a-b*b)/(2*a*b),-1,1));
  const upper=Math.atan2(reach,drop)-Math.atan2(b*Math.sin(elbow),a+b*Math.cos(elbow));
  c.j[1].rotation.z=upper;c.j[2].rotation.z=elbow;c.j[4].rotation.z=-upper-elbow;
  story.root.updateMatrixWorld(true);tip.getWorldPosition(story.printTip);
  return story.printTip;
}
function printingTarget(T,story,which,p,t){
  const levels=which==='tank'?story.tankLayers:story.domeLayers,h=which==='tank'?story.tankHeight:story.domeHeight;
  const f=clamp(p)*128,i=Math.min(127,Math.floor(f)),q=f-i,a=levels[i],b=levels[i+1],mix=k=>a[k]+(b[k]-a[k])*q;
  const phase=t*1.7,rz=Math.min(6.9,mix('rz')*.7),rx=Math.min(7,mix('rx')*.75);
  const origin=which==='tank'?2.6:SITE_DISTANCE+2.6;
  return new T.Vector3(mix('x')+rx*Math.sin(phase),Math.max(.04,p*h),clamp(mix('z')+rz*Math.cos(phase),origin-7,origin+7));
}
export function applyTime(T,story,time){
  const s=stateAt(story.lod===2?DURATION:time),t=s.time,{kidou,isao,kw,tw,dw}=story;story.state=s;
  kidou.position.set(0,0,s.z);kidou.visible=s.surface>0;
  story.surfacePlane.constant=s.surface>=1?1000:s.surface*story.gantryHeight;
  kw.visible=s.wire>0&&s.surface<1;kw.material.uniforms.top.value=1000;kw.material.uniforms.buildTime.value=t>=30?1000:t;kw.material.uniforms.bottom.value=s.surface>0?s.surface*story.gantryHeight:-1;
  for(const [wire,p,height]of [[tw,s.tank,story.tankHeight],[dw,s.dome,story.domeHeight]]){wire.visible=p>0;wire.material.uniforms.top.value=p>=1?1000:p*height;}
  story.laser.visible=story.spark.visible=story.ring.visible=false;
  let pose=null;
  if(story.lod<2){
    // Rest during assembly, raised during transfer, precise print pose while producing.
    pose=applyKidou(T,kidou,{mode:'park',distance:s.z,vz:s.speed});
    const raise=smooth((t-72)/6)*(1-smooth((t-98)/6));pose.lift.position.y+=raise*8.05;
    if(t>=44&&t<50){const target=printingTarget(T,story,'tank',0,50),f=smooth((t-44)/6);const old=pose.lift.position.y;posePrint(T,story,pose,target);pose.lift.position.y=old+(pose.lift.position.y-old)*f;pose.carriage.position.x*=f;pose.j[0].rotation.y*=f;for(const [j,angle]of [[1,-.5],[2,1.05],[4,-.55]])pose.j[j].rotation.z=angle+(pose.j[j].rotation.z-angle)*f;}
    if(t>=50&&t<=72||t>=104&&t<=132){
      const which=t<=72?'tank':'dome',p=which==='tank'?s.tank:s.dome,target=printingTarget(T,story,which,p,t);
      // Update feed hoses at the actual carriage position, then solve the arm.
      pose=applyKidou(T,kidou,{mode:'park',distance:s.z,carriageX:target.x});
      posePrint(T,story,pose,target);story.printTarget.copy(target);
      const mid=story.printTip.clone().add(target).multiplyScalar(.5),d=story.printTip.clone().sub(target);
      story.laser.position.copy(mid);story.laser.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());story.laser.scale.y=d.length();story.laser.visible=story.spark.visible=story.ring.visible=true;story.spark.position.copy(target);
      story.ring.position.set(0,target.y,which==='tank'?2.6:SITE_DISTANCE+2.6);story.ring.scale.set(which==='tank'?3.4:7.6,1,which==='tank'?6.5:7.6);
    }else if(t>132){const target=printingTarget(T,story,'dome',1,132).lerp(new T.Vector3(0,story.domeHeight+1,SITE_DISTANCE+2.6),smooth((t-132)/4));posePrint(T,story,pose,target);}
    // Raise from the last print pose and settle into the next one without snapping joints.
    if(t>72&&t<78||t>=98&&t<104){
      const retract=t<78,anchor=printingTarget(T,story,retract?'tank':'dome',retract?1:0,retract?72:104);
      pose=applyKidou(T,kidou,{mode:'park',distance:s.z,carriageX:anchor.x});posePrint(T,story,pose,anchor);
      const f=retract?smooth((t-72)/6):1-smooth((t-98)/6);
      pose.lift.position.y+=( -2.4-pose.lift.position.y)*f;
      pose.carriage.position.x*=1-f;pose.j[0].rotation.y*=1-f;
      for(const [j,angle]of [[1,-.5],[2,1.05],[4,-.55]])pose.j[j].rotation.z+=(angle-pose.j[j].rotation.z)*f;
    }
    if(t>=78&&t<98)pose.lift.position.y=-2.4;
    // Hoses follow the final, blended carriage; applyKidou retains their geometry until it changes.
    const lift=pose.lift.position.y,angles=pose.j.map(j=>j.rotation.clone()),carriageX=pose.carriage.position.x;
    pose=applyKidou(T,kidou,{mode:'park',distance:s.z,vz:s.speed,carriageX});pose.lift.position.y=lift;pose.j.forEach((j,i)=>j.rotation.copy(angles[i]));
    story.mixer.setTime(t);
  }
  // Fly to each completed section before starting the next; transfers never print.
  const {work,aim}=assemblyFlight(T,story,t);story.isaoTarget.copy(aim);
  isao.position.copy(work);isao.rotation.y=Math.atan2(aim.x-work.x,aim.z-work.z);story.isaoWorld=work.clone();
  if(t>=6&&t<30&&s.assembly.printing){
    story.root.updateMatrixWorld(true);const tip=isao.getObjectByName('TOOL_TIP').getWorldPosition(new T.Vector3()),d=tip.clone().sub(story.isaoTarget);
    story.laser.position.copy(tip).add(story.isaoTarget).multiplyScalar(.5);story.laser.scale.y=d.length();story.laser.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());story.spark.position.copy(story.isaoTarget);story.laser.visible=story.spark.visible=true;
  }
  story.root.updateMatrixWorld(true);story.pose=pose;return s;
}
