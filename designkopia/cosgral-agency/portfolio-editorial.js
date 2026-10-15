/**
 * Realizacje — page behaviour. Two small things only: the systems rows expand
 * in place, and a reel swaps its poster for video while the pointer is on it.
 * Everything else (reveals, tone wipes, smooth scroll) comes from the shared
 * editorial system the homepage already uses.
 */
(function () {
  "use strict";

  /* ——— Systems: one row open at a time ——— */
  var rows = Array.prototype.slice.call(document.querySelectorAll("[data-sys-row]"));
  rows.forEach(function (row) {
    row.addEventListener("click", function () {
      var wasOpen = row.classList.contains("is-open");
      rows.forEach(function (r) {
        r.classList.remove("is-open");
        r.setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        row.classList.add("is-open");
        row.setAttribute("aria-expanded", "true");
      }
    });
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        row.click();
      }
    });
  });

  /* ——— Reels: poster until hovered, then the clip itself ——— */
  var reels = Array.prototype.slice.call(document.querySelectorAll("[data-reel]"));
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    reels.forEach(function (reel) {
      var src = reel.getAttribute("data-reel");
      var video = null;

      reel.addEventListener("pointerenter", function () {
        if (!video) {
          video = document.createElement("video");
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "none";
          video.src = src;
          reel.appendChild(video);
        }
        reel.classList.add("is-playing");
        var play = video.play();
        if (play && play.catch) play.catch(function () { /* autoplay refused — poster stays */ });
      });

      reel.addEventListener("pointerleave", function () {
        reel.classList.remove("is-playing");
        if (video) video.pause();
      });
    });
  }
})();
