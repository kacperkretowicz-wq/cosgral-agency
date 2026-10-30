/**
 * COSGRAL V3 — inercyjny scroll (Lenis) + ScrollTrigger.
 * Wzorzec jak na lusion.co / premium GSAP sites.
 */
(function () {
  "use strict";

  var REDUCED_MOTION = !!window.cosgralMotion?.reduced;

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

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (MOBILE) {
    ScrollTrigger.config({ ignoreMobileResize: true });
    readyResolve(null);
    return;
  }

  var lenis = new Lenis({
    /* Wolniejszy, gładszy krok kółka — dłuższy dwell w sekcji, bez ciężkiego lagu */
    lerp: MOBILE ? 0.25 : 0.22,
    duration: MOBILE ? 0.65 : 0.72,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    smoothTouch: false,
    touchMultiplier: 1.05,
    wheelMultiplier: 1.0,
  });

  window.cosgralSmoothScroll.lenis = lenis;

  ScrollTrigger.scrollerProxy(document.documentElement, {
    scrollTop: function (value) {
      if (arguments.length) {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll;
    },
    getBoundingClientRect: function () {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    /* Lenis tu używa natywnego scrolla (bez transform na html) → pin: fixed */
    pinType: "fixed",
  });
  ScrollTrigger.defaults({ pinType: "fixed" });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  /* Allow mild catch-up on mobile under GPU load; keep tight on desktop */
  gsap.ticker.lagSmoothing(MOBILE ? 500 : 0);

  var SECTION_IDS = ["top", "rozpad", "uslugi", "realizacje", "faq", "proces", "kontakt"];

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;
      if (SECTION_IDS.indexOf(href.slice(1)) >= 0) return;
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
