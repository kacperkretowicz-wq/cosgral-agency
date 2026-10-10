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

  function setActiveTheme(theme) {
    syncLayerClasses(theme);
  }

  window.__portfolioThemeLayers = {
    setActiveTheme: setActiveTheme,
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
