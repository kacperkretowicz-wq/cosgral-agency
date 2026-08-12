/**
 * Fala uderzeniowa — promień od sześcianu przy przejściu przez treść (menu).
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;
  if (!document.querySelector(".subpage-cube-portal")) return;

  var canvas = document.createElement("canvas");
  canvas.className = "menu-shockwave";
  canvas.id = "menu-shockwave";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  function readVar(name, fallback) {
    var raw = document.documentElement.style.getPropertyValue(name);
    var val = parseFloat(raw);
    return Number.isFinite(val) ? val : fallback;
  }

  function draw() {
    var html = document.documentElement;
    var bend = readVar("--menu-water-bend", 0);
    if (bend < 0.02) {
      canvas.style.opacity = "0";
      requestAnimationFrame(draw);
      return;
    }

    canvas.style.opacity = String(Math.min(1, bend * 1.15));

    var cx = readVar("--menu-wave-x", window.innerWidth * 0.5);
    var cy = readVar("--menu-wave-y", window.innerHeight * 0.46);
    var progress = readVar("--menu-wave-progress", 0);
    var w = window.innerWidth;
    var h = window.innerHeight;
    var maxR = Math.hypot(w, h) * 0.58;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var rings = 4;
    for (var i = 0; i < rings; i++) {
      var t = (progress + i * 0.18) % 1.12;
      var r = t * maxR;
      var alpha = Math.max(0, 0.42 - t * 0.36) * bend;
      if (alpha <= 0.01) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, " + alpha + ")";
      ctx.lineWidth = 1.5 + bend * 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, r - 6), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180, 210, 255, " + alpha * 0.35 + ")";
      ctx.lineWidth = 10 + bend * 16;
      ctx.stroke();
    }

    var crest = Math.max(0, 1 - Math.abs(progress - 0.38) / 0.38) * bend;
    if (crest > 0.02) {
      var crestR = progress * maxR * 0.92;
      var ring = ctx.createRadialGradient(cx, cy, crestR * 0.82, cx, cy, crestR * 1.08);
      ring.addColorStop(0, "rgba(255,255,255,0)");
      ring.addColorStop(0.45, "rgba(255,255,255," + crest * 0.22 + ")");
      ring.addColorStop(0.55, "rgba(200,220,255," + crest * 0.12 + ")");
      ring.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(cx, cy, crestR * 1.12, 0, Math.PI * 2);
      ctx.fill();
    }

    var core = Math.max(0, 1 - progress * 1.4) * bend;
    if (core > 0.03) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 48 + core * 90);
      g.addColorStop(0, "rgba(255,255,255," + core * 0.2 + ")");
      g.addColorStop(0.35, "rgba(255,255,255," + core * 0.06 + ")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
