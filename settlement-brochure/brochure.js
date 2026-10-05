const hello=document.querySelector('#hello');
const greeting=document.querySelector('#greeting');
hello.addEventListener('click',()=>{const waved=hello.getAttribute('aria-pressed')!=='true';hello.setAttribute('aria-pressed',String(waved));greeting.textContent=waved?'“Oh good. You brought a towel!”':'“We saved you a sunny spot.”';});
const towel=document.querySelector('#towel');
towel.addEventListener('click',()=>{const packed=towel.getAttribute('aria-pressed')!=='true';towel.setAttribute('aria-pressed',String(packed));towel.querySelector('span').textContent=packed?'✓ PACKED':'PACK TOWEL';greeting.textContent=packed?'“You’ll fit right in.”':'“We saved you a sunny spot.”';hello.setAttribute('aria-pressed','false');});
