import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const out=new URL('../../assets/rokuroku66/',import.meta.url),shots=process.env.ROKU_SHOT_DIR||path.join(os.tmpdir(),'rokuroku66-review');
async function sheet(file,title,subtitle,panels){
 const w=1920,h=1480,items=[],escape=s=>s.replaceAll('&','&amp;');
 items.push({input:Buffer.from(`<svg width="1920" height="1480" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1480" fill="#11212c"/><text x="40" y="52" fill="#e8e2d4" font-family="sans-serif" font-size="31" letter-spacing="3">${escape(title)}</text><text x="40" y="85" fill="#96b2c0" font-family="sans-serif" font-size="17">${escape(subtitle)}</text></svg>`)});
 for(let i=0;i<panels.length;i++){const [label,input]=panels[i],x=40+i%2*940,y=120+Math.floor(i/2)*660;items.push({input:await sharp(input instanceof URL?fileURLToPath(input):input).resize(900,590,{fit:'contain',background:'#172a35'}).toBuffer(),left:x,top:y});items.push({input:Buffer.from(`<svg width="900" height="40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="28" font-family="sans-serif" font-size="18" fill="#d6c29e">${escape(label)}</text></svg>`),left:x,top:y+594});}
 await sharp({create:{width:w,height:h,channels:3,background:'#11212c'}}).composite(items).jpeg({quality:93}).toFile(fileURLToPath(new URL(file,out)));
}
await sheet('design-sheet.jpg','ROKUROKU-66 / SIX SERPENTINE LIMBS','Isao biomimetic series 002 · 22 short vertebrae per limb · 264 motor axes · ivory scales / graphite gimbals',[
 ['01 / Extended — top',new URL('previews/extended-top.png',out)],['02 / Increasing curvature — six spirals',new URL('previews/coiled-top.png',out)],['03 / Support limbs and upright coils',new URL('previews/mixed-front.png',out)],['04 / Compact orthogonal motors — armor removed',path.join(shots,'gimbal.png')]
]);
await sheet('motion-sheet.jpg','ROKUROKU-66 / CURVATURE STUDY','Actual viewer captures · repeated yaw creates an arc · increasing yaw makes a spiral · both axes form a helix',[
 ['01 / Equal side bends — circular arcs',path.join(shots,'arc.png')],['02 / Increasing side bends — tighter tips',path.join(shots,'spiral.png')],['03 / Selected limb — two-axis pole wrap',path.join(shots,'pole-wrap.png')],['04 / Short recessed scales and moving overlap lips',path.join(shots,'scales.png')]
]);
for(const name of ['pole-wrap','gimbal','scales'])await fs.copyFile(path.join(shots,name+'.png'),new URL('previews/'+name+'.png',out));
console.log('Prepared RokuRoku-66 design and motion review sheets.');
