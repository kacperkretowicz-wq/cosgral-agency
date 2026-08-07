/**
 * Portfolio montaż — video tile grid + full gallery + lightbox.
 */
(function () {
  "use strict";

  var tilesRoot = document.getElementById("reels-tiles");
  var galleryRoot = document.getElementById("reels-gallery");
  var lightbox = document.getElementById("reels-lightbox");
  var lightboxNav = null;

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
        (item.poster || item.src) +
        '" alt="" loading="lazy" decoding="async" />'
      );
    }
    return (
      '<video data-portfolio-video data-video-mode="focus-only" data-video-src="' +
      item.src +
      '" poster="' +
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
    return (
      '<button type="button" class="' +
      cls +
      '" style="--i:' +
      i +
      ";--lane:" +
      lane +
      '" data-reel-src="' +
      item.src +
      '" data-reel-full="' +
      (item.full || item.src) +
      '" data-reel-poster="' +
      (item.poster || "") +
      '" data-reel-alt="' +
      (item.client || "Rolka") +
      '" data-reel-audio="' +
      (item.audio === false ? "false" : "true") +
      '">' +
      tileMedia(item, !!opts.isClone) +
      "</button>"
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
    var pool = collectItems(data);
    if (!pool.length && data.collage) pool = data.collage.slice();
    if (!pool.length) return;

    var tiles = pickTiles(pool, 20);
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

    bindLightboxTriggers(tilesRoot);
    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.scan(tilesRoot);
    initTilesEntrance();
    initTilesCenterFocus();
    document.dispatchEvent(new CustomEvent("portfolio:media-ready", { detail: { type: "reels" } }));
  }

  function cmToPx(cm) {
    var probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:" + cm + "cm";
    document.documentElement.appendChild(probe);
    var px = probe.offsetWidth;
    probe.remove();
    return px;
  }

  function initTilesCenterFocus() {
    var stage = tilesRoot && tilesRoot.querySelector(".reels-tiles__stage");
    var section = document.getElementById("montaz");
    if (!stage || !section) return;

    var radius = cmToPx(7);
    var radiusSq = radius * radius;
    var running = false;

    function updateFocus() {
      var cx = window.innerWidth * 0.5;
      var cy = window.innerHeight * 0.5;
      stage.querySelectorAll(".reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card").forEach(function (card) {
        var rect = card.getBoundingClientRect();
        var dx = rect.left + rect.width * 0.5 - cx;
        var dy = rect.top + rect.height * 0.5 - cy;
        card.classList.toggle("is-in-focus", dx * dx + dy * dy <= radiusSq);
      });
      if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.syncReelsFocus(stage);
    }

    function loop() {
      if (!running) return;
      updateFocus();
      requestAnimationFrame(loop);
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!running) {
              running = true;
              requestAnimationFrame(loop);
            }
          } else {
            running = false;
            stage.querySelectorAll(".reels-tiles__card.is-in-focus").forEach(function (card) {
              card.classList.remove("is-in-focus");
            });
            if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.pauseAllIn(stage);
          }
        });
      },
      { threshold: 0.05 }
    );

    io.observe(section);
    window.addEventListener("resize", updateFocus);
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
          item.src +
          '" data-reel-full="' +
          (item.full || item.src) +
          '" data-reel-poster="' +
          (item.poster || "") +
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
          item.src +
          '" poster="' +
          (item.poster || "") +
          '" muted loop playsinline preload="none"></video>' +
          "</button>";
      });

      html += "</div></section>";
    });

    galleryRoot.innerHTML = html;
    bindLightboxTriggers(galleryRoot);
    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.scan(galleryRoot);
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
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (lightboxNav) lightboxNav.onKeydown(e);
    });
  }

  bindLightboxUi();

  fetch("portfolio/reels/manifest.json?v=20260807ap")
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
