/**
 * COSGRAL V3 — reveal wordmarku hero (clip-path).
 */
(function () {
  "use strict";

  const FORCE_MOTION = new URLSearchParams(location.search).has("forceMotion");
  const REDUCED_MOTION = FORCE_MOTION ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DOM = {};
  let readyResolve;
  const ready = new Promise(function (resolve) { readyResolve = resolve; });

  function cacheDom() {
    DOM.heading = document.querySelector(".hero-wordmark[data-hero-heading='main']");
  }

  function init() {
    cacheDom();
    if (!DOM.heading) {
      readyResolve();
      return;
    }

    if (REDUCED_MOTION) {
      DOM.heading.style.clipPath = "inset(0 0% 0 0)";
    } else if (window.gsap) {
      gsap.set(DOM.heading, { clipPath: "inset(0 100% 0 0)" });
    }

    readyResolve();
  }

  function appendToTimeline(tl, at) {
    if (!DOM.heading) return 0;

    if (REDUCED_MOTION) {
      tl.set(DOM.heading, { clipPath: "inset(0 0% 0 0)" }, at);
      return 0;
    }

    tl.to(DOM.heading, {
      clipPath: "inset(0 0% 0 0)",
      duration: 1.05,
      ease: "power2.inOut",
    }, at);

    return 1.05;
  }

  init();

  window.heroTextReveal = {
    ready: ready,
    appendToTimeline: appendToTimeline,
  };
})();
