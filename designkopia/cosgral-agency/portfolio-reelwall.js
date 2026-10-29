/* Montage: white title -> staged arrival -> a floating, interactive reel wall. */
(function () {
  'use strict';
  const chapter = document.getElementById('montaz');
  if (!chapter) return;
  const root = document.documentElement, body = document.body;
  const reduced = root.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (i,k) => { const x=Math.sin(i*12.9898+k*78.233)*43758.5453; return x-Math.floor(x); };
  const ease = x => 1-Math.pow(1-x,3);
  const label = () => root.lang === 'en' ? 'EDITS' : 'MONTAŻ';
  const wall = document.createElement('section');
  wall.className='pf-wall'; wall.hidden=true; wall.setAttribute('role','dialog'); wall.setAttribute('aria-modal','true'); wall.setAttribute('aria-label','Montaż');
  wall.innerHTML='<strong class="pf-wall__intro"></strong><div class="pf-wall__field" role="list"></div>';
  body.appendChild(wall);
  const field=wall.querySelector('.pf-wall__field'), intro=wall.querySelector('.pf-wall__intro');
  const closeBtn=document.createElement('button'); closeBtn.type='button'; closeBtn.className='pf-wall__close'; closeBtn.hidden=true; body.appendChild(closeBtn);
  const waveCanvas=document.createElement('canvas'); waveCanvas.className='pf-wall__wave'; waveCanvas.setAttribute('aria-hidden','true'); body.appendChild(waveCanvas);
  const wctx=waveCanvas.getContext('2d');
  let items=[],tiles=[],base=[],cur=[],flights=[],phase='closed',active=-1,hover=-1,anim=0,loop=0,lastT=0,entryStart=0,entryEnd=0;
  let px=0,py=0,sx=0,sy=0,returnFocus=null;
  const timers=[];
  const releases=new Map();
  function later(fn,ms) { timers.push(setTimeout(fn,ms)); }
  function clearTimers() { timers.splice(0).forEach(clearTimeout); }
  function setPhase(value) { phase=value; wall.dataset.phase=value; }
  function language() {
    intro.textContent=label(); wall.setAttribute('aria-label',root.lang==='en'?'Edits gallery':'Galeria montażu'); closeBtn.textContent=root.lang==='en'?'Back':'Wróć';
  }
  window.__pfWallFrame = function(W,H) { return {mobile:W<=900,top:100,bottom:40,side:24}; };
  window.__pfWallLayout = function(W,H,n) {
    const mobile=W<=900, cols=mobile?5:7, rows=Math.max(1,Math.ceil(n/cols));
    const aw=W*(mobile?2:1.8), ah=H*(mobile?1.8:1.7), cw=aw/cols,ch=ah/rows;
    return Array.from({length:n},(_,i)=>{
      const scale=.58+rnd(i,1)*.88;
      const h=Math.min(H*.37,Math.max(mobile?92:105,ch*.86*scale));
      const aspect=items[i]?.aspect||9/16,w=h*aspect;
      const x=(W-aw)/2+cw*(i%cols+.5)+(rnd(i,2)-.5)*cw*.54-w/2;
      const y=(H-ah)/2+ch*(Math.floor(i/cols)+.5)+(rnd(i,3)-.5)*ch*.42-h/2+30;
      return {x,y,w,h,depth:.25+rnd(i,4)*.75};
    });
  };
  function measure(snap) {
    base=window.__pfWallLayout(innerWidth,innerHeight,items.length);
    if(snap||cur.length!==base.length) cur=base.map(b=>({...b}));
    base.forEach((b,i)=>{tiles[i].style.width=b.w+'px';tiles[i].style.height=b.h+'px';});
  }
  function allowed() {return !document.hidden&&!root.classList.contains('is-nav-menu-open')&&(phase==='open'||phase==='entering');}
  function play(i) {
    const tile=tiles[i]; if(!tile)return;
    let video=tile.querySelector('video');
    const wanted=allowed()&&(i===active||i===hover);
    if(!wanted) {
      if(video) {
        video.pause();video.muted=true;
        if(!releases.has(i))releases.set(i,setTimeout(()=>{
          releases.delete(i);
          if(i!==active&&i!==hover&&video.isConnected){video.removeAttribute('src');video.load();video.remove();}
        },700));
      }
      tile.classList.remove('is-previewing');return;
    }
    if(releases.has(i)){clearTimeout(releases.get(i));releases.delete(i);}
    if(!video) {
      video=document.createElement('video'); video.loop=true;video.playsInline=true;video.muted=true;video.preload='metadata';video.poster=items[i].poster;video.setAttribute('playsinline','');
      video.src=items[i].src;tile.insertBefore(video,tile.querySelector('.pf-wall__cap'));
      video.addEventListener('playing',()=>{if(allowed()&&(i===active||i===hover))tile.classList.add('is-previewing');else video.pause();});
    }
    video.muted=i!==active;
    const promise=video.play();
    if(promise)promise.catch(()=>{if(allowed()&&(i===active||i===hover)){video.muted=true;video.play().catch(()=>{});}});
  }
  function syncVideos() {tiles.forEach((_,i)=>play(i));}
  function setHover(i) {
    if(phase!=='open')return;
    const old=hover;hover=i;
    if(old>=0&&old!==active)play(old);
    if(i>=0)play(i);wake();
  }
  function toggle(i) {
    if(phase!=='open')return;
    const old=active;active=active===i?-1:i;
    tiles.forEach((tile,k)=>{tile.classList.toggle('is-active',k===active);tile.setAttribute('aria-pressed',String(k===active));});
    if(old>=0)play(old);play(i);wall.dataset.selected=String(active);wake();
  }
  function build() {
    field.textContent='';
    tiles=items.map((item,i)=>{
      const tile=document.createElement('button');tile.type='button';tile.className='pf-wall__tile';tile.setAttribute('aria-label',item.client+' — '+item.n);tile.setAttribute('aria-pressed','false');tile.tabIndex=-1;
      const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.alt='';img.src=item.poster;tile.appendChild(img);
      const cap=document.createElement('span');cap.className='pf-wall__cap';const name=document.createElement('b');name.textContent=item.client;cap.append(name,document.createTextNode(' '+String(item.n).padStart(2,'0')));tile.appendChild(cap);
      tile.style.visibility='hidden';tile.addEventListener('click',e=>{if(touchMoved){e.preventDefault();touchMoved=false;return;}toggle(i);});
      tile.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')setHover(i);});
      tile.addEventListener('pointerleave',()=>{if(hover===i)setHover(-1);});
      tile.addEventListener('focus',()=>setHover(i));tile.addEventListener('blur',()=>{if(hover===i)setHover(-1);});
      field.appendChild(tile);return tile;
    });measure(true);
  }
  fetch('portfolio-media/reels/manifest.json?v=20261018self1').then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).then(m=>{
    (m.groups||[]).forEach(g=>(g.items||[]).forEach((item,k)=>items.push({client:g.name||g.id,n:k+1,poster:item.poster,src:item.full||item.src,aspect:Math.max(.5,Math.min(1.8,(item.w||720)/(item.h||1280)))})));
    build();
  }).catch(()=>{wall.dataset.loadError='true';});
  function targets() {
    const W=innerWidth,H=innerHeight,panX=-sx*W*.48,panY=-sy*H*.56;
    const out=base.map((b,i)=>{
      const factor=i===active?1.62:i===hover?1.2:1;
      return {cx:b.x+b.w/2+panX,cy:b.y+b.h/2+panY,w:b.w*factor,h:b.h*factor};
    });
    const focus=active>=0?active:hover;
    if(focus>=0){
      const a=out[focus];a.cx=Math.max(a.w/2+30,Math.min(W-a.w/2-30,a.cx));a.cy=Math.max(a.h/2+104,Math.min(H-a.h/2-35,a.cy));
      for(let pass=0;pass<3;pass++)out.forEach((t,i)=>{
        if(i===focus)return;
        const ox=(a.w+t.w)/2+18-Math.abs(t.cx-a.cx),oy=(a.h+t.h)/2+22-Math.abs(t.cy-a.cy);
        if(ox>0&&oy>0){if(ox<oy)t.cx+=(t.cx>=a.cx?1:-1)*ox;else t.cy+=(t.cy>=a.cy?1:-1)*oy;}
      });
    }return out;
  }
  function startFlight() {
    if(phase!=='title')return;
    setPhase('entering');entryStart=performance.now();
    const order=items.map((_,i)=>i).sort((a,b)=>rnd(a,18)-rnd(b,18));
    const ranks=new Map(order.map((i,k)=>[i,k]));
    flights=base.map((b,i)=>{
      const edge=Math.floor(rnd(i,12)*8),margin=Math.max(innerWidth,innerHeight)*(.22+rnd(i,13)*.35);
      const x=edge===0||edge===4||edge===7?-margin:edge===1||edge===5||edge===6?innerWidth+margin:rnd(i,14)*innerWidth;
      const y=edge===2||edge===4||edge===5?-margin:edge===3||edge===6||edge===7?innerHeight+margin:rnd(i,15)*innerHeight;
      return {x,y,z:rnd(i,16)>.55?380:-1400,scale:rnd(i,16)>.55?2.15:.25,rot:(rnd(i,17)-.5)*35,delay:reduced?0:ranks.get(i)*26,duration:reduced?1:1100+rnd(i,19)*650};
    });
    entryEnd=Math.max(0,...flights.map(f=>f.delay+f.duration));wake();
  }
  function step(now) {
    loop=0;
    if(!allowed()){lastT=0;return;}
    const dt=lastT?Math.min(.05,(now-lastT)/1000):.016;lastT=now;
    const k=reduced?1:1-Math.exp(-dt*9),pk=reduced?1:1-Math.exp(-dt*3.5);
    sx+=(px-sx)*pk;sy+=(py-sy)*pk;
    let moving=Math.abs(px-sx)+Math.abs(py-sy)>.0001;
    const tg=targets();
    tiles.forEach((tile,i)=>{
      const t=tg[i],c=cur[i],b=base[i];
      c.x+=(t.cx-t.w/2-c.x)*k;c.y+=(t.cy-t.h/2-c.y)*k;c.w+=(t.w-c.w)*k;c.h+=(t.h-c.h)*k;
      if(Math.abs(t.cx-t.w/2-c.x)+Math.abs(t.cy-t.h/2-c.y)+Math.abs(t.w-c.w)+Math.abs(t.h-c.h)>.05)moving=true;
      const f=flights[i];let p=phase==='entering'?Math.max(0,Math.min(1,(now-entryStart-f.delay)/f.duration)):1;
      if(p===0){tile.style.visibility='hidden';return;}
      const e=ease(p),x=f.x+(c.x-f.x)*e,y=f.y+(c.y-f.y)*e,z=f.z*(1-e),scale=f.scale+(1-f.scale)*e;
      const depth=(i===active||i===hover)?0:b.depth*20;
      tile.style.visibility='visible';tile.style.opacity=String(Math.min(1,p*4));
      tile.style.transform='translate3d('+(x-sx*depth).toFixed(2)+'px,'+(y-sy*depth).toFixed(2)+'px,'+z.toFixed(1)+'px) rotate('+(f.rot*(1-e)).toFixed(2)+'deg) scale('+(c.w/b.w*scale).toFixed(4)+')';
      tile.classList.toggle('is-hover',i===hover&&i!==active);
      tile.style.pointerEvents=p===1?'auto':'none';tile.tabIndex=p===1?0:-1;
    });
    if(phase==='entering'){
      moving=true;
      if(now-entryStart>=entryEnd){setPhase('open');intro.hidden=true;moving=false;}
    }
    wall.dataset.pan=sx.toFixed(3)+','+sy.toFixed(3);
    if(moving)wake();else lastT=0;
  }
  function wake(){if(!loop&&allowed())loop=requestAnimationFrame(step);}
  window.addEventListener('pointermove',e=>{
    if(phase!=='open')return;
    px=Math.max(-.5,Math.min(.5,e.clientX/innerWidth-.5));py=Math.max(-.5,Math.min(.5,e.clientY/innerHeight-.5));wake();
  },{passive:true});
  let touch=null,touchMoved=false;
  wall.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touchMoved=false;touch={x:e.clientX,y:e.clientY,px,py};}});
  wall.addEventListener('pointermove',e=>{if(touch&&phase==='open'){if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touchMoved=true;px=Math.max(-.5,Math.min(.5,touch.px-(e.clientX-touch.x)/innerWidth));py=Math.max(-.5,Math.min(.5,touch.py-(e.clientY-touch.y)/innerHeight));wake();}});
  window.addEventListener('pointerup',()=>{touch=null;});
  function centre() {
    var attr = window.innerWidth <= 900 ? "data-cube-at-m" : "data-cube-at";
    var v = (chapter.getAttribute(attr) || "0.5 0.5").split(" ").map(Number);
    return [v[0] * window.innerWidth, v[1] * window.innerHeight];
  }
  function noise(a, t) {
    return 0.55 * Math.sin(3 * a + t * 1.3) + 0.35 * Math.sin(5 * a - t * 1.9) + 0.22 * Math.sin(9 * a + t * 2.6) + 0.12 * Math.sin(15 * a - t * 3.4);
  }
  function outline(cx, cy, r, t, scale) {
    var pts = [];
    for (var k = 0; k < 96; k++) {
      var a = k / 96 * Math.PI * 2;
      var rr = Math.max(0, r * scale * (1 + 0.12 * noise(a, t)));
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
  }
  function drawFront(pts, alpha, width) {
    wctx.beginPath();
    pts.forEach(function (p, k) { if (k) wctx.lineTo(p[0], p[1]); else wctx.moveTo(p[0], p[1]); });
    wctx.closePath();
    wctx.strokeStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
    wctx.lineWidth = width;
    wctx.stroke();
  }
  function run(opening, done) {
    cancelAnimationFrame(anim);
    var W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; waveCanvas.height = H;
    var c = centre();
    var far = Math.max(Math.hypot(c[0], c[1]), Math.hypot(W - c[0], c[1]), Math.hypot(c[0], H - c[1]), Math.hypot(W - c[0], H - c[1])) * 1.2;
    var start = performance.now(), delay = opening ? 260 : 0, dur = reduced ? 1 : opening ? 1500 : 1000;
    (function frame(now) {
      var p = Math.min(1, Math.max(0, (now - start - delay) / dur));
      var e = opening ? 1 - Math.pow(1 - p, 3) : 1 - p * p * (3 - 2 * p);
      var t = now / 1000;
      var r = e * far;
      var pts = outline(c[0], c[1], r, t, 1);
      wall.style.clipPath = "polygon(" + pts.map(function (q) { return q[0].toFixed(1) + "px " + q[1].toFixed(1) + "px"; }).join(",") + ")";
      wctx.clearRect(0, 0, W, H);
      var fade = opening ? 1 - p : p;
      if (r > 1) {
        wctx.shadowColor = "rgba(255,255,255,0.9)";
        wctx.shadowBlur = 22;
        drawFront(pts, 0.85 * Math.min(1, fade * 1.4 + 0.15), 2.4);
        wctx.shadowBlur = 0;
        drawFront(outline(c[0], c[1], r, t + 0.6, 0.74), 0.32 * fade, 1.4);
        drawFront(outline(c[0], c[1], r, t + 1.2, 0.5), 0.2 * fade, 1.2);
      }
      if (p < 1) anim = requestAnimationFrame(frame);
      else {
        wctx.clearRect(0, 0, W, H);
        if (done) done();
      }
    })(start);
  }

  function open() {
    if(phase!=='closed'||!items.length)return;
    clearTimers();returnFocus=document.activeElement;active=hover=-1;px=py=sx=sy=0;language();
    tiles.forEach(tile=>{tile.style.visibility='hidden';tile.style.opacity='0';tile.tabIndex=-1;tile.classList.remove('is-active','is-hover');tile.setAttribute('aria-pressed','false');});
    measure(true);intro.hidden=false;intro.classList.remove('is-fading');wall.hidden=false;wall.style.clipPath='polygon(0 0,0 0,0 0)';closeBtn.hidden=false;
    setPhase('opening');body.classList.add('pf-wall-open');window.dispatchEvent(new CustomEvent('pf-wall-open'));
    run(true,()=>{
      if(phase!=='opening')return;
      wall.style.clipPath='';setPhase('title');closeBtn.focus({preventScroll:true});
      later(()=>{if(phase!=='title')return;intro.classList.add('is-fading');later(startFlight,reduced?0:500);},reduced?100:400);
    });
  }
  function close() {
    if(phase==='closed'||phase==='closing')return;
    clearTimers();cancelAnimationFrame(loop);loop=0;lastT=0;active=hover=-1;setPhase('closing');syncVideos();
    closeBtn.hidden=true;window.dispatchEvent(new CustomEvent('pf-wall-close'));
    run(false,()=>{
      wall.hidden=true;wall.style.clipPath='';body.classList.remove('pf-wall-open');setPhase('closed');
      tiles.forEach(tile=>{tile.tabIndex=-1;const video=tile.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();video.remove();}tile.classList.remove('is-previewing','is-active');});
      if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    });
  }
  closeBtn.addEventListener('click',close);
  window.addEventListener('click',e=>{
    const target=e.target.closest?.('#montaz [data-tile-expand-hit],#montaz [data-tile-expand]');
    if(!target||e.defaultPrevented||window.__pfCubeDragged)return;
    e.preventDefault();e.stopImmediatePropagation();open();
  },true);
  window.addEventListener('wheel',e=>{if(phase!=='closed'){e.preventDefault();e.stopImmediatePropagation();if(phase==='open'){py=Math.max(-.5,Math.min(.5,py+e.deltaY/innerHeight*.3));px=Math.max(-.5,Math.min(.5,px+e.deltaX/innerWidth*.3));wake();}}},{capture:true,passive:false});
  window.addEventListener('keydown',e=>{
    if(phase==='closed'||root.classList.contains('is-nav-menu-open'))return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
    if(e.key==='Tab'){
      const buttons=[closeBtn,...tiles.filter(t=>t.tabIndex===0)],i=buttons.indexOf(document.activeElement),next=e.shiftKey?(i<=0?buttons.length-1:i-1):(i+1)%buttons.length;
      e.preventDefault();buttons[next].focus();return;
    }
    if(e.key.startsWith('Arrow')&&phase==='open'){e.preventDefault();if(e.key==='ArrowLeft')px=Math.max(-.5,px-.12);if(e.key==='ArrowRight')px=Math.min(.5,px+.12);if(e.key==='ArrowUp')py=Math.max(-.5,py-.12);if(e.key==='ArrowDown')py=Math.min(.5,py+.12);wake();}
    if(!['Enter',' '].includes(e.key))e.stopImmediatePropagation();
  },true);
  window.addEventListener('resize',()=>{measure(false);wake();},{passive:true});
  window.addEventListener('cosgral:langchange',language);
  function activity(){syncVideos();wake();}
  document.addEventListener('visibilitychange',activity);
  new MutationObserver(activity).observe(root,{attributes:true,attributeFilter:['class']});
  language();
})();
