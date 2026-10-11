/**
 * Scroll-scrubbed lightening of the line field for Wybrane realizacje.
 * Holds dark for the first quarter of each 72vh track, smoothsteps across
 * the middle half, then holds off-white. Same curve back to dark before FAQ.
 * No lerp on top of scroll.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var bridge = document.getElementById("paper-bridge");
  var back = document.getElementById("paper-return");
  if (!bridge || !back) return;

  var root = document.documentElement;
  var scheduled = false;
  var lastFilter = null;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function centralSmoothstep(t) {
    var u = (t - 0.25) / 0.5;
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    return u * u * (3 - 2 * u);
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

  function apply() {
    var b = bridge.getBoundingClientRect();
    var r = back.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var enter = centralSmoothstep(clamp01((vh - b.top) / Math.max(b.height, 1)));
    var exit = centralSmoothstep(clamp01((vh - r.top) / Math.max(r.height, 1)));
    var paper = enter * (1 - exit);
    root.style.setProperty("--paper", paper.toFixed(4));
    window.__cosgralPaper = paper;
    var ink = root.classList.contains("is-paper-ink");
    if (!ink && paper > 0.48) root.classList.add("is-paper-ink");
    else if (ink && paper < 0.36) root.classList.remove("is-paper-ink");
    tintChat(paper);
  }

  function requestDraw() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }

  window.addEventListener("scroll", requestDraw, { passive: true });
  window.addEventListener("resize", requestDraw);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", requestDraw);
    window.visualViewport.addEventListener("scroll", requestDraw);
  }

  function bindLenis(tries) {
    var api = window.cosgralSmoothScroll;
    var lenis = api && api.lenis;
    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", requestDraw);
      return;
    }
    if (tries > 40) return;
    setTimeout(function () { bindLenis(tries + 1); }, 150);
  }
  bindLenis(0);

  apply();
})();
