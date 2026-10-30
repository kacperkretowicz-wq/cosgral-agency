/** One motion policy for Chrome effects, scrolling and portfolio playback. */
(function () {
  'use strict';
  const root=document.documentElement;
  const params=new URLSearchParams(location.search);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const explicitReduce=params.has('reduceMotion');
  let stored=false;
  try {
    if(explicitReduce)localStorage.removeItem('cosgral-force-motion');
    else if(params.has('forceMotion'))localStorage.setItem('cosgral-force-motion','1');
    stored=localStorage.getItem('cosgral-force-motion')==='1';
  } catch (_) {}
  // Desktop is the full-effects preview by default, including Windows Chrome.
  const force=!explicitReduce&&(params.has('forceMotion')||stored||matchMedia('(hover: hover) and (pointer: fine)').matches);
  window.cosgralMotion={force,get reduced(){return explicitReduce||(preference.matches&&!force)}};
  function sync(){
    root.classList.toggle('force-motion',force);
    root.classList.toggle('reduce-motion',window.cosgralMotion.reduced);
    window.dispatchEvent(new CustomEvent('cosgral:motionchange'));
  }
  preference.addEventListener('change',sync);
  sync();
})();
