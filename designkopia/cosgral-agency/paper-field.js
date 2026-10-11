/**
 * Line-field lightening, scrubbed with the scroll.
 * Sine in-out from the middle of Co robimy to the top of Wybrane realizacje,
 * then the same curve from the middle of that section to the top of FAQ.
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
  var LERP = 0.1;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function sineInOut(t) {
    t = clamp01(t);
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  function flowTop(el) {
    return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
  }

  function goal() {
    var y = window.scrollY || window.pageYOffset || 0;
    var bridgeTop = flowTop(bridge);
    var returnTop = flowTop(back);
    var uTop = bridgeTop - (parseFloat(getComputedStyle(uslugi).marginBottom) || 0) - uslugi.offsetHeight;
    var wTop = returnTop - (parseFloat(getComputedStyle(work).marginBottom) || 0) - work.offsetHeight;
    var enter0 = uTop + uslugi.offsetHeight * 0.5;
    var enter1 = bridgeTop + bridge.offsetHeight;
    var exit0 = wTop + work.offsetHeight * 0.5;
    var exit1 = returnTop + back.offsetHeight;
    var enter = sineInOut((y - enter0) / Math.max(enter1 - enter0, 1));
    var exit = sineInOut((y - exit0) / Math.max(exit1 - exit0, 1));
    return clamp01(enter) * (1 - clamp01(exit));
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
    root.style.setProperty("--paper", paper.toFixed(4));
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
