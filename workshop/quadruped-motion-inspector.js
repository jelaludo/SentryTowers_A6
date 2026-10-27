// Shared contact/pose study UI. Bars show authored contact windows; the readout
// measures current world-space sole heights from the loaded rig.
import {Vector3} from 'three';
const ids=['FL','FR','HL','HR'];
const names={ready:'Ready',crouch:'Crouch',push_off:'Push-off',apex:'Apex',fore_contact:'Fore contact',absorb:'Absorb',recover:'Recover'};
export function createMotionInspector(container,{seek,sideView}){
 let meta=null,playhead=null,readout=null;
 function setClip(next){
  meta=next;container.replaceChildren();container.hidden=!meta||(!meta.touchdown_phase&&!meta.release_s);if(container.hidden)return;
  const title=document.createElement('p');title.className='motion-study-title';title.textContent=meta.release_s?'JUMP STUDY / SEVEN POSES':'PAW CONTACT / ONE CYCLE';container.append(title);
  if(meta.phase_landmarks_s){const buttons=document.createElement('div');buttons.className='motion-pose-buttons';for(const [name,t] of Object.entries(meta.phase_landmarks_s)){const b=document.createElement('button');b.textContent=names[name]||name;b.dataset.motionPose=name;b.title=t.toFixed(3)+' seconds';b.onclick=()=>{seek(t);sideView();};buttons.append(b);}container.append(buttons);}
  const width=280,left=32,track=240,duration=meta.duration_s;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${width} 105`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Authored stance windows for four paws; click to scrub');svg.classList.add('motion-contact-chart');
  let markup='';
  for(let i=0;i<4;i++){
   const id=ids[i],y=12+i*23;markup+=`<text x="0" y="${y+9}" class="contact-label">${id}</text><rect x="${left}" y="${y}" width="${track}" height="12" rx="2" class="contact-track"/>`;
   const intervals=[];
   if(meta.release_s)intervals.push([0,meta.release_s[id]/duration],[meta.touchdown_s[id]/duration,1]);
   else{const start=meta.touchdown_phase[id],d=typeof meta.duty_factor==='number'?meta.duty_factor:meta.duty_factor[id];intervals.push([start,Math.min(1,start+d)]);if(start+d>1)intervals.push([0,start+d-1]);}
   for(const [a,b] of intervals)markup+=`<rect x="${left+a*track}" y="${y}" width="${Math.max(0,b-a)*track}" height="12" rx="2" class="contact-stance"/>`;
  }
  markup+=`<line x1="${left}" x2="${left}" y1="6" y2="99" class="contact-playhead"/>`;svg.innerHTML=markup;playhead=svg.querySelector('.contact-playhead');
  svg.onclick=e=>{const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*width;seek(Math.max(0,Math.min(1,(x-left)/track))*duration);};container.append(svg);
  const order=document.createElement('p');order.className='motion-contact-order';
  if(meta.touchdown_phase){const beats=new Map();for(const [id,t] of Object.entries(meta.touchdown_phase)){if(!beats.has(t))beats.set(t,[]);beats.get(t).push(id);}order.textContent=[...beats].sort((a,b)=>a[0]-b[0]).map(([,feet])=>feet.join(' + ')).join(' → ');}
  else order.textContent='Fore release → hind push → fore contact → hind contact';container.append(order);
  readout=document.createElement('p');readout.className='motion-contact-readout';readout.setAttribute('aria-live','off');container.append(readout);
 }
 function update(t,root){if(container.hidden||!meta)return;const x=32+240*Math.min(1,t/meta.duration_s);playhead.setAttribute('x1',x);playhead.setAttribute('x2',x);const grounded=ids.filter(id=>root.getObjectByName('SOCKET_PAW_'+id).getWorldPosition(new Vector3()).y<.012);readout.textContent=grounded.length?'Near floor: '+grounded.join(' · '):'Flight / all four paws clear';for(const button of container.querySelectorAll('[data-motion-pose]'))button.setAttribute('aria-pressed',String(Math.abs(t-meta.phase_landmarks_s[button.dataset.motionPose])<.012));}
 return {setClip,update};
}
