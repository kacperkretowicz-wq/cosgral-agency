/**
 * COSGRAL — preloader (logo arc fly-in + loading bar).
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var shell = document.getElementById("preloader");
  var bar = document.getElementById("preloader-bar");
  var cube = document.querySelector(".preloader__cube");
  var cubeSlot = document.querySelector(".preloader__cube-slot");
  if (!shell) return;

  if (REDUCED) {
    shell.classList.add("is-done", "is-settled");
    document.body.classList.add("is-ready");
    return;
  }

  var start = performance.now();
  var duration = MOBILE ? 2400 : 3200;
  var flight = null;
  var logo = { x: 0, y: 0, rot: 0, scale: 1, opacity: 0 };
  var logoTarget = { x: 0, y: 0, rot: 0, scale: 1, opacity: 1 };

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
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
    var slotCX = slot.left + slot.width * 0.5;
    var slotCY = slot.top + slot.height * 0.5;
    var startX = window.innerWidth * 0.56 - slotCX;
    var startY = window.innerHeight * 0.48 - slotCY;
    var endX = 0;
    var endY = 0;
    var ctrlX = startX * 0.34;
    var ctrlY = startY - window.innerHeight * 0.1;
    return { startX: startX, startY: startY, ctrlX: ctrlX, ctrlY: ctrlY, endX: endX, endY: endY };
  }

  function applyCube() {
    if (!cube) return;
    cube.style.setProperty("--cube-x", logo.x.toFixed(2) + "px");
    cube.style.setProperty("--cube-y", logo.y.toFixed(2) + "px");
    cube.style.setProperty("--cube-rot", logo.rot.toFixed(2) + "deg");
    cube.style.setProperty("--cube-scale", logo.scale.toFixed(3));
    cube.style.setProperty("--cube-opacity", logo.opacity.toFixed(3));
  }

  function updateLogo(p) {
    if (!cube || !flight) return;
    var flyP = easeOut(Math.min(1, p / 0.96));
    var pos = quadArc(flyP, flight.startX, flight.startY, flight.ctrlX, flight.ctrlY, flight.endX, flight.endY);
    logoTarget.x = pos.x;
    logoTarget.y = pos.y;
    logoTarget.rot = 24 * (1 - flyP);
    logoTarget.scale = 0.86 + 0.14 * flyP;
    logoTarget.opacity = Math.min(1, p * 3.2);

    logo.x += (logoTarget.x - logo.x) * 0.22;
    logo.y += (logoTarget.y - logo.y) * 0.22;
    logo.rot += (logoTarget.rot - logo.rot) * 0.2;
    logo.scale += (logoTarget.scale - logo.scale) * 0.2;
    logo.opacity += (logoTarget.opacity - logo.opacity) * 0.28;
    applyCube();

    if (flyP >= 0.995) {
      shell.classList.add("is-settled");
    }
  }

  function settleCube() {
    if (!cube || !flight) return;
    logo.x = flight.endX;
    logo.y = flight.endY;
    logo.rot = 0;
    logo.scale = 1;
    logo.opacity = 1;
    applyCube();
    shell.classList.add("is-settled");
  }

  flight = measureFlight();
  shell.classList.add("is-flying");
  if (cube && flight) {
    logo.x = flight.startX;
    logo.y = flight.startY;
    logo.rot = 24;
    logo.scale = 0.86;
    logo.opacity = 0;
    applyCube();
  }

  window.addEventListener(
    "resize",
    function () {
      if (shell.classList.contains("is-settled")) return;
      flight = measureFlight();
      if (cube && flight) {
        logo.x = flight.startX;
        logo.y = flight.startY;
        applyCube();
      }
    },
    { passive: true }
  );

  function tick(now) {
    var p = Math.min(1, (now - start) / duration);
    if (bar) bar.style.transform = "scaleX(" + easeOut(p).toFixed(4) + ")";
    updateLogo(p);

    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      settleCube();
      shell.classList.add("is-exiting");
      setTimeout(function () {
        shell.classList.add("is-done");
        document.body.classList.add("is-ready");
      }, MOBILE ? 380 : 650);
    }
  }

  requestAnimationFrame(tick);
})();
