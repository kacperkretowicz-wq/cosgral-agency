(function () {
  "use strict";

  var shell = document.getElementById("page-scroll-shell");
  var video = document.querySelector("[data-hero-bg-video]");

  if (!shell) return;

  document.body.classList.add("has-page-scroll-bg");

  function playVideo() {
    if (!video || document.documentElement.classList.contains("reduce-motion")) return;
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }

  if (video) {
    video.addEventListener("ended", function () {
      video.currentTime = 0;
      playVideo();
    });
    playVideo();
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) playVideo();
    });
  }

})();
