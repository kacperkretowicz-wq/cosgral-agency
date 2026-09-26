/**
 * Realizacje — L→R category tabs over theme WebGL backgrounds.
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
  var wheelLock = 0;

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

  function clearSlides() {
    slideTimers.forEach(function (id) {
      window.clearInterval(id);
    });
    slideTimers = [];
  }

  function playTileSlides(tile) {
    var slides = Array.prototype.slice.call(tile.querySelectorAll("[data-tile-slide]"));
    if (!slides.length) return;
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
      }, 2600)
    );
  }

  function syncVideos(activeTile) {
    tiles.forEach(function (tile) {
      tile.querySelectorAll("[data-card-video]").forEach(function (video) {
        if (tile === activeTile) {
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

  function applyTheme(theme) {
    document.body.setAttribute("data-tile-theme", theme || "web");
    if (window.__portfolioTileBg && window.__portfolioTileBg.setTheme) {
      window.__portfolioTileBg.setTheme(theme || "web");
    }
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
    syncVideos(tile);
    playTileSlides(tile);
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
      window.requestAnimationFrame(syncFromScroll);
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

  document.body.classList.add("portfolio-page--tiles");
  scrollToIndex(0, "auto");
  window.setTimeout(function () {
    scrollToIndex(0, "auto");
  }, 80);
})();
