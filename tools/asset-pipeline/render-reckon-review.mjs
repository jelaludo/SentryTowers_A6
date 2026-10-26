// Assemble the Blender-rendered action review into a compact contact sheet.
import sharp from 'sharp';
const out=new URL('../../assets/reckon-k9/',import.meta.url),names=['preview','walk','run','sit','roll','hand','jump','fetch'],composites=[];
for(let i=0;i<names.length;i++){composites.push({input:await sharp(new URL(names[i]+'.png',out).pathname).resize(600,425).toBuffer(),left:i%4*600,top:Math.floor(i/4)*460});const label=`<svg width="600" height="35"><text x="18" y="23" fill="#cadbdc" font-family="sans-serif" font-size="16">${names[i].toUpperCase()}</text></svg>`;composites.push({input:Buffer.from(label),left:i%4*600,top:Math.floor(i/4)*460+425});}
await sharp({create:{width:2400,height:920,channels:3,background:'#10191e'}}).composite(composites).png().toFile(new URL('animation-review.png',out).pathname);
