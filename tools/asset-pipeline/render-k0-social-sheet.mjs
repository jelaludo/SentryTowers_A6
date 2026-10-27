// Composite original Blender review renders; no external imagery.
import sharp from 'sharp';
const out=new URL('../../assets/k0-tech-01/',import.meta.url),width=1800,height=1060,layers=[];
const poses=[['social-sit','SIT / HOLD'],['social-offer','HAND / OFFER'],['social-shake','HAND / SHAKE'],['social-roll-side','ROLL / SIDE'],['social-roll-back','ROLL / BACK'],['social-recover','ROLL / RECOVER']];
let labels='<svg width="1800" height="1060"><style>text{font-family:sans-serif;fill:#e6eceb}</style><text x="28" y="43" font-size="28">K0-TECH-01 / SIT, HAND AND ROLL</text><text x="28" y="74" font-size="16">Original articulated performances / Eight named clips / Models by jelaludo</text>';
for(let i=0;i<poses.length;i++){
 const x=25+(i%3)*590,y=105+Math.floor(i/3)*465;
 layers.push({input:await sharp(new URL(poses[i][0]+'.png',out).pathname).resize(570,373).png().toBuffer(),left:x,top:y+44});
 labels+=`<text x="${x+12}" y="${y+28}" font-size="20">${poses[i][1]}</text>`;
}
labels+='<text x="28" y="1032" font-size="15">Derived review renders / Flat-floor motion; game terrain and transition checks remain separate.</text></svg>';
layers.push({input:Buffer.from(labels),left:0,top:0});
await sharp({create:{width,height,channels:3,background:'#172125'}}).composite(layers).png().toFile(new URL('social-study.png',out).pathname);
