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

  if (!video.getAttribute("src")) {
    video.setAttribute("src", theme.video);
  }

  function play() {
    if (REDUCED) return;
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
})();
