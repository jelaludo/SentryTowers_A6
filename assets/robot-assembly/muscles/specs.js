// Optional AUREL-03 musculature. Points are in named source-bone local frames.
// Designed mechanical muscle groups; no biological tissue or third-party mesh data.
export const MUSCLES=[];
const A=(node,p)=>({node,p});
function add(id,module,a,b,width,depth,normal,{bow=.008,peak=.46,tendon=.004,bulge=1,shape='fusiform'}={}){
 MUSCLES.push({id,module,origin:a,insertion:b,width,depth,normal:{node:normal[0],v:normal[1]},bow,peak,tendon,bulge,shape});
}
for(const side of ['L','R']){
 const s=side==='L'?1:-1,sp='RIBCAGE_SPINE',pe='PELVIS_FRAME',sh=`ARM_${side}_SHOULDER`,el=`ARM_${side}_ELBOW`,wr=`ARM_${side}_WRIST`,hip=`LEG_${side}_HIP`,kn=`LEG_${side}_KNEE`,an=`LEG_${side}_ANKLE`,arm='ARM_'+side,leg='LEG_'+side;
 const front=[sh,[0,0,1]],rear=[sh,[0,0,-1]],outer=[sh,[s,0,0]];
 // Convergent chest and back bands retain a visible sternum and spine interval.
 for(const [i,y,w]of [[1,.369,.029],[2,.319,.032],[3,.266,.030]])add(`PECTORAL_${i}_${side}`,'RIBCAGE',A(sp,[s*.020,y,.120]),A(sh,[-s*.013,-.056,.047]),w,.014,[sp,[0,0,1]],{bow:.026,peak:.48,tendon:.003,shape:'fan'});
 add('LATISSIMUS_'+side,'RIBCAGE',A(sp,[s*.039,.104,-.105]),A(sh,[-s*.022,-.085,-.036]),.040,.021,[sp,[0,0,-1]],{bow:.013,peak:.38});
 add('TRAPEZIUS_'+side,'RIBCAGE',A(sp,[s*.017,.440,-.073]),A(sh,[-s*.027,.006,-.035]),.027,.017,[sp,[0,0,-1]],{bow:.004});
 add('SCAPULAR_'+side,'RIBCAGE',A(sp,[s*.029,.288,-.115]),A(sh,[-s*.028,-.010,-.043]),.027,.015,[sp,[0,0,-1]],{bow:.013});
 add('OBLIQUE_'+side,'RIBCAGE',A(sp,[s*.116,.151,.046]),A(pe,[s*.094,.103,.067]),.023,.016,[sp,[s*.6,0,1]],{bow:.012,peak:.53});
 add('RECTUS_'+side,'RIBCAGE',A(sp,[s*.029,.219,.111]),A(pe,[s*.027,.072,.081]),.022,.013,[sp,[0,0,1]],{bow:.007,peak:.49,tendon:.003,shape:'strap'});
 add('ERECTOR_'+side,'RIBCAGE',A(sp,[s*.033,.305,-.108]),A(pe,[s*.031,.070,-.072]),.016,.015,[sp,[0,0,-1]],{bow:.006,tendon:.003});
 for(const [i,y]of [[1,.197],[2,.165]])add(`SERRATUS_${i}_${side}`,'RIBCAGE',A(sp,[s*.131,y,.046]),A(sp,[s*.079,y-.044,.095]),.011,.009,[sp,[s*.4,0,1]],{bow:.004,tendon:.002});
 // Three deltoid heads wrap the shoulder instead of a spherical shoulder pad.
 add('DELTOID_FRONT_'+side,arm,A(sp,[s*.158,.407,.037]),A(sh,[s*.023,-.159,.019]),.027,.025,front,{bow:.023,peak:.30,shape:'cap'});
 add('DELTOID_SIDE_'+side,arm,A(sp,[s*.187,.412,0]),A(sh,[s*.025,-.171,0]),.034,.029,outer,{bow:.032,peak:.29,shape:'cap'});
 add('DELTOID_REAR_'+side,arm,A(sp,[s*.160,.397,-.044]),A(sh,[s*.019,-.150,-.022]),.025,.023,rear,{bow:.024,peak:.30,shape:'cap'});
 add('BICEPS_'+side,arm,A(sh,[-s*.005,-.047,.029]),A(el,[-s*.006,-.067,.029]),.032,.028,front,{bow:.022,peak:.43,bulge:1.3});
 add('TRICEPS_'+side,arm,A(sh,[0,-.040,-.029]),A(el,[0,-.024,-.031]),.032,.028,rear,{bow:.021,peak:.46});
 add('BRACHIALIS_'+side,arm,A(sh,[s*.026,-.108,.003]),A(el,[s*.019,-.018,.008]),.020,.020,outer,{bow:.010,peak:.54,tendon:.003});
 add('FOREARM_FLEXOR_'+side,arm,A(el,[-s*.010,-.032,.025]),A(wr,[-s*.008,.012,.016]),.023,.021,[el,[0,0,1]],{bow:.012,peak:.34,tendon:.003});
 add('FOREARM_EXTENSOR_'+side,arm,A(el,[s*.010,-.030,-.023]),A(wr,[s*.008,.014,-.013]),.022,.018,[el,[0,0,-1]],{bow:.011,peak:.36,tendon:.003});
 add('BRACHIORADIALIS_'+side,arm,A(el,[s*.025,-.012,.005]),A(wr,[s*.014,.019,.007]),.017,.016,[el,[s,0,0]],{bow:.009,peak:.30,tendon:.0025});
 // Pelvic masses stay separate and leave the mechanical hip interfaces readable.
 add('GLUTEUS_MAXIMUS_'+side,'PELVIS',A(pe,[s*.086,.116,-.054]),A(hip,[s*.023,-.124,-.031]),.047,.034,[pe,[0,0,-1]],{bow:.022,peak:.40,tendon:.005});
 add('GLUTEUS_MEDIUS_'+side,'PELVIS',A(pe,[s*.124,.127,-.006]),A(hip,[s*.036,-.083,-.005]),.032,.025,[pe,[s,0,0]],{bow:.018,peak:.37});
 add('HIP_FLEXOR_'+side,'PELVIS',A(pe,[s*.060,.090,.066]),A(hip,[-s*.014,-.110,.023]),.024,.020,[pe,[0,0,1]],{bow:.006,tendon:.003});
 add('RECTUS_FEMORIS_'+side,leg,A(hip,[0,-.048,.033]),A(kn,[0,-.025,.041]),.038,.030,[hip,[0,0,1]],{bow:.023,peak:.45,tendon:.005});
 add('VASTUS_LATERALIS_'+side,leg,A(hip,[s*.027,-.064,.019]),A(kn,[s*.022,.012,.027]),.030,.027,[hip,[s*.7,0,1]],{bow:.020,peak:.48});
 add('VASTUS_MEDIALIS_'+side,leg,A(hip,[-s*.024,-.132,.023]),A(kn,[-s*.021,-.010,.035]),.027,.024,[hip,[-s*.5,0,1]],{bow:.017,peak:.65});
 for(const k of [-1,1])add(`HAMSTRING_${k<0?'MEDIAL':'LATERAL'}_${side}`,leg,A(hip,[k*.021,-.060,-.031]),A(kn,[k*.019,-.040,-.026]),.024,.026,[hip,[0,0,-1]],{bow:.023,peak:.44});
 add('ADDUCTOR_'+side,leg,A(hip,[-s*.030,-.021,0]),A(hip,[-s*.021,-.267,-.008]),.023,.020,[hip,[-s,0,0]],{bow:.010,peak:.35,tendon:.003});
 for(const k of [-1,1])add(`CALF_${k<0?'MEDIAL':'LATERAL'}_${side}`,leg,A(kn,[k*.020,-.042,-.029]),A(an,[k*.007,.014,-.036]),k===-s?.027:.024,.029,[kn,[0,0,-1]],{bow:.024,peak:.31,tendon:.0035});
 add('TIBIALIS_'+side,leg,A(kn,[s*.012,-.055,.025]),A(an,[s*.011,.011,.020]),.021,.018,[kn,[0,0,1]],{bow:.013,peak:.36,tendon:.003});
 add('PERONEAL_'+side,leg,A(kn,[s*.026,-.066,-.003]),A(an,[s*.021,.016,-.010]),.015,.016,[kn,[s,0,0]],{bow:.011,peak:.38,tendon:.0025});
}
export const MUSCLE_MODULES=[...new Set(MUSCLES.map(x=>x.module))];
