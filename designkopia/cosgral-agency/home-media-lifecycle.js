/* Portfolio media starts near the viewport and releases the decoder offscreen. */
(function () {
  const videos=Array.from(document.querySelectorAll('.home-work video, [data-observed-video]'));
  const visible=new Set();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const desired=new WeakMap();
  function sync(video) {
    const play=visible.has(video)&&!document.hidden&&!document.body.classList.contains('is-nav-menu-open')&&!reduced.matches;
    if(desired.get(video)===play)return;
    desired.set(video,play);
    if(play){
      if(video.dataset.lazySrc&&!video.getAttribute('src'))video.src=video.dataset.lazySrc;
      video.play().catch(()=>{});
    } else video.pause();
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);
      sync(entry.target);
    }
  },{rootMargin:'0px',threshold:0.01});
  videos.forEach(video=>observer.observe(video));
  const update=()=>videos.forEach(sync);
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    videos.forEach(video=>desired.delete(video));
    update();
  });
  window.addEventListener('cosgral:menu-state',update);
  reduced.addEventListener('change',update);
})();
