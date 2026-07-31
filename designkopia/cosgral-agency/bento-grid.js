/**
 * Magic UI–style Bento Grid — hover video + scroll reveal.
 */
(function () {
  "use strict";

  var grid = document.querySelector("[data-bento-grid]");
  if (!grid) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  grid.querySelectorAll(".bento-card video").forEach(function (v) {
    var card = v.closest(".bento-card");
    if (!card) return;
    card.addEventListener("mouseenter", function () {
      v.play().catch(function () {});
    });
    card.addEventListener("mouseleave", function () {
      v.pause();
    });
    card.addEventListener("focusin", function () {
      v.play().catch(function () {});
    });
    card.addEventListener("focusout", function () {
      v.pause();
    });
  });

  if (REDUCED || !window.gsap) return;

  (async function () {
    await window.cosgralSmoothScroll?.ready;
    gsap.utils.toArray(".bento-card").forEach(function (card, i) {
      gsap.fromTo(
        card,
        { opacity: 0, y: 56, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
          delay: i * 0.08,
          scrollTrigger: {
            trigger: card,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  })();
})();
