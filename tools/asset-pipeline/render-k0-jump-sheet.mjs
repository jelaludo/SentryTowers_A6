// Derived review layout: original rig renders, no external reference imagery.
import sharp from 'sharp';import fs from 'node:fs/promises';
const project=new URL('../../',import.meta.url),p=JSON.parse(await fs.readFile(new URL('source/motion-patterns/quadruped-patterns.json',project)));
for(const [rig,family,title] of [['cheetah','k0-tech-01','K0-TECH-01 / POUNCE']]){
 const out=new URL(`assets/${family}/`,project),keys=Object.entries(p.jumps[rig].landmarks_s),layers=[],W=1600,H=1020;
 let s=`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#152025"/><g font-family="Helvetica,Arial,sans-serif"><text x="30" y="45" font-size="27" fill="#efbf65">${title} / 1.6 m FORWARD LEAP</text><text x="30" y="76" font-size="15" fill="#b3c0c5">Fixed world camera and ground marks · motion goes left · same view at every pose</text>`;
 for(let i=0;i<keys.length;i++){const [name,t]=keys[i],x=24+(i%4)*394,y=112+Math.floor(i/4)*420;s+=`<rect x="${x}" y="${y}" width="376" height="398" fill="#26353b"/><text x="${x+13}" y="${y+28}" fill="#efbf65" font-size="16">${i+1} / ${name.replaceAll('_',' ').toUpperCase()}</text><text x="${x+13}" y="${y+51}" fill="#b3c0c5" font-size="13">${t.toFixed(3)} s</text>`;}
 s+='<text x="1218" y="583" font-size="18" fill="#efbf65">RIGGED PERFORMANCE</text><text x="1218" y="622" font-size="15" fill="#b3c0c5">Forepaws release first.</text><text x="1218" y="649" font-size="15" fill="#b3c0c5">Hind legs complete the push.</text><text x="1218" y="676" font-size="15" fill="#b3c0c5">Forepaws land before the hips.</text><text x="1218" y="728" font-size="13" fill="#b3c0c5">Timing adapted to each mechanical rig.</text><text x="1218" y="752" font-size="13" fill="#b3c0c5">No reference assets redistributed.</text><text x="30" y="993" fill="#b3c0c5" font-size="13">Models by jelaludo / Derived Blender review renders / 27 October 2026</text></g></svg>';
 layers.push({input:Buffer.from(s),left:0,top:0});
 for(let i=0;i<keys.length;i++){const input=await sharp(new URL('jump-'+keys[i][0]+'.png',out).pathname).resize(376,330,{fit:'contain',background:'#26353b'}).png().toBuffer();layers.push({input,left:24+(i%4)*394,top:112+Math.floor(i/4)*420+66});}
 await sharp({create:{width:W,height:H,channels:4,background:'#152025'}}).composite(layers).png().toFile(new URL('jump-study.png',out).pathname);
}
