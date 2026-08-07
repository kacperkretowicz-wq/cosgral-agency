/**
 * Portfolio graphics — scroll cinema (duża plansza + kamera) + gallery + lightbox.
 */
(function () {
  "use strict";

  var collageRoot = document.getElementById("graphics-collage");
  var galleryRoot = document.getElementById("graphics-gallery");
  var lightbox = document.getElementById("graphics-lightbox");
  var lightboxNav = null;

  var COLLAGE_COUNTS = {
    "juicy-events": 20,
    "far-east": 7,
    "safe-grant": 6,
    bts: 2,
  };

  var WORLD_W = 2600;
  var WORLD_H = 4200;

  /** 35 kafelków — ciaśniejsza siatka, różne rozmiary (w = mnożnik szerokości) */
  var WORLD = [
    { x: -580, y: -1080, s: 1.02, r: -4, w: 1.05, ar: 0.8 },
    { x: -168, y: -1160, s: 1.12, r: 3, w: 1.15, ar: 0.8 },
    { x: 248, y: -1030, s: 0.94, r: -2, w: 0.9, ar: 0.8 },
    { x: 610, y: -1110, s: 1.08, r: 5, w: 1.06, ar: 0.8 },
    { x: -498, y: -700, s: 0.88, r: 2, w: 0.46, ar: 0.8 },
    { x: -268, y: -635, s: 0.9, r: -3, w: 0.62, ar: 0.8 },
    { x: -38, y: -688, s: 0.86, r: 4, w: 0.82, ar: 0.8 },
    { x: 192, y: -658, s: 0.9, r: -2, w: 0.46, ar: 0.8 },
    { x: -402, y: -468, s: 0.92, r: 3, w: 0.62, ar: 0.8 },
    { x: -112, y: -505, s: 0.88, r: -4, w: 0.82, ar: 0.8 },
    { x: 152, y: -448, s: 0.9, r: 2, w: 0.46, ar: 0.8 },
    { x: 362, y: -485, s: 0.88, r: -3, w: 0.62, ar: 0.8 },
    { x: -288, y: -308, s: 0.92, r: 5, w: 0.82, ar: 0.8 },
    { x: 72, y: -332, s: 0.86, r: -2, w: 0.46, ar: 0.8 },
    { x: -452, y: -128, s: 1.0, r: -3, w: 1.04, ar: 0.8 },
    { x: -16, y: -72, s: 1.18, r: 2, w: 1.2, ar: 0.8 },
    { x: 372, y: -168, s: 0.92, r: -5, w: 0.92, ar: 0.8 },
    { x: 742, y: -64, s: 1.06, r: 4, w: 1.06, ar: 0.8 },
    { x: -242, y: 238, s: 0.94, r: -2, w: 0.62, ar: 0.8 },
    { x: 306, y: 286, s: 1.08, r: 3, w: 0.82, ar: 0.8 },
    { x: -630, y: 668, s: 1.0, r: 2, w: 0.82, ar: 0.8 },
    { x: -146, y: 728, s: 0.84, r: -4, w: 0.46, ar: 0.8 },
    { x: 268, y: 620, s: 1.12, r: 3, w: 1.42, ar: 0.8 },
    { x: 656, y: 748, s: 0.9, r: -2, w: 0.62, ar: 0.8 },
    { x: -352, y: 1048, s: 1.04, r: -3, w: 0.82, ar: 0.8 },
    { x: 418, y: 1080, s: 0.96, r: 4, w: 0.46, ar: 0.8 },
    { x: -88, y: 1180, s: 0.9, r: 2, w: 0.62, ar: 0.8 },
    { x: 248, y: 1140, s: 0.88, r: -3, w: 0.46, ar: 0.8 },
    { x: 580, y: 1200, s: 0.92, r: 4, w: 0.82, ar: 0.8 },
    { x: -420, y: 1320, s: 0.86, r: -2, w: 0.46, ar: 0.8 },
    { x: 40, y: 1360, s: 0.94, r: 3, w: 0.62, ar: 0.8 },
    { x: 460, y: 1300, s: 0.9, r: -4, w: 0.82, ar: 0.8 },
    { x: -260, y: 1480, s: 0.88, r: 2, w: 0.46, ar: 0.8 },
    { x: 200, y: 1520, s: 0.92, r: -3, w: 0.62, ar: 0.8 },
    { x: 620, y: 1450, s: 0.9, r: 4, w: 0.82, ar: 0.8 },
  ];

  var FOCUS_JUICY = [0, 1, 2, 3];
  var FOCUS_FAR = [18, 19, 20, 21];
  var EARLY_VISIBLE = [0, 1, 2, 3, 18, 19, 20, 21];

  function mediaMarkup(item, opts) {
    opts = opts || {};
    var alt = item.client || "Grafika";
    if (item.type === "video") {
      return (
        '<video class="' +
        (opts.videoClass || "") +
        '" data-portfolio-video data-video-src="' +
        item.src +
        '" poster="' +
        (item.poster || "") +
        '" muted loop playsinline preload="none"></video>'
      );
    }
    return (
      '<img class="' +
      (opts.imgClass || "") +
      '" src="' +
      item.src +
      '" alt="' +
      alt +
      '" loading="lazy" decoding="async" />'
    );
  }

  function openLightbox(item, alt) {
    if (!lightbox) return;
    var img = lightbox.querySelector(".graphics-lightbox__img");
    var video = lightbox.querySelector(".graphics-lightbox__video");
    if (!img || !video) return;

    img.hidden = true;
    video.hidden = true;
    img.removeAttribute("src");
    video.pause();
    video.removeAttribute("src");

    if (item.type === "video") {
      if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.pauseAllIn(document);
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
    } else {
      img.src = item.full || item.src;
      img.alt = alt || "";
      img.hidden = false;
    }

    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    var img = lightbox.querySelector(".graphics-lightbox__img");
    var video = lightbox.querySelector(".graphics-lightbox__video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.hidden = true;
    }
    if (img) {
      img.removeAttribute("src");
      img.hidden = true;
    }
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-lightbox-open");
    if (lightboxNav) lightboxNav.reset();
  }

  function parseItem(el) {
    return {
      type: el.getAttribute("data-lightbox-type") || "image",
      src: el.getAttribute("data-lightbox-src"),
      full: el.getAttribute("data-lightbox-full") || el.getAttribute("data-lightbox-src"),
      poster: el.getAttribute("data-lightbox-poster") || "",
      audio: el.getAttribute("data-lightbox-audio") !== "false",
    };
  }

  function bindLightboxTriggers(root) {
    if (!root || !lightboxNav) return;
    var selector = "[data-lightbox-src]";
    root.querySelectorAll(selector).forEach(function (btn) {
      lightboxNav.bindTrigger(btn);
    });
  }

  function itemAttrs(item, groupName, idx) {
    return (
      ' data-lightbox-type="' +
      (item.type || "image") +
      '" data-lightbox-src="' +
      item.src +
      '" data-lightbox-full="' +
      (item.full || item.src) +
      '" data-lightbox-poster="' +
      (item.poster || "") +
      '" data-lightbox-audio="' +
      (item.type === "video" && item.audio !== false ? "true" : "false") +
      '" data-lightbox-alt="' +
      groupName +
      " " +
      (idx + 1) +
      '"'
    );
  }

  function buildCollageItems(data) {
    var items = [];
    (data.groups || []).forEach(function (group) {
      var count = COLLAGE_COUNTS[group.id] || 0;
      if (!count) return;
      (group.items || []).slice(0, count).forEach(function (item, idx) {
        items.push(
          Object.assign({}, item, {
            client: group.name,
            id: group.id,
            collageIndex: items.length,
            groupIndex: idx,
          })
        );
      });
    });
    return items;
  }

  function clusterCenter(indices) {
    var sx = 0;
    var sy = 0;
    var n = 0;
    indices.forEach(function (i) {
      var p = WORLD[i];
      if (!p) return;
      sx += p.x;
      sy += p.y;
      n += 1;
    });
    return { x: sx / n, y: sy / n };
  }

  function cameraFocus(focus, scale) {
    return { x: -focus.x * scale, y: -focus.y * scale, scale: scale };
  }

  function placeTilesOnWorld(world, tiles, mobile) {
    var m = mobile ? 0.68 : 1;
    var spread = mobile ? 0.96 : 1.02;
    var baseW = mobile ? 158 : 232;
    var cx = WORLD_W * 0.5;
    var cy = WORLD_H * 0.5;

    tiles.forEach(function (tile) {
      var idx = Number(tile.getAttribute("data-idx"));
      var pos = WORLD[idx];
      if (!pos) return;
      var inner = tile.querySelector(".graphics-cinema__tile-inner");
      var media = tile.querySelector(".graphics-cinema__media");
      if (inner) inner.style.width = baseW * pos.w * m + "px";
      if (media) media.style.aspectRatio = String(pos.ar);

      var visibleEarly = EARLY_VISIBLE.indexOf(idx) >= 0;
      gsap.set(tile, {
        left: cx + pos.x * m * spread,
        top: cy + pos.y * m * spread,
        xPercent: -50,
        yPercent: -50,
        scale: pos.s,
        rotation: pos.r,
        opacity: visibleEarly ? 1 : 0,
        zIndex: Math.round(pos.s * 100) + idx,
      });
      if (media) gsap.set(media, { filter: "grayscale(0)" });
    });
  }

  function renderCollage(data) {
    if (!collageRoot) return;
    var items = buildCollageItems(data);
    if (!items.length) return;

    var tilesHtml = "";
    items.forEach(function (item, i) {
      tilesHtml +=
        '<button type="button" class="graphics-cinema__tile" data-idx="' +
        i +
        '"' +
        itemAttrs(item, item.client, item.groupIndex) +
        ">" +
        '<span class="graphics-cinema__tile-inner">' +
        mediaMarkup(item, { imgClass: "graphics-cinema__media", videoClass: "graphics-cinema__media" }) +
        "</span></button>";
    });

    collageRoot.innerHTML =
      '<div class="graphics-cinema">' +
      '<div class="graphics-cinema__viewport">' +
      '<div class="graphics-cinema__camera">' +
      '<div class="graphics-cinema__world" style="--world-w:' +
      WORLD_W +
      "px;--world-h:" +
      WORLD_H +
      'px">' +
      '<p class="graphics-cinema__watermark" aria-hidden="true">Kreacja</p>' +
      tilesHtml +
      "</div></div></div></div>";

    bindLightboxTriggers(collageRoot);
    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.scan(collageRoot);
    initCinemaScroll();
    initGrafikiBloom();
    document.dispatchEvent(new CustomEvent("portfolio:media-ready", { detail: { type: "graphics" } }));
  }

  function initCinemaScroll() {
    var reduced = document.documentElement.classList.contains("reduce-motion");
    var cinema = collageRoot && collageRoot.querySelector(".graphics-cinema");
    if (!cinema) return;

    var camera = cinema.querySelector(".graphics-cinema__camera");
    var world = cinema.querySelector(".graphics-cinema__world");
    var watermark = cinema.querySelector(".graphics-cinema__watermark");
    var tiles = cinema.querySelectorAll(".graphics-cinema__tile");
    var mobile = window.matchMedia("(max-width: 900px)").matches;

    if (reduced || !window.gsap || !window.ScrollTrigger) {
      cinema.classList.add("is-static");
      collageRoot.classList.add("is-ready");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    placeTilesOnWorld(world, tiles, mobile);

    var juicy = clusterCenter(FOCUS_JUICY);
    var far = clusterCenter(FOCUS_FAR);
    var m = mobile ? 0.68 : 1;
    var spread = mobile ? 0.96 : 1.02;
    juicy = { x: juicy.x * m * spread, y: juicy.y * m * spread };
    far = { x: far.x * m * spread, y: far.y * m * spread };

    var z1 = mobile ? 2.35 : 2.85;
    var z2 = mobile ? 2.15 : 2.55;
    var z3 = mobile ? 0.54 : 0.64;
    var z3wide = mobile ? 0.48 : 0.56;

    var start = cameraFocus(juicy, mobile ? 1.35 : 1.55);
    var act1 = cameraFocus(juicy, z1);
    var act2 = cameraFocus(far, z2);
    var act2b = { x: act2.x - (mobile ? 18 : 42), y: act2.y + (mobile ? 10 : 22), scale: z2 + 0.06 };
    var full = { x: 0, y: 0, scale: z3 };
    var fullWide = { x: 0, y: mobile ? 48 : 88, scale: z3wide };

    gsap.set(camera, start);
    if (watermark) gsap.set(watermark, { opacity: 0.07, scale: 1 });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: cinema,
        start: "top top",
        end: "+=720%",
        pin: true,
        scrub: 1.85,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(camera, Object.assign({ duration: 0.26, ease: "power1.inOut" }, act1), 0);
    tl.to(camera, Object.assign({ duration: 0.28, ease: "power2.inOut" }, act2), 0.24);
    tl.to(camera, Object.assign({ duration: 0.1, ease: "sine.inOut" }, act2b), 0.48);
    tl.to(camera, Object.assign({ duration: 0.28, ease: "power2.inOut" }, full), 0.54);
    tl.to(camera, Object.assign({ duration: 0.32, ease: "power1.inOut" }, fullWide), 0.76);

    if (watermark) {
      tl.to(watermark, { opacity: 0.11, scale: 1.04, duration: 0.28, ease: "power2.inOut" }, 0.54);
    }

    tiles.forEach(function (tile) {
      var idx = Number(tile.getAttribute("data-idx"));
      if (EARLY_VISIBLE.indexOf(idx) >= 0) return;
      var pos = WORLD[idx];
      if (!pos) return;
      tl.fromTo(
        tile,
        { opacity: 0, scale: pos.s * 0.72 },
        { opacity: 1, scale: pos.s, duration: 0.26, ease: "power2.out" },
        0.56 + (idx % 9) * 0.014
      );
    });

    collageRoot.classList.add("is-ready");

    window.addEventListener("load", function () {
      ScrollTrigger.refresh();
    });
  }

  var RAIL_LIGHT = {
    "--rail-track-edge": "rgba(255, 255, 255, 0.04)",
    "--rail-track-mid": "rgba(255, 255, 255, 0.14)",
    "--rail-fill-1": "rgba(255, 255, 255, 0.35)",
    "--rail-fill-2": "rgba(255, 255, 255, 0.85)",
    "--rail-fill-shadow": "rgba(255, 255, 255, 0.2)",
    "--rail-dot-border": "rgba(255, 255, 255, 0.28)",
    "--rail-dot-bg": "rgba(8, 8, 8, 0.65)",
    "--rail-dot-active-border": "rgba(255, 255, 255, 0.55)",
    "--rail-dot-active-bg": "rgba(255, 255, 255, 0.22)",
    "--rail-dot-hold-border": "rgba(255, 255, 255, 0.95)",
    "--rail-dot-hold-bg": "rgba(255, 255, 255, 0.92)",
    "--rail-dot-hold-shadow-1": "rgba(255, 255, 255, 0.08)",
    "--rail-dot-hold-shadow-2": "rgba(255, 255, 255, 0.35)",
    "--rail-title": "rgba(255, 255, 255, 0.52)",
    "--rail-title-hover": "rgba(255, 255, 255, 0.92)",
    "--rail-title-current": "rgba(255, 255, 255, 0.88)",
  };

  var RAIL_S1 = {
    "--rail-track-mid": "rgba(170, 170, 170, 0.16)",
    "--rail-fill-1": "rgba(190, 190, 190, 0.34)",
    "--rail-fill-2": "rgba(210, 210, 210, 0.78)",
    "--rail-fill-shadow": "rgba(180, 180, 180, 0.18)",
    "--rail-dot-border": "rgba(150, 150, 150, 0.34)",
    "--rail-dot-bg": "rgba(28, 28, 28, 0.58)",
    "--rail-dot-active-border": "rgba(170, 170, 170, 0.5)",
    "--rail-dot-active-bg": "rgba(220, 220, 220, 0.2)",
    "--rail-dot-hold-border": "rgba(200, 200, 200, 0.82)",
    "--rail-dot-hold-bg": "rgba(235, 235, 235, 0.82)",
    "--rail-dot-hold-shadow-1": "rgba(160, 160, 160, 0.1)",
    "--rail-dot-hold-shadow-2": "rgba(160, 160, 160, 0.28)",
    "--rail-title": "rgba(210, 210, 210, 0.58)",
    "--rail-title-hover": "rgba(240, 240, 240, 0.9)",
    "--rail-title-current": "rgba(230, 230, 230, 0.86)",
  };

  var RAIL_S2 = {
    "--rail-track-mid": "rgba(110, 110, 110, 0.2)",
    "--rail-fill-1": "rgba(90, 90, 90, 0.34)",
    "--rail-fill-2": "rgba(70, 70, 70, 0.72)",
    "--rail-fill-shadow": "rgba(80, 80, 80, 0.18)",
    "--rail-dot-border": "rgba(80, 80, 80, 0.42)",
    "--rail-dot-bg": "rgba(245, 245, 245, 0.72)",
    "--rail-dot-active-border": "rgba(60, 60, 60, 0.58)",
    "--rail-dot-active-bg": "rgba(30, 30, 30, 0.16)",
    "--rail-dot-hold-border": "rgba(40, 40, 40, 0.86)",
    "--rail-dot-hold-bg": "rgba(20, 20, 20, 0.78)",
    "--rail-dot-hold-shadow-1": "rgba(0, 0, 0, 0.06)",
    "--rail-dot-hold-shadow-2": "rgba(0, 0, 0, 0.22)",
    "--rail-title": "rgba(70, 70, 70, 0.62)",
    "--rail-title-hover": "rgba(20, 20, 20, 0.9)",
    "--rail-title-current": "rgba(35, 35, 35, 0.86)",
  };

  var RAIL_S3 = {
    "--rail-track-mid": "rgba(40, 40, 40, 0.22)",
    "--rail-fill-1": "rgba(30, 30, 30, 0.34)",
    "--rail-fill-2": "rgba(15, 15, 15, 0.78)",
    "--rail-fill-shadow": "rgba(0, 0, 0, 0.18)",
    "--rail-dot-border": "rgba(20, 20, 20, 0.48)",
    "--rail-dot-bg": "rgba(255, 255, 255, 0.84)",
    "--rail-dot-active-border": "rgba(0, 0, 0, 0.62)",
    "--rail-dot-active-bg": "rgba(0, 0, 0, 0.18)",
    "--rail-dot-hold-border": "rgba(0, 0, 0, 0.9)",
    "--rail-dot-hold-bg": "rgba(0, 0, 0, 0.84)",
    "--rail-dot-hold-shadow-1": "rgba(0, 0, 0, 0.07)",
    "--rail-dot-hold-shadow-2": "rgba(0, 0, 0, 0.28)",
    "--rail-title": "rgba(30, 30, 30, 0.66)",
    "--rail-title-hover": "rgba(0, 0, 0, 0.92)",
    "--rail-title-current": "rgba(10, 10, 10, 0.88)",
  };

  var RAIL_DARK = {
    "--rail-track-edge": "rgba(0, 0, 0, 0.05)",
    "--rail-track-mid": "rgba(0, 0, 0, 0.24)",
    "--rail-fill-1": "rgba(0, 0, 0, 0.32)",
    "--rail-fill-2": "rgba(0, 0, 0, 0.84)",
    "--rail-fill-shadow": "rgba(0, 0, 0, 0.22)",
    "--rail-dot-border": "rgba(0, 0, 0, 0.44)",
    "--rail-dot-bg": "rgba(255, 255, 255, 0.9)",
    "--rail-dot-active-border": "rgba(0, 0, 0, 0.68)",
    "--rail-dot-active-bg": "rgba(0, 0, 0, 0.22)",
    "--rail-dot-hold-border": "rgba(0, 0, 0, 0.95)",
    "--rail-dot-hold-bg": "rgba(0, 0, 0, 0.92)",
    "--rail-dot-hold-shadow-1": "rgba(0, 0, 0, 0.08)",
    "--rail-dot-hold-shadow-2": "rgba(0, 0, 0, 0.34)",
    "--rail-title": "rgba(0, 0, 0, 0.6)",
    "--rail-title-hover": "rgba(0, 0, 0, 0.94)",
    "--rail-title-current": "rgba(0, 0, 0, 0.9)",
  };

  function getScrollRail() {
    return document.querySelector(".portfolio-page [data-scroll-rail]");
  }

  function appendRailStage(timeline, vars, position, duration) {
    var rail = getScrollRail();
    if (!rail || !vars) return;
    timeline.to(rail, Object.assign({ ease: "none", duration: duration }, vars), position);
  }

  function initGrafikiBloom() {
    var section = document.getElementById("grafiki");
    if (!section || !window.gsap || !window.ScrollTrigger) return;

    var ambient = document.querySelector(".subpage-ambient");
    var blur = document.querySelector(".subpage-ambient__blur");
    var shade = document.querySelector(".subpage-ambient__shade");
    var cube = document.querySelector(".subpage-cube-portal");
    var bloom = document.getElementById("grafiki-bloom");

    gsap.set(shade, { backgroundColor: "rgba(3, 3, 3, 0.28)" });
    gsap.set(ambient, { filter: "grayscale(1) contrast(1.04) brightness(0.78)" });
    gsap.set(blur, { opacity: 0.55 });
    gsap.set(cube, { opacity: 0.68 });
    gsap.set(bloom, { opacity: 0 });
    var rail = getScrollRail();
    if (rail) gsap.set(rail, RAIL_LIGHT);

    var montazCta = document.querySelector("#montaz .reels-tiles__footer");
    var cinema = document.querySelector(".graphics-cinema");
    var grafikiCta = document.querySelector("#grafiki .graphics-collage__footer");
    var nextSection = document.getElementById("automatyzacje");
    var scrubSpeed = 3.4;

    var bloomTl = gsap.timeline({
      scrollTrigger: {
        trigger: montazCta || section,
        start: "bottom top",
        endTrigger: cinema || section,
        end: "top 35%",
        scrub: scrubSpeed,
      },
    });

    bloomTl
      .to(bloom, { opacity: 0.03, ease: "none", duration: 0.28 }, 0)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.06)", ease: "none", duration: 0.28 }, 0)
      .to(ambient, { filter: "grayscale(0.88) contrast(1.04) brightness(0.86)", ease: "none", duration: 0.28 }, 0)
      .to(blur, { opacity: 0.56, ease: "none", duration: 0.28 }, 0)
      .to(cube, { opacity: 0.6, ease: "none", duration: 0.28 }, 0)

      .to(bloom, { opacity: 0.1, ease: "none", duration: 0.24 }, 0.28)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.16)", ease: "none", duration: 0.24 }, 0.28)
      .to(ambient, { filter: "grayscale(0.62) contrast(1.03) brightness(1.08)", ease: "none", duration: 0.24 }, 0.28)
      .to(blur, { opacity: 0.6, ease: "none", duration: 0.24 }, 0.28)
      .to(cube, { opacity: 0.35, ease: "none", duration: 0.24 }, 0.28)

      .to(bloom, { opacity: 0.28, ease: "none", duration: 0.24 }, 0.52)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.38)", ease: "none", duration: 0.24 }, 0.52)
      .to(ambient, { filter: "grayscale(0.32) contrast(1.02) brightness(1.42)", ease: "none", duration: 0.24 }, 0.52)
      .to(blur, { opacity: 0.66, ease: "none", duration: 0.24 }, 0.52)
      .to(cube, { opacity: 0.12, ease: "none", duration: 0.24 }, 0.52)

      .to(bloom, { opacity: 0.56, ease: "none", duration: 0.24 }, 0.76)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.66)", ease: "none", duration: 0.24 }, 0.76)
      .to(ambient, { filter: "grayscale(0.12) contrast(1.02) brightness(1.82)", ease: "none", duration: 0.24 }, 0.76)
      .to(blur, { opacity: 0.72, ease: "none", duration: 0.24 }, 0.76)
      .to(cube, { opacity: 0, ease: "none", duration: 0.24 }, 0.76);

    appendRailStage(bloomTl, RAIL_S1, 0, 0.28);
    appendRailStage(bloomTl, RAIL_S2, 0.28, 0.24);
    appendRailStage(bloomTl, RAIL_S3, 0.52, 0.24);
    appendRailStage(bloomTl, RAIL_DARK, 0.76, 0.24);

    var darkenTl = gsap.timeline({
      scrollTrigger: {
        trigger: grafikiCta || section,
        start: "bottom top",
        endTrigger: nextSection || section,
        end: "top 35%",
        scrub: scrubSpeed,
      },
    });

    darkenTl
      .to(bloom, { opacity: 0.28, ease: "none", duration: 0.24 }, 0)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.38)", ease: "none", duration: 0.24 }, 0)
      .to(ambient, { filter: "grayscale(0.32) contrast(1.02) brightness(1.42)", ease: "none", duration: 0.24 }, 0)
      .to(blur, { opacity: 0.66, ease: "none", duration: 0.24 }, 0)
      .to(cube, { opacity: 0.12, ease: "none", duration: 0.24 }, 0)

      .to(bloom, { opacity: 0.1, ease: "none", duration: 0.24 }, 0.24)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.16)", ease: "none", duration: 0.24 }, 0.24)
      .to(ambient, { filter: "grayscale(0.62) contrast(1.03) brightness(1.08)", ease: "none", duration: 0.24 }, 0.24)
      .to(blur, { opacity: 0.6, ease: "none", duration: 0.24 }, 0.24)
      .to(cube, { opacity: 0.35, ease: "none", duration: 0.24 }, 0.24)

      .to(bloom, { opacity: 0.03, ease: "none", duration: 0.24 }, 0.48)
      .to(shade, { backgroundColor: "rgba(255, 255, 255, 0.06)", ease: "none", duration: 0.24 }, 0.48)
      .to(ambient, { filter: "grayscale(0.88) contrast(1.04) brightness(0.86)", ease: "none", duration: 0.24 }, 0.48)
      .to(blur, { opacity: 0.56, ease: "none", duration: 0.24 }, 0.48)
      .to(cube, { opacity: 0.6, ease: "none", duration: 0.24 }, 0.48)

      .to(bloom, { opacity: 0, ease: "none", duration: 0.28 }, 0.72)
      .to(shade, { backgroundColor: "rgba(3, 3, 3, 0.28)", ease: "none", duration: 0.28 }, 0.72)
      .to(ambient, { filter: "grayscale(1) contrast(1.04) brightness(0.78)", ease: "none", duration: 0.28 }, 0.72)
      .to(blur, { opacity: 0.55, ease: "none", duration: 0.28 }, 0.72)
      .to(cube, { opacity: 0.68, ease: "none", duration: 0.28 }, 0.72);

    appendRailStage(darkenTl, RAIL_S3, 0, 0.24);
    appendRailStage(darkenTl, RAIL_S2, 0.24, 0.24);
    appendRailStage(darkenTl, RAIL_S1, 0.48, 0.24);
    appendRailStage(darkenTl, RAIL_LIGHT, 0.72, 0.28);

    ScrollTrigger.create({
      trigger: section,
      start: "top 32%",
      endTrigger: grafikiCta || section,
      end: "bottom top",
      onEnter: function () {
        document.body.classList.add("is-grafiki-light");
      },
      onLeave: function () {
        document.body.classList.remove("is-grafiki-light");
      },
      onEnterBack: function () {
        document.body.classList.add("is-grafiki-light");
      },
      onLeaveBack: function () {
        document.body.classList.remove("is-grafiki-light");
      },
    });
  }

  function renderGallery(data) {
    if (!galleryRoot || !data.groups) return;
    var html = "";

    data.groups.forEach(function (group) {
      if (!group.items || !group.items.length) return;
      html +=
        '<section class="graphics-gallery__group" id="' +
        group.id +
        '">' +
        '<header class="graphics-gallery__head container">' +
        '<h2 class="graphics-gallery__title">' +
        group.name +
        "</h2>" +
        '<p class="graphics-gallery__count">' +
        group.items.length +
        " " +
        (group.items.length === 1 ? "grafika" : "grafik") +
        "</p>" +
        "</header>" +
        '<div class="graphics-masonry container">';

      group.items.forEach(function (item, idx) {
        var media =
          item.type === "video"
            ? '<video data-portfolio-video data-video-src="' +
              item.src +
              '" poster="' +
              (item.poster || "") +
              '" muted loop playsinline preload="none"></video>'
            : '<img src="' + item.src + '" alt="" loading="lazy" decoding="async" />';

        html +=
          '<button type="button" class="graphics-masonry__item' +
          (item.type === "video" ? " is-video" : "") +
          '"' +
          itemAttrs(item, group.name, idx) +
          ' style="--ar:' +
          (item.h / item.w).toFixed(4) +
          '">' +
          media +
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
        triggerSelector: "[data-lightbox-src]",
        altAttr: "data-lightbox-alt",
        pageScope: document,
        parseItem: parseItem,
        openItem: openLightbox,
      });
    }
    lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (lightboxNav) lightboxNav.onKeydown(e);
    });
  }

  bindLightboxUi();

  fetch("portfolio/graphics/manifest.json?v=20260807ai")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      renderCollage(data);
      renderGallery(data);
    })
    .catch(function (err) {
      console.warn("[portfolio-graphics]", err);
    });
})();
