/**
 * COSGRAL V3 — pauza/wznowienie wideo-pętli [data-loop-video] (lustrzany sześcian
 * w akcie 1, klawisze w akcie 3) poza viewportem / przy karcie w tle.
 *
 * Ping-pong (naprzód -> od tyłu -> naprzód) jest WYPIECZONY w plikach
 * *-loop.mp4 (ffmpeg: forward + reverse sklejone w jedną pętlę), więc wystarczy
 * natywny atrybut loop — wcześniejsze cofanie currentTime z rAF dławiło się na
 * seekach w realnej przeglądarce i animacja nie była ciągła.
 * Wzorzec pause-poza-viewportem ten sam co w mesh-gradient-bg.js.
 */
(function () {
  "use strict";

  document.querySelectorAll("[data-loop-video]").forEach(function (video) {
    var inView = true;

    function sync() {
      if (inView && !document.hidden) video.play().catch(function () {});
      else video.pause();
    }

    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(video);

    document.addEventListener("visibilitychange", sync);
    sync();
  });
})();
