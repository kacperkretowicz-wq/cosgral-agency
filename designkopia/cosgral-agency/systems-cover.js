(function () {
  "use strict";
  var video = document.querySelector(".auto-cover__video");
  if (!video) return;

  var reduced =
    document.documentElement.classList.contains("reduce-motion") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("autoplay", "");

  if (reduced) return;

  var trying = false;
  function play() {
    if (trying || !video.paused) return;
    trying = true;
    var p = video.play();
    if (p && p.then) {
      p.then(function () {
        trying = false;
      }).catch(function () {
        trying = false;
      });
    } else {
      trying = false;
    }
  }

  function inView() {
    var rect = video.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    return rect.bottom > vh * 0.08 && rect.top < vh * 0.92;
  }

  function playIfVisible() {
    if (inView()) play();
    else if (!video.paused) video.pause();
  }

  if (video.readyState >= 2) playIfVisible();
  video.addEventListener("canplay", playIfVisible);
  video.addEventListener("loadeddata", playIfVisible);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) play();
          else video.pause();
        });
      },
      { threshold: [0, 0.12, 0.35], rootMargin: "20% 0px" }
    );
    io.observe(video);
  }

  ["pointerdown", "touchstart", "click"].forEach(function (ev) {
    window.addEventListener(ev, playIfVisible, { passive: true });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") playIfVisible();
  });
})();
