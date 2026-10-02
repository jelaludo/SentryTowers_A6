// Add one GPU-instanced live score display to an LOD0/LOD1 scoreboard GLB.
// The GLB itself retains a visible 12,345,678 snapshot until this adapter runs.
const SEGMENTS={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
const POS={a:[0,.285],b:[.235,.145],c:[.235,-.145],d:[0,-.285],e:[-.235,-.145],f:[-.235,.145],g:[0,0]};
const FONT={
 '0':['11111','10001','10011','10101','11001','10001','11111'],
 '1':['00100','01100','00100','00100','00100','00100','01110'],
 '2':['11111','00001','00001','11111','10000','10000','11111'],
 '3':['11111','00001','00001','01111','00001','00001','11111'],
 '4':['10001','10001','10001','11111','00001','00001','00001'],
 '5':['11111','10000','10000','11111','00001','00001','11111'],
 '6':['11111','10000','10000','11111','10001','10001','11111'],
 '7':['11111','00001','00010','00100','01000','01000','01000'],
 '8':['11111','10001','10001','11111','10001','10001','11111'],
 '9':['11111','10001','10001','11111','00001','00001','11111']
};
const COLORS={beacon:0x82ffe4,flipdot:0xf5e56b,splitflap:0x203038};
export const MAX_SCORE=99999999;
export function normalizeScore(value){const n=Number(value);if(!Number.isFinite(n))throw new TypeError('Score must be finite');return Math.min(MAX_SCORE,Math.max(0,Math.trunc(n)));}
export function attachScoreDisplay(THREE,root,entry,initial=entry.display.default_score){
 if(entry.lod===2)throw new Error('LOD2 is a static score snapshot; use LOD1 for a live score');
 const anchor=root.getObjectByName(entry.display.runtime_node),snapshot=root.getObjectByName(entry.display.static_node);if(!anchor||!snapshot)throw new Error('Scoreboard display nodes are missing');snapshot.visible=false;
 const style=entry.variant,pixel=style==='flipdot',bitmap=pixel||style==='splitflap';const geometry=pixel?new THREE.CircleGeometry(.035,8):new THREE.BoxGeometry(1,1,1);const material=pixel?new THREE.MeshStandardMaterial({color:COLORS[style],roughness:.93,metalness:0,side:THREE.DoubleSide}):new THREE.MeshBasicMaterial({color:COLORS[style]});const display=new THREE.InstancedMesh(geometry,material,bitmap?280:56);display.name='SCORE_LIVE_INSTANCES';display.frustumCulled=false;anchor.add(display);
 const dummy=new THREE.Object3D();let score=0;
 function place(x,y,w,h,z){dummy.position.set(x,y,z);dummy.scale.set(w,h,pixel?1:bitmap?.014:.025);dummy.rotation.set(0,0,0);dummy.updateMatrix();display.setMatrixAt(display.count,dummy.matrix);display.count++;}
 function setScore(value){score=normalizeScore(value);display.count=0;const digits=String(score).padStart(8,'0');for(let i=0;i<8;i++){const x=(i-3.5)*entry.display.pitch_m,d=digits[i];if(bitmap){const pattern=FONT[d];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(pattern[row][col]==='1')place(x+(col-2)*.09,(3-row)*.09,pixel?1:.073,pixel?1:.073,.066);}else for(const segment of SEGMENTS[d]){const [dx,dy]=POS[segment],horizontal='adg'.includes(segment);place(x+dx,dy,horizontal?.40:.065,horizontal?.068:.235,.066);}}display.instanceMatrix.needsUpdate=true;return score;}
 setScore(initial);
 return{get score(){return score;},setScore,display,dispose(){anchor.remove(display);geometry.dispose();material.dispose();snapshot.visible=true;}};
}
