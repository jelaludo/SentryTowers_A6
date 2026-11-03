import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const out=new URL('../../assets/rokuroku66/',import.meta.url),shots=process.env.ROKU_SHOT_DIR||path.join(os.tmpdir(),'rokuroku66-review');
const panels=[],w=1920,h=1180;
panels.push({input:Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#11212c"/><text x="35" y="48" fill="#e8e2d4" font-family="sans-serif" font-size="29" letter-spacing="2">ROKUROKU-66 / ORGANIC LOCOMOTION</text><text x="35" y="80" fill="#96b2c0" font-family="sans-serif" font-size="17">Top: six-limb ripple / 0.34 m/s · Bottom: four walking limbs + front sensors / 0.25 m/s</text></svg>`)});
for(const [row,mode] of ['walk','scout'].entries())for(let col=0;col<3;col++){
 const i=[0,2,4][col],x=35+col*625,y=112+row*530;
 panels.push({input:await sharp(path.join(shots,`${mode}-${i}.png`)).resize(600,474,{fit:'cover'}).png().toBuffer(),left:x,top:y});
 panels.push({input:Buffer.from(`<svg width="600" height="32" xmlns="http://www.w3.org/2000/svg"><text x="0" y="25" fill="#d6c29e" font-family="sans-serif" font-size="16">${mode==='walk'?'WALK':'SENSOR WALK'} / ${Math.round(i/6*100)}% of cycle</text></svg>`),left:x,top:y+478});
}
await sharp({create:{width:w,height:h,channels:3,background:'#11212c'}}).composite(panels).jpeg({quality:93}).toFile(fileURLToPath(new URL('walking-sheet.jpg',out)));
for(const mode of ['walk','scout'])await fs.copyFile(path.join(shots,mode+'-2.png'),new URL('previews/'+mode+'.png',out));
console.log('Prepared walking and sensor-walk review sheet.');
