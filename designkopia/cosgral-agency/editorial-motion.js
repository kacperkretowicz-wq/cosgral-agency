import { createHorizon, sampleHorizonProgress } from './editorial-horizon.js?v=20261019editorial16';

/* Native flow, a thermal horizon, and artwork entrances that follow the scroll. */
const root=document.documentElement, preference=matchMedia('(prefers-reduced-motion: reduce)');
let force=new URLSearchParams(location.search).has('forceMotion');
try{force||=localStorage.getItem('cosgral-force-motion')==='1';}catch(_){}
const reduced=root.classList.contains('reduce-motion')||(preference.matches&&!force);
const gsap=window.gsap, ScrollTrigger=window.ScrollTrigger;
const gallery=document.querySelector('[data-project-gallery]');
const clamp=v=>Math.max(0,Math.min(1,v));
// Fit once per layout change; scrolling only moves the already sized words.
const runway=document.querySelector('.editorial-runway'),runwayWord=runway?.querySelector('.runway-word');
function fitRunway(){
  if(!runwayWord)return;
  const style=getComputedStyle(runway),size=parseFloat(getComputedStyle(runwayWord).fontSize);
  const room=runway.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const measured=runwayWord.getBoundingClientRect().width;
  if(measured>0)runwayWord.style.fontSize=`${(size*room/measured).toFixed(3)}px`;
}
if(runway){new ResizeObserver(fitRunway).observe(runway);document.fonts?.ready.then(fitRunway);fitRunway();}
await window.cosgralSmoothScroll?.ready;
const lenis=window.cosgralSmoothScroll?.lenis;
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  if(link.hasAttribute('data-nav-services-toggle')||link.hasAttribute('data-nav-close'))return;
  const target=document.getElementById(link.hash.slice(1));if(!target)return;
  event.preventDefault();
  if(lenis)lenis.scrollTo(target,{offset:-94,duration:reduced?0:1});
  else target.scrollIntoView({behavior:reduced?'instant':'smooth'});
}));
if(!reduced&&gsap&&ScrollTrigger)root.classList.add('editorial-motion');
let animated=root.classList.contains('editorial-motion');
const horizons=[],animations=[],pointerStops=[];
let refreshTimer,layoutRevision=0,galleryAnimating=false;
function refresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!galleryAnimating)ScrollTrigger?.refresh();},120);}
window.addEventListener('cosgral:horizon-layout',refresh);

document.querySelectorAll('[data-tone-wipe]').forEach(section=>{
  const horizon=createHorizon(section,!animated);horizons.push(horizon);
  if(!animated||section.classList.contains('is-static'))return;
  const state={progress:0};
  const first=!section.classList.contains('tone-wipe--dark');
  animations.push(gsap.to(state,{progress:1,ease:'none',onUpdate:()=>horizon.update(first?sampleHorizonProgress(state.progress):state.progress),
    scrollTrigger:{trigger:section,start:'top top',end:'bottom bottom',scrub:first ? .65 : .5,invalidateOnRefresh:true}}));
});
if(ScrollTrigger){
  ScrollTrigger.create({id:'shatter-beat',start:()=>innerHeight*.18,end:()=>innerHeight*1.32});
  ScrollTrigger.create({trigger:'[data-tone-wipe]',start:'bottom bottom',end:'max',
    onToggle:self=>root.classList.toggle('is-ambient-covered',self.isActive)});
  ScrollTrigger.create({trigger:'#uslugi',start:'top 90%',end:'max',
    onToggle:self=>root.classList.toggle('is-gyro-outside-hero',self.isActive)});
}
// Entrances scrub in both directions, without restarting a timed fade on every scroll.
if(animated){
  document.querySelectorAll('[data-editorial-reveal]').forEach(element=>{
    const isTile=element.matches('.art-tile');
    function entranceLine(base){
      const columns=isTile?getComputedStyle(element.parentElement).gridTemplateColumns.split(' ').length:1;
      const index=isTile?[...element.parentElement.children].indexOf(element):0;
      return `top ${base-(index%columns)*4}%`;
    }
    animations.push(gsap.fromTo(element,{opacity:0,y:element.matches('.art-tile,.project-card')?54:30},
      {opacity:1,y:0,ease:'none',scrollTrigger:{trigger:element,start:()=>entranceLine(96),end:()=>entranceLine(72),scrub:.18,invalidateOnRefresh:true}}));
  });
  document.querySelectorAll('.project-card__art').forEach(art=>{
    const media=art.querySelector('video,.foil-ribbon,.orbit-art');if(!media)return;
    animations.push(gsap.fromTo(media,{y:-12},{y:12,ease:'none',
      scrollTrigger:{trigger:art,start:'top bottom',end:'bottom top',scrub:.2}}));
  });
}
const playing=new Set();
function syncArtwork(){playing.forEach(el=>el.querySelectorAll('.kinetic-art').forEach(art=>art.classList.toggle('is-playing',animated&&!document.hidden)));}
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    entry.target.classList.toggle('is-inview',entry.isIntersecting);
    if(entry.isIntersecting)playing.add(entry.target);else{
      playing.delete(entry.target);entry.target.querySelectorAll('.kinetic-art').forEach(el=>el.classList.remove('is-playing'));
    }
  });syncArtwork();
},{threshold:.08});
document.querySelectorAll('[data-editorial-reveal]').forEach(el=>observer.observe(el));
document.addEventListener('visibilitychange',syncArtwork);

document.querySelectorAll('[data-gallery-layout]').forEach(button=>button.addEventListener('click',()=>{
  if(!gallery||gallery.dataset.layout===button.dataset.galleryLayout)return;
  const cards=[...gallery.querySelectorAll('.project-card')];
  // Cancel the previous FLIP before measuring another layout choice.
  cards.forEach(card=>card.getAnimations().forEach(animation=>animation.cancel()));
  const before=cards.map(card=>card.getBoundingClientRect());
  gallery.dataset.layout=button.dataset.galleryLayout;
  document.querySelectorAll('[data-gallery-layout]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
  const after=cards.map(card=>card.getBoundingClientRect());
  const revision=++layoutRevision;
  galleryAnimating=animated;
  const movements=animated?cards.map((card,i)=>{
    const a=before[i],b=after[i];
    return card.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scale(${a.width/b.width},${a.height/b.height})`,transformOrigin:'0 0'},
      {transform:'none',transformOrigin:'0 0'}],{duration:640,easing:'cubic-bezier(.22,1,.36,1)'});
  }):[];
  // A refresh during FLIP would capture its temporary scale as the card's real transform.
  Promise.allSettled(movements.map(animation=>animation.finished)).then(()=>{
    if(revision!==layoutRevision)return;
    galleryAnimating=false;ScrollTrigger?.refresh();
  });
}));
window.addEventListener('resize',()=>gallery?.querySelectorAll('.project-card').forEach(card=>card.getAnimations().forEach(animation=>animation.cancel())));
if(animated&&matchMedia('(hover: hover) and (pointer: fine)').matches){
  document.querySelectorAll('.art-tile').forEach(tile=>{
    let raf=0,last=0,x=0,y=0,tx=0,ty=0;
    function frame(now){
      const dt=last?Math.min(now-last,48):16;last=now;
      const blend=1-Math.exp(-dt/95);x+=(tx-x)*blend;y+=(ty-y)*blend;
      tile.style.setProperty('--art-x',`${x.toFixed(3)}px`);tile.style.setProperty('--art-y',`${y.toFixed(3)}px`);
      if(Math.abs(tx-x)+Math.abs(ty-y)>.02)raf=requestAnimationFrame(frame);else{raf=0;last=0;}
    }
    function start(){if(!raf)raf=requestAnimationFrame(frame);}
    tile.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch')return;
      const rect=tile.getBoundingClientRect();
      tx=(clamp((event.clientX-rect.left)/rect.width)-.5)*16;ty=(clamp((event.clientY-rect.top)/rect.height)-.5)*12;start();
    },{passive:true});
    tile.addEventListener('pointerleave',()=>{tx=ty=0;start();});
    pointerStops.push(()=>{cancelAnimationFrame(raf);raf=0;tile.style.setProperty('--art-x','0px');tile.style.setProperty('--art-y','0px');});
  });
}
// Navigation changes tone when the moving boundary passes the fixed controls.
const lightStart=document.querySelector('[data-tone-wipe]'),lightEnd=document.querySelector('.tone-wipe--dark');
let lightGeometry=[],chatLine=0,lastNavLight=null,lastChatLight=null;
function measureLightNavigation(){
  const scroll=window.scrollY;
  lightGeometry=[lightStart,lightEnd].map(el=>{
    const rect=el.getBoundingClientRect();
    return {top:rect.top+scroll,bottom:rect.bottom+scroll,height:el.querySelector('.tone-wipe__sticky').offsetHeight};
  });
  const chat=document.querySelector('.cg-chat-label');
  chatLine=chat?chat.getBoundingClientRect().top:innerHeight-45;
  lightNavigation();
}
function lightNavigation(){
  if(lightGeometry.length!==2)return;
  const scroll=lenis?.scroll??window.scrollY;
  function lightAt(x,y){
    const docY=scroll+y;
    for(let i=0;i<2;i++){
      const rect=lightGeometry[i];
      if(rect.top<=docY&&rect.bottom>docY){
        const stickyTop=Math.max(rect.top-scroll,Math.min(0,rect.bottom-scroll-rect.height));
        return horizons[i].isLightAt(x,(y-stickyTop)/rect.height);
      }
    }
    return lightGeometry[0].bottom<=docY&&lightGeometry[1].top>docY;
  }
  const navLight=lightAt(.06,48),chatLight=lightAt(.5,chatLine);
  if(navLight!==lastNavLight){lastNavLight=navLight;document.body.classList.toggle('has-light-section',navLight);}
  if(chatLight!==lastChatLight){lastChatLight=chatLight;root.classList.toggle('has-light-chat',chatLight);}
}
if(ScrollTrigger){
  ScrollTrigger.create({start:0,end:'max',onUpdate:lightNavigation,onRefresh:measureLightNavigation});
  if(animated)gsap.ticker.add(lightNavigation);
  measureLightNavigation();
}
window.addEventListener('resize',measureLightNavigation,{passive:true});
window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  requestAnimationFrame(()=>{lenis?.resize();ScrollTrigger?.refresh();measureLightNavigation();});
});
const faqObserver=new ResizeObserver(refresh);
document.querySelectorAll('.faq-item__a').forEach(el=>faqObserver.observe(el));
window.addEventListener('cosgral:cube-intro-done',()=>document.body.classList.add('editorial-ready'));
window.addEventListener('cosgral:langchange',event=>{if(event.detail?.layoutChanged!==false)refresh();});
setTimeout(()=>document.body.classList.add('editorial-ready'),1800);
ScrollTrigger?.refresh();
preference.addEventListener('change',event=>{
  if(!event.matches||force)return;
  animated=false;root.classList.remove('editorial-motion');
  gsap?.ticker.remove(lightNavigation);
  animations.forEach(animation=>{animation.scrollTrigger?.kill();animation.kill();});
  pointerStops.forEach(stop=>stop());syncArtwork();
  document.querySelectorAll('[data-editorial-reveal]').forEach(el=>{el.style.opacity='1';el.style.transform='none';});
  horizons.forEach(horizon=>horizon.destroy());refresh();
});
