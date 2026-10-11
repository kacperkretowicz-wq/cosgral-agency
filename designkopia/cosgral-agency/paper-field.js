/**
 * Line-field lightening, scrubbed with the scroll.
 * Sine in-out from the middle of Co robimy to the top of Wybrane realizacje,
 * then the same curve from the end of that section (after the pinned slides) to the top of FAQ.
 * A light per-frame lerp (same tick as Lenis) keeps the blend from stepping.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var uslugi = document.getElementById("uslugi");
  var work = document.getElementById("realizacje");
  var faq = document.getElementById("faq");
  var bridge = document.getElementById("paper-bridge");
  var back = document.getElementById("paper-return");
  if (!uslugi || !work || !faq || !bridge || !back) return;

  var root = document.documentElement;
  var shown = 0;
  var primed = false;
  var lastFilter = null;
  var lastPaperStr = "";
  var LERP = 0.1;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function sineInOut(t) {
    t = clamp01(t);
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  var geo = null;
  function flowTop(el, y) {
    return el.getBoundingClientRect().top + y;
  }

  function measure() {
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || 1;
    var bridgeTop = flowTop(bridge, y);
    var returnTop = flowTop(back, y);
    var uMb = parseFloat(getComputedStyle(uslugi).marginBottom) || 0;
    var wMb = parseFloat(getComputedStyle(work).marginBottom) || 0;
    var uTop = bridgeTop - uMb - uslugi.offsetHeight;
    var wTop = returnTop - wMb - work.offsetHeight;
    var enter0 = uTop + uslugi.offsetHeight * 0.5;
    var enter1 = bridgeTop + bridge.offsetHeight;
    var exit0 = wTop + work.offsetHeight * 0.5;
    if (work.classList.contains("home-work-pin")) {
      exit0 = flowTop(work, y) + work.offsetHeight - vh;
    }
    var exit1 = returnTop + back.offsetHeight;
    geo = { enter0: enter0, enter1: enter1, exit0: exit0, exit1: exit1 };
  }

  function goal() {
    if (!geo) measure();
    var y = window.scrollY || window.pageYOffset || 0;
    var enter = sineInOut((y - geo.enter0) / Math.max(geo.enter1 - geo.enter0, 1));
    var exit = sineInOut((y - geo.exit0) / Math.max(geo.exit1 - geo.exit0, 1));
    return clamp01(enter) * (1 - clamp01(exit));
  }

  measure();
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("load", measure);
  if (window.ResizeObserver) {
    var geoObs = new ResizeObserver(function () {
      measure();
    });
    geoObs.observe(work);
    geoObs.observe(uslugi);
    geoObs.observe(bridge);
    geoObs.observe(back);
  }

  function tintChat(paper) {
    var canvas = document.querySelector(".cg-chat-cube-canvas");
    if (!canvas) return;
    var launcher = canvas.closest(".cg-chat-launcher");
    if (launcher && launcher.getAttribute("aria-expanded") === "true") {
      if (canvas.style.filter) canvas.style.filter = "";
      lastFilter = null;
      return;
    }
    var next = paper > 0.004 ? "brightness(" + (1 - paper * 0.58).toFixed(4) + ")" : "";
    if (next === lastFilter) return;
    lastFilter = next;
    canvas.style.transition = "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
    canvas.style.filter = next;
  }

  function publish(paper) {
    var rounded = paper.toFixed(3);
    if (rounded !== lastPaperStr) {
      lastPaperStr = rounded;
      root.style.setProperty("--paper", paper.toFixed(4));
    }
    window.__cosgralPaper = paper;
    root.classList.remove("is-paper-ink");
    tintChat(paper);
  }

  function tick(time, deltaTime) {
    var next = goal();
    if (!primed) {
      shown = next;
      primed = true;
    } else {
      var dt = 0.0167;
      if (typeof deltaTime === "number" && deltaTime > 0) {
        dt = deltaTime > 5 ? deltaTime / 1000 : deltaTime;
      }
      if (dt > 0.05) dt = 0.05;
      var k = 1 - Math.pow(1 - LERP, dt / 0.01667);
      shown += (next - shown) * k;
      if (Math.abs(next - shown) < 0.0004) shown = next;
    }
    publish(shown);
  }

  if (window.gsap && gsap.ticker) {
    gsap.ticker.add(tick);
  } else {
    (function frame() {
      tick();
      requestAnimationFrame(frame);
    })();
  }
})();
