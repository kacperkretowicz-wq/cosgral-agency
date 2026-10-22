/**
 * Portfolio montaż — video tile grid + full gallery + lightbox.
 */
(function () {
  "use strict";

  var tilesRoot = document.getElementById("reels-tiles");
  var galleryRoot = document.getElementById("reels-gallery");
  var lightbox = document.getElementById("reels-lightbox");
  var lightboxNav = null;
  var MEDIA_VERSION = "20260814g";

  function mediaUrl(path) {
    if (!path) return "";
    if (path.indexOf("?") !== -1) return path;
    return path + "?v=" + MEDIA_VERSION;
  }

  function openLightbox(item, alt) {
    if (!lightbox) return;
    var video = lightbox.querySelector(".reels-lightbox__video");
    if (!video) return;
    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.pauseAllIn(document);
    video.pause();
    video.removeAttribute("src");
    video.src = item.full || item.src;
    if (item.poster) video.poster = item.poster;
    video.loop = false;
    video.muted = item.audio === false;
    if (!video.muted) {
      video.removeAttribute("muted");
      video.volume = 1;
    }
    video.hidden = false;
    video.currentTime = 0;
    var play = video.play();
    if (play && play.catch) play.catch(function () {});
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    var video = lightbox.querySelector(".reels-lightbox__video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.hidden = true;
    }
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-lightbox-open");
    if (lightboxNav) lightboxNav.reset();
  }

  function parseItem(el) {
    return {
      type: "video",
      src: el.getAttribute("data-reel-src"),
      full: el.getAttribute("data-reel-full") || el.getAttribute("data-reel-src"),
      poster: el.getAttribute("data-reel-poster") || "",
      audio: el.getAttribute("data-reel-audio") !== "false",
    };
  }

  function bindLightboxTriggers(root) {
    if (!root || !lightboxNav) return;
    root.querySelectorAll("[data-reel-src]").forEach(function (btn) {
      lightboxNav.bindTrigger(btn);
    });
  }

  function tileMedia(item, isClone) {
    if (isClone) {
      return (
        '<img class="reels-tiles__poster" src="' +
        (item.poster || mediaUrl(item.src)) +
        '" alt="" loading="lazy" decoding="async" />'
      );
    }
    return (
      '<video data-portfolio-video data-video-mode="focus-only" data-video-src="' +
      mediaUrl(item.src) +
      '" data-video-poster="' +
      /* perf: unversioned poster = the same URL the Montaż wall uses, so it downloads once */
      (item.poster || "") +
      '" muted loop playsinline preload="none"></video>'
    );
  }

  function tileMarkup(item, i, opts) {
    opts = opts || {};
    var cls =
      "reels-tiles__card" +
      (opts.size ? " reels-tiles__card--" + opts.size : "") +
      (opts.depth ? " reels-tiles__card--" + opts.depth : "");
    var lane = opts.lane != null ? opts.lane : 0;
    /* Preview na portfolio — tylko dekoracja (bez klików / lightbox) */
    return (
      '<div class="' +
      cls +
      '" style="--i:' +
      i +
      ";--lane:" +
      lane +
      '" aria-hidden="true">' +
      tileMedia(item, !!opts.isClone) +
      "</div>"
    );
  }

  function collectItems(data) {
    var all = [];
    (data.groups || []).forEach(function (group) {
      (group.items || []).forEach(function (item) {
        all.push(
          Object.assign({}, item, {
            client: group.name,
            id: group.id,
          })
        );
      });
    });
    return all;
  }

  function pickTiles(all, count) {
    if (!all.length) return [];
    if (all.length <= count) return all.slice();
    var picked = [];
    var step = all.length / count;
    for (var i = 0; i < count; i++) {
      picked.push(all[Math.floor(i * step)]);
    }
    return picked;
  }

  function renderTiles(data) {
    if (!tilesRoot) return;
    var allowed = { trove: true, wiktoria: true };
    var pool = collectItems(data).filter(function (item) {
      return !!allowed[item.id];
    });
    if (!pool.length && data.collage) {
      pool = data.collage.filter(function (item) {
        return !!allowed[item.id];
      });
    }
    if (!pool.length) return;

    var tiles = pool;
    var sizes = ["sm", "xl", "xs", "lg", "md", "sm", "xl", "xs", "md", "lg", "xs", "md", "xl", "sm", "lg", "md", "xs", "xl", "sm", "lg"];
    var depths = ["far", "near", "mid", "far", "near", "mid", "far", "near", "mid", "near", "far", "mid", "near", "far", "mid", "near", "far", "mid", "near", "far"];
    var lanes = [2, 0, 1, -1, 2, 0, -2, 1, 0, 2, -1, 1, 0, 2, -1, 0, 1, -2, 2, 0];

    var cards = "";
    var cloneCards = "";
    tiles.forEach(function (item, i) {
      var tileOpts = {
        size: sizes[i % sizes.length],
        depth: depths[i % depths.length],
        lane: lanes[i % lanes.length],
      };
      cards += tileMarkup(item, i, tileOpts);
      cloneCards += tileMarkup(item, i, Object.assign({}, tileOpts, { isClone: true }));
    });

    tilesRoot.innerHTML =
      '<div class="reels-tiles__stage">' +
      '<div class="reels-tiles__belt">' +
      '<div class="reels-tiles__track" aria-hidden="false">' +
      cards +
      "</div>" +
      '<div class="reels-tiles__track reels-tiles__track--clone" aria-hidden="true">' +
      cloneCards +
      "</div>" +
      "</div>" +
      "</div>";

    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.scan(tilesRoot);
    initTilePosters();
    initTilesEntrance();
    initTilesCenterFocus();
    syncDriftSpeed();
    document.dispatchEvent(new CustomEvent("portfolio:media-ready", { detail: { type: "reels" } }));
  }

  /* Stała prędkość w px/s — na mobile krótsza belka przy 52s wyglądała wolniej */
  var DRIFT_PX_PER_SEC = 48;
  var driftResizeBound = false;

  function syncDriftSpeed() {
    if (!tilesRoot) return;
    var belt = tilesRoot.querySelector(".reels-tiles__belt");
    var track = tilesRoot.querySelector(".reels-tiles__track:not(.reels-tiles__track--clone)");
    if (!belt || !track) return;
    var w = track.getBoundingClientRect().width;
    if (w < 40) return;
    var sec = Math.max(16, Math.min(90, w / DRIFT_PX_PER_SEC));
    belt.style.animationDuration = sec.toFixed(2) + "s";
    if (!driftResizeBound) {
      driftResizeBound = true;
      var t = 0;
      window.addEventListener(
        "resize",
        function () {
          window.clearTimeout(t);
          t = window.setTimeout(syncDriftSpeed, 120);
        },
        { passive: true }
      );
    }
  }

  function initTilesCenterFocus() {
    var stage = tilesRoot && tilesRoot.querySelector(".reels-tiles__stage");
    var section = document.getElementById("montaz");
    if (!stage || !section) return;

    if (document.body.classList.contains("reels-gallery-page")) return;

    var radius = cmToPx(7);
    var radiusSq = radius * radius;
    var inView = false, raf = 0, wasRunning = false;
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card"));
    function canRun() {
      var html = document.documentElement, body = document.body;
      return inView && !document.hidden && !html.classList.contains("is-nav-menu-open") &&
        !body.classList.contains("pf-wall-open") && !body.classList.contains("pf-gfx-open") &&
        !body.classList.contains("is-lightbox-open") &&
        !(body.classList.contains("portfolio-page--tiles") && !section.classList.contains("is-active"));
    }

    function updateFocus() {
      var cx = window.innerWidth * 0.5;
      var cy = window.innerHeight * 0.5;
      var focus = cards.map(function (card) {
        var rect = card.getBoundingClientRect();
        var dx = rect.left + rect.width * 0.5 - cx;
        var dy = rect.top + rect.height * 0.5 - cy;
        return dx * dx + dy * dy <= radiusSq;
      });
      cards.forEach(function (card, i) {
        if (card.classList.contains("is-in-focus") !== focus[i]) card.classList.toggle("is-in-focus", focus[i]);
      });
      if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.syncReelsFocus(stage);
    }

    function loop() {
      raf = 0;
      if (!canRun()) { syncActivity(); return; }
      updateFocus();
      raf = requestAnimationFrame(loop);
    }
    function syncActivity() {
      var running = canRun();
      if (running && !raf) raf = requestAnimationFrame(loop);
      else if (!running) {
        cancelAnimationFrame(raf); raf = 0;
        if (wasRunning) {
          cards.forEach(function (card) { card.classList.remove("is-in-focus"); });
          if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.pauseAllIn(stage);
        }
      }
      wasRunning = running;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
        });
        syncActivity();
      },
      { threshold: 0.05 }
    );

    io.observe(section);
    window.addEventListener("resize", syncActivity, { passive: true });
    window.addEventListener("pageshow", syncActivity, { passive: true });
    document.addEventListener("visibilitychange", syncActivity);
    if (window.MutationObserver) {
      var activity = new MutationObserver(syncActivity);
      [document.documentElement, document.body, section].forEach(function (node) {
        activity.observe(node, { attributes: true, attributeFilter: ["class"] });
      });
    }
  }

  function initTilePosters() {
    var section = document.getElementById("montaz") || tilesRoot;
    function prepare() {
      tilesRoot.querySelectorAll("video[data-video-poster]").forEach(function (video) {
        var poster = video.getAttribute("data-video-poster");
        if (poster) video.poster = poster;
        video.removeAttribute("data-video-poster");
      });
    }
    if (!window.IntersectionObserver) { prepare(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) { prepare(); io.disconnect(); }
    }, { rootMargin: "100% 0px" });
    io.observe(section);
  }

  function cmToPx(cm) {
    var probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:" + cm + "cm";
    document.documentElement.appendChild(probe);
    var px = probe.offsetWidth;
    probe.remove();
    return px;
  }

  function initTilesEntrance() {
    var section = document.getElementById("montaz");
    var reduced = document.documentElement.classList.contains("reduce-motion");
    if (!section || reduced) {
      tilesRoot.classList.add("is-ready");
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tilesRoot.classList.add("is-ready");
          io.disconnect();
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(section);
  }

  function renderGallery(data) {
    if (!galleryRoot || !data.groups) return;
    var html = "";
    data.groups.forEach(function (group) {
      if (!group.items || !group.items.length) return;
      html +=
        '<section class="reels-gallery__group" id="' +
        group.id +
        '">' +
        '<header class="reels-gallery__head container">' +
        '<h2 class="reels-gallery__title">' +
        group.name +
        "</h2>" +
        '<p class="reels-gallery__count">' +
        group.items.length +
        " " +
        (group.items.length === 1 ? "rolka" : "rolek") +
        "</p>" +
        "</header>" +
        '<div class="reels-masonry container">';

      group.items.forEach(function (item, idx) {
        html +=
          '<button type="button" class="reels-masonry__item" data-reel-src="' +
          mediaUrl(item.src) +
          '" data-reel-full="' +
          mediaUrl(item.full || item.src) +
          '" data-reel-poster="' +
          mediaUrl(item.poster || "") +
          '" data-reel-alt="' +
          group.name +
          " " +
          (idx + 1) +
          '" data-reel-audio="' +
          (item.audio === false ? "false" : "true") +
          '" style="--ar:' +
          (item.h / item.w).toFixed(4) +
          '">' +
          '<video data-portfolio-video data-video-src="' +
          mediaUrl(item.src) +
          '" poster="' +
          mediaUrl(item.poster || "") +
          '" muted loop playsinline preload="none"></video>' +
          "</button>";
      });

      html += "</div></section>";
    });

    galleryRoot.innerHTML = html;
    bindLightboxTriggers(galleryRoot);
    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.scan(galleryRoot);
    if (window.CosgralPortfolioColorZone && document.body.classList.contains("reels-gallery-page")) {
      window.CosgralPortfolioColorZone.watch(galleryRoot, ".reels-masonry__item", { observe: galleryRoot });
    }
  }

  function bindLightboxUi() {
    if (!lightbox) return;
    if (window.CosgralPortfolioLightboxNav) {
      lightboxNav = window.CosgralPortfolioLightboxNav.create({
        lightbox: lightbox,
        triggerSelector: "[data-reel-src]",
        altAttr: "data-reel-alt",
        pageScope: document,
        parseItem: parseItem,
        openItem: openLightbox,
      });
    }
    lightbox.querySelectorAll("[data-reel-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden || document.documentElement.classList.contains("is-nav-menu-open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (lightboxNav) lightboxNav.onKeydown(e);
    });
  }

  bindLightboxUi();

  fetch("portfolio-media/reels/manifest.json?v=20261018self1")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      renderTiles(data);
      renderGallery(data);
    })
    .catch(function (err) {
      console.warn("[portfolio-montaz]", err);
    });
})();
