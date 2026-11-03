import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const out=new URL('../../assets/nih-dairia-mech/',import.meta.url),shots=process.env.NIH_SHOT_DIR||path.join(os.tmpdir(),'nih-dairia-review');
async function sheet(file,title,subtitle,panels){
 const w=1920,h=1480,items=[];const escape=s=>s.replaceAll('&','&amp;');
 const header=Buffer.from(`<svg width="1920" height="1480" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1480" fill="#11212c"/><text x="40" y="52" fill="#e8e2d4" font-family="sans-serif" font-size="31" letter-spacing="3">${escape(title)}</text><text x="40" y="85" fill="#96b2c0" font-family="sans-serif" font-size="17">${escape(subtitle)}</text></svg>`);items.push({input:header});
 for(let i=0;i<panels.length;i++){const [label,input]=panels[i],x=40+i%2*940,y=120+Math.floor(i/2)*660;items.push({input:await sharp(input instanceof URL?fileURLToPath(input):input).resize(900,590,{fit:'contain',background:'#172a35'}).toBuffer(),left:x,top:y});items.push({input:Buffer.from(`<svg width="900" height="40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="28" font-family="sans-serif" font-size="18" fill="#d6c29e">${escape(label)}</text></svg>`),left:x,top:y+594});}
 await sharp({create:{width:w,height:h,channels:3,background:'#11212c'}}).composite(items).jpeg({quality:93}).toFile(fileURLToPath(new URL(file,out)));
}
await sheet('design-sheet.jpg','NIH-DAIRIA / MECHANICAL STUDY V1','Isao biomimetic series 001 · 6 legs · 18 folding claws · 580 mm hydraulic stroke',[
 ['01 / Perspective — detailed master',new URL('preview.png',out)],['02 / Radial silhouette — top',new URL('previews/top.png',out)],['03 / Low suspended body — side',new URL('previews/side.png',out)],['04 / Folding titanium ground claws',new URL('previews/claws.png',out)]
]);
await sheet('motion-sheet.jpg','NIH-DAIRIA / MOVEMENT STUDY','Engine-driven planar kinematics · tripod walk at 0.30 m/s · one-shot anchor deployment',[
 ['Observe / pressure regulation',path.join(shots,'idle.png')],['Walk / alternating support',path.join(shots,'walk.png')],['Reach / full hydraulic stroke',path.join(shots,'extend.png')],['Anchor / spread, deploy, lower, hold',path.join(shots,'anchor.png')]
]);
for(const name of ['anchor','extend'])await sharp(path.join(shots,name+'.png')).png().toFile(fileURLToPath(new URL('previews/'+name+'.png',out)));
console.log('Prepared design and motion review sheets.');
