/** One continuous flight from work into a hold-to-open, scroll-led FAQ scene. */
const section=document.querySelector('[data-faq-scroll]');
if(section) initFAQ(section);
function initFAQ(section){
  const stage=section.querySelector('.faq-scroll__stage'),fallback=section.querySelector('.faq-scroll__fallback');
  const items=[...fallback.querySelectorAll('.faq-item')],lines=[...stage.querySelectorAll('[data-faq-line]')];
  const question=stage.querySelector('[data-faq-question]'),cube=stage.querySelector('[data-faq-cube]');
  const answer=stage.querySelector('[data-faq-answer]'),copy=stage.querySelector('[data-faq-answer-copy]');
  const hint=stage.querySelector('[data-faq-hint]'),instruction=stage.querySelector('[data-faq-instruction]');
  const kicker=stage.querySelector('[data-faq-answer-kicker]'),buttons=[...stage.querySelectorAll('[data-faq-select]')];
  const work=document.getElementById('realizacje'),preference=matchMedia('(prefers-reduced-motion:reduce)');
  const portal=document.createElement('div');portal.className='faq-glass-portal';portal.setAttribute('aria-hidden','true');
  const poster=cube.querySelector('img'),canvas=cube.querySelector('canvas');portal.append(poster,canvas);document.body.append(portal);
  const holdUI=document.createElement('span');holdUI.className='faq-hold-ui';holdUI.setAttribute('aria-hidden','true');
  holdUI.innerHTML='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/><circle class="faq-hold-ui__fill" cx="50" cy="50" r="47"/></svg><span data-hold-label></span>';
  portal.append(holdUI);
  const intro=document.createElement('div');intro.className='faq-scroll__intro';intro.setAttribute('aria-hidden','true');intro.textContent='ZAPYTAJ.';stage.prepend(intro);
  const clamp=v=>Math.max(0,Math.min(1,v)),ease=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
  let active=-1,opened=false,unlocked=false,holding=false,hold=0,reveal=0,unlockAt=0,suppressClickUntil=0;
  let reduced=preference.matches||document.documentElement.classList.contains('reduce-motion');
  let top=0,span=1,start=0,end=1,bottom=0,raf=0,last=0,progress=0,target=0,near=false,model=null,loading=false;
  let origin=.12,visualIndex=-1,holdGesture=false;
  const pose={flight:0,progress:0,reveal:0,charge:0,x:0,y:0,opened:false};
  const english=()=>document.documentElement.lang==='en',t=(pl,en)=>english()?en:pl;
  function labels(){
    const q=items[Math.max(active,0)].querySelector('[data-i18n^="faq.q"]').textContent.trim();
    cube.setAttribute('aria-label',!unlocked?t('Przytrzymaj, aby odkryć pytania','Press and hold to explore the questions'):t(opened?'Ukryj odpowiedź: ':'Pokaż odpowiedź: ',opened?'Hide answer: ':'Show answer: ')+q);
    hint.textContent=unlocked?t('Kliknij sześcian, aby poznać odpowiedź','Click the cube to reveal the answer'):t('Kliknij i przytrzymaj sześcian','Click and hold the cube');
    instruction.textContent=unlocked?t('Przewiń, aby zmienić pytanie','Scroll to the next question'):t('Przytrzymaj, aby wejść do środka','Hold to step inside');
    holdUI.querySelector('[data-hold-label]').textContent=t('PRZYTRZYMAJ','HOLD');intro.textContent=t('ZAPYTAJ.','ASK US.');
    kicker.textContent=t('Odpowiedź','Answer')+' / '+String(active+1).padStart(2,'0');
    answer.setAttribute('aria-label',t('Odpowiedź','Answer'));
    section.setAttribute('aria-label',t('Najczęstsze pytania','Frequently asked questions'));
    buttons.forEach((b,i)=>{b.setAttribute('aria-label',t('Pytanie ','Question ')+(i+1));b.disabled=!unlocked;});
  }
  function fit(){
    lines.forEach(line=>{line.style.fontSize='';const fs=parseFloat(getComputedStyle(line).fontSize);if(line.offsetWidth>stage.clientWidth*.94)line.style.fontSize=fs*stage.clientWidth*.94/line.offsetWidth+'px';});
  }
  function close(){opened=false;pose.opened=false;answer.hidden=true;cube.setAttribute('aria-expanded','false');section.classList.remove('is-answer-open');labels();}
  function select(i,force=false){
    i=Math.max(0,Math.min(items.length-1,i));if(i===active&&!force)return;close();active=i;
    const text=items[i].querySelector('[data-i18n^="faq.q"]').textContent.trim(),words=text.split(/\s+/);
    let split=1,best=Infinity;
    for(let j=1;j<words.length;j++){const score=Math.abs(words.slice(0,j).join(' ').length-words.slice(j).join(' ').length);if(score<best){best=score;split=j;}}
    lines[0].textContent=words.slice(0,split).join(' ');lines[1].textContent=words.slice(split).join(' ');
    question.setAttribute('aria-label',text);copy.textContent=items[i].querySelector('[data-i18n^="faq.a"]').textContent.trim();
    buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));labels();fit();
  }
  function measure(){
    const y=scrollY;top=section.getBoundingClientRect().top+y;bottom=top+section.offsetHeight;span=Math.max(1,section.offsetHeight-stage.offsetHeight);
    const wr=work?.getBoundingClientRect();start=wr?wr.top+y+wr.height*.42-innerHeight*.45:top-innerHeight*1.6;end=top;
    fit();wake();
  }
  function unlock(){
    if(unlocked)return;unlocked=true;holding=false;hold=1;unlockAt=performance.now();origin=clamp((scrollY-top)/span);
    suppressClickUntil=unlockAt+450;section.classList.add('is-unlocked');select(0,true);labels();wake();
  }
  function begin(){if(unlocked||holding)return;holdGesture=true;holding=true;last=0;cube.classList.add('is-holding');wake();}
  function cancel(){holding=false;cube.classList.remove('is-holding');wake();}
  cube.addEventListener('pointerdown',event=>{
    if(event.button!==0||unlocked)return;event.preventDefault();cube.setPointerCapture(event.pointerId);begin();
  });
  cube.addEventListener('pointerup',()=>{if(holdGesture)suppressClickUntil=performance.now()+450;holdGesture=false;cancel();});cube.addEventListener('pointercancel',cancel);cube.addEventListener('lostpointercapture',cancel);
  cube.addEventListener('contextmenu',event=>event.preventDefault());
  cube.addEventListener('keydown',event=>{if(!unlocked&&(event.code==='Space'||event.code==='Enter')){event.preventDefault();if(reduced)unlock();else begin();}});
  cube.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();cancel();}});
  cube.addEventListener('blur',cancel);
  cube.addEventListener('click',()=>{
    if(!unlocked){if(reduced)unlock();return;}
    if(performance.now()<suppressClickUntil||reveal<.85)return;
    if(opened)close();else{
      opened=true;pose.opened=true;answer.hidden=false;section.classList.add('is-answer-open');cube.setAttribute('aria-expanded','true');labels();
      if(!reduced)answer.animate([{opacity:0,transform:'translate(-50%,20px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:750,easing:'cubic-bezier(.16,1,.3,1)'});
    }wake();
  });
  function jump(i){
    i=Math.max(0,Math.min(items.length-1,i));if(!unlocked)return;
    if(reduced){select(i);progress=target=origin+(1-origin)*(i+.35)/items.length;wake();return;}
    const y=top+span*(origin+(1-origin)*(i+.35)/items.length),lenis=window.cosgralSmoothScroll?.lenis;
    if(lenis)lenis.scrollTo(y,{duration:1.4});else scrollTo({top:y,behavior:'smooth'});
  }
  buttons.forEach((b,i)=>b.addEventListener('click',()=>jump(i)));
  stage.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();wake();}
    if(unlocked&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();jump(active+(event.key==='ArrowRight'?1:-1));}
  });
  addEventListener('pointermove',event=>{if(!near||event.pointerType==='touch')return;pose.x=event.clientX/innerWidth*2-1;pose.y=event.clientY/innerHeight*2-1;wake();},{passive:true});
  function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(draw);}
  async function load(){
    if(loading||model)return;loading=true;
    try{const {createFAQCube}=await import('./faq-scroll-cube.js?v=20261022noomo2');model=await createFAQCube(portal,pose,()=>reduced);model.setVisible(near&&!document.hidden);}
    catch(error){portal.classList.add('is-fallback');console.warn('COSGRAL FAQ: poster fallback',error);}
  }
  function draw(now){
    raf=0;const dt=Math.min(.05,last?(now-last)/1000:.016);last=now;
    target=clamp((scrollY-top)/span);if(!reduced)progress+=(target-progress)*(1-Math.exp(-dt*7));
    const flight=reduced?1:ease(0,1,(scrollY-start)/Math.max(1,end-start));pose.flight=flight;
    near=scrollY>start-innerHeight*.3&&scrollY<bottom-innerHeight*.15;
    portal.classList.toggle('is-visible',near);portal.style.setProperty('--flight',String(flight));
    portal.style.setProperty('--fallback-x',((-.3+.8*flight)*100)+'vw');
    model?.setVisible(near&&!document.hidden);if(near)load();
    if(holding&&!unlocked){hold=clamp(hold+dt/1.25);if(hold>=1)unlock();}
    else if(!unlocked)hold=Math.max(0,hold-dt*1.8);
    if(unlocked)reveal=reduced?1:ease(.12,1.8,(now-unlockAt)/1000);
    pose.reveal=reveal;pose.charge=hold;
    let qp=clamp((progress-origin)/Math.max(.08,1-origin));
    if(!unlocked||reveal<.9)qp=0;
    if(unlocked&&!reduced)select(Math.min(items.length-1,Math.floor(qp*items.length)));
    const phase=Math.min(.999,qp*items.length-active);
    const enter=active===0?1:ease(0,.22,phase),leave=active===items.length-1?0:ease(.77,1,phase);
    const alpha=unlocked?ease(.38,.94,reveal)*enter*(1-leave):0;
    const displacement=reduced?0:(1-enter)*60-leave*65;
    lines.forEach((line,i)=>{
      line.style.transform=`translate3d(${displacement*(i?-1:1)}vw,${(1-enter)*38}px,0) rotateY(${displacement*(i?-1:1)*.18}deg)`;
      line.style.opacity=String(alpha*(opened ? .1 : 1));
    });
    question.setAttribute('aria-hidden',String(!unlocked));
    intro.style.opacity=String((1-ease(.04,.58,reveal))*.9);
    intro.style.transform=`translate3d(${pose.x*-14}px,${pose.y*-9}px,0) scale(${1+hold*.035})`;
    holdUI.style.visibility=scrollY>=top-40?'visible':'hidden';holdUI.style.opacity=String(1-ease(0,.45,reveal));holdUI.style.setProperty('--hold',String(hold));
    cube.classList.toggle('is-holding',holding);cube.classList.toggle('is-unlocked',unlocked);
    cube.disabled=unlocked&&(reveal<.85||alpha<.8)&&!opened;
    hint.style.opacity=opened?'0':String(unlocked?alpha:1);
    stage.style.setProperty('--faq-progress',String(unlocked?Math.max(.02,qp):hold));
    section.classList.toggle('is-available',unlocked&&reveal>.85);
    pose.progress=qp;model?.wake();
    if(near&&!reduced||holding||Math.abs(progress-target)>.0001)wake();else last=0;
  }
  section.classList.add('is-enhanced');section.classList.toggle('is-reduced',reduced);fallback.inert=true;fallback.setAttribute('aria-hidden','true');stage.hidden=false;
  select(0);measure();
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',measure,{passive:true});
  const resize=new ResizeObserver(measure);resize.observe(stage);if(work)resize.observe(work);
  document.fonts?.ready.then(measure);window.ScrollTrigger?.addEventListener('refresh',measure);
  addEventListener('cosgral:langchange',()=>{select(Math.max(0,active),true);measure();});
  preference.addEventListener('change',event=>{reduced=event.matches;section.classList.toggle('is-reduced',reduced);measure();window.cosgralSmoothScroll?.lenis?.resize();window.ScrollTrigger?.refresh();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;cancel();model?.setVisible(false);}else{last=0;wake();}});
  addEventListener('pagehide',event=>{model?.setVisible(false);if(!event.persisted){resize.disconnect();model?.dispose();cancelAnimationFrame(raf);portal.remove();}});
  addEventListener('pageshow',()=>{measure();wake();});
  window.cosgralSmoothScroll?.lenis?.resize();window.ScrollTrigger?.refresh();wake();
}
