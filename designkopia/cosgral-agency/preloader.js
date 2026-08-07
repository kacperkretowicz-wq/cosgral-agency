/**
 * COSGRAL — preloader (cube arc fly-in + counter).
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var shell = document.getElementById("preloader");
  var counter = document.getElementById("preloader-counter");
  var cube = document.querySelector(".preloader__cube");
  var cubeSlot = document.querySelector(".preloader__cube-slot");
  if (!shell) return;

  if (REDUCED) {
    shell.classList.add("is-done", "is-settled");
    document.body.classList.add("is-ready");
    return;
  }

  var value = 0;
  var target = 100;
  var start = performance.now();
  var duration = 3000;
  var flight = null;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 2.55);
  }

  function quadArc(t, sx, sy, cx, cy, ex, ey) {
    var u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * ex,
      y: u * u * sy + 2 * u * t * cy + t * t * ey,
    };
  }

  function measureFlight() {
    if (!cubeSlot) return null;
    var slot = cubeSlot.getBoundingClientRect();
    var endX = slot.left + slot.width * 0.5 - window.innerWidth * 0.5;
    var endY = slot.top + slot.height * 0.5 - window.innerHeight * 0.5;
    var startX = window.innerWidth * 0.56;
    var startY = window.innerHeight * 0.48;
    var ctrlX = startX * 0.34 + endX * 0.66;
    var ctrlY = endY - window.innerHeight * 0.1;
    return { startX: startX, startY: startY, ctrlX: ctrlX, ctrlY: ctrlY, endX: endX, endY: endY };
  }

  function updateCube(p) {
    if (!cube || !flight) return;
    var flyP = easeOut(Math.min(1, p / 0.94));
    var pos = quadArc(flyP, flight.startX, flight.startY, flight.ctrlX, flight.ctrlY, flight.endX, flight.endY);
    var rot = 68 * (1 - flyP) + Math.sin(flyP * Math.PI) * 6;
    var scale = 0.76 + 0.24 * flyP;
    var opacity = Math.min(1, p * 4.5);

    cube.style.transform =
      "translate(calc(-50% + " +
      pos.x +
      "px), calc(-50% + " +
      pos.y +
      "px)) rotate(" +
      rot +
      "deg) scale(" +
      scale +
      ")";
    cube.style.opacity = String(opacity);

    if (flyP >= 0.999) {
      shell.classList.add("is-settled");
      cube.style.transform = "";
      cube.style.opacity = "";
    }
  }

  function settleCube() {
    if (!cube) return;
    shell.classList.add("is-settled");
    cube.style.transform = "";
    cube.style.opacity = "";
  }

  flight = measureFlight();
  shell.classList.add("is-flying");
  if (cube && flight) {
    cube.style.transform =
      "translate(calc(-50% + " +
      flight.startX +
      "px), calc(-50% + " +
      flight.startY +
      "px)) rotate(68deg) scale(0.76)";
  }

  window.addEventListener(
    "resize",
    function () {
      if (shell.classList.contains("is-settled")) return;
      flight = measureFlight();
    },
    { passive: true }
  );

  function tick(now) {
    var p = Math.min(1, (now - start) / duration);
    value = Math.round(p * target);
    if (counter) counter.textContent = String(value).padStart(3, "0");
    updateCube(p);

    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      settleCube();
      shell.classList.add("is-exiting");
      setTimeout(function () {
        shell.classList.add("is-done");
        document.body.classList.add("is-ready");
      }, 650);
    }
  }

  requestAnimationFrame(tick);
})();
