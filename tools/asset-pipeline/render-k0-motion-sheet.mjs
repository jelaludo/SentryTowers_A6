// Layout only: composites original Blender review renders into a derived study sheet.
import fs from 'node:fs/promises';import sharp from 'sharp';
const out=new URL('../../assets/k0-tech-01/',import.meta.url);
const phases=[['fore-support','01 / FORE SUPPORT','Sequential forelimb contacts · 13%'],['gathered','02 / GATHERED FLIGHT','Flexed spine · hind paws pass beneath · 37%'],['hind-support','03 / HIND SUPPORT','Sequential hindlimb contacts · 61%'],['extended','04 / EXTENDED FLIGHT','Extended spine · all four paws airborne · 87%']];
const layers=[];const W=1600,H=1080;
const label=(text,x,y,size=20,color='#e6ece8',weight=400)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Helvetica,Arial,sans-serif" font-weight="${weight}" font-size="${size}">${text}</text>`;
let svg=`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#171d1f"/>`;
svg+=label('K0-TECH-01 / FELIS',40,52,30,'#edbe67',600)+label('ROTARY GALLOP / TWO FLIGHT PHASES',40,85,15,'#b6c0bf')+label('0.40 s CYCLE · +Z FORWARD · 51 JOINTS',1150,53,14,'#b6c0bf');
for(let i=0;i<4;i++){const x=40+(i%2)*780,y=119+Math.floor(i/2)*418;svg+=`<rect x="${x}" y="${y}" width="740" height="392" fill="#222c30"/>`;svg+=label(phases[i][1],x+18,y+31,17,'#edbe67',600)+label(phases[i][2],x+18,y+58,14,'#b6c0bf');}
svg+=label('CONTACT ORDER',40,1003,15,'#edbe67',600)+label('Fore L → Fore R → gathered flight → Hind R → Hind L → extended flight',225,1003,17)+label('Original rigid-armor model and authored kinematic motion / jelaludo',40,1041,14,'#b6c0bf')+label('Derived review renders · not a force simulation',1250,1041,12,'#b6c0bf');svg+='</svg>';
layers.push({input:Buffer.from(svg),left:0,top:0});
for(let i=0;i<4;i++){const input=await sharp(new URL(phases[i][0]+'.png',out).pathname).extract({left:15,top:180,width:1270,height:540}).resize(740,315).png().toBuffer();layers.push({input,left:40+(i%2)*780,top:119+Math.floor(i/2)*418+76});}
await sharp({create:{width:W,height:H,channels:4,background:'#171d1f'}}).composite(layers).png().toFile(new URL('motion-sheet.png',out).pathname);
console.log('Wrote motion-sheet.png');
