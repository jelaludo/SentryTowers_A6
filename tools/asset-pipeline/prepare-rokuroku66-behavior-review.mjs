import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import sharp from 'sharp';
const out=new URL('../../assets/rokuroku66/',import.meta.url),shots=process.env.ROKU_SHOT_DIR||path.join(os.tmpdir(),'rokuroku66-review'),w=1920,h=1480;
const items=[{input:Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#11212c"/><text x="40" y="52" fill="#e8e2d4" font-family="sans-serif" font-size="31" letter-spacing="2">ROKUROKU-66 / A CURIOUS TEMPERAMENT</text><text x="40" y="85" fill="#96b2c0" font-family="sans-serif" font-size="17">Seeded wandering · hesitation · tentacle survey · sudden rush · soft arrival</text></svg>`)}];
for(const [i,[label,file]]of [['01 / Hesitate — test the ground','behavior-hesitate'],['02 / Sense — rise and probe ahead','behavior-sense'],['03 / Rush — low body, quick diagonal steps','behavior-rush'],['04 / Clearing — new destinations, actual travel','roam-clearing']].entries()){
 const x=40+i%2*940,y=120+Math.floor(i/2)*660;
 items.push({input:await sharp(path.join(shots,file+'.png')).resize(900,590,{fit:'contain',background:'#172a35'}).toBuffer(),left:x,top:y});
 items.push({input:Buffer.from(`<svg width="900" height="40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="28" font-family="sans-serif" font-size="18" fill="#d6c29e">${label}</text></svg>`),left:x,top:y+594});
}
await sharp({create:{width:w,height:h,channels:3,background:'#11212c'}}).composite(items).jpeg({quality:93}).toFile(fileURLToPath(new URL('behavior-sheet.jpg',out)));
for(const name of ['roam','hesitate','sense','rush'])await fs.copyFile(path.join(shots,'behavior-'+name+'.png'),new URL('previews/'+name+'.png',out));
console.log('Prepared behavior review sheet.');
