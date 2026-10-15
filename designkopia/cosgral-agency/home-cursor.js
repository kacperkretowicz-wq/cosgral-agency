/**
 * Magnetic custom cursor — desktop only.
 * Supports drag-x arrow mode over [data-cursor="drag-x"].
 */
(function () {
  "use strict";

  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  /* Prefer .home-cursor — never treat [data-cursor="drag-x"] zones as the cursor root */
  var root = document.querySelector(".home-cursor");
  if (!root) {
    root = document.createElement("div");
    root.className = "home-cursor";
    root.setAttribute("data-cursor", "");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="home-cursor__dot"></div><div class="home-cursor__ring"></div>';
    document.body.appendChild(root);
  }
  if (!root) return;

  var dot = root.querySelector(".home-cursor__dot");
  var ring = root.querySelector(".home-cursor__ring");
  var cx = 0;
  var cy = 0;
  var rx = 0;
  var ry = 0;
  var dragZone = null;

  document.addEventListener("mousemove", function (e) {
    cx = e.clientX;
    cy = e.clientY;
    if (dragZone) {
      var rect = dragZone.getBoundingClientRect();
      var mid = rect.left + rect.width * 0.5;
      root.classList.toggle("is-drag-left", e.clientX < mid);
      root.classList.toggle("is-drag-right", e.clientX >= mid);
    }
  });

  document.addEventListener("mouseover", function (e) {
    var zone = e.target.closest && e.target.closest('[data-cursor="drag-x"]');
    if (zone) {
      dragZone = zone;
      root.classList.add("is-drag-x");
      root.classList.remove("is-hover");
      return;
    }
    if (
      e.target.closest(
        "a, button, [data-magnetic], [data-tile-interact], .footer-social__link, .service-panel__close, .service-panel__cta, .portfolio-web-card, .web-deck__card, .web-case-panel__close, .web-case-panel__visit, .reels-tiles__card, .reels-grid__card, .home-scroll-rail__dot, .portfolio-center-nav a"
      )
    ) {
      root.classList.add("is-hover");
    }
  });

  document.addEventListener("mouseout", function (e) {
    var rel = e.relatedTarget;
    if (dragZone && (!rel || !rel.closest || !rel.closest('[data-cursor="drag-x"]'))) {
      dragZone = null;
      root.classList.remove("is-drag-x", "is-drag-left", "is-drag-right");
    }
    if (!rel || !rel.closest || !rel.closest("a, button, [data-magnetic], .service-panel__close, .service-panel__cta, .portfolio-center-nav a")) {
      root.classList.remove("is-hover");
    }
  });

  document.querySelectorAll("a, button, [data-magnetic]").forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      if (!dragZone) root.classList.add("is-hover");
    });
    el.addEventListener("mouseleave", function () {
      root.classList.remove("is-hover");
    });
  });

  var lastDot = "";
  var lastRing = "";
  function tick() {
    rx += (cx - rx) * 0.12;
    ry += (cy - ry) * 0.12;
    if (dot) {
      var d = "translate3d(" + cx + "px, " + cy + "px, 0)";
      if (d !== lastDot) {
        lastDot = d;
        dot.style.transform = d;
      }
    }
    if (ring) {
      var r =
        "translate3d(" +
        Math.round(rx * 10) / 10 +
        "px, " +
        Math.round(ry * 10) / 10 +
        "px, 0)";
      if (r !== lastRing) {
        lastRing = r;
        ring.style.transform = r;
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
