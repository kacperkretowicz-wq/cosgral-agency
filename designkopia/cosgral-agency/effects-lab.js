(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionToggle = document.querySelector("[data-toggle-motion]");
  var motionStatus = document.querySelector("[data-motion-status]");
  var parallax = document.querySelector("[data-lab-parallax]");
  var layout = document.querySelector("[data-lab-layout]");
  var cards = layout ? Array.from(layout.querySelectorAll(".lab-layout-card")) : [];
  var scrollFrame = 0;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function smooth(value) { return value * value * (3 - 2 * value); }
  function progress(section) {
    var rect = section.getBoundingClientRect();
    return clamp(-rect.top / Math.max(1, rect.height - innerHeight), 0, 1);
  }
  function updateScroll() {
    scrollFrame = 0;
    if (reduced) return;
    if (parallax) {
      var p = progress(parallax);
      var offset = Math.round((p - .5) * 130);
      parallax.style.setProperty("--parallax-y", offset + "px");
    }
    if (layout && cards.length) {
      var spread = smooth(progress(layout));
      var stage = layout.querySelector(".lab-layout-stage");
      var distance = Math.min(stage.clientWidth * (innerWidth < 620 ? .28 : .32), innerWidth < 620 ? 140 : 390);
      cards.forEach(function (card, index) {
        var stackY = [-8, 8, 20][index];
        var stackAngle = [-7, 4, 9][index];
        card.style.setProperty("--x", ((index - 1) * distance * spread).toFixed(1) + "px");
        card.style.setProperty("--y", (stackY * (1 - spread)).toFixed(1) + "px");
        card.style.setProperty("--rotation", (stackAngle * (1 - spread)).toFixed(2) + "deg");
        card.style.setProperty("--scale", (1 - index * .035 * (1 - spread)).toFixed(3));
      });
    }
  }
  function requestScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  function setMotion(enabled) {
    reduced = !enabled;
    motionToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    motionToggle.textContent = enabled ? "Wyłącz ruch" : "Włącz ruch";
    motionStatus.hidden = enabled;
    motionStatus.textContent = enabled ? "" : "Ruch jest wyłączony. Włącz go, aby zobaczyć efekty przewijania i interakcji.";
    if (enabled) updateScroll();
    else {
      if (parallax) parallax.style.setProperty("--parallax-y", "0px");
      cards.forEach(function (card) {
        card.style.setProperty("--x", "0px"); card.style.setProperty("--y", "0px");
        card.style.setProperty("--rotation", "0deg"); card.style.setProperty("--scale", "1");
      });
    }
  }
  setMotion(!reduced);
  motionToggle.addEventListener("click", function () { setMotion(reduced); });
  updateScroll();
  addEventListener("scroll", requestScroll, { passive: true });
  addEventListener("resize", requestScroll, { passive: true });

  var magnet = document.querySelector(".lab-magnet");
  var magnetButton = document.querySelector("[data-play-magnet]");
  var magnetPlayback = 0;
  function moveMagnet(x, y) {
    var rect = magnet.getBoundingClientRect();
    var nx = clamp((x - rect.left) / rect.width * 2 - 1, -1, 1);
    var ny = clamp((y - rect.top) / rect.height * 2 - 1, -1, 1);
    magnet.style.setProperty("--rx", (-ny * 8).toFixed(2) + "deg");
    magnet.style.setProperty("--ry", (nx * 10).toFixed(2) + "deg");
    magnet.style.setProperty("--tx", (nx * 5).toFixed(1) + "px");
    magnet.style.setProperty("--ty", (ny * 5).toFixed(1) + "px");
    magnet.style.setProperty("--mx", ((nx + 1) * 50).toFixed(1) + "%");
    magnet.style.setProperty("--my", ((ny + 1) * 50).toFixed(1) + "%");
  }
  function resetMagnet() {
    magnet.style.setProperty("--rx", "0deg"); magnet.style.setProperty("--ry", "0deg");
    magnet.style.setProperty("--tx", "0px"); magnet.style.setProperty("--ty", "0px");
    magnet.style.setProperty("--mx", "50%"); magnet.style.setProperty("--my", "50%");
  }
  function playMagnet() {
    if (reduced) setMotion(true);
    cancelAnimationFrame(magnetPlayback);
    var started = performance.now();
    function tick(now) {
      var p = clamp((now - started) / 1150, 0, 1);
      var r = magnet.getBoundingClientRect();
      moveMagnet(r.left + r.width * (.5 + Math.sin(p * Math.PI * 2) * .32), r.top + r.height * (.5 + Math.cos(p * Math.PI * 2) * .28));
      if (p < 1) magnetPlayback = requestAnimationFrame(tick); else { magnetPlayback = 0; resetMagnet(); }
    }
    magnetPlayback = requestAnimationFrame(tick);
  }
  if (magnet) {
    magnet.addEventListener("pointermove", function (event) { if (!reduced && !magnetPlayback) moveMagnet(event.clientX, event.clientY); });
    magnet.addEventListener("pointerleave", resetMagnet);
    magnet.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); playMagnet(); } });
    magnetButton.addEventListener("click", playMagnet);
  }

  var wave = document.querySelector(".lab-wave");
  var waveButton = document.querySelector("[data-play-wave]");
  if (!wave) return;
  var canvas = wave.querySelector("canvas");
  var ctx = canvas.getContext("2d", { alpha: false });
  var image = wave.querySelector("img");
  var waveFrame = 0;
  var wavePlayback = 0;
  var pointerX = canvas.width / 2;
  var pointerY = canvas.height / 2;
  var strength = 0;
  var targetStrength = 0;
  var phase = 0;

  function drawWave() {
    waveFrame = 0;
    if (!image.complete || !image.naturalWidth) return;
    strength += (targetStrength - strength) * .2;
    phase += .14;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (var y = 0; y < canvas.height; y += 3) {
      var falloff = Math.exp(-Math.abs(y - pointerY) / 76);
      var shift = Math.sin(y / 14 + phase + pointerX / 90) * strength * falloff;
      ctx.drawImage(image, 0, y, canvas.width, 3, shift, y, canvas.width, 3);
    }
    if (strength > .2 || targetStrength > .2) {
      waveFrame = requestAnimationFrame(drawWave);
    } else {
      wave.classList.remove("is-active");
    }
  }
  function updateWave(x, y, amount) {
    var rect = wave.getBoundingClientRect();
    pointerX = clamp((x - rect.left) / rect.width * canvas.width, 0, canvas.width);
    pointerY = clamp((y - rect.top) / rect.height * canvas.height, 0, canvas.height);
    targetStrength = amount;
    wave.classList.add("is-active");
    if (!waveFrame) waveFrame = requestAnimationFrame(drawWave);
  }
  function playWave() {
    if (reduced) setMotion(true);
    cancelAnimationFrame(wavePlayback);
    var started = performance.now();
    function tick(now) {
      var p = clamp((now - started) / 1450, 0, 1);
      var r = wave.getBoundingClientRect();
      updateWave(r.left + r.width * (.2 + p * .6), r.top + r.height * (.5 + Math.sin(p * Math.PI * 2) * .22), 19);
      if (p < 1) wavePlayback = requestAnimationFrame(tick);
      else { wavePlayback = 0; targetStrength = 0; }
    }
    wavePlayback = requestAnimationFrame(tick);
  }
  wave.addEventListener("pointermove", function (event) { if (!reduced && !wavePlayback) updateWave(event.clientX, event.clientY, 18); });
  wave.addEventListener("pointerleave", function () { if (!wavePlayback) targetStrength = 0; });
  wave.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); playWave(); } });
  waveButton.addEventListener("click", playWave);
})();
