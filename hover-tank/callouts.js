import {Vector3} from 'three';
const $=id=>document.getElementById(id);
export class PartCallouts {
  constructor(stage,camera){
    this.stage=stage;this.camera=camera;this.parts=[];this.visible=[];this.serial=0;
    this.overlay=document.createElement('div');this.overlay.className='part-overlay';stage.append(this.overlay);
    $('labels').onchange=()=>{this.overlay.hidden=$('partsPanel').hidden=!$('labels').checked;};
    this.overlay.hidden=true;
    $('partGroup').onchange=()=>this.populate();$('partSearch').oninput=()=>this.populate();
    $('copyPart').onclick=async()=>{if(!this.selected)return;const p=this.selected;try{await navigator.clipboard.writeText(`${p.code} — ${p.name} [${p.id}] (Blender: ${p.source})`);$('copyPart').textContent='Copied';}catch{$('partDetail').textContent+= ' — Select this text to copy.';}};
  }
  async load(root,file){
    const ticket=++this.serial;this.parts=[];this.overlay.replaceChildren();$('partList').replaceChildren();
    const response=await fetch('../assets/hover-tank/'+file.replace('.glb','-callouts.json'));
    if(!response.ok)throw Error('Part labels unavailable');
    const data=await response.json();if(ticket!==this.serial)return;
    const prefixes={'Hull':'H','Turret':'T','Cannon':'C','Left nacelle':'NL','Right nacelle':'NR','Left plasma':'PL','Right plasma':'PR','Rear magazine':'M'},counts={};
    this.parts=data.map(p=>({...p,node:root.getObjectByName(p.anchor)})).filter(p=>p.node);
    for(const p of this.parts){counts[p.group]=(counts[p.group]||0)+1;p.code=prefixes[p.group]+String(counts[p.group]).padStart(2,'0');}
    const previous=$('partGroup').value;$('partGroup').replaceChildren();
    for(const group of Object.keys(prefixes)){if(!this.parts.some(p=>p.group===group))continue;const o=document.createElement('option');o.value=group;o.textContent=group;$('partGroup').append(o);}
    if([...$('partGroup').options].some(o=>o.value===previous))$('partGroup').value=previous;
    this.selected=null;$('copyPart').disabled=true;$('partDetail').textContent='Select a number to identify a piece.';this.populate();
  }
  select(p){
    this.selected=p;$('copyPart').disabled=false;$('copyPart').textContent='Copy part reference';
    $('partDetail').textContent=`${p.code} — ${p.name}. Blender object: ${p.source}`;
    for(const q of this.visible){q.button.setAttribute('aria-pressed',String(q===p));q.marker.classList.toggle('selected',q===p);q.label.hidden=q!==p;}
  }
  populate(){
    this.overlay.replaceChildren();$('partList').replaceChildren();
    const query=$('partSearch').value.toLowerCase();
    this.visible=this.parts.filter(p=>p.group===$('partGroup').value&&`${p.code} ${p.name} ${p.source}`.toLowerCase().includes(query));
    for(const p of this.visible){
      p.button=document.createElement('button');p.button.textContent=`${p.code} · ${p.name}`;p.button.onclick=()=>this.select(p);p.button.setAttribute('aria-pressed',String(p===this.selected));$('partList').append(p.button);
      p.marker=document.createElement('button');p.marker.className='part-marker';p.marker.textContent=p.code;p.marker.title=p.name;p.marker.setAttribute('aria-label',`${p.code}: ${p.name}`);p.marker.onclick=()=>this.select(p);
      p.label=document.createElement('span');p.label.className='part-name';p.label.textContent=p.name;p.label.hidden=p!==this.selected;p.marker.append(p.label);this.overlay.append(p.marker);
    }
    if(this.selected)this.select(this.selected);
  }
  update(){
    if(!$('labels').checked)return;
    const width=this.stage.clientWidth,height=this.stage.clientHeight,occupied=[];
    this.camera.updateMatrixWorld();
    for(const p of [...this.visible].sort((a,b)=>(b===this.selected)-(a===this.selected))){
      p.node.updateWorldMatrix(true,false);const v=p.node.localToWorld(new Vector3(...p.position)).project(this.camera);
      const x=(v.x+1)*width/2,y=(1-v.y)*height/2;
      const hidden=v.z<-1||v.z>1||x<18||x>width-18||y<65||y>height-65||occupied.some(([a,b])=>Math.abs(a-x)<35&&Math.abs(b-y)<24);
      p.marker.hidden=hidden;if(hidden)continue;occupied.push([x,y]);p.marker.style.left=x+'px';p.marker.style.top=y+'px';
      p.label.classList.toggle('left-label',x>width/2);p.label.style.left=x>width/2?'auto':'18px';p.label.style.right=x>width/2?'18px':'auto';
    }
  }
}
