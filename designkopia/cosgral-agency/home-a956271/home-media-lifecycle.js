/* Embedded portfolio loops: warm near the viewport, decode only when visible. */
(function () {
  const videos=Array.from(document.querySelectorAll('.home-work video, [data-observed-video]'));
  const states=new WeakMap();
  const visible=new Set();
  const root=document.documentElement;
  const allowed=()=>!document.hidden&&!root.classList.contains('is-nav-menu-open')&&
    !document.body.classList.contains('is-nav-menu-open')&&!window.cosgralMotion?.reduced;

  function mount(video,index){
    const state=states.get(video);
    state.index=index;state.pending=false;state.failed=false;state.epoch++;
    video.preload='auto';
    video.src=state.sources[index];
    video.load();
  }
  function fallback(video){
    const state=states.get(video);
    if(state.index+1<state.sources.length){mount(video,state.index+1);sync(video)}
    else{state.failed=true;video.dataset.playbackState='error'}
  }
  function warm(video){
    const state=states.get(video);
    if(!window.cosgralMotion?.reduced&&state.index<0&&state.sources.length)mount(video,0);
  }
  function sync(video){
    const state=states.get(video);
    if(!visible.has(video)||!allowed()){
      video.autoplay=false;
      video.pause();
      return;
    }
    warm(video);
    if(state.failed||state.pending||!video.paused||state.index<0)return;
    state.pending=true;
    const epoch=state.epoch;
    video.autoplay=true;
    video.play().then(()=>{
      if(epoch!==state.epoch)return;
      state.pending=false;video.dataset.playbackState='playing';
      if(!visible.has(video)||!allowed())video.pause();
    }).catch(error=>{
      if(epoch!==state.epoch)return;
      state.pending=false;
      if(error.name==='NotSupportedError'){fallback(video);return}
      video.dataset.playbackState=error.name==='NotAllowedError'?'blocked':error.name==='AbortError'?'paused':'error';
      // Never expose browser chrome on decorative loops; keep the poster until a gesture can retry.
    });
  }
  for(const video of videos){
    video.controls=false;video.removeAttribute('controls');
    video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;
    video.setAttribute('muted','');video.setAttribute('playsinline','');
    const mp4=video.dataset.lazySrc,webm=video.dataset.previewSrc;
    const mp4Supported=!!video.canPlayType('video/mp4; codecs="avc1.42E01E"');
    const sources=(mp4Supported?[mp4,webm]:[webm,mp4]).filter(Boolean);
    states.set(video,{sources,index:-1,pending:false,epoch:0,failed:false});
    video.addEventListener('canplay',()=>sync(video));
    video.addEventListener('error',()=>{if(video.error)fallback(video)});
  }
  const prepare=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting)warm(entry.target);
  },{rootMargin:'450px 0px',threshold:0});
  const playback=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);
      sync(entry.target);
    }
  },{threshold:.01});
  videos.forEach(video=>{prepare.observe(video);playback.observe(video)});
  const update=()=>videos.forEach(sync);
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',update);
  window.addEventListener('cosgral:menu-state',update);
  window.addEventListener('cosgral:motionchange',update);
  const retry=()=>{for(const video of visible)if(video.paused)sync(video)};
  document.addEventListener('pointerdown',retry,{passive:true});
  document.addEventListener('keydown',retry);
  // Read-only diagnostics for local Chrome troubleshooting, without adding product UI.
  window.cosgralMedia={snapshot:()=>videos.map(video=>({source:video.currentSrc,state:video.dataset.playbackState,
    readyState:video.readyState,paused:video.paused,time:video.currentTime,error:video.error?.code||null}))};
})();
