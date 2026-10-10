(function () {
  "use strict";
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;
  var current = null;
  document.addEventListener("pointermove", function (e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var target = el && el.closest("a, button");
    if (target && (target.classList.contains("p4-card") || target.classList.contains("p4-row") || target.closest(".p4-rail"))) target = null;
    if (current && current !== target) current.style.transform = "";
    current = target;
    if (!target) return;
    var r = target.getBoundingClientRect();
    if (r.width > 360) return;
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    target.style.transform = "translate3d(" + (dx * 0.16).toFixed(1) + "px," + (dy * 0.16).toFixed(1) + "px,0)";
  }, { passive: true });
})();
