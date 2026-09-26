/**
 * Shared montaż / grafiki theme layers — works on tabs page and category subpages.
 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-portfolio-theme-stage]");
  if (!stage) return;

  var alwaysVideo = document.body.classList.contains("portfolio-theme-page--video");
  var alwaysGraphics = document.body.classList.contains("portfolio-theme-page--graphics");

  function setupRails() {
    stage.querySelectorAll("[data-montaz-rail]").forEach(function (rail) {
      if (rail.classList.contains("is-ready")) return;
      var track = rail.querySelector("[data-montaz-track]");
      var belt = rail.querySelector(".portfolio-montaz-rail__belt");
      if (!track || !belt) return;
      var clone = track.cloneNode(true);
      clone.removeAttribute("data-montaz-track");
      belt.appendChild(clone);
      rail.classList.add("is-ready");
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
    if (theme === "video" || alwaysVideo) {
      setupRails();
      syncVideos(true);
    } else {
      syncVideos(false);
    }
  }

  window.__portfolioThemeLayers = {
    setActiveTheme: setActiveTheme,
    setupRails: setupRails,
  };

  if (alwaysVideo) {
    setActiveTheme("video");
  } else if (alwaysGraphics) {
    setActiveTheme("graphics");
  }

  window.addEventListener("portfolio-tile-theme", function (e) {
    var theme = e && e.detail && e.detail.theme;
    if (theme) setActiveTheme(theme);
  });
})();
