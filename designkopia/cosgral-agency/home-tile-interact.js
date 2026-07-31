/**
 * Cursor-reactive tiles — tilt, liquid spotlight, video blur on service cards.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var cards = document.querySelectorAll(".services-fan__card[data-tile-interact]");
  if (!cards.length) return;

  cards.forEach(function (card) {
    var media = card.querySelector(".services-fan__card-media");
    var video = card.querySelector("video");

    card.addEventListener("mouseenter", function () {
      if (!card.classList.contains("is-active")) return;
      card.classList.add("is-hovered");
      if (video) video.play().catch(function () {});
    });

    card.addEventListener("mouseleave", function () {
      card.classList.remove("is-hovered", "is-cursor-active");
      card.style.setProperty("--lx", "50%");
      card.style.setProperty("--ly", "50%");
      if (media) media.style.transform = "";
      if (video && !card.classList.contains("is-active")) video.pause();
    });

    card.addEventListener("mousemove", function (e) {
      if (!card.classList.contains("is-active")) return;
      var r = card.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      var y = ((e.clientY - r.top) / r.height) * 100;
      var tiltY = ((x - 50) / 50) * 8;
      var tiltX = ((50 - y) / 50) * 6;

      card.classList.add("is-cursor-active");
      card.style.setProperty("--lx", x.toFixed(1) + "%");
      card.style.setProperty("--ly", y.toFixed(1) + "%");

      if (media) {
        var dx = (x - 50) / 50;
        var dy = (y - 50) / 50;
        media.style.transform =
          "translate(" + (dx * 14).toFixed(1) + "px, " + (dy * 14).toFixed(1) + "px) scale(1.14) rotateX(" +
          tiltX.toFixed(2) + "deg) rotateY(" + tiltY.toFixed(2) + "deg)";
      }
    });
  });

  document.querySelectorAll(".home-process__step[data-tile-interact]").forEach(function (step) {
    step.addEventListener("mousemove", function (e) {
      var r = step.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      var y = ((e.clientY - r.top) / r.height) * 100;
      step.style.setProperty("--lx", x.toFixed(1) + "%");
      step.style.setProperty("--ly", y.toFixed(1) + "%");
      step.classList.add("is-cursor-active");
    });
    step.addEventListener("mouseleave", function () {
      step.classList.remove("is-cursor-active");
    });
  });
})();
