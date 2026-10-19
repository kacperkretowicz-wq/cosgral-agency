/**
 * Filmik z kafelka usługi jako tło podstrony (z kolorystycznym tintem).
 */
(function () {
  "use strict";

  if (!document.body || !document.body.classList.contains("service-page")) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var themeId = document.body.getAttribute("data-service-theme");
  var theme = window.cosgralServiceThemes?.themes?.[themeId];
  var video = document.querySelector(".service-page-video__media");

  if (!video || !theme?.video) return;
  var inView = true;
  var suspended = false;

  if (!video.getAttribute("src")) {
    video.setAttribute("src", theme.video);
  }

  function play() {
    if (REDUCED || document.hidden || suspended || !inView || !video.paused) return;
    video.play().catch(function () {});
  }

  function pause() {
    video.pause();
  }

  if (video.readyState >= 2) play();
  else video.addEventListener("loadeddata", play, { once: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
    else play();
  });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) play(); else pause();
    }).observe(video);
  }
  window.addEventListener("pagehide", function () { suspended = true; pause(); });
  window.addEventListener("pageshow", function () { suspended = false; play(); });
})();
