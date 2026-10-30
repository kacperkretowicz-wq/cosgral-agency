/** One motion policy for Chrome effects, scrolling and portfolio playback. */
(function () {
  'use strict';
  const root=document.documentElement;
  const params=new URLSearchParams(location.search);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const explicitReduce=params.has('reduceMotion');
  try {
    if(explicitReduce)localStorage.removeItem('cosgral-force-motion');
    else if(params.has('forceMotion'))localStorage.setItem('cosgral-force-motion','1');
  } catch (_) {}
  // Full effects by default; explicit reduceMotion always wins. respectMotion follows the OS.
  const force=!explicitReduce&&(params.has('forceMotion')||!params.has('respectMotion'));
  window.cosgralMotion={force,get reduced(){return explicitReduce||(preference.matches&&!force)}};
  function sync(){
    root.classList.toggle('force-motion',force);
    root.classList.toggle('reduce-motion',window.cosgralMotion.reduced);
    window.dispatchEvent(new CustomEvent('cosgral:motionchange'));
  }
  preference.addEventListener('change',sync);
  sync();
})();
