// Derived browser review images. Plain GLBs remain the authoritative assets.
import fs from 'node:fs/promises';import sharp from 'sharp';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
const out=new URL('../../assets/c08-worker/aurel/',import.meta.url);await fs.mkdir(new URL('previews/',out),{recursive:true});
await page.goto(process.env.C08_VIEWER_URL||'http://127.0.0.1:8791/c08-worker/?variant=aurel&lod=1');await page.waitForFunction(()=>window.c08Worker?.gltf);
await page.addStyleTag({content:'.identity,.views,.stage-meta,.view-badge{display:none!important}'});
const panels=[];
const shots=[
 ['game','Game / AUREL economical pair','16,452 triangles · eight material draws',1,'Standby_Idle',0,'rest','hero'],
 ['palm','Natural inward curl','2,708 triangles per hand · independent mirrored rigs',1,'Standby_Idle',0,'rest','hands'],
 ['dorsal','Ivory shells / wrist interface','Same Isao hand · fixed C08 adapter',1,'Standby_Idle',0,'rest','hands'],
 ['inspect','Inspection / open right hand','Original body action · engine-driven fingers',1,'Work_Inspect',2.4,'auto','hero'],
 ['carry','Carry / loose paired grip','Existing locomotion and wrist choreography retained',1,'Carry_Walk_Cycle',.76,'auto','hero'],
 ['distance','Distance / naturally curled static','2,784 triangles · one draw · 235,648 bytes',2,'Standby_Idle',0,'rest','hero']
];
for(const [id,label,detail,lod,clip,time,mode,view]of shots){
 await page.locator('#lod').selectOption(String(lod));await page.waitForFunction(l=>c08Worker.entry.lod===l,lod);
 await page.evaluate(async({clip,time,mode,view,id})=>{document.getElementById('hand-mode').value=mode;c08Worker.selectClip(clip);c08Worker.scrub(time);c08Worker.setView(view);if(id==='dorsal'){
  const T=await import('three'),k=c08Worker,center=new T.Box3().setFromObject(k.gltf.scene.getObjectByName('AUREL_R_GEOMETRY'),true).getCenter(new T.Vector3());const delta=k.camera.position.clone().sub(center);delta.x*=-1;delta.z*=-1;k.camera.position.copy(center).add(delta);k.camera.lookAt(center);
 }},{clip,time,mode,view,id});
 await page.waitForTimeout(100);const raw=await page.locator('#stage').screenshot();await fs.writeFile(new URL(`previews/${id}.png`,out),raw);
 const labelSvg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="90"><rect width="960" height="90" fill="#102027"/><text x="28" y="35" fill="#f1d19c" font-family="sans-serif" font-size="24">${label}</text><text x="28" y="66" fill="#b6c5c7" font-family="sans-serif" font-size="17">${detail}</text></svg>`);
 const panel=await sharp(raw).resize(960,700,{fit:'contain',background:'#171b1d'}).extend({bottom:90,background:'#102027'}).composite([{input:labelSvg,left:0,top:700}]).png().toBuffer();panels.push(panel);
 if(id==='game')await sharp(raw).resize(1000,700,{fit:'contain',background:'#171b1d'}).jpeg({quality:90}).toFile(new URL('preview.jpg',out).pathname);
}
await sharp({create:{width:1920,height:2370,channels:3,background:'#102027'}}).composite(panels.map((input,i)=>({input,left:(i%2)*960,top:Math.floor(i/2)*790}))).jpeg({quality:92}).toFile(new URL('review-sheet.jpg',out).pathname);
await browser.close();console.log('C08 AUREL review sheet and six derived previews written.');
