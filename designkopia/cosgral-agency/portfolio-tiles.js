/**
 * Realizacje — equal glass tiles + theme stage backgrounds.
 * Web / Montaż: one full-bleed film cut from random source windows.
 * Grafiki: drifting JUICY collage.
 * Systems: bright WebGL cube stage (portfolio-systems-stage.js).
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

  var WEB_CLIPS = [
    "portfolio-media/showcase/web/juicy-events.mp4",
    "portfolio-media/showcase/web/trove-archive.mp4",
    "portfolio-media/showcase/web/mj-social-media.mp4",
  ];

  var REEL_CLIPS = [
    "portfolio-media/reels/orlincy/001.mp4",
    "portfolio-media/reels/reklamy/001.mp4",
    "portfolio-media/reels/orlincy/002.mp4",
    "portfolio-media/reels/reklamy/002.mp4",
    "portfolio-media/reels/orlincy/003.mp4",
    "portfolio-media/reels/reklamy/003.mp4",
    "portfolio-media/reels/orlincy/004.mp4",
    "portfolio-media/reels/reklamy/004.mp4",
    "portfolio-media/reels/orlincy/005.mp4",
    "portfolio-media/reels/reklamy/005.mp4",
    "portfolio-media/reels/orlincy/006.mp4",
  ];

  var JUICY_IMGS = [];
  for (var j = 1; j <= 18; j++) {
    var id = j < 10 ? "00" + j : j < 100 ? "0" + j : String(j);
    JUICY_IMGS.push("portfolio-media/graphics/juicy-events/" + id + ".jpg");
  }

  /* Brand-board collage slots (Auras-like asymmetric identity board) */
  var JUICY_SLOTS = [
    { x: 4, y: 6, w: 22, rot: -8, z: 3 },
    { x: 28, y: 3, w: 18, rot: 4, z: 2 },
    { x: 50, y: 8, w: 26, rot: -3, z: 4 },
    { x: 78, y: 4, w: 18, rot: 7, z: 2 },
    { x: 8, y: 38, w: 20, rot: 5, z: 2 },
    { x: 32, y: 34, w: 24, rot: -6, z: 5 },
    { x: 58, y: 40, w: 16, rot: 9, z: 1 },
    { x: 76, y: 36, w: 20, rot: -4, z: 3 },
    { x: 2, y: 68, w: 24, rot: 3, z: 2 },
    { x: 30, y: 66, w: 18, rot: -9, z: 4 },
    { x: 52, y: 70, w: 22, rot: 6, z: 3 },
    { x: 76, y: 64, w: 20, rot: -2, z: 2 },
    { x: 18, y: 18, w: 14, rot: 12, z: 6 },
    { x: 66, y: 22, w: 15, rot: -11, z: 5 },
  ];

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

  /* ——— Full-bleed film cutters (one video, hard cuts between windows) ——— */
  function createFilmCutter(video, pool, opts) {
    opts = opts || {};
    var holdMin = opts.holdMin || 2.1;
    var holdMax = opts.holdMax || 3.8;
    var timer = null;
    var busy = false;
    var lastSrc = "";

    function pickSrc() {
      if (!pool.length) return "";
      var next = pool[Math.floor(Math.random() * pool.length)];
      if (pool.length > 1 && next === lastSrc) {
        next = pool[Math.floor(Math.random() * pool.length)];
      }
      lastSrc = next;
      return next;
    }

    function jumpWindow() {
      if (!video.duration || !isFinite(video.duration)) return;
      var span = Math.max(holdMin, Math.min(holdMax, video.duration * 0.22));
      var maxStart = Math.max(0.15, video.duration - span);
      video.currentTime = Math.random() * maxStart;
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    }

    function scheduleNext() {
      if (timer) window.clearTimeout(timer);
      if (REDUCED) return;
      var wait = (holdMin + Math.random() * (holdMax - holdMin)) * 1000;
      timer = window.setTimeout(cut, wait);
    }

    function cut() {
      if (busy) return;
      busy = true;
      var src = pickSrc();
      if (!src) {
        busy = false;
        return;
      }
      if (video.getAttribute("src") !== src) {
        video.src = src;
        video.addEventListener(
          "loadedmetadata",
          function () {
            jumpWindow();
            busy = false;
            scheduleNext();
          },
          { once: true }
        );
        try {
          video.load();
        } catch (e) {
          busy = false;
        }
        return;
      }
      jumpWindow();
      busy = false;
      scheduleNext();
    }

    return {
      start: function () {
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        if (!video.getAttribute("src")) {
          video.src = pickSrc();
          video.addEventListener(
            "loadedmetadata",
            function () {
              jumpWindow();
              scheduleNext();
            },
            { once: true }
          );
          try {
            video.load();
          } catch (e) {}
        } else {
          jumpWindow();
          scheduleNext();
        }
      },
      stop: function () {
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
        try {
          video.pause();
        } catch (e) {}
      },
    };
  }

  var webVideo = document.querySelector("[data-stage-web-film]");
  var reelVideo = document.querySelector("[data-stage-reel-film]");
  var webFilm = webVideo ? createFilmCutter(webVideo, WEB_CLIPS, { holdMin: 2.2, holdMax: 3.6 }) : null;
  var reelFilm = reelVideo
    ? createFilmCutter(reelVideo, REEL_CLIPS, { holdMin: 1.8, holdMax: 3.2 })
    : null;

  /* ——— JUICY drifting collage ——— */
  function buildJuicyField() {
    var host = document.querySelector("[data-stage-juicy]");
    if (!host || host.getAttribute("data-ready") === "1") return;
    host.setAttribute("data-ready", "1");
    var html = "";
    JUICY_SLOTS.forEach(function (slot, i) {
      var src = JUICY_IMGS[i % JUICY_IMGS.length];
      var drift = 14 + (i % 5) * 3;
      var delay = -((i * 1.7) % drift);
      html +=
        '<div class="stage-juicy-card" style="' +
        "left:" +
        slot.x +
        "%;top:" +
        slot.y +
        "%;width:" +
        slot.w +
        "vw;--rot:" +
        slot.rot +
        "deg;--z:" +
        slot.z +
        ";--drift:" +
        drift +
        "s;--delay:" +
        delay +
        's;z-index:' +
        slot.z +
        '">' +
        '<img src="' +
        src +
        '" alt="" loading="lazy" decoding="async" />' +
        "</div>";
    });
    host.innerHTML = html;
  }

  function systemsApi() {
    return window.__portfolioSystemsStage || null;
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-tile-theme", theme || "web");
    if (webFilm) webFilm.stop();
    if (reelFilm) reelFilm.stop();
    var sys = systemsApi();
    if (sys) sys.stop();

    if (theme === "web") {
      if (webFilm) webFilm.start();
    } else if (theme === "systems") {
      (function trySystems(n) {
        var api = systemsApi();
        if (api) {
          api.resize();
          api.start();
          return;
        }
        if (n < 40) window.setTimeout(function () { trySystems(n + 1); }, 50);
      })(0);
    } else if (theme === "video") {
      if (reelFilm) reelFilm.start();
    } else if (theme === "graphics") {
      buildJuicyField();
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
    var theme = tiles[index].getAttribute("data-theme") || "web";
    applyTheme(theme);
    playTileSlides(tiles[index]);
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
      var sys = systemsApi();
      if (sys && document.body.getAttribute("data-tile-theme") === "systems") sys.resize();
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
  buildJuicyField();
  scrollToIndex(0, "auto");
  window.setTimeout(function () {
    scrollToIndex(0, "auto");
  }, 80);
})();
