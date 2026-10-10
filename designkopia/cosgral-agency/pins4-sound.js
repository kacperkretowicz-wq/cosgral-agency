(function () {
  "use strict";
  var btn = document.querySelector("[data-p4-sound]");
  if (!btn) return;
  var ctx = null;
  var on = false;
  function blip(freq) {
    if (!on || !ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.frequency.value = freq;
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.13);
  }
  btn.addEventListener("click", function () {
    on = !on;
    if (on && !ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx && ctx.state === "suspended") ctx.resume();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    blip(on ? 660 : 320);
  });
  window.cosgralP4Blip = function () { blip(520); };
})();