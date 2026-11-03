import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import sharp from 'sharp';import {fileURLToPath} from 'node:url';
const out=new URL('../../assets/rokuroku66/',import.meta.url),shots=process.env.ROKU_STORY_SHOTS||path.join(os.tmpdir(),'rokuroku66-story'),w=1920,h=2140;
const items=[{input:Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#11212c"/><text x="40" y="52" fill="#e8e2d4" font-family="sans-serif" font-size="31" letter-spacing="2">THE ROLLING VISITOR / ROKUROKU-66 × 09-TAI</text><text x="40" y="85" fill="#96b2c0" font-family="sans-serif" font-size="17">3× default / 67 seconds · Adaptive feelers · Pursuit · Fixed-pole wrap · Captions use authored time</text></svg>`)}];
for(const [i,[label,name]]of [['00:00 / Sleeping spiral — a visitor waits','sleep'],['00:42 / Sense — locate the rolling lure','sense'],['00:49 / Pursuit — twice the normal rush','chase'],['01:32 / Curl — a moment of hesitation','spiral'],['02:18 / Wrap — the pole stays fixed','wrap'],['02:51 / Pursue again — unfurled and moving','second-chase']].entries()){
 const x=40+(i%2)*940,y=120+Math.floor(i/2)*660;
 items.push({input:await sharp(path.join(shots,'scene-'+name+'.png')).resize(900,590,{fit:'contain',background:'#172a35'}).toBuffer(),left:x,top:y});
 items.push({input:Buffer.from(`<svg width="900" height="40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="28" fill="#d6c29e" font-family="sans-serif" font-size="18">${label}</text></svg>`),left:x,top:y+594});
}
await sharp({create:{width:w,height:h,channels:3,background:'#11212c'}}).composite(items).jpeg({quality:93}).toFile(fileURLToPath(new URL('story-sheet.jpg',out)));
for(const name of ['sleep','chase','wrap'])await fs.copyFile(path.join(shots,'scene-'+name+'.png'),new URL('previews/story-'+name+'.png',out));
const handoffHeight=1480,handoff=[{input:Buffer.from(`<svg width="${w}" height="${handoffHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${handoffHeight}" fill="#11212c"/><text x="40" y="52" fill="#e8e2d4" font-family="sans-serif" font-size="31" letter-spacing="2">ROKUROKU-66 / SENSING FOLLOWS THE LURE</text><text x="40" y="85" fill="#96b2c0" font-family="sans-serif" font-size="17">Six interchangeable limbs · Slow and settle · Plant the former feeler · Raise the nearer limb · Resume pursuit</text></svg>`)}];
for(const [i,[label,name]]of [['01 / Lure changes direction — prepare the exchange','before'],['02 / Former feeler lowers and becomes a support','plant'],['03 / Nearer limb rises after the former feeler plants','lift'],['04 / New sensor pair aims toward 09-tai','after']].entries()){
 const x=40+(i%2)*940,y=120+Math.floor(i/2)*660;
 handoff.push({input:await sharp(path.join(shots,'scene-handoff-'+name+'.png')).resize(900,590,{fit:'contain',background:'#172a35'}).toBuffer(),left:x,top:y});
 handoff.push({input:Buffer.from(`<svg width="900" height="40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="28" fill="#d6c29e" font-family="sans-serif" font-size="18">${label}</text></svg>`),left:x,top:y+594});
}
await sharp({create:{width:w,height:handoffHeight,channels:3,background:'#11212c'}}).composite(handoff).jpeg({quality:93}).toFile(fileURLToPath(new URL('handoff-sheet.jpg',out)));
console.log('Prepared story and sensor-handoff review sheets, plus three story previews.');
