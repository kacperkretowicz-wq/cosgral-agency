(function () {
  "use strict";
  var section = document.getElementById("automatyzacje");
  if (!section) return;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 2.1);
  }

  function coverProgress() {
    var r = section.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var enterRaw = 1 - Math.max(0, Math.min(1, r.top / (vh * 0.88)));
    var enter = easeOut(enterRaw);
    var leave = r.bottom < vh * 0.22 ? Math.max(0, r.bottom / (vh * 0.22)) : 1;
    return Math.max(0, Math.min(1, Math.min(enter, leave)));
  }

  function sync() {
    var p = coverProgress();
    document.body.classList.toggle("is-auto-cube-hero", p > 0.04);
    if (window.cosgralCube && typeof window.cosgralCube.setAutoHeroProgress === "function") {
      window.cosgralCube.setAutoHeroProgress(p);
    }
  }

  function boot() {
    sync();
    var tries = 0;
    (function waitCube() {
      if (window.cosgralCube && window.cosgralCube.setAutoHeroProgress) {
        sync();
        return;
      }
      if (++tries < 90) window.requestAnimationFrame(waitCube);
    })();
    if (!window.ScrollTrigger) {
      window.addEventListener("scroll", sync, { passive: true });
      return;
    }
    ScrollTrigger.create({
      id: "auto-cube-hero",
      start: 0,
      end: "max",
      onUpdate: sync,
      onRefresh: sync,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", function () {
    window.setTimeout(sync, 120);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
