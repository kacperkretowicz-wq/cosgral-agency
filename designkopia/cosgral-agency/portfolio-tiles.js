/**
 * Realizacje — equal tiles + theme stage backgrounds.
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
  var webClipTimer = null;
  var systemsRaf = 0;
  var systemsRunning = false;
  var reelsReady = false;

  var WEB_CLIPS = [
    "portfolio-media/showcase/web/juicy-events.mp4",
    "portfolio-media/showcase/web/trove-archive.mp4",
    "portfolio-media/showcase/web/mj-social-media.mp4",
  ];

  /* Wiktoria (orlincy) + TROVE (reklamy) */
  var REEL_POOL = [
    { src: "portfolio-media/reels/orlincy/001.mp4", poster: "portfolio-media/reels/orlincy/001-poster.jpg" },
    { src: "portfolio-media/reels/reklamy/001.mp4", poster: "portfolio-media/reels/reklamy/001-poster.jpg" },
    { src: "portfolio-media/reels/orlincy/002.mp4", poster: "portfolio-media/reels/orlincy/002-poster.jpg" },
    { src: "portfolio-media/reels/reklamy/002.mp4", poster: "portfolio-media/reels/reklamy/002-poster.jpg" },
    { src: "portfolio-media/reels/orlincy/003.mp4", poster: "portfolio-media/reels/orlincy/003-poster.jpg" },
    { src: "portfolio-media/reels/reklamy/003.mp4", poster: "portfolio-media/reels/reklamy/003-poster.jpg" },
    { src: "portfolio-media/reels/orlincy/004.mp4", poster: "portfolio-media/reels/orlincy/004-poster.jpg" },
    { src: "portfolio-media/reels/reklamy/004.mp4", poster: "portfolio-media/reels/reklamy/004-poster.jpg" },
    { src: "portfolio-media/reels/orlincy/005.mp4", poster: "portfolio-media/reels/orlincy/005-poster.jpg" },
    { src: "portfolio-media/reels/reklamy/005.mp4", poster: "portfolio-media/reels/reklamy/005-poster.jpg" },
    { src: "portfolio-media/reels/orlincy/006.mp4", poster: "portfolio-media/reels/orlincy/006-poster.jpg" },
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

  /* ——— Web mosaic: random clip windows ——— */
  function jumpWebClip(video) {
    if (!video || !video.duration || !isFinite(video.duration)) return;
    var span = Math.max(2.2, Math.min(5.5, video.duration * 0.18));
    var maxStart = Math.max(0.2, video.duration - span);
    video.currentTime = Math.random() * maxStart;
    var play = video.play();
    if (play && play.catch) play.catch(function () {});
  }

  function bootWebMosaic() {
    var cells = document.querySelectorAll("[data-stage-web-mosaic] video");
    cells.forEach(function (video, i) {
      var src = video.getAttribute("data-web-clip") || WEB_CLIPS[i % WEB_CLIPS.length];
      if (!video.getAttribute("src")) video.src = src;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.addEventListener(
        "loadedmetadata",
        function () {
          jumpWebClip(video);
        },
        { once: true }
      );
      try {
        video.load();
      } catch (e) {}
    });
  }

  function startWebClips() {
    stopWebClips();
    var cells = document.querySelectorAll("[data-stage-web-mosaic] video");
    cells.forEach(function (video) {
      jumpWebClip(video);
    });
    if (REDUCED) return;
    webClipTimer = window.setInterval(function () {
      var list = Array.prototype.slice.call(cells);
      if (!list.length) return;
      var pick = list[Math.floor(Math.random() * list.length)];
      /* sometimes swap source for more variety */
      if (Math.random() > 0.55) {
        var next = WEB_CLIPS[Math.floor(Math.random() * WEB_CLIPS.length)];
        if (pick.getAttribute("src") !== next) {
          pick.src = next;
          pick.addEventListener(
            "loadedmetadata",
            function () {
              jumpWebClip(pick);
            },
            { once: true }
          );
          return;
        }
      }
      jumpWebClip(pick);
    }, 2800);
  }

  function stopWebClips() {
    if (webClipTimer) {
      window.clearInterval(webClipTimer);
      webClipTimer = null;
    }
    document.querySelectorAll("[data-stage-web-mosaic] video").forEach(function (video) {
      try {
        video.pause();
      } catch (e) {}
    });
  }

  /* ——— Systems: B/W thinking lines ——— */
  function bootSystemsCanvas() {
    var canvas = document.querySelector("[data-stage-systems-canvas]");
    if (!canvas) return null;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var lines = [];
    var w = 0;
    var h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!lines.length) {
        for (var i = 0; i < 36; i++) {
          lines.push({
            y: Math.random() * h,
            amp: 6 + Math.random() * 56,
            freq: 0.0012 + Math.random() * 0.0055,
            speed: 0.35 + Math.random() * 1.1,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.1 + Math.random() * 0.35,
            width: 0.5 + Math.random() * 1.8,
          });
        }
      }
    }

    function frame(t) {
      if (!systemsRunning) return;
      systemsRaf = window.requestAnimationFrame(frame);
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      var time = t * 0.001;
      lines.forEach(function (line) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(245,245,245," + line.alpha.toFixed(3) + ")";
        ctx.lineWidth = line.width;
        for (var x = 0; x <= w; x += 6) {
          var y =
            line.y +
            Math.sin(x * line.freq + time * line.speed + line.phase) * line.amp +
            Math.sin(x * line.freq * 2.2 - time * line.speed * 0.7) * (line.amp * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        line.y += Math.sin(time * 0.2 + line.phase) * 0.08;
        if (line.y < -40) line.y = h + 20;
        if (line.y > h + 40) line.y = -20;
      });
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return {
      start: function () {
        if (systemsRunning) return;
        systemsRunning = true;
        systemsRaf = window.requestAnimationFrame(frame);
      },
      stop: function () {
        systemsRunning = false;
        if (systemsRaf) window.cancelAnimationFrame(systemsRaf);
        systemsRaf = 0;
      },
    };
  }

  var systemsApi = bootSystemsCanvas();

  /* ——— Montaż reels field ——— */
  function buildReelsField() {
    var host = document.querySelector("[data-stage-reels]");
    if (!host || reelsReady) return;
    reelsReady = true;
    var depths = ["near", "mid", "far", "mid", "far", "near", "mid", "far"];
    function rowHtml(mod) {
      var cards = "";
      for (var i = 0; i < 8; i++) {
        var item = REEL_POOL[(i + mod * 3) % REEL_POOL.length];
        var depth = depths[i % depths.length];
        cards +=
          '<div class="stage-reel-card stage-reel-card--' +
          depth +
          '">' +
          '<video muted loop playsinline preload="metadata" poster="' +
          item.poster +
          '" data-reel-src="' +
          item.src +
          '"></video>' +
          "</div>";
      }
      return cards + cards + cards;
    }
    host.innerHTML =
      '<div class="stage-reels-row stage-reels-row--a">' +
      rowHtml(0) +
      "</div>" +
      '<div class="stage-reels-row stage-reels-row--b">' +
      rowHtml(1) +
      "</div>" +
      '<div class="stage-reels-row stage-reels-row--c">' +
      rowHtml(2) +
      "</div>";
  }

  function setReelsPlaying(on) {
    var videos = document.querySelectorAll("[data-stage-reels] video");
    videos.forEach(function (video, i) {
      if (on) {
        if (!video.getAttribute("src")) {
          video.src = video.getAttribute("data-reel-src");
        }
        /* play a subset for perf */
        if (i % 2 === 0 || window.innerWidth > 900) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        }
      } else {
        try {
          video.pause();
        } catch (e) {}
      }
    });
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-tile-theme", theme || "web");
    stopWebClips();
    if (systemsApi) systemsApi.stop();
    setReelsPlaying(false);

    if (theme === "web") {
      startWebClips();
    } else if (theme === "systems") {
      if (systemsApi) systemsApi.start();
    } else if (theme === "video") {
      buildReelsField();
      setReelsPlaying(true);
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
  bootWebMosaic();
  buildReelsField();
  scrollToIndex(0, "auto");
  window.setTimeout(function () {
    scrollToIndex(0, "auto");
  }, 80);
})();
