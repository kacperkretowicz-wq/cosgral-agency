/**
 * Shared category theme layers — tabs + category subpages.
 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-portfolio-theme-stage]");
  if (!stage) return;

  var alwaysVideo = document.body.classList.contains("portfolio-theme-page--video");
  var alwaysGraphics = document.body.classList.contains("portfolio-theme-page--graphics");
  var alwaysSystems = document.body.classList.contains("portfolio-theme-page--systems");
  var alwaysWeb = document.body.classList.contains("portfolio-theme-page--web");

  function setupStream() {
    stage.querySelectorAll("[data-montaz-stream]").forEach(function (stream) {
      if (stream.classList.contains("is-ready")) return;
      var belt = stream.querySelector("[data-montaz-belt]");
      var set = stream.querySelector("[data-montaz-set]");
      if (!belt || !set) return;
      var clone = set.cloneNode(true);
      clone.removeAttribute("data-montaz-set");
      belt.appendChild(clone);
      stream.classList.add("is-ready");
    });
  }

  function syncLayerClasses(theme) {
    stage.querySelectorAll(".portfolio-theme-layer[data-theme-layer]").forEach(function (layer) {
      var key = layer.getAttribute("data-theme-layer");
      var on =
        key === theme ||
        (alwaysVideo && key === "video") ||
        (alwaysGraphics && key === "graphics") ||
        (alwaysSystems && key === "systems") ||
        (alwaysWeb && key === "web");
      layer.classList.toggle("is-theme-active", on);
    });
  }

  function syncVideos(active) {
    stage.querySelectorAll("[data-theme-video]").forEach(function (video) {
      if (active) {
        if (video.readyState < 2) {
          try {
            video.load();
          } catch (e) {}
        }
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      } else {
        try {
          video.pause();
        } catch (e) {}
      }
    });
  }

  function setActiveTheme(theme) {
    syncLayerClasses(theme);
    if (theme === "video" || alwaysVideo) {
      setupStream();
      syncVideos(true);
    } else {
      syncVideos(false);
    }
  }

  window.__portfolioThemeLayers = {
    setActiveTheme: setActiveTheme,
    setupStream: setupStream,
  };

  if (alwaysVideo) {
    setActiveTheme("video");
  } else if (alwaysGraphics) {
    setActiveTheme("graphics");
  } else if (alwaysSystems) {
    setActiveTheme("systems");
  } else if (alwaysWeb) {
    setActiveTheme("web");
  } else {
    var initial = document.body.getAttribute("data-tile-theme") || "web";
    setActiveTheme(initial);
  }

  window.addEventListener("portfolio-tile-theme", function (e) {
    var theme = e && e.detail && e.detail.theme;
    if (theme) setActiveTheme(theme);
  });
})();
