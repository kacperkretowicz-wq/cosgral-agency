/**
 * Services 3D fan carousel — arrow navigation, active card faces front.
 */
(function () {
  "use strict";

  var fan = document.querySelector("[data-services-fan]");
  if (!fan) return;

  var cards = Array.prototype.slice.call(fan.querySelectorAll(".services-fan__card"));
  var prevBtn = document.querySelector("[data-fan-prev]");
  var nextBtn = document.querySelector("[data-fan-next]");
  var counter = document.querySelector("[data-fan-counter]");
  var total = cards.length;
  var current = 0;
  var SPREAD = 52;
  var RADIUS = 420;
  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  function layout(animate) {
    cards.forEach(function (card, i) {
      var offset = i - current;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      var angle = offset * SPREAD;
      var rad = (angle * Math.PI) / 180;
      var tz = Math.cos(rad) * RADIUS - RADIUS + 40;
      var tx = Math.sin(rad) * RADIUS * 0.55;
      var rotY = -angle;
      var scale = offset === 0 ? 1 : 0.82;
      var opacity = Math.abs(offset) > 2 ? 0.25 : offset === 0 ? 1 : 0.55;
      var zIndex = 100 - Math.abs(offset);

      var transform = "translateX(" + tx + "px) translateZ(" + tz + "px) rotateY(" + rotY + "deg) scale(" + scale + ")";

      if (animate && window.gsap && !REDUCED) {
        gsap.to(card, {
          transform: transform,
          opacity: opacity,
          duration: 0.75,
          ease: "power3.out",
          overwrite: true,
        });
      } else {
        card.style.transform = transform;
        card.style.opacity = opacity;
      }

      card.style.zIndex = zIndex;
      card.classList.toggle("is-active", offset === 0);
      card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
      card.tabIndex = offset === 0 ? 0 : -1;

      var video = card.querySelector("video");
      if (video) {
        if (offset === 0) video.play().catch(function () {});
        else video.pause();
      }
    });

    if (counter) {
      counter.textContent = String(current + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    }
  }

  function go(dir) {
    current = (current + dir + total) % total;
    layout(true);
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

  document.addEventListener("keydown", function (e) {
    if (!fan.closest("section") || !isInView(fan)) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  function isInView(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  layout(false);

  window.addEventListener("resize", function () { layout(false); });
})();
