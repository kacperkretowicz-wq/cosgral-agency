/** Native cursor remains available until the custom pointer is actually visible. */
(function(){
  'use strict';
  const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
  const html=document.documentElement;
  let root=document.querySelector('.home-cursor');
  if(!root){
    root=document.createElement('div');root.className='home-cursor';root.setAttribute('aria-hidden','true');
    root.innerHTML='<div class="home-cursor__dot"></div><div class="home-cursor__ring"></div>';
  }
  // Keep it outside body: scene transforms and menu filters cannot clip it.
  html.appendChild(root);
  const dot=root.querySelector('.home-cursor__dot'),ring=root.querySelector('.home-cursor__ring');
  let x=0,y=0,rx=0,ry=0,active=false,lastTime=0,raf=0;
  function hide(){active=false;cancelAnimationFrame(raf);raf=0;lastTime=0;root.style.opacity='0';html.classList.remove('has-custom-cursor');}
  function eligible(){return fine.matches&&!html.classList.contains('reduce-motion');}
  document.addEventListener('pointermove',function(e){
    if(e.pointerType==='touch'||!eligible()){hide();return;}
    x=e.clientX;y=e.clientY;
    if(!active){rx=x;ry=y;active=true;root.style.opacity='1';}
    dot.style.transform='translate3d('+x+'px,'+y+'px,0)';
    // Activate only after drawing the replacement at a known pointer position.
    html.classList.add('has-custom-cursor');
    if(!raf)raf=requestAnimationFrame(tick);
  },{passive:true,capture:true});
  document.addEventListener('pointerover',function(e){
    const target=e.target instanceof Element?e.target:null;
    root.classList.toggle('is-hover',!!target?.closest('a,button,input,textarea,select,[data-magnetic],[data-tile-interact]'));
    root.classList.toggle('is-drag-x',!!target?.closest('[data-cursor="drag-x"]'));
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)hide();},{passive:true});
  window.addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  fine.addEventListener('change',hide);window.addEventListener('resize',()=>{if(!eligible())hide();});
  function tick(now){
    raf=0;
    const dt=Math.min(0.05,(now-(lastTime||now-16.7))/1000);lastTime=now;
    if(!active)return;
    const ease=1-Math.exp(-dt*18);rx+=(x-rx)*ease;ry+=(y-ry)*ease;
    ring.style.transform='translate3d('+rx.toFixed(2)+'px,'+ry.toFixed(2)+'px,0)';
    if(Math.abs(x-rx)+Math.abs(y-ry)>.02)raf=requestAnimationFrame(tick);else lastTime=0;
  }
  hide();
})();
