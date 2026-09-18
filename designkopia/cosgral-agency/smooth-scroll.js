/**
 * COSGRAL V3 — inercyjny scroll (Lenis) + ScrollTrigger.
 * Wzorzec jak na lusion.co / premium GSAP sites.
 */
(function () {
  "use strict";

  var DESKTOP_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var FORCE_MOTION =
    new URLSearchParams(location.search).has("forceMotion") ||
    DESKTOP_POINTER ||
    (function () {
      try { return localStorage.getItem("cosgral-force-motion") === "1"; } catch (e) { return false; }
    })();
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

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  /* Touch / Android: natywny scroll — Lenis + scrollerProxy tnie FPS i gubi gesty. */
  if (MOBILE) {
    document.documentElement.classList.add("is-native-scroll");
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (e) {}
    if (!new URLSearchParams(location.search).has("service")) {
      window.scrollTo(0, 0);
    }

    var nativeApi = {
      scroll: 0,
      resize: function () {},
      on: function () {},
      raf: function () {},
      scrollTo: function (target, opts) {
        opts = opts || {};
        var y = typeof target === "number" ? target : 0;
        if (opts.immediate) {
          window.scrollTo(0, y);
          if (opts.onComplete) opts.onComplete();
          return;
        }
        window.scrollTo({ top: y, behavior: "smooth" });
        if (opts.onComplete) {
          window.setTimeout(opts.onComplete, Math.max(280, (opts.duration || 0.9) * 650));
        }
      },
    };
    window.cosgralSmoothScroll.lenis = nativeApi;
    window.cosgralSmoothScroll.scrollTo = function (target, opts) {
      opts = opts || {};
      if (typeof target === "number") {
        nativeApi.scrollTo(target, opts);
        return;
      }
      if (target && target.getBoundingClientRect) {
        var y = target.getBoundingClientRect().top + window.pageYOffset + (opts.offset || 0);
        nativeApi.scrollTo(y, opts);
      }
    };
    var syncNative = function () {
      nativeApi.scroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    };
    window.addEventListener("scroll", syncNative, { passive: true });
    syncNative();
    requestAnimationFrame(function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      readyResolve(nativeApi);
    });
    return;
  }

  var lenis = new Lenis({
    /* Wolny scroll: lekka inercja — szybka reakcja, bez ciężkiego lag-smooth */
    lerp: 0.12,
    duration: 1.0,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    smoothTouch: false,
    touchMultiplier: 1.15,
    wheelMultiplier: 0.92,
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
  gsap.ticker.lagSmoothing(0);

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
