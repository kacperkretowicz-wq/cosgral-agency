(function () {
  "use strict";

  var BG_URL = "images/cosgral-agency/background-mockups/scroll-mockup-11-editorial-current.jpg";
  var shell = document.getElementById("page-scroll-shell");
  var canvas = document.getElementById("page-scroll-bg");
  var timer;

  if (!shell || !canvas) return;

  document.body.classList.add("has-page-scroll-bg");

  function docHeight() {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      window.innerHeight
    );
  }

  function sync() {
    var h = docHeight();
    shell.style.minHeight = h + "px";
    canvas.style.height = h + "px";
    canvas.style.backgroundSize = "100% " + h + "px";
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(sync, 100);
  }

  sync();
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  setTimeout(schedule, 1200);
  setTimeout(schedule, 3500);

  if (window.ResizeObserver) {
    var content = document.getElementById("page-scroll-content");
    if (content) new ResizeObserver(schedule).observe(content);
  }

  if (window.ScrollTrigger) {
    ScrollTrigger.addEventListener("refresh", schedule);
  }
})();
