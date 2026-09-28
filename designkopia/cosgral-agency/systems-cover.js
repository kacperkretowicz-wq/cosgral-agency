(function () {
  "use strict";
  var section = document.getElementById("automatyzacje");
  if (!section) return;

  function sync() {
    var r = section.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var on = r.bottom > vh * 0.08 && r.top < vh * 0.92;
    document.body.classList.toggle("is-auto-cube-hero", on);
  }

  function boot() {
    sync();
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
