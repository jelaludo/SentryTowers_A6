const addon=new URLSearchParams(location.search).get('view')==='containers';
for(const a of document.querySelectorAll('.model-tabs a'))a.setAttribute('aria-current',a.dataset.view===(addon?'containers':'tank')?'page':'false');
if(addon)await import('./container-viewer.js?v=floor-low-2');else await import('./viewer.js');
