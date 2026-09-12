// Shared sizing keeps existing model controls and canvases below the common header.
const header=document.querySelector('.workshop-header'),heading=document.querySelector('.asset-heading');
if(header&&heading){const resize=()=>document.documentElement.style.setProperty('--workshop-top-height',`${header.getBoundingClientRect().height+heading.getBoundingClientRect().height}px`);const observer=new ResizeObserver(resize);observer.observe(header);observer.observe(heading);resize();}
