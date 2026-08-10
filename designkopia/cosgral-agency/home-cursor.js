/**
 * Magnetic custom cursor — desktop only.
 */
(function () {
  "use strict";

  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var root = document.querySelector("[data-cursor]");
  if (!root) return;

  var dot = root.querySelector(".home-cursor__dot");
  var ring = root.querySelector(".home-cursor__ring");
  var cx = 0, cy = 0, rx = 0, ry = 0;

  document.addEventListener("mousemove", function (e) {
    cx = e.clientX;
    cy = e.clientY;
  });

  document.addEventListener("mouseover", function (e) {
    if (e.target.closest("a, button, [data-magnetic], .service-panel__close, .service-panel__cta")) {
      root.classList.add("is-hover");
    }
  });
  document.addEventListener("mouseout", function (e) {
    var rel = e.relatedTarget;
    if (!rel || !rel.closest || !rel.closest("a, button, [data-magnetic], .service-panel__close, .service-panel__cta")) {
      root.classList.remove("is-hover");
    }
  });

  document.querySelectorAll("a, button, [data-magnetic]").forEach(function (el) {
    el.addEventListener("mouseenter", function () { root.classList.add("is-hover"); });
    el.addEventListener("mouseleave", function () { root.classList.remove("is-hover"); });
  });

  function tick() {
    rx += (cx - rx) * 0.12;
    ry += (cy - ry) * 0.12;
    if (dot) {
      dot.style.setProperty("--cx", cx + "px");
      dot.style.setProperty("--cy", cy + "px");
    }
    if (ring) {
      ring.style.setProperty("--rx", rx + "px");
      ring.style.setProperty("--ry", ry + "px");
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
