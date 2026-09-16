/**
 * Magnetic custom cursor — desktop only.
 */
(function () {
  "use strict";

  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var root = document.querySelector("[data-cursor]");
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
  var cx = 0, cy = 0, rx = 0, ry = 0;

  document.addEventListener("mousemove", function (e) {
    cx = e.clientX;
    cy = e.clientY;
  });

  document.addEventListener("mouseover", function (e) {
    if (e.target.closest("a, button, [data-magnetic], [data-tile-interact], .footer-social__link, .service-panel__close, .service-panel__cta, .portfolio-web-card, .reels-tiles__card, .home-scroll-rail__dot")) {
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

  // Transform wpisujemy wprost (zamiast --cx/--cy → var() w CSS): jedna
  // właściwość na compositorze, bez pośredniego przeliczenia zmiennych; zapis
  // tylko gdy pozycja realnie się zmieniła (po zatrzymaniu myszy pierścień
  // dojeżdża i pętla przestaje dotykać DOM).
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
      var r = "translate3d(" + (Math.round(rx * 10) / 10) + "px, " + (Math.round(ry * 10) / 10) + "px, 0)";
      if (r !== lastRing) {
        lastRing = r;
        ring.style.transform = r;
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
