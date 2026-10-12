/* Editorial variant: native document flow, reversible reveals and two iris wipes. */
(async function () {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  await window.cosgralSmoothScroll?.ready;
  const lenis=window.cosgralSmoothScroll?.lenis;
  document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
    if(link.hasAttribute('data-nav-services-toggle')||link.hasAttribute('data-nav-close'))return;
    const target=document.getElementById(link.hash.slice(1));
    if(!target)return;
    event.preventDefault();
    if(lenis)lenis.scrollTo(target,{offset:-94,duration:reduced?0:1.0});
    else target.scrollIntoView({behavior:reduced?'instant':'smooth'});
  }));
  if(window.ScrollTrigger) {
    ScrollTrigger.create({id:'shatter-beat',start:()=>innerHeight*.18,end:()=>innerHeight*1.32});
    document.querySelectorAll('[data-tone-wipe]').forEach(section=>{
      const panel=section.querySelector('.tone-wipe__surface');
      if(reduced){panel.style.clipPath='none';return;}
      ScrollTrigger.create({trigger:section,start:'top 65%',end:'bottom bottom',onUpdate:self=>{
        const p=self.progress;
        const radius=(p*p*(3-2*p))*155;
        panel.style.clipPath=`circle(${radius.toFixed(2)}% at 50% 78%)`;
        section.style.setProperty('--wipe-progress',p.toFixed(3));
      }});
    });
    ScrollTrigger.create({trigger:'#realizacje',endTrigger:'#light-end',start:'top 12%',end:'bottom 12%',
      onToggle:self=>document.body.classList.toggle('has-light-section',self.isActive)});
    ScrollTrigger.create({trigger:'#uslugi',start:'top top',end:'max',
      onToggle:self=>document.documentElement.classList.toggle('is-ambient-covered',self.isActive)});
    ScrollTrigger.refresh();
    let refreshTimer;
    const resizeObserver=new ResizeObserver(()=>{
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>ScrollTrigger.refresh(),120);
    });
    document.querySelectorAll('.faq-item__a').forEach(el=>resizeObserver.observe(el));
  }
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      entry.target.classList.toggle('is-inview',entry.isIntersecting);
      entry.target.querySelectorAll('.kinetic-art').forEach(el=>el.classList.toggle('is-playing',entry.isIntersecting));
    });
  },{threshold:.08,rootMargin:'60px 0px'});
  document.querySelectorAll('[data-editorial-reveal]').forEach(el=>revealObserver.observe(el));
  const gallery=document.querySelector('[data-project-gallery]');
  document.querySelectorAll('[data-gallery-layout]').forEach(button=>button.addEventListener('click',()=>{
    if(gallery.dataset.layout===button.dataset.galleryLayout)return;
    const cards=Array.from(gallery.querySelectorAll('.project-card'));
    const before=cards.map(card=>card.getBoundingClientRect());
    cards.forEach(card=>card.getAnimations().forEach(animation=>animation.cancel()));
    gallery.dataset.layout=button.dataset.galleryLayout;
    document.querySelectorAll('[data-gallery-layout]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    const after=cards.map(card=>card.getBoundingClientRect());
    if(!reduced)cards.forEach((card,index)=>{
      const a=before[index],b=after[index];
      card.animate([
        {transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scale(${a.width/b.width},${a.height/b.height})`,transformOrigin:'0 0'},
        {transform:'none',transformOrigin:'0 0'}
      ],{duration:600,easing:'cubic-bezier(.22,1,.36,1)'});
    });
    // Layout is a deliberate visitor choice; recalculate after the transition.
    window.setTimeout(()=>window.ScrollTrigger?.refresh(),650);
  }));
  document.querySelectorAll('.art-tile').forEach(tile=>{
    let rect=null,raf=0,nx=0,ny=0;
    tile.addEventListener('pointerenter',()=>{rect=tile.getBoundingClientRect();});
    tile.addEventListener('pointermove',event=>{
      if(reduced||event.pointerType==='touch'||!rect)return;
      nx=(event.clientX-rect.left)/rect.width-.5;ny=(event.clientY-rect.top)/rect.height-.5;
      if(!raf)raf=requestAnimationFrame(()=>{raf=0;tile.style.setProperty('--art-x',`${nx*10}px`);tile.style.setProperty('--art-y',`${ny*10}px`);});
    },{passive:true});
    tile.addEventListener('pointerleave',()=>{rect=null;cancelAnimationFrame(raf);raf=0;tile.style.setProperty('--art-x','0px');tile.style.setProperty('--art-y','0px');});
  });
  window.addEventListener('cosgral:cube-intro-done',()=>document.body.classList.add('editorial-ready'));
  window.addEventListener('cosgral:langchange',()=>window.ScrollTrigger?.refresh());
  window.setTimeout(()=>document.body.classList.add('editorial-ready'),1800);
})();
