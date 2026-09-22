/**
 * Portfolio — sterowanie odtwarzaniem MP4 (lazy load, limit dekoderów, pause poza viewportem).
 * Pause zachowuje currentTime — powrót na kafelek wznawia od miejsca pauzy.
 */
(function () {
  "use strict";

  var MAX_PLAYING = 3;
  var playing = [];
  var observed = new WeakSet();

  function shouldSkip(video) {
    return !!video.closest(".reels-tiles__track--clone");
  }

  function ensureSrc(video) {
    var src = video.getAttribute("data-video-src");
    if (!src || video.getAttribute("src")) return false;
    video.src = src;
    video.load();
    return true;
  }

  function showPausedFrame(video) {
    if (!video || shouldSkip(video)) return;
    if (!video.paused && !video.ended) return;
    ensureSrc(video);
    var settle = function () {
      try {
        if (!Number.isFinite(video.currentTime) || video.currentTime < 0.04) {
          video.currentTime = 0.08;
        }
      } catch (e) {}
      if (!video.paused) video.pause();
    };
    if (video.readyState >= 2) {
      settle();
      return;
    }
    var onReady = function () {
      video.removeEventListener("loadeddata", onReady);
      settle();
    };
    video.addEventListener("loadeddata", onReady);
  }

  function removeFromPlaying(video) {
    playing = playing.filter(function (v) {
      return v !== video;
    });
  }

  function pauseVideo(video) {
    if (!video) return;
    if (!video.paused) video.pause();
    removeFromPlaying(video);
  }

  function playVideo(video) {
    if (!video || shouldSkip(video)) return;
    ensureSrc(video);
    var idx = playing.indexOf(video);
    if (idx >= 0) {
      playing.splice(idx, 1);
      playing.unshift(video);
      if (video.paused) {
        var resume = video.play();
        if (resume && resume.catch) resume.catch(function () {});
      }
      return;
    }
    while (playing.length >= MAX_PLAYING) {
      pauseVideo(playing[playing.length - 1]);
    }
    var promise = video.play();
    if (promise && promise.then) {
      promise
        .then(function () {
          playing.unshift(video);
        })
        .catch(function () {});
    }
  }

  function prepareVideo(video) {
    if (!video || video.dataset.portfolioVideoBound) return;
    video.dataset.portfolioVideoBound = "1";
    video.removeAttribute("autoplay");
    if (!video.getAttribute("preload") || video.getAttribute("preload") === "none") {
      video.setAttribute("preload", "metadata");
    }
    if (!video.hasAttribute("data-portfolio-video")) {
      video.setAttribute("data-portfolio-video", "");
    }
  }

  var visibilityIo = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (shouldSkip(video)) return;
        if (video.dataset.videoMode === "focus-only") return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          playVideo(video);
        } else {
          pauseVideo(video);
        }
      });
    },
    { threshold: [0, 0.3, 0.55], rootMargin: "60px 0px" }
  );

  function register(video) {
    if (!video || video.tagName !== "VIDEO") return;
    prepareVideo(video);
    if (observed.has(video)) return;
    observed.add(video);
    if (video.dataset.videoMode !== "focus-only") {
      visibilityIo.observe(video);
    }
  }

  function scan(root) {
    (root || document).querySelectorAll("video[data-portfolio-video], video[data-video-src]").forEach(register);
  }

  function syncReelsFocus(stage) {
    if (!stage) return;
    stage.querySelectorAll(".reels-tiles__track--clone video").forEach(pauseVideo);
    var cards = stage.querySelectorAll(
      ".reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card, .reels-grid__card"
    );
    cards.forEach(function (card) {
      var video = card.querySelector("video");
      if (!video) return;
      if (card.classList.contains("is-in-focus")) {
        playVideo(video);
      } else {
        pauseVideo(video);
      }
    });
  }

  function pauseAllIn(root) {
    if (!root) return;
    root.querySelectorAll("video").forEach(pauseVideo);
  }

  function warmFramesIn(root) {
    if (!root) return;
    root.querySelectorAll("video[data-video-src], video[data-portfolio-video]").forEach(showPausedFrame);
  }

  function bindSectionPause(sectionId) {
    var section = document.getElementById(sectionId);
    if (!section) return;
    var sectionIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            pauseAllIn(section);
            return;
          }
          if (sectionId === "strony") warmFramesIn(section);
        });
      },
      { threshold: 0.02 }
    );
    sectionIo.observe(section);
  }

  function init() {
    scan();
    bindSectionPause("montaz");
    bindSectionPause("strony");
    bindSectionPause("grafiki");
    var strony = document.getElementById("strony");
    if (strony) warmFramesIn(strony);
  }

  window.CosgralPortfolioVideo = {
    register: register,
    scan: scan,
    syncReelsFocus: syncReelsFocus,
    play: playVideo,
    pause: pauseVideo,
    pauseAllIn: pauseAllIn,
    warmFrame: showPausedFrame,
    warmFramesIn: warmFramesIn,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("portfolio:media-ready", function () {
    scan();
  });
})();
