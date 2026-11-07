import {poseElevator} from '../space-elevator/runtime.js';
export const DURATION=112,BASE_SPEED=2,FAST_MULTIPLIER=20,ORBITAL_Y=1523.2;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const CHAPTERS=[
 {id:'city',start:0,end:12,title:'A city on the surface',detail:'Eight connected domes, a central plaza and one elevator terminal.'},
 {id:'approach',start:12,end:24,title:'Find the climber',detail:'The camera leaves the streets and closes on the tether cabin.'},
 {id:'depart',start:24,end:32,title:'Leave the city',detail:'The first part of the ascent plays at normal travel speed.'},
 {id:'accelerate',start:32,end:36,title:'Accelerate to 20×',detail:'Time compression rises smoothly from 1× to 20×.'},
 {id:'ascent',start:36,end:46,title:'Above the settlement',detail:'Follow the climber as the city falls away below.'},
 {id:'gunship',start:46,end:60,title:'KORP passes',detail:'The heavy gunship crosses behind the tether on its own flight path.'},
 {id:'arrival',start:60,end:78,title:'The orbital harbour',detail:'The terminal comes into view. The climber brakes and docks below it.'},
 {id:'sol',start:78,end:98,title:'Two quiet sentinels',detail:'SOL-82 and SOL-88 drift behind the terminal at different angular speeds.'},
 {id:'complete',start:98,end:112,title:'One connected settlement',detail:'Hold on the orbital terminal, the two SOL platforms and the world below.'}
];
// Integral of a smooth 1× -> 20× velocity ramp. Travel is deterministic under seeking.
const integral=u=>u*u*u-.5*u*u*u*u;
export function stateAt(value){const t=clamp(value,0,DURATION);let y=55,speed=0,multiplier=1;
 if(t>=24&&t<32){y+=2*(t-24);speed=2;}
 else if(t>=32&&t<36){const u=(t-32)/4;y=71+4*(2*u+38*integral(u));speed=2+38*smooth(u);multiplier=speed/2;}
 else if(t>=36&&t<68){y=155+40*(t-36);speed=40;multiplier=20;}
 else if(t>=68&&t<72){const u=(t-68)/4;y=1435+160*(u-integral(u));speed=40*(1-smooth(u));multiplier=20;}
 else if(t>=72){y=1515;multiplier=1;}
 const a82=.0018*(t-78),a88=.0022*(t-78);
 const sol82=[-91*Math.cos(a82)+145*Math.sin(a82),ORBITAL_Y+22, -91*Math.sin(a82)-145*Math.cos(a82)];
 const sol88=[91*Math.cos(a88)+170*Math.sin(a88),ORBITAL_Y+32,91*Math.sin(a88)-170*Math.cos(a88)];
 const gunship=[-15*(t-52),805+2*Math.sin((t-52)*.15),-55+2*(t-52)];
 return{time:t,y,speed,multiplier,sol82,sol88,gunship,chapter:CHAPTERS.find(c=>t<c.end)||CHAPTERS.at(-1),progress:clamp((y-55)/1460),dock:t>=72};
}
export const DOMES=[
 {id:'HABITAT_W',module:'habitat',p:[-48,0,62]}, {id:'LOGISTICS',module:'logistics',p:[0,0,62]}, {id:'RESEARCH_E',module:'research',p:[48,0,62]},
 {id:'BIOSPHERE',module:'biosphere',p:[-48,0,110]}, {id:'FABRICATION',module:'fabrication',p:[48,0,110]},
 {id:'POWER',module:'power',p:[-48,0,158]}, {id:'HABITAT_N',module:'habitat',p:[0,0,158]}, {id:'RESEARCH_N',module:'research',p:[48,0,158]}
];
export const LINKS=[[0,1],[1,2],[0,3],[2,4],[3,5],[4,7],[5,6],[6,7]];
export function sourcePaths(lod){const tier=lod?'game':'detailed';return Object.fromEntries([
 ...['surface','orbital','climber'].map(k=>[k,`assets/space-elevator/${k}_d0_lod${lod}.glb`]),
 ...['habitat','logistics','research','biosphere','fabrication','power','bridge'].map(k=>[k,`assets/dome-colony/${k}_d0_lod${lod}.glb`]),
 ['sol82',`assets/sol82/lod${lod}/sol82_platform_${tier}.glb`],['sol88',`assets/sol88/lod${lod}/sol88_platform_${tier}.glb`],['korp',`assets/korp/korp_d0_lod${lod}.glb`],['tank',`assets/hover-tank/mork_hover_tank_${lod?'low_':''}d0.glb`]
 ]);}
// New display-only site/connector geometry; canonical model geometry remains unchanged.
function scenery(T){const root=new T.Group();root.name='CITY_SCENERY';const positions=[],normals=[],colors=[];
 function box(size,p,color,rot=0){const g=new T.BoxGeometry(...size).toNonIndexed();g.rotateY(rot);g.translate(...p);positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);const c=new T.Color(color);for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b);g.dispose();}
 box([174,6,224],[0,-3.12,78],0x4a5e66);box([170,.12,220],[0,-.075,78],0x7f9196);
 // Two roads and the central civic plaza, all above the site deck.
 for(const x of [-24,24]){box([11,.025,55],[x,.003,5],0x344b56);box([11,.025,141],[x,.003,114],0x344b56);}box([156,.025,11],[0,.003,38],0x344b56);box([42,.06,42],[0,.025,110],0x566f79);
 for(const x of [-24,24])for(let z=-20;z<184;z+=7)box([.16,.015,2.6],[x,.026,z],0xc0c2ad);
 for(let x=-72;x<=72;x+=7)box([2.6,.015,.16],[x,.029,38],0xc0c2ad);
 for(const side of [-1,1])for(let i=0;i<5;i++){box([3,.4,1.2],[side*17,.26,97+i*6],0xc7cec6);box([2.8,.8,.2],[side*17,.7,97+i*6-.5],0x456570);}
 // Elevated pedestrian transfer from the logistics port to the observation facade.
 const from=23.2,to=48,mid=(from+to)/2,length=to-from;
 box([3.6,.4,length],[0,7.7,mid],0x3b5560);box([3.6,.28,length],[0,11.6,mid],0xd2d5c9);
 for(const side of [-1,1]){box([.16,3.5,length],[side*1.72,9.7,mid],0x547c89);for(let z=from;z<=to;z+=3.1)box([.23,3.7,.2],[side*1.72,9.7,z],0xcbd2ca);}
 for(const z of [29,42]){for(const side of [-1,1]){box([.35,7.5,.35],[side*6.5,3.75,z],0x536d77);box([1,.25,1],[side*6.5,.125,z],0xb1bdb8);}box([13.2,.3,.4],[0,7.35,z],0x536d77);}
 for(const z of [from,to]){box([4,.3,.4],[0,11.7,z],0xd3b16d);for(const x of [-1.85,1.85])box([.3,3.9,.4],[x,9.7,z],0xd3b16d);}
 // Utility banks in the plaza, with pale housings and blue collectors.
 for(const x of [-8,8])for(const z of [104,116]){box([5,1.4,4],[x,.75,z],0xb8c5c5);box([4.8,.12,3.8],[x,1.52,z],0x30576c);for(let k=-2;k<=2;k++)box([.035,.025,3.8],[x+k*.9,1.6,z],0x92aeb6);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.15}));mesh.name='CITY_SITE_AND_TRANSFER';root.add(mesh);return root;
}
export function createStory(T,models,lod,cloneScene=r=>r.clone(true)){
 const root=new T.Group();root.name='ELEVATOR_CITY_DIORAMA_ROOT';const city=new T.Group();city.name='CONNECTED_CITY';root.add(city);const objects={},domes=[];
 function instance(role,name,p=[0,0,0],parent=root){const w=new T.Group();w.name=name;w.position.fromArray(p);const model=cloneScene(models[role].scene);w.add(model);parent.add(w);objects[name]=w;return w;}
 const surface=instance('surface','SURFACE_TERMINAL',[0,0,0],city),orbital=instance('orbital','ORBITAL_TERMINAL',[0,ORBITAL_Y,0]),climber=instance('climber','CITY_CLIMBER',[0,55,0]);
 for(const d of DOMES){const w=instance(d.module,d.id,d.p,city);domes.push(w);const shell=w.getObjectByName('SHELL');if(shell?.isMesh){shell.material=shell.material.clone();shell.material.transparent=false;shell.material.opacity=1;shell.material.depthWrite=true;}}
 const connections=[];
 for(const [i,j]of LINKS){const a=DOMES[i].p,b=DOMES[j].p,dx=b[0]-a[0],dz=b[2]-a[2],w=instance('bridge',`HALL_${i}_${j}`,[(a[0]+b[0])/2,0,(a[2]+b[2])/2],city);w.rotation.y=dx?0:Math.PI/2;const pa=dx?'E':'N',pb=dx?'W':'S';for(const [index,port]of [[i,pa],[j,pb]])domes[index].getObjectByName('PORT_CAP_'+port).visible=false;connections.push({a:i,b:j,wrapper:w,aPort:pa,bPort:pb});}
 // Port N is +Z in the canonical dome kit; the logistics-facing station cap is S.
 domes[1].getObjectByName('PORT_CAP_S').visible=false;
 const site=scenery(T);city.add(site);const parked=instance('tank','MORK_IN_BAY',[0,.54,14],city),patrol=instance('tank','MORK_PATROL',[-24,.04,65],city);patrol.rotation.y=Math.PI;
 const sol82=instance('sol82','SOL_82'),sol88=instance('sol88','SOL_88'),korp=instance('korp','KORP_FLYBY');
 const mixers=[];function clip(wrapper,role,name,loop=true){const mixer=new T.AnimationMixer(wrapper.children[0]),c=models[role].animations.find(c=>c.name===name);if(!c)throw Error('Missing clip '+role+'/'+name);const action=mixer.clipAction(c);action.setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);action.clampWhenFinished=true;action.play();mixers.push({mixer,action,duration:c.duration,loop});return action;}
 clip(sol82,'sol82','Idle_Cycle');clip(sol88,'sol88','Idle_Cycle');clip(korp,'korp','Gear_Retract',false);
 for(const name of ['ENGINE_FL_PITCH','ENGINE_FR_PITCH','ENGINE_RL_PITCH','ENGINE_RR_PITCH'])korp.getObjectByName(name).rotation.x=-.12;
 // Tether outside each module's retained central guide. No alternate station geometry.
 const tether=new T.Group();tether.name='CONTINUOUS_TETHER';const material=new T.MeshStandardMaterial({color:0xa4bec8,metalness:.65,roughness:.4});for(const x of [-.5075,.5075]){const m=new T.Mesh(new T.BoxGeometry(.085,ORBITAL_Y+700-54,.33),material);m.position.set(x,(ORBITAL_Y+700+54)/2,0);tether.add(m);}root.add(tether);
 const bandCount=Math.floor((ORBITAL_Y+650-65)/25)*2,bands=new T.InstancedMesh(new T.BoxGeometry(.10,.35,.36),new T.MeshStandardMaterial({color:0xd8b36b,emissive:0x705320,emissiveIntensity:.3,roughness:.6}),bandCount);bands.name='TETHER_DISTANCE_MARKINGS';const matrix=new T.Matrix4();for(let i=0;i<bandCount;i++)bands.setMatrixAt(i,matrix.makeTranslation(i%2?.5075:-.5075,65+Math.floor(i/2)*25,0));bands.instanceMatrix.needsUpdate=true;tether.add(bands);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const story={root,city,surface,orbital,climber,domes,connections,site,parked,patrol,sol82,sol88,korp,tether,mixers,lod,models};applyTime(T,story,0);return story;
}
export function applyTime(T,story,t){const s=stateAt(t);story.state=s;story.climber.position.y=s.y;
 poseElevator(story.surface.getObjectByName('ELEVATOR_SURFACE_ROOT'),{door:1,dish:15});poseElevator(story.orbital.getObjectByName('ELEVATOR_ORBITAL_ROOT'),{solar:14,dish:-12+s.time*.18});poseElevator(story.climber.getObjectByName('ELEVATOR_CLIMBER_ROOT'),{distance:s.y-55});
 story.sol82.position.fromArray(s.sol82);story.sol88.position.fromArray(s.sol88);story.sol82.rotation.y=.16+s.time*.0018;story.sol88.rotation.y=-.18+s.time*.0022;
 story.korp.position.fromArray(s.gunship);story.korp.rotation.set(0,Math.atan2(-15,2),-.06*Math.sin((s.time-52)*.1));
 for(const {mixer,action,duration,loop}of story.mixers){action.enabled=true;action.paused=false;mixer.setTime(loop?s.time%duration:duration);}
 story.patrol.position.z=65+10*Math.sin(s.time*.065);story.root.updateMatrixWorld(true);return s;
}
export function cameraAt(t,aspect=1.5){const s=stateAt(t),blend=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*smooth(u));let target,offset;
 const cityTarget=[0,18,88],cityOffset=[-182+30*smooth(t/12),142-25*smooth(t/12),225-25*smooth(t/12)],rideTarget=[0,s.y+3,2],rideOffset=[-24,12,36];
 if(t<12){target=cityTarget;offset=cityOffset;}else if(t<24){target=blend(cityTarget,rideTarget,(t-12)/12);offset=blend([-152,117,200],rideOffset,(t-12)/12);}else{target=rideTarget;offset=rideOffset;}
 const pass=smooth((t-44)/6)*(1-smooth((t-54)/7));if(t>=24){target=blend(target,s.gunship.map((v,i)=>v+(i===1?4:0)),pass*.38);offset=blend(offset,[-55,24,88],pass);}
 const arrival=smooth((t-61)/17);if(t>=61){const end=(t-78)/34;target=blend(target,[0,ORBITAL_Y+11,-37],arrival);offset=blend(offset,[-35+40*clamp(end),100-5*clamp(end),230],arrival);}
 const mobile=Math.max(1,Math.min(2.4,1.3/aspect));offset=offset.map(v=>v*mobile);return{target,position:target.map((v,i)=>v+offset[i]),fov:40};
}
