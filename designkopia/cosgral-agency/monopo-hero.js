/**
 * Monopo-style hero — background beams + video dialog (Aceternity-inspired, vanilla).
 */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-hero-beams]");
  var dialog = document.querySelector("[data-hero-video-dialog]");
  var openBtn = document.querySelector("[data-hero-video-open]");
  var closeBtn = document.querySelector("[data-hero-video-close]");
  var dialogVideo = dialog && dialog.querySelector("video");
  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  function initBeams() {
    if (!canvas || REDUCED) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var beams = [];
    var count = 18;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      beams = [];
      for (var i = 0; i < count; i++) {
        beams.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          len: 80 + Math.random() * 220,
          angle: (-Math.PI / 2) + (Math.random() - 0.5) * 0.8,
          speed: 0.15 + Math.random() * 0.35,
          alpha: 0.04 + Math.random() * 0.12,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      beams.forEach(function (b) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        var g = ctx.createLinearGradient(0, 0, b.len, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, "rgba(255,255,255," + b.alpha + ")");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(b.len, 0);
        ctx.stroke();
        ctx.restore();
        b.y -= b.speed;
        if (b.y < -120) {
          b.y = canvas.offsetHeight + 80;
          b.x = Math.random() * canvas.offsetWidth;
        }
      });
      requestAnimationFrame(draw);
    }

    resize();
    seed();
    draw();
    window.addEventListener("resize", function () {
      resize();
      seed();
    });
  }

  function openDialog() {
    if (!dialog) return;
    dialog.hidden = false;
    document.body.classList.add("hero-dialog-open");
    if (dialogVideo) {
      dialogVideo.currentTime = 0;
      var p = dialogVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.hidden = true;
    document.body.classList.remove("hero-dialog-open");
    if (dialogVideo) dialogVideo.pause();
  }

  if (openBtn) openBtn.addEventListener("click", openDialog);
  if (closeBtn) closeBtn.addEventListener("click", closeDialog);
  if (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDialog();
  });

  initBeams();

  if (window.gsap && !REDUCED) {
    (async function () {
      await window.cosgralSmoothScroll?.ready;
      gsap.from(".monopo-hero__eyebrow", { opacity: 0, y: 24, duration: 1, delay: 0.2, ease: "power3.out" });
      gsap.from(".monopo-hero__brand", { opacity: 0, y: 48, duration: 1.1, delay: 0.35, ease: "power3.out" });
      gsap.from(".monopo-hero__tagline", { opacity: 0, y: 32, duration: 1, delay: 0.55, ease: "power3.out" });
      gsap.from(".monopo-hero__play", { opacity: 0, y: 20, duration: 0.9, delay: 0.75, ease: "power3.out" });
    })();
  }
})();
