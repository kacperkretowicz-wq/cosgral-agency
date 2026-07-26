/**
 * COSGRAL V4 — preloader (cube + counter).
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var shell = document.getElementById("preloader");
  var counter = document.getElementById("preloader-counter");
  if (!shell) return;

  if (REDUCED) {
    shell.classList.add("is-done");
    document.body.classList.add("is-ready");
    return;
  }

  var value = 0;
  var target = 100;
  var start = performance.now();
  var duration = 2200;

  function tick(now) {
    var p = Math.min(1, (now - start) / duration);
    value = Math.round(p * target);
    if (counter) counter.textContent = String(value).padStart(3, "0");
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      shell.classList.add("is-exiting");
      setTimeout(function () {
        shell.classList.add("is-done");
        document.body.classList.add("is-ready");
      }, 650);
    }
  }

  requestAnimationFrame(tick);
})();
