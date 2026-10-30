/* Muted inline video loads near the viewport; playback follows the shared motion policy. */
(function () {
  const videos=Array.from(document.querySelectorAll('.home-work video, [data-observed-video]'));
  const visible=new Set();
  const desired=new WeakMap();
  const root=document.documentElement;
  function sync(video) {
    const play=visible.has(video)&&!document.hidden&&!root.classList.contains('is-nav-menu-open')&&
      !document.body.classList.contains('is-nav-menu-open')&&!window.cosgralMotion?.reduced;
    if(desired.get(video)===play)return;
    desired.set(video,play);
    if(!play){video.pause();return}
    video.muted=true;
    video.defaultMuted=true;
    video.playsInline=true;
    if(video.dataset.lazySrc&&!video.getAttribute('src'))video.src=video.dataset.lazySrc;
    video.play().then(()=>{
      video.dataset.playbackState='playing';
      // A delayed play promise must not restart a video that has left the viewport.
      if(!desired.get(video))video.pause();
      if(video.dataset.autoplayControls){video.controls=false;delete video.dataset.autoplayControls}
    }).catch(error=>{
      desired.delete(video);
      video.dataset.playbackState=error.name==='NotAllowedError'?'blocked':'error';
      // Browsers may still require a gesture: provide a usable native play button.
      if(!video.controls){video.controls=true;video.dataset.autoplayControls='true'}
    });
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);
      sync(entry.target);
    }
  },{rootMargin:'0px',threshold:0.01});
  videos.forEach(video=>observer.observe(video));
  const update=()=>videos.forEach(sync);
  const retryBlocked=()=>{for(const video of visible)if(video.dataset.playbackState==='blocked')sync(video)};
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',event=>{if(event.persisted){videos.forEach(video=>desired.delete(video));update()}});
  window.addEventListener('cosgral:menu-state',update);
  window.addEventListener('cosgral:motionchange',update);
  document.addEventListener('pointerdown',retryBlocked,{passive:true});
  document.addEventListener('keydown',retryBlocked);
})();
