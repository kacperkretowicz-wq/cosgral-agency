/**
 * Realizacje — L→R category tabs + per-theme media backgrounds.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-portfolio-tiles]");
  if (!root) return;

  var scroller = root.querySelector("[data-portfolio-tiles-scroller]");
  var tiles = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile]"));
  var dots = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile-dot]"));
  if (!scroller || !tiles.length) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var activeIndex = -1;
  var slideTimers = [];
  var reelCompTimer = null;
  var wheelLock = 0;
  var pendingTheme = null;
  var depthRaf = 0;

  function clamp(i) {
    return Math.max(0, Math.min(tiles.length - 1, i));
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return r.left + r.width * 0.5;
  }

  function nearestIndex() {
    var mid = window.innerWidth * 0.5;
    var best = 0;
    var bestDist = Infinity;
    tiles.forEach(function (tile, i) {
      var d = Math.abs(centerOf(tile) - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function updateTileDepth() {
    if (REDUCED) return;
    var mid = window.innerWidth * 0.5;
    var span = Math.max(220, window.innerWidth * 0.42);
    tiles.forEach(function (tile, i) {
      var dist = (centerOf(tile) - mid) / span;
      var abs = Math.min(1.35, Math.abs(dist));
      var focus = 1 - Math.min(1, abs);
      var scale = 0.9 + focus * 0.16;
      var rot = Math.max(-11, Math.min(11, -dist * 10));
      var ty = -focus * 8;
      if (i === activeIndex) {
        scale = Math.max(scale, 1.06);
        rot *= 0.35;
        ty = Math.min(ty, -6);
      }
      tile.style.setProperty("--tile-scale", scale.toFixed(3));
      tile.style.setProperty("--tile-rotz", rot.toFixed(2) + "deg");
      tile.style.setProperty("--tile-ty", ty.toFixed(1) + "px");
    });
  }

  function clearSlides() {
    slideTimers.forEach(function (id) {
      window.clearInterval(id);
    });
    slideTimers = [];
    if (reelCompTimer) {
      window.clearInterval(reelCompTimer);
      reelCompTimer = null;
    }
  }

  function playTileSlides(tile) {
    var slides = Array.prototype.slice.call(tile.querySelectorAll("[data-tile-slide]"));
    if (!slides.length) return;
    var fast = tile.getAttribute("data-theme") === "graphics";
    var interval = fast ? 700 : 2600;
    if (slides.length < 2 || REDUCED) {
      slides.forEach(function (s, i) {
        s.classList.toggle("is-on", i === 0);
      });
      return;
    }
    var n = 0;
    slides.forEach(function (s, i) {
      s.classList.toggle("is-on", i === 0);
    });
    slideTimers.push(
      window.setInterval(function () {
        n = (n + 1) % slides.length;
        slides.forEach(function (s, i) {
          s.classList.toggle("is-on", i === n);
        });
      }, interval)
    );
  }

  function syncCardVideos(activeTile) {
    tiles.forEach(function (tile) {
      var isReelComp = !!tile.querySelector("[data-tile-reel-comp]");
      tile.querySelectorAll("[data-card-video]").forEach(function (video) {
        if (tile === activeTile && !isReelComp) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          try {
            video.pause();
          } catch (e) {}
        }
      });
    });
  }

  function playReelCompilation(tile) {
    var cells = Array.prototype.slice.call(tile.querySelectorAll("[data-reel-cell]"));
    if (!cells.length) return;
    cells.forEach(function (cell) {
      cell.classList.remove("is-playing");
      var v = cell.querySelector("video");
      if (v) {
        try {
          v.pause();
        } catch (e) {}
      }
    });
    if (REDUCED) {
      cells.slice(0, 3).forEach(function (cell) {
        cell.classList.add("is-playing");
      });
      return;
    }
    var n = 0;
    function activate(index) {
      cells.forEach(function (cell, i) {
        var on = i === index || i === (index + 3) % cells.length || i === (index + 7) % cells.length;
        cell.classList.toggle("is-playing", on);
        var video = cell.querySelector("video");
        if (!video) return;
        if (on) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          try {
            video.pause();
          } catch (e) {}
        }
      });
    }
    activate(0);
    reelCompTimer = window.setInterval(function () {
      n = (n + 1) % cells.length;
      activate(n);
    }, 1600);
  }

  function applyTheme(theme) {
    theme = theme || "web";
    pendingTheme = theme;
    document.body.setAttribute("data-tile-theme", theme);
    var light = theme === "systems" || theme === "graphics";
    document.body.classList.toggle("is-tile-bg-light", light);
    if (window.__portfolioTileBg && window.__portfolioTileBg.setTheme) {
      window.__portfolioTileBg.setTheme(theme);
    }
    if (window.__portfolioThemeLayers && window.__portfolioThemeLayers.setActiveTheme) {
      window.__portfolioThemeLayers.setActiveTheme(theme);
    }
    window.dispatchEvent(
      new CustomEvent("portfolio-tile-theme", { detail: { theme: theme } })
    );
  }

  function setActive(index, opts) {
    opts = opts || {};
    index = clamp(index);
    if (index === activeIndex && !opts.force) return;
    activeIndex = index;
    clearSlides();
    tiles.forEach(function (tile, i) {
      tile.classList.toggle("is-active", i === index);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-current", i === index ? "true" : "false");
    });
    var tile = tiles[index];
    applyTheme(tile.getAttribute("data-theme") || "web");
    syncCardVideos(tile);
    if (tile.querySelector("[data-tile-reel-comp]")) {
      playReelCompilation(tile);
    } else {
      playTileSlides(tile);
    }
    updateTileDepth();
  }

  function scrollToIndex(index, behavior) {
    index = clamp(index);
    var tile = tiles[index];
    if (!tile) return;
    var left = scroller.scrollLeft + (centerOf(tile) - window.innerWidth * 0.5);
    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: behavior || "smooth",
    });
    setActive(index, { force: true });
  }

  function syncFromScroll() {
    setActive(nearestIndex());
  }

  scroller.addEventListener(
    "scroll",
    function () {
      if (depthRaf) return;
      depthRaf = window.requestAnimationFrame(function () {
        depthRaf = 0;
        syncFromScroll();
        updateTileDepth();
      });
    },
    { passive: true }
  );

  window.addEventListener(
    "resize",
    function () {
      scrollToIndex(activeIndex < 0 ? 0 : activeIndex, "auto");
    },
    { passive: true }
  );

  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      scrollToIndex(i);
    });
  });

  window.addEventListener(
    "wheel",
    function (e) {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaY) < 1.2) return;
      e.preventDefault();
      var now = performance.now();
      if (now - wheelLock < 420) return;
      wheelLock = now;
      var next = activeIndex + (e.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= tiles.length) return;
      scrollToIndex(next);
    },
    { passive: false }
  );

  window.addEventListener("portfolio-tile-bg-ready", function () {
    if (pendingTheme) applyTheme(pendingTheme);
  });

  document.body.classList.add("portfolio-page--tiles");
  scrollToIndex(0, "auto");
  window.setTimeout(function () {
    scrollToIndex(0, "auto");
    if (pendingTheme) applyTheme(pendingTheme);
  }, 80);
  window.setTimeout(function () {
    if (pendingTheme) applyTheme(pendingTheme);
  }, 400);
})();
