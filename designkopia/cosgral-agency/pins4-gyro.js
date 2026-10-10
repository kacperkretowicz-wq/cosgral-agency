(function () {
  "use strict";
  if (document.documentElement.classList.contains("reduce-motion")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function apply() {
    raf = 0;
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    root.style.setProperty("--tilt-x", cx.toFixed(3));
    root.style.setProperty("--tilt-y", cy.toFixed(3));
    if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(apply);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(apply); }
  window.addEventListener("pointermove", function (e) {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    kick();
  }, { passive: true });
  function onOrient(e) {
    tx = Math.max(-1, Math.min(1, (e.gamma || 0) / 28));
    ty = Math.max(-1, Math.min(1, ((e.beta || 0) - 40) / 32));
    kick();
  }
  function enable() { window.addEventListener("deviceorientation", onOrient, { passive: true }); }
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    window.addEventListener("touchend", function ask() {
      DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") enable(); }).catch(function () {});
    }, { once: true, passive: true });
  } else enable();
})();
