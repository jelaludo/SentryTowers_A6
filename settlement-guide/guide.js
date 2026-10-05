const stamps=[...document.querySelectorAll('.stamp')];
const labels=stamps.map(button=>button.innerHTML);
function update(){const n=stamps.filter(b=>b.getAttribute('aria-pressed')==='true').length;document.querySelector('#progress').textContent=n===4?'4 / 4 STAMPS · WELCOME HOME, HITCHHIKER!':`${n} / 4 STAMPS · YOUR ADVENTURE AWAITS`;}
stamps.forEach((button,index)=>button.addEventListener('click',()=>{const done=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(done));if(done)button.textContent='✓ '+button.dataset.done;else button.innerHTML=labels[index];update();}));
document.querySelector('#reset').addEventListener('click',()=>{stamps.forEach((button,index)=>{button.setAttribute('aria-pressed','false');button.innerHTML=labels[index];});update();});
