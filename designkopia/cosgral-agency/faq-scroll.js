/** COSGRAL FAQ. Native sticky scroll; all answers remain in the source fallback. */
const section = document.querySelector('[data-faq-scroll]');
if (section) initFAQ(section);

function initFAQ(section) {
  const stage = section.querySelector('.faq-scroll__stage');
  const fallback = section.querySelector('.faq-scroll__fallback');
  const items = [...fallback.querySelectorAll('.faq-item')];
  const lines = [...stage.querySelectorAll('[data-faq-line]')];
  const question = stage.querySelector('[data-faq-question]');
  const cube = stage.querySelector('[data-faq-cube]');
  const answer = stage.querySelector('[data-faq-answer]');
  const answerCopy = stage.querySelector('[data-faq-answer-copy]');
  const hint = stage.querySelector('[data-faq-hint]');
  const instruction = stage.querySelector('[data-faq-instruction]');
  const answerKicker = stage.querySelector('[data-faq-answer-kicker]');
  const buttons = [...stage.querySelectorAll('[data-faq-select]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = (a,b,n) => { const t=clamp((n-a)/(b-a)); return t*t*(3-2*t); };
  let active = -1, opened = false, reduced = preference.matches || document.documentElement.classList.contains('reduce-motion');
  let progress = 0, frame = 0, top = 0, span = 1, visible = false;
  let pose = {progress:0,opened:false,x:0,y:0}, model = null, loading = false;
  let lastVisual = '';
  const localized = () => document.documentElement.lang === 'en';
  const translate = (pl,en) => localized() ? en : pl;
  function textParts(text) {
    // Preserve the full translated question; balance it over two display lines.
    const words=text.trim().split(/\s+/);let best=1,cost=Infinity;
    for(let i=1;i<words.length;i++) {
      const a=words.slice(0,i).join(' '),b=words.slice(i).join(' ');
      const score=Math.abs(a.length-b.length);
      if(score<cost){cost=score;best=i;}
    }
    return [words.slice(0,best).join(' '),words.slice(best).join(' ')];
  }
  function fitType() {
    lines.forEach(line=>{
      line.style.fontSize='';
      const size=parseFloat(getComputedStyle(line).fontSize);
      if(line.offsetWidth>stage.clientWidth*.94)line.style.fontSize=(size*stage.clientWidth*.94/line.offsetWidth)+'px';
    });
  }
  function closeAnswer() {
    if(answer.contains(document.activeElement))cube.focus({preventScroll:true});
    opened=false;pose.opened=false;answer.hidden=true;
    section.classList.remove('is-answer-open');cube.setAttribute('aria-expanded','false');
    updateLabels();model?.wake();
  }
  function updateLabels() {
    const q=items[Math.max(0,active)].querySelector('[data-i18n^="faq.q"]').textContent.trim();
    cube.setAttribute('aria-label',translate(opened?'Ukryj odpowiedź: ':'Pokaż odpowiedź: ',opened?'Hide answer: ':'Show answer: ')+q);
    hint.textContent=translate('Kliknij sześcian, aby poznać odpowiedź','Click the cube to reveal the answer');
    instruction.textContent=translate('Przewiń, aby zmienić pytanie','Scroll to the next question');
    answerKicker.textContent=translate('Odpowiedź','Answer')+' / '+String(active+1).padStart(2,'0');
    answer.setAttribute('aria-label',translate('Odpowiedź','Answer'));
    stage.querySelector('.faq-scroll__navigation').setAttribute('aria-label',translate('Wybierz pytanie','Choose a question'));
    buttons.forEach((button,i)=>button.setAttribute('aria-label',translate('Pytanie ','Question ')+(i+1)));
  }
  function select(index) {
    index=Math.max(0,Math.min(items.length-1,index));
    if(index===active)return;
    closeAnswer();active=index;
    const text=items[index].querySelector('[data-i18n^="faq.q"]').textContent.trim();
    const parts=textParts(text);
    lines.forEach((line,i)=>line.textContent=parts[i]);
    question.setAttribute('aria-label',text);
    answerCopy.textContent=items[index].querySelector('[data-i18n^="faq.a"]').textContent.trim();
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(index===i)));
    updateLabels();fitType();lastVisual='';
  }
  function draw() {
    frame=0;
    if(!reduced) {
      progress=clamp((scrollY-top)/span);
      select(Math.min(items.length-1,Math.floor(progress*items.length)));
    }
    const local=Math.min(.99999,progress*items.length-active);
    const enter=active===0?1:smooth(0,.20,local);
    const leave=active===items.length-1?0:smooth(.78,1,local);
    const visibility=reduced?1:enter*(1-leave);
    const displacement=reduced?0:(1-enter)*55-leave*55;
    const key=[displacement.toFixed(2),visibility.toFixed(3),opened].join('/');
    if(key!==lastVisual) {
      lastVisual=key;
      lines.forEach((line,i)=>{
        line.style.transform=`translate3d(${displacement*(i?-1:1)}vw,0,0) rotateY(${displacement*(i?-1:1)*.18}deg)`;
        line.style.opacity=String(visibility*(opened ? .13 : 1));
      });
    }
    const unavailable=!reduced&&visibility<.85;
    cube.disabled=unavailable;
    hint.style.opacity=opened||unavailable?'0':'1';
    stage.style.setProperty('--faq-progress',String(reduced?(active+1)/items.length:Math.max(.025,progress)));
    pose.progress=progress;model?.wake();
  }
  function requestDraw() {if(!frame)frame=requestAnimationFrame(draw);}
  function measure() {
    top=section.getBoundingClientRect().top+scrollY;
    span=Math.max(1,section.offsetHeight-stage.offsetHeight);fitType();requestDraw();
  }
  function jump(index) {
    index=Math.max(0,Math.min(items.length-1,index));
    if(reduced){select(index);progress=(index+.35)/items.length;requestDraw();return;}
    const target=top+span*((index+.35)/items.length);
    const lenis=window.cosgralSmoothScroll?.lenis;
    if(lenis)lenis.scrollTo(target,{duration:.85});else scrollTo({top:target,behavior:'smooth'});
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>jump(i)));
  cube.addEventListener('click',()=>{
    if(opened)closeAnswer();else {
      opened=true;pose.opened=true;answer.hidden=false;
      section.classList.add('is-answer-open');cube.setAttribute('aria-expanded','true');
      updateLabels();
      if(!reduced)answer.animate([{opacity:0,transform:'translate(-50%,14px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
    }
    requestDraw();
  });
  stage.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&opened){closeAnswer();requestDraw();}
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();jump(active+(event.key==='ArrowRight'?1:-1));
    }
  });
  if(matchMedia('(hover:hover) and (pointer:fine)').matches) {
    cube.addEventListener('pointermove',event=>{
      const r=cube.getBoundingClientRect();pose.x=(event.clientX-r.left)/r.width-.5;pose.y=(event.clientY-r.top)/r.height-.5;model?.wake();
    },{passive:true});
    cube.addEventListener('pointerleave',()=>{pose.x=pose.y=0;model?.wake();});
  }
  async function loadModel() {
    if(loading||model)return;loading=true;
    try {
      const {createFAQCube}=await import('./faq-scroll-cube.js?v=20261022faq1');
      model=await createFAQCube(cube,pose,()=>reduced);
      model.setVisible(visible&&!document.hidden);
    } catch(error) {console.warn('COSGRAL FAQ: using the cube poster',error);}
  }
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible){loadModel();requestDraw();}
    model?.setVisible(visible&&!document.hidden);
  },{rootMargin:'250px 0px'});
  section.classList.add('is-enhanced');section.classList.toggle('is-reduced',reduced);
  fallback.setAttribute('aria-hidden','true');fallback.inert=true;
  stage.hidden=false;select(0);measure();observer.observe(stage);
  addEventListener('scroll',()=>{if(visible)requestDraw();},{passive:true});
  addEventListener('resize',measure,{passive:true});
  document.fonts?.ready.then(measure);
  const resizeObserver=new ResizeObserver(measure);resizeObserver.observe(stage);
  window.ScrollTrigger?.addEventListener('refresh',measure);
  addEventListener('cosgral:langchange',()=>{active=-1;select(reduced?buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true'):Math.min(items.length-1,Math.floor(progress*items.length)));measure();});
  preference.addEventListener('change',event=>{
    reduced=event.matches;section.classList.toggle('is-reduced',reduced);measure();model?.wake();
    window.cosgralSmoothScroll?.lenis?.resize();window.ScrollTrigger?.refresh();
  });
  document.addEventListener('visibilitychange',()=>model?.setVisible(visible&&!document.hidden));
  addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();resizeObserver.disconnect();model?.dispose();}else model?.setVisible(false);});
  addEventListener('pageshow',()=>{measure();model?.setVisible(visible&&!document.hidden);});
  window.cosgralSmoothScroll?.lenis?.resize();window.ScrollTrigger?.refresh();
}
