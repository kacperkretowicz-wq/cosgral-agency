/**
 * COSGRAL V3 — inercyjny scroll (Lenis) + ScrollTrigger.
 * Wzorzec jak na lusion.co / premium GSAP sites.
 */
(function () {
  "use strict";

  var FORCE_MOTION = new URLSearchParams(location.search).has("forceMotion");
  var REDUCED_MOTION = FORCE_MOTION ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var readyResolve;
  var ready = new Promise(function (resolve) { readyResolve = resolve; });

  window.cosgralSmoothScroll = {
    ready: ready,
    lenis: null,
    scrollTo: function (target, opts) {
      if (window.cosgralSmoothScroll.lenis) {
        window.cosgralSmoothScroll.lenis.scrollTo(target, opts || {});
      } else if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "smooth" });
      } else if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
  };

  if (REDUCED_MOTION || typeof Lenis === "undefined" || typeof gsap === "undefined") {
    readyResolve(null);
    return;
  }

  var lenis = new Lenis({
    lerp: 0.1,
    duration: 1.15,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    smoothTouch: false,
    touchMultiplier: 1.2,
    wheelMultiplier: 1.15,
  });

  window.cosgralSmoothScroll.lenis = lenis;

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.35 });
    });
  });

  ScrollTrigger.addEventListener("refresh", function () {
    lenis.resize();
  });

  requestAnimationFrame(function () {
    ScrollTrigger.refresh();
    readyResolve(lenis);
  });
})();
