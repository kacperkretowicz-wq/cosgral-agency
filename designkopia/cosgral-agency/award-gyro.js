/**
 * Subtle device tilt. iOS needs a user gesture before orientation events.
 * Desktop uses the pointer. Reduced motion stays still.
 */
(function () {
  "use strict";
  if (document.documentElement.classList.contains("reduce-motion")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  var tx = 0;
  var ty = 0;
  var cx = 0;
  var cy = 0;

  function apply() {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    root.style.setProperty("--tilt-x", cx.toFixed(3));
    root.style.setProperty("--tilt-y", cy.toFixed(3));
    if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
      requestAnimationFrame(apply);
    }
  }

  function kick() {
    requestAnimationFrame(apply);
  }

  window.addEventListener("pointermove", function (e) {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    kick();
  }, { passive: true });

  function onOrient(e) {
    var g = e.gamma || 0;
    var b = e.beta || 0;
    tx = Math.max(-1, Math.min(1, g / 28));
    ty = Math.max(-1, Math.min(1, (b - 40) / 32));
    kick();
  }

  function enable() {
    window.addEventListener("deviceorientation", onOrient, { passive: true });
  }

  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    var asked = false;
    function ask() {
      if (asked) return;
      asked = true;
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === "granted") enable();
      }).catch(function () {});
    }
    window.addEventListener("touchend", ask, { once: true, passive: true });
  } else {
    enable();
  }
})();
