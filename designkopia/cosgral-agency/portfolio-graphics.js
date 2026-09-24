/**
 * Portfolio graphics — scroll cinema (duża plansza + kamera) + gallery + lightbox.
 */
(function () {
  "use strict";

  var grafikiMenuState = {
    bloomTl: null,
    darkenTl: null,
    cube: null,
    triggers: [],
  };

  function syncGrafikiCubeFade() {
    if (!document.body.classList.contains("is-grafiki-zone")) return;
    if (!window.cosgralCube?.setGrafikiFade) return;
    window.cosgralCube.setGrafikiFade(0);
  }

  function restoreCubePortalOutsideGrafiki() {
    var cube = grafikiMenuState.cube;
    if (!cube) return;
    if (window.gsap) {
      gsap.set(cube, { clearProps: "opacity,visibility" });
    } else {
      cube.style.removeProperty("opacity");
      cube.style.removeProperty("visibility");
    }
  }

  function refreshGrafikiBloomState() {
    if (!window.ScrollTrigger) return;
    grafikiMenuState.triggers.forEach(function (st) {
      if (st) st.update();
    });
    ScrollTrigger.update();
    syncGrafikiCubeFade();
  }

  window.addEventListener("cosgral:cube-menu", function (e) {
    if (e.detail && e.detail.open) return;
    refreshGrafikiBloomState();
    requestAnimationFrame(refreshGrafikiBloomState);
  });

  var collageRoot = document.getElementById("graphics-brands-cards") || document.getElementById("graphics-collage");
  var brandsRoot = document.getElementById("graphics-brands");
  var galleryRoot = document.getElementById("graphics-gallery");
  var lightbox = document.getElementById("graphics-lightbox");
  var lightboxNav = null;

  var COLLAGE_COUNTS = {
    "juicy-events": 3,
    "far-east": 2,
    bts: 1,
  };

  var BRANDS_WORD = {
    pl: ["GRA", "FI", "KI"],
    en: ["VI", "SU", "ALS"],
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
  var FOCUS_HERO_END = [0, 1, 2, 3, 18, 19, 22, 23];
  var EARLY_VISIBLE = [0, 1, 2, 3, 18, 19, 20, 21, 22, 23];
  var INTRO_TILES = FOCUS_JUICY.slice();

  function isLeftIntroTile(idx) {
    return idx === 0 || idx === 1;
  }

  function findCinemaTile(tiles, idx) {
    for (var i = 0; i < tiles.length; i++) {
      if (Number(tiles[i].getAttribute("data-idx")) === idx) return tiles[i];
    }
    return null;
  }

  function resetCinemaTilesForBeat(tiles, beat) {
    if (!window.gsap || !tiles.length) return;
    tiles.forEach(function (tile) {
      var idx = Number(tile.getAttribute("data-idx"));
      var pos = WORLD[idx];
      if (!pos) return;
      if (beat === 0) {
        gsap.set(tile, { opacity: 0, x: 0, scale: pos.s, rotation: pos.r });
        return;
      }
      gsap.set(tile, { opacity: 1, x: 0, scale: pos.s, rotation: pos.r });
    });
  }

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
    var spread = mobile ? 1.02 : 1.14;
    var baseW = mobile ? 172 : 272;
    var cx = WORLD_W * 0.5;
    var cy = WORLD_H * 0.5;
    var cluster = clusterCenter(FOCUS_HERO_END);
    var fx = cluster.x * m * spread;
    var fy = cluster.y * m * spread - (mobile ? 40 : 80);
    var clearW = mobile ? 320 : 640;
    var clearH = mobile ? 260 : 400;

    tiles.forEach(function (tile) {
      var idx = Number(tile.getAttribute("data-idx"));
      var pos = WORLD[idx];
      if (!pos) return;
      var inner = tile.querySelector(".graphics-cinema__tile-inner");
      var media = tile.querySelector(".graphics-cinema__media");
      if (inner) inner.style.width = baseW * pos.w * m + "px";
      if (media) media.style.aspectRatio = String(pos.ar);

      var tx = pos.x * m * spread;
      var ty = pos.y * m * spread;
      var tileW = baseW * pos.w * m * pos.s;
      var tileH = tileW / (pos.ar || 0.8);
      var hw = tileW * 0.5;
      var hh = tileH * 0.5;
      var ox = clearW * 0.5 + hw - Math.abs(tx - fx);
      var oy = clearH * 0.5 + hh - Math.abs(ty - fy);
      if (ox > 0 && oy > 0) {
        var dx = tx - fx;
        var dy = ty - fy;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) dx = idx % 2 === 0 ? -1 : 1;
        var nx = dx / (clearW * 0.5 + hw);
        var ny = dy / (clearH * 0.5 + hh);
        var d = Math.sqrt(nx * nx + ny * ny) || 0.01;
        var push = 1.18 / d;
        tx = fx + dx * push;
        ty = fy + dy * push;
      }

      gsap.set(tile, {
        left: cx + tx,
        top: cy + ty,
        xPercent: -50,
        yPercent: -50,
        scale: pos.s,
        rotation: pos.r,
        opacity: 0,
        x: 0,
        zIndex: Math.round(pos.s * 100) + idx,
      });
      if (media) gsap.set(media, { filter: "grayscale(0)" });
    });
  }

  function getBrandsLang() {
    if (window.cosgralI18n && typeof window.cosgralI18n.getLang === "function") {
      return window.cosgralI18n.getLang() === "en" ? "en" : "pl";
    }
    return (document.documentElement.lang || "pl").toLowerCase().indexOf("en") === 0 ? "en" : "pl";
  }

  function syncBrandsWord() {
    var word = document.querySelector("[data-graphics-brands-word]");
    if (!word) return;
    var parts = BRANDS_WORD[getBrandsLang()] || BRANDS_WORD.pl;
    var chunks = word.querySelectorAll(".graphics-brands__chunk");
    if (chunks[0]) chunks[0].textContent = parts[0];
    if (chunks[1]) chunks[1].textContent = parts[1];
    if (chunks[2]) chunks[2].textContent = parts[2];
    word.setAttribute("aria-label", parts.join(""));
  }

  function renderCollage(data) {
    if (!brandsRoot || !collageRoot) return;
    var items = buildCollageItems(data).slice(0, 6);
    if (!items.length) return;

    /* Stable layout slots matching Locomotive Brands pin (6 floating cards). */
    var slots = [
      { x: 8, y: 14, w: 15, ar: "1 / 1" },
      { x: 38, y: 6, w: 13, ar: "3 / 4" },
      { x: 72, y: 10, w: 12, ar: "9 / 16" },
      { x: 10, y: 62, w: 16, ar: "1 / 1" },
      { x: 42, y: 68, w: 14, ar: "5 / 4" },
      { x: 74, y: 58, w: 16, ar: "1 / 1" },
    ];

    var html = "";
    items.forEach(function (item, i) {
      var slot = slots[i] || slots[slots.length - 1];
      html +=
        '<button type="button" class="graphics-brands__card" data-brands-card="' +
        i +
        '" style="--bx:' +
        slot.x +
        "%;--by:" +
        slot.y +
        "%;--bw:" +
        slot.w +
        "%;--bar:" +
        slot.ar +
        ';"' +
        itemAttrs(item, item.client, item.groupIndex) +
        ">" +
        mediaMarkup(item, { imgClass: "graphics-brands__media", videoClass: "graphics-brands__media" }) +
        "</button>";
    });

    collageRoot.innerHTML = html;
    syncBrandsWord();
    bindLightboxTriggers(collageRoot);
    if (window.CosgralPortfolioVideo) window.CosgralPortfolioVideo.scan(collageRoot);
    initBrandsMotion();
    initGrafikiBloom();
    document.dispatchEvent(new CustomEvent("portfolio:media-ready", { detail: { type: "graphics" } }));
  }

  /**
   * Locomotive MTL “Brands” kinetic type — frame-accurate loop for GRAFIKI / VISUALS.
   * Center chunk stays put; outer chunks orbit: home → horizontal → 4 diagonals → horizontal → home.
   */
  function initBrandsMotion() {
    var section = document.getElementById("grafiki");
    var stage = brandsRoot && brandsRoot.querySelector(".graphics-brands__stage");
    var chunkA = brandsRoot && brandsRoot.querySelector(".graphics-brands__chunk--a");
    var chunkB = brandsRoot && brandsRoot.querySelector(".graphics-brands__chunk--b");
    var chunkC = brandsRoot && brandsRoot.querySelector(".graphics-brands__chunk--c");
    var cards = collageRoot ? collageRoot.querySelectorAll(".graphics-brands__card") : [];
    if (!section || !stage || !chunkA || !chunkB || !chunkC) return;

    section.classList.add("is-grafiki-frames", "is-grafiki-brands");
    brandsRoot.classList.add("is-ready");

    var reduced = document.documentElement.classList.contains("reduce-motion");
    var mobile = window.matchMedia("(max-width: 900px)").matches;

    function stubStepper(pinST) {
      window.cosgralGrafikiStepper = {
        refresh: function () {
          if (pinST) pinST.refresh();
        },
        snapToHold: function () {},
        revealHold: function () {},
        transitionToBeat: function () {},
        resetForReentry: function () {
          if (window._grafikiBrandsTl) window._grafikiBrandsTl.progress(0);
        },
        getBeat: function () {
          return 1;
        },
        isAnimating: function () {
          return false;
        },
        getPassDown: function () {
          return true;
        },
        getPassUp: function () {
          return true;
        },
        suspendHold: function () {},
        getHoldY: function () {
          return pinST ? pinST.start : 0;
        },
        syncCubeFade: syncGrafikiCubeFade,
      };
    }

    if (reduced || !window.gsap) {
      stubStepper(null);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var w = window.innerWidth;
    var h = window.innerHeight;
    var vx = mobile ? 0.3 : 0.36;
    var vy = mobile ? 0.24 : 0.3;
    var hx = mobile ? 0.32 : 0.4;

    function measureHome() {
      gsap.set([chunkA, chunkB, chunkC], { x: 0, y: 0, xPercent: -50, yPercent: -50 });
      var wa = chunkA.offsetWidth || chunkA.getBoundingClientRect().width;
      var wb = chunkB.offsetWidth || chunkB.getBoundingClientRect().width;
      var wc = chunkC.offsetWidth || chunkC.getBoundingClientRect().width;
      return {
        a: { x: -(wb * 0.5 + wa * 0.5), y: 0 },
        c: { x: wb * 0.5 + wc * 0.5, y: 0 },
      };
    }

    var home = measureHome();
    var textPos = {
      midL: { x: -hx * w, y: 0 },
      midR: { x: hx * w, y: 0 },
      TL: { x: -vx * w, y: -vy * h },
      TR: { x: vx * w, y: -vy * h },
      BL: { x: -vx * w, y: vy * h },
      BR: { x: vx * w, y: vy * h },
    };

    var cardLayouts = [
      [
        { l: 8, t: 12, s: 1, z: 2 },
        { l: 38, t: 5, s: 1.05, z: 3 },
        { l: 74, t: 10, s: 0.95, z: 2 },
        { l: 9, t: 62, s: 1, z: 2 },
        { l: 42, t: 68, s: 0.95, z: 2 },
        { l: 74, t: 58, s: 1.05, z: 3 },
      ],
      [
        { l: 6, t: 8, s: 0.85, z: 2 },
        { l: 34, t: 4, s: 1.35, z: 5 },
        { l: 78, t: 8, s: 0.9, z: 2 },
        { l: 8, t: 66, s: 0.95, z: 2 },
        { l: 44, t: 72, s: 0.85, z: 2 },
        { l: 76, t: 62, s: 0.95, z: 2 },
      ],
      [
        { l: 22, t: 18, s: 0.9, z: 2 },
        { l: 40, t: 8, s: 0.8, z: 2 },
        { l: 78, t: 6, s: 1.05, z: 3 },
        { l: 8, t: 58, s: 0.9, z: 2 },
        { l: 38, t: 62, s: 1.3, z: 5 },
        { l: 72, t: 52, s: 1.1, z: 3 },
      ],
      [
        { l: 8, t: 6, s: 0.85, z: 2 },
        { l: 28, t: 8, s: 0.75, z: 2 },
        { l: 70, t: 4, s: 1.05, z: 3 },
        { l: 10, t: 64, s: 0.9, z: 2 },
        { l: 36, t: 70, s: 0.85, z: 2 },
        { l: 58, t: 28, s: 1.55, z: 6 },
      ],
      [
        { l: 6, t: 8, s: 0.9, z: 2 },
        { l: 24, t: 10, s: 0.8, z: 2 },
        { l: 62, t: 4, s: 1.4, z: 6 },
        { l: 10, t: 60, s: 1.05, z: 3 },
        { l: 40, t: 66, s: 0.95, z: 2 },
        { l: 76, t: 58, s: 0.95, z: 2 },
      ],
      [
        { l: 10, t: 10, s: 0.95, z: 2 },
        { l: 36, t: 6, s: 1.1, z: 3 },
        { l: 74, t: 8, s: 1, z: 2 },
        { l: 10, t: 64, s: 1, z: 2 },
        { l: 42, t: 70, s: 0.95, z: 2 },
        { l: 74, t: 60, s: 1, z: 2 },
      ],
      [
        { l: 8, t: 12, s: 1, z: 2 },
        { l: 38, t: 5, s: 1.05, z: 3 },
        { l: 74, t: 10, s: 0.95, z: 2 },
        { l: 9, t: 62, s: 1, z: 2 },
        { l: 42, t: 68, s: 0.95, z: 2 },
        { l: 74, t: 58, s: 1.05, z: 3 },
      ],
    ];

    var tl;

    function applyCardLayout(layout, extras) {
      extras = extras || {};
      cards.forEach(function (card, i) {
        var slot = layout[i] || layout[0];
        var props = {
          left: slot.l + "%",
          top: slot.t + "%",
          scale: slot.s,
          zIndex: slot.z,
          x: 0,
          y: 0,
          rotate: (i % 2 === 0 ? -1.2 : 1.1) * (0.4 + i * 0.15),
          duration: extras.duration != null ? extras.duration : 1,
          ease: extras.ease || "power2.inOut",
        };
        if (extras.immediate) gsap.set(card, props);
        else tl.to(card, props, extras.at);
      });
    }

    gsap.set([chunkA, chunkB, chunkC], { xPercent: -50, yPercent: -50 });
    gsap.set(chunkB, { x: 0, y: 0 });
    gsap.set(chunkA, { x: home.a.x, y: home.a.y });
    gsap.set(chunkC, { x: home.c.x, y: home.c.y });
    applyCardLayout(cardLayouts[0], { immediate: true });

    var overlay = section.querySelector(".graphics-stage__overlay--brands");
    var framesCta = section.querySelector("[data-graphics-frames-cta]");
    if (overlay) gsap.set(overlay, { autoAlpha: 0 });
    if (framesCta) gsap.set(framesCta, { autoAlpha: 0, y: 18 });

    tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        id: "grafiki-pin",
        trigger: section,
        start: "top top",
        end: mobile ? "+=240%" : "+=280%",
        pin: true,
        pinSpacing: true,
        scrub: 0.75,
        anticipatePin: 0.4,
        invalidateOnRefresh: true,
        refreshPriority: -1,
        onEnter: function () {
          document.body.classList.add("is-grafiki-zone");
        },
        onEnterBack: function () {
          document.body.classList.add("is-grafiki-zone");
        },
      },
    });

    window._grafikiBrandsTl = tl;
    var pinST = tl.scrollTrigger;

    tl.to({}, { duration: 0.35 });
    tl.to(chunkA, { x: textPos.midL.x, y: textPos.midL.y, duration: 1 }, ">");
    tl.to(chunkC, { x: textPos.midR.x, y: textPos.midR.y, duration: 1 }, "<");
    applyCardLayout(cardLayouts[1], { at: "<", duration: 1 });
    tl.to({}, { duration: 0.35 });

    tl.to(chunkA, { x: textPos.TL.x, y: textPos.TL.y, duration: 1 });
    tl.to(chunkC, { x: textPos.BR.x, y: textPos.BR.y, duration: 1 }, "<");
    applyCardLayout(cardLayouts[2], { at: "<", duration: 1 });
    tl.to({}, { duration: 0.4 });

    tl.to(chunkA, { x: textPos.BR.x, y: textPos.BR.y, duration: 1 });
    tl.to(chunkC, { x: textPos.TL.x, y: textPos.TL.y, duration: 1 }, "<");
    applyCardLayout(cardLayouts[3], { at: "<", duration: 1 });
    tl.to({}, { duration: 0.4 });

    tl.to(chunkA, { x: textPos.BL.x, y: textPos.BL.y, duration: 1 });
    tl.to(chunkC, { x: textPos.TR.x, y: textPos.TR.y, duration: 1 }, "<");
    applyCardLayout(cardLayouts[4], { at: "<", duration: 1 });
    tl.to({}, { duration: 0.35 });

    tl.to(chunkA, { x: textPos.midL.x, y: textPos.midL.y, duration: 1 });
    tl.to(chunkC, { x: textPos.midR.x, y: textPos.midR.y, duration: 1 }, "<");
    applyCardLayout(cardLayouts[5], { at: "<", duration: 1 });
    tl.to({}, { duration: 0.3 });

    tl.to(chunkA, {
      x: function () { return measureHome().a.x; },
      y: 0,
      duration: 0.9,
    });
    tl.to(chunkC, {
      x: function () { return measureHome().c.x; },
      y: 0,
      duration: 0.9,
    }, "<");
    applyCardLayout(cardLayouts[6], { at: "<", duration: 0.9 });
    if (overlay) tl.to(overlay, { autoAlpha: 1, duration: 0.5 }, "-=0.35");
    if (framesCta) tl.to(framesCta, { autoAlpha: 1, y: 0, duration: 0.5 }, "<");
    tl.to({}, { duration: 0.55 });

    stubStepper(pinST);

    document.addEventListener("cosgral:lang", function () {
      syncBrandsWord();
      var h2 = measureHome();
      var p = tl.progress();
      if (p < 0.08 || p > 0.92) {
        gsap.set(chunkA, { x: h2.a.x, y: 0 });
        gsap.set(chunkC, { x: h2.c.x, y: 0 });
      }
    });
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest && e.target.closest("[data-i18n-lang-btn]");
      if (btn) setTimeout(syncBrandsWord, 40);
    });

    window.addEventListener("load", function () {
      ScrollTrigger.refresh();
      if (window.cosgralGrafikiStepper && window.cosgralGrafikiStepper.refresh) {
        window.cosgralGrafikiStepper.refresh();
      }
      if (window.cosgralPortfolioRail && window.cosgralPortfolioRail.refresh) {
        window.cosgralPortfolioRail.refresh();
      }
    });
  }

  /**
   * Frames scrub: kafelki wlatują i układają się, kamera odjeżdża.
   */
  function buildCinemaTimeline(camera, watermark, tiles) {
    var mobile = window.matchMedia("(max-width: 900px)").matches;
    var heroEnd = clusterCenter(FOCUS_HERO_END);
    var m = mobile ? 0.68 : 1;
    var spread = mobile ? 1.02 : 1.14;
    heroEnd = { x: heroEnd.x * m * spread, y: heroEnd.y * m * spread - (mobile ? 40 : 80) };
    var endScale = mobile ? 0.78 : 0.92;
    var startScale = mobile ? 1.55 : 1.85;
    var start = cameraFocus(clusterCenter(FOCUS_JUICY), startScale);
    var mid = cameraFocus(clusterCenter(FOCUS_FAR), mobile ? 1.15 : 1.28);
    var full = cameraFocus(heroEnd, endScale);

    gsap.set(camera, start);
    if (watermark) gsap.set(watermark, { opacity: 0, scale: 0.92 });

    var tileArr = Array.prototype.slice.call(tiles);
    tileArr.forEach(function (tile, i) {
      var idx = Number(tile.getAttribute("data-idx"));
      var pos = WORLD[idx] || { s: 1, r: 0 };
      var fromLeft = i % 2 === 0;
      gsap.set(tile, {
        opacity: 0,
        x: fromLeft ? -(mobile ? 120 : 220) : mobile ? 120 : 220,
        y: (i % 5) * (mobile ? 18 : 28) - 40,
        scale: pos.s * 0.42,
        rotation: pos.r + (fromLeft ? -18 : 18),
        transformOrigin: "50% 50%",
      });
    });

    var tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });

    tileArr.forEach(function (tile, i) {
      var idx = Number(tile.getAttribute("data-idx"));
      var pos = WORLD[idx] || { s: 1, r: 0 };
      tl.to(
        tile,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: pos.s,
          rotation: pos.r,
          duration: 0.55,
          ease: "power3.out",
        },
        i * 0.018
      );
    });

    tl.to(camera, Object.assign({ duration: 0.7, ease: "power2.inOut" }, mid), 0.35);
    tl.to(camera, Object.assign({ duration: 0.85, ease: "power1.inOut" }, full), 0.85);

    if (watermark) {
      tl.to(watermark, { opacity: 0.08, scale: 1, duration: 0.6, ease: "power2.out" }, 0.9);
    }

    tileArr.forEach(function (tile, i) {
      var idx = Number(tile.getAttribute("data-idx"));
      var pos = WORLD[idx];
      if (!pos) return;
      tl.to(
        tile,
        {
          scale: pos.s * 1.02,
          duration: 0.35,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 1,
        },
        1.35 + (i % 7) * 0.02
      );
    });

    return tl;
  }

  function initGrafikiStepper(section, cinemaTl, pinST, pinHandlers) {
    var overlay = section.querySelector(".graphics-stage__overlay");
    var overlayCopy = section.querySelector(".graphics-stage__copy");
    var overlayCta = section.querySelector(".graphics-collage__footer");
    var CINEMA_MS = window.matchMedia("(max-width: 900px)").matches ? 7.55 : 8.65;
    var WHEEL_END = 52;
    var WHEEL_MIN = 6;
    var WHEEL_INSTANT = 16;
    var HOLD_TOLERANCE = 28;
    var APPROACH_TOLERANCE = 140;
    var COOLDOWN_MS = 280;

    var holdY = 0;
    var activeBeat = 0;
    var passDown = false;
    var passUp = true;
    var animating = false;
    var locked = false;
    var wheelAccum = 0;
    var wheelTimer = null;
    var cooldownUntil = 0;
    var guardTimer = null;
    var safetyTimer = null;
    var overlayRevealTimer = null;
    var ctaRevealTimer = null;
    var overlayRevealShown = false;
    var OVERLAY_LEAD_S = 2;
    var CTA_AFTER_COPY_S = 0.2;
    var holdSuspended = false;

    function clearOverlayRevealTimer() {
      if (overlayRevealTimer) {
        window.clearTimeout(overlayRevealTimer);
        overlayRevealTimer = null;
      }
    }

    function clearCtaRevealTimer() {
      if (ctaRevealTimer) {
        window.clearTimeout(ctaRevealTimer);
        ctaRevealTimer = null;
      }
    }

    function clearSafetyTimer() {
      if (safetyTimer) {
        window.clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      clearOverlayRevealTimer();
      clearCtaRevealTimer();
    }

    function setOverlayRevealVisible(visible, immediate, opts) {
      opts = opts || {};
      var targets = [];
      if (overlayCopy) targets.push(overlayCopy);
      if (overlayCta) targets.push(overlayCta);
      if (!targets.length) return;

      clearCtaRevealTimer();

      if (!visible) {
        document.body.classList.remove("is-grafiki-overlay-reveal");
        setOverlayVisible(false, immediate);
        setCtaVisible(false, immediate);
        return;
      }

      document.body.classList.add("is-grafiki-overlay-reveal");

      if (!window.gsap || immediate) {
        setOverlayVisible(true, true);
        setCtaVisible(true, true);
        return;
      }

      gsap.killTweensOf(targets);
      if (overlay) overlay.classList.remove("is-overlay-hidden");
      var nostalgic = opts.nostalgic === true;
      var mobileBlurOff = window.matchMedia("(max-width: 900px)").matches;
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: nostalgic ? 32 : 14, filter: mobileBlurOff ? "none" : nostalgic ? "blur(16px)" : "blur(8px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "none",
          duration: nostalgic ? 1.75 : 0.42,
          delay: nostalgic ? 0.18 : 0,
          ease: nostalgic ? "sine.inOut" : "power2.out",
          overwrite: true,
        }
      );
    }

    function scheduleCtaReveal(immediate) {
      setOverlayRevealVisible(true, !!immediate);
    }

    function revealOverlayBeforeEnd() {
      if (!animating || overlayRevealShown) return;
      overlayRevealShown = true;
      setOverlayRevealVisible(true, false, { nostalgic: true });
    }

    function refreshHolds() {
      if (!pinST) return;
      holdY = pinST.start;
    }

    function beginCooldown() {
      cooldownUntil = Date.now() + COOLDOWN_MS;
    }

    function shouldIgnore() {
      if (!collageRoot || !collageRoot.classList.contains("is-ready")) return true;
      if (document.querySelector(".nav-overlay.is-open")) return true;
      if (document.querySelector(".graphics-lightbox:not([hidden])")) return true;
      return false;
    }

    function canStep() {
      if (locked || animating) return false;
      if (Date.now() < cooldownUntil) return false;
      return true;
    }

    function inPinZone() {
      if (!pinST) return false;
      var y = window.scrollY;
      return y >= pinST.start - 6 && y <= pinST.end + 6;
    }

    function atHoldPoint() {
      refreshHolds();
      return Math.abs(window.scrollY - holdY) <= HOLD_TOLERANCE;
    }

    function nearHoldApproach() {
      if (!pinST) return false;
      refreshHolds();
      var y = window.scrollY;
      return y >= holdY - APPROACH_TOLERANCE && y <= pinST.end + HOLD_TOLERANCE;
    }

    function ensureAtHold() {
      refreshHolds();
      if (atHoldPoint()) return true;
      locked = true;
      window.scrollTo(0, holdY);
      if (window.ScrollTrigger) ScrollTrigger.update();
      window.requestAnimationFrame(function () {
        window.scrollTo(0, holdY);
        if (window.ScrollTrigger) ScrollTrigger.update();
        locked = false;
      });
      return atHoldPoint();
    }

    function setPassFlags(beat, opts) {
      opts = opts || {};
      if (opts.fromBelow && beat === 1) {
        passDown = true;
        passUp = false;
        return;
      }
      passDown = beat === 1;
      passUp = beat === 0;
    }

    function updateSectionUI() {
      var showCta = activeBeat === 1 && passDown && !animating;
      section.classList.toggle("is-cinema-done", showCta);
      document.body.classList.toggle("is-grafiki-cinema-start", activeBeat === 0 && !animating);
      document.body.classList.toggle("is-grafiki-cinema-end", showCta);
      document.body.classList.toggle("is-grafiki-cinema-animating", animating);
    }

    function setCtaVisible(visible, immediate) {
      if (!overlayCta) return;
      if (!window.gsap || immediate) {
        if (visible) {
          overlayCta.style.opacity = "1";
          overlayCta.style.visibility = "visible";
          overlayCta.style.transform = "translateY(0)";
          overlayCta.style.filter = "none";
        } else {
          overlayCta.style.opacity = "0";
          overlayCta.style.visibility = "hidden";
          overlayCta.style.transform = "translateY(18px)";
          overlayCta.style.filter = "none";
        }
        return;
      }
      gsap.killTweensOf(overlayCta);
      if (visible) {
        gsap.fromTo(
          overlayCta,
          { autoAlpha: 0, y: 18, filter: window.matchMedia("(max-width: 900px)").matches ? "none" : "blur(8px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "none",
            duration: 0.42,
            delay: 0,
            ease: "power2.out",
            overwrite: true,
          }
        );
      } else {
        gsap.set(overlayCta, {
          autoAlpha: 0,
          visibility: "hidden",
          y: 18,
          filter: "none",
          overwrite: true,
        });
      }
    }

    function setOverlayVisible(visible, immediate, opts) {
      opts = opts || {};
      if (!overlayCopy && !overlay) return;
      var targets = overlayCopy ? [overlayCopy] : [];
      if (!window.gsap || immediate) {
        targets.forEach(function (el) {
          if (!el) return;
          if (visible) {
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.transform = "translateY(0)";
            el.style.filter = "none";
          } else {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.transform = "translateY(-14px)";
          }
        });
        if (overlay) overlay.classList.toggle("is-overlay-hidden", !visible);
        if (opts.onComplete) opts.onComplete();
        return;
      }
      gsap.killTweensOf(targets);
      if (visible) {
        if (overlay) overlay.classList.remove("is-overlay-hidden");
        var nostalgic = opts.nostalgic === true;
        var mobileBlurOff = window.matchMedia("(max-width: 900px)").matches;
        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: nostalgic ? 32 : 12, filter: mobileBlurOff ? "none" : nostalgic ? "blur(16px)" : "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "none",
            duration: nostalgic ? 1.75 : 0.29,
            delay: nostalgic ? 0.18 : 0.04,
            ease: nostalgic ? "sine.inOut" : "power2.out",
            overwrite: true,
            onComplete: opts.onComplete || null,
          }
        );
      } else {
        if (overlay) overlay.classList.add("is-overlay-hidden");
        gsap.to(targets, {
          autoAlpha: 0,
          y: -14,
          filter: window.matchMedia("(max-width: 900px)").matches ? "none" : "blur(8px)",
          duration: 0.42,
          ease: "power2.in",
          overwrite: true,
        });
      }
    }

    function setBeatState(beat, opts) {
      opts = opts || {};
      activeBeat = beat;
      cinemaTl.progress(beat === 0 ? 0 : 1);
      resetCinemaTilesForBeat(section.querySelectorAll(".graphics-cinema__tile"), beat);
      setPassFlags(beat, opts);
      updateSectionUI();
      if (!animating) {
        if (beat === 1) {
          setOverlayRevealVisible(true, !!opts.fromBelow, opts.fromBelow ? null : { nostalgic: false });
        } else {
          document.body.classList.remove("is-grafiki-overlay-reveal");
          clearCtaRevealTimer();
          setOverlayRevealVisible(false, true);
        }
      }
    }

    function resetForReentry() {
      clearSafetyTimer();
      if (window.gsap) gsap.killTweensOf(cinemaTl);
      animating = false;
      locked = false;
      cooldownUntil = 0;
      activeBeat = 0;
      passDown = false;
      passUp = true;
      overlayRevealShown = false;
      wheelAccum = 0;
      cinemaTl.pause();
      cinemaTl.progress(0);
      cinemaTl.timeScale(1);
      resetCinemaTilesForBeat(section.querySelectorAll(".graphics-cinema__tile"), 0);
      var stage = section.querySelector(".graphics-stage");
      if (stage && window.gsap) {
        gsap.set(stage, { autoAlpha: 1, scale: 1, filter: "blur(0px)", visibility: "visible" });
      }
      document.body.classList.remove(
        "is-grafiki-overlay-reveal",
        "is-grafiki-cinema-end",
        "is-grafiki-cinema-animating"
      );
      setOverlayRevealVisible(false, true);
      updateSectionUI();
    }

    function playAutoCinema() {
      if (document.documentElement.classList.contains("reduce-motion")) return;
      if (animating) return;
      if (activeBeat !== 0 || passDown) resetForReentry();
      transitionToBeat(1);
    }

    function snapToHold(beat, opts) {
      opts = opts || {};
      if (animating || (holdSuspended && !opts.force)) return;
      refreshHolds();
      locked = true;
      setBeatState(beat, opts);
      if (window.gsap) {
        var stage = section.querySelector(".graphics-stage");
        if (stage) gsap.set(stage, { autoAlpha: 1, scale: 1, filter: "blur(0px)" });
      }
      window.scrollTo(0, holdY);
      if (window.ScrollTrigger) ScrollTrigger.update();
      window.requestAnimationFrame(function () {
        window.scrollTo(0, holdY);
        if (window.ScrollTrigger) ScrollTrigger.update();
        window.setTimeout(function () {
          locked = false;
          if (!opts.skipCooldown && beat === 1 && passDown) beginCooldown();
          if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
          if (beat === 0 && opts.autoPlay !== false && !opts.fromBelow && !opts.skipAutoPlay) {
            playAutoCinema();
          }
        }, 24);
      });
    }

    function finishTransition(beat) {
      if (!animating) return;
      clearSafetyTimer();
      gsap.killTweensOf(cinemaTl);
      animating = false;
      locked = false;
      activeBeat = beat;
      setPassFlags(beat);
      cinemaTl.pause();
      cinemaTl.time(beat === 0 ? 0 : cinemaTl.duration());
      cinemaTl.timeScale(1);
      cinemaTl.eventCallback("onComplete", null);
      cinemaTl.eventCallback("onReverseComplete", null);
      updateSectionUI();
      document.body.classList.remove("is-grafiki-overlay-reveal");
      if (beat === 1) {
        if (!overlayRevealShown) {
          setOverlayRevealVisible(true, false, { nostalgic: true });
        }
      } else {
        clearCtaRevealTimer();
        setOverlayRevealVisible(false, true);
      }
      overlayRevealShown = false;
      beginCooldown();
      if (window.ScrollTrigger) ScrollTrigger.update();
      if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
      window.dispatchEvent(
        new CustomEvent("cosgral:grafiki-beat", { detail: { beat: beat } })
      );
    }

    function transitionToBeat(beat) {
      if (animating || !canStep()) return;
      if (beat === 1 && activeBeat !== 0) resetForReentry();
      if (beat === 1 && activeBeat !== 0) return;
      if (beat === 0 && activeBeat !== 1) return;

      clearSafetyTimer();
      gsap.killTweensOf(cinemaTl);
      overlayRevealShown = false;
      document.body.classList.remove("is-grafiki-overlay-reveal");

      animating = true;
      locked = true;
      passDown = false;
      passUp = false;
      updateSectionUI();
      clearCtaRevealTimer();
      setOverlayVisible(false, false);
      setCtaVisible(false, true);
      resetCinemaTilesForBeat(section.querySelectorAll(".graphics-cinema__tile"), 0);

      cinemaTl.pause();
      cinemaTl.timeScale(1);
      cinemaTl.eventCallback("onComplete", null);
      cinemaTl.eventCallback("onReverseComplete", null);

      var targetTime = beat === 1 ? cinemaTl.duration() : 0;
      gsap.to(cinemaTl, {
        time: targetTime,
        duration: CINEMA_MS,
        ease: "power2.inOut",
        overwrite: true,
        onComplete: function () {
          finishTransition(beat);
        },
      });

      if (beat === 1) {
        var revealDelay = Math.max(0, CINEMA_MS - OVERLAY_LEAD_S) * 1000;
        overlayRevealTimer = window.setTimeout(revealOverlayBeforeEnd, revealDelay);
      }

      safetyTimer = window.setTimeout(function () {
        if (animating) finishTransition(beat);
      }, CINEMA_MS * 1000 + 420);
    }

    function requestStep(dir) {
      if (!canStep()) return;
      if (dir > 0 && activeBeat === 0 && !passDown) {
        if (!nearHoldApproach()) return;
        ensureAtHold();
        transitionToBeat(1);
        return;
      }
      if (dir < 0 && activeBeat === 1 && !passUp) {
        if (!inPinZone() || !atHoldPoint()) return;
        transitionToBeat(0);
      }
    }

    function commitWheel() {
      wheelTimer = null;
      if (!canStep()) {
        wheelAccum = 0;
        return;
      }
      if (Math.abs(wheelAccum) < WHEEL_MIN) {
        wheelAccum = 0;
        return;
      }
      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      requestStep(dir);
    }

    function onWheel(e) {
      if (shouldIgnore()) return;

      if (animating) {
        if (nearHoldApproach() || inPinZone()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      var dir = e.deltaY > 0 ? 1 : -1;

      if (activeBeat === 0 && !passDown) {
        if (!nearHoldApproach()) return;
        if (dir < 0 && passUp) return;
        if (dir > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (!canStep()) return;
          wheelAccum += e.deltaY;
          if (Math.abs(wheelAccum) >= WHEEL_INSTANT) {
            if (wheelTimer) window.clearTimeout(wheelTimer);
            commitWheel();
            return;
          }
          if (wheelTimer) window.clearTimeout(wheelTimer);
          wheelTimer = window.setTimeout(commitWheel, WHEEL_END);
        }
        return;
      }

      if (!inPinZone() || !atHoldPoint()) return;

      if (dir > 0 && passDown) return;
      if (dir < 0 && passUp) return;

      var wantsStep = dir < 0 && activeBeat === 1;
      if (!wantsStep) return;

      e.preventDefault();
      e.stopPropagation();

      if (!canStep()) return;

      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) >= WHEEL_INSTANT) {
        if (wheelTimer) window.clearTimeout(wheelTimer);
        commitWheel();
        return;
      }
      if (wheelTimer) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(commitWheel, WHEEL_END);
    }

    var touchStartY = 0;
    var touchLastY = 0;
    var touchAccum = 0;
    var touchActive = false;
    var deferWheelToStepper = document.querySelector('script[src*="portfolio-section-stepper"]');

    if (!deferWheelToStepper) {
    window.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches[0] || shouldIgnore()) return;
        touchStartY = e.touches[0].clientY;
        touchLastY = touchStartY;
        touchAccum = 0;
        touchActive = nearHoldApproach() || (inPinZone() && atHoldPoint());
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "touchmove",
      function (e) {
        if (!touchActive || !e.touches[0] || shouldIgnore()) return;
        if (animating) {
          e.preventDefault();
          return;
        }

        var y = e.touches[0].clientY;
        var delta = touchLastY - y;
        touchLastY = y;
        var dir = delta > 0 ? 1 : -1;

        if (activeBeat === 0 && !passDown) {
          if (!nearHoldApproach()) return;
          if (dir < 0 && passUp) return;
          if (dir > 0) {
            touchAccum += delta;
            e.preventDefault();
          }
          return;
        }

        if (!inPinZone() || !atHoldPoint()) return;

        if (dir > 0 && passDown) return;
        if (dir < 0 && passUp) return;
        if (dir < 0 && activeBeat === 1) {
          touchAccum += delta;
          e.preventDefault();
        }
      },
      { passive: false, capture: true }
    );

    window.addEventListener(
      "touchend",
      function () {
        if (!touchActive) return;
        touchActive = false;
        if (shouldIgnore() || animating || !canStep()) {
          touchAccum = 0;
          return;
        }
        if (Math.abs(touchAccum) < WHEEL_MIN) {
          touchAccum = 0;
          return;
        }
        var dir = touchAccum > 0 ? 1 : -1;
        touchAccum = 0;
        requestStep(dir);
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "touchcancel",
      function () {
        touchActive = false;
        touchAccum = 0;
      },
      { passive: true, capture: true }
    );
    }

    if (!deferWheelToStepper) {
      window.addEventListener("wheel", onWheel, { passive: false, capture: true });
      window.addEventListener(
        "scroll",
        function () {
          if (animating || locked) return;
          scheduleEnforceHold();
        },
        { passive: true }
      );
    }

    function scheduleEnforceHold() {
      if (guardTimer) window.clearTimeout(guardTimer);
      guardTimer = window.setTimeout(enforceHold, 40);
    }

    function enforceHold() {
      guardTimer = null;
      if (shouldIgnore() || animating || locked || holdSuspended || !inPinZone()) return;
      refreshHolds();
      var y = window.scrollY;
      if (Math.abs(y - holdY) <= HOLD_TOLERANCE) return;

      // Beat 0: blokuj tylko zejście w dół bez animacji
      if (activeBeat === 0 && !passDown && y > holdY + HOLD_TOLERANCE) {
        snapToHold(0, { skipCooldown: true });
        return;
      }

      // Beat 1: blokuj tylko zejście w górę bez animacji wstecz
      if (activeBeat === 1 && !passUp && y < holdY - HOLD_TOLERANCE) {
        snapToHold(1, { fromBelow: true, skipCooldown: true });
      }
    }

    pinHandlers.onEnter = function () {
      if (animating || holdSuspended) return;
      playAutoCinema();
    };
    pinHandlers.onEnterBack = function () {
      if (holdSuspended) return;
      snapToHold(1, { fromBelow: true, skipAutoPlay: true });
    };
    pinHandlers.onUpdate = function (self) {
      if (animating || locked) return;
      if (self.direction === 1 && activeBeat === 0 && !passDown) scheduleEnforceHold();
      if (self.direction === -1 && activeBeat === 1 && !passUp) scheduleEnforceHold();
    };

    refreshHolds();
    if (inPinZone()) {
      var fromBelow = window.scrollY > holdY + HOLD_TOLERANCE;
      if (fromBelow) {
        snapToHold(1, { fromBelow: true, skipAutoPlay: true, skipCooldown: true });
      } else {
        playAutoCinema();
      }
    } else {
      setBeatState(0);
      setOverlayVisible(false, true);
      setCtaVisible(false, true);
    }

    window.cosgralGrafikiStepper = {
      refresh: refreshHolds,
      snapToHold: function (beat, opts) {
        opts = opts || {};
        if (beat === 1) {
          opts.fromBelow = true;
          opts.skipAutoPlay = true;
        } else if (opts.autoPlay == null) {
          opts.autoPlay = true;
        }
        snapToHold(beat, opts);
      },
      revealHold: function (beat) {
        snapToHold(beat, { fromBelow: beat === 1, skipAutoPlay: true, force: true, skipCooldown: true });
      },
      transitionToBeat: transitionToBeat,
      resetForReentry: resetForReentry,
      getBeat: function () {
        return activeBeat;
      },
      isAnimating: function () {
        return animating;
      },
      getPassDown: function () {
        return passDown;
      },
      getPassUp: function () {
        return passUp;
      },
      suspendHold: function (on) {
        holdSuspended = !!on;
      },
      getHoldY: function () {
        return holdY;
      },
      syncCubeFade: syncGrafikiCubeFade,
    };
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

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function parseRgba(str) {
    var m = String(str).match(/rgba?\(([^)]+)\)/);
    if (!m) return [255, 255, 255, 1];
    var p = m[1].split(",").map(function (v) {
      return parseFloat(v.trim());
    });
    if (p.length < 4) p.push(1);
    return p;
  }

  function mixRgba(from, to, t) {
    var a = parseRgba(from);
    var b = parseRgba(to);
    return (
      "rgba(" +
      Math.round(lerp(a[0], b[0], t)) +
      ", " +
      Math.round(lerp(a[1], b[1], t)) +
      ", " +
      Math.round(lerp(a[2], b[2], t)) +
      ", " +
      lerp(a[3], b[3], t).toFixed(3) +
      ")"
    );
  }

  function mixRail(from, to, t) {
    var out = {};
    Object.keys(to).forEach(function (key) {
      out[key] = from[key] && String(from[key]).indexOf("rgba") !== -1 ? mixRgba(from[key], to[key], t) : to[key];
    });
    return out;
  }

  function initGrafikiBloom() {
    var section = document.getElementById("grafiki");
    if (!section || !window.gsap || !window.ScrollTrigger) return;
    /* Film mode: ambient stays under master timeline — no competing bloom pin */
    if (document.body.classList.contains("portfolio-page--film")) return;

    var ambient = document.querySelector(".subpage-ambient");
    var blur = document.querySelector(".subpage-ambient__blur");
    var shade = document.querySelector(".subpage-ambient__shade");
    var cube = document.querySelector(".subpage-cube-portal");
    var bloom = document.getElementById("grafiki-bloom");
    var rail = getScrollRail();
    var grafikiCta = document.querySelector("#grafiki [data-graphics-frames-cta]") || document.querySelector("#grafiki .graphics-brands");

    grafikiMenuState.cube = cube;
    gsap.set(shade, { backgroundColor: "rgba(3, 3, 3, 0.28)" });
    gsap.set(ambient, { filter: "grayscale(1) contrast(1.04) brightness(0.78)" });
    gsap.set(blur, { opacity: 0.55 });
    gsap.set(bloom, { opacity: 0 });
    if (rail) gsap.set(rail, RAIL_LIGHT);

    function applyAmbientLift(t) {
      t = Math.max(0, Math.min(1, t));
      gsap.set(bloom, { opacity: lerp(0, 0.66, t) });
      gsap.set(shade, { backgroundColor: mixRgba("rgba(3, 3, 3, 0.28)", "rgba(255, 255, 255, 0.84)", t) });
      gsap.set(ambient, {
        filter:
          "grayscale(" +
          lerp(1, 0, t).toFixed(3) +
          ") contrast(" +
          lerp(1.04, 1.01, t).toFixed(3) +
          ") brightness(" +
          lerp(0.78, 2.52, t).toFixed(3) +
          ")",
      });
      gsap.set(blur, { opacity: lerp(0.55, 0.82, t) });
      if (rail) gsap.set(rail, mixRail(RAIL_LIGHT, RAIL_DARK, t));
      /* Jasny tryb przez całą widoczność Grafiki — ściemnianie dopiero gdy sekcja zniknie ze scrolla */
      document.body.classList.toggle("is-grafiki-light", t > 0.06);
      syncGrafikiCubeFade();
    }

    function liftFromScroll(self) {
      var pin = ScrollTrigger.getById("grafiki-pin");
      var y = self.scroll();
      var liftStart = self.start;
      var pinStart = pin ? pin.start : self.start + (self.end - self.start) * 0.22;
      var pinEnd = pin ? pin.end : self.end;
      /* Ściemnianie dopiero po końcu pina (= Grafiki już nie widać) */
      var darkenStart = pinEnd;
      var darkenEnd = self.end;
      var t;
      if (y <= pinStart) {
        var raw = (y - liftStart) / Math.max(1, pinStart - liftStart);
        t = Math.min(1, Math.pow(Math.max(0, raw), 0.4));
      } else if (y <= darkenStart) {
        t = 1;
      } else {
        t = 1 - (y - darkenStart) / Math.max(1, darkenEnd - darkenStart);
      }
      applyAmbientLift(t);
    }

    var bloomST = ScrollTrigger.create({
      id: "grafiki-bloom",
      trigger: section,
      start: function () {
        var pin = ScrollTrigger.getById("grafiki-pin");
        return pin ? pin.start - window.innerHeight * 0.72 : "top 92%";
      },
      end: function () {
        var pin = ScrollTrigger.getById("grafiki-pin");
        /* Do ściemnienia po zniknięciu Grafiki — przejście w Automatyzacje / chapter */
        return pin ? pin.end + window.innerHeight * 0.85 : "bottom top";
      },
      invalidateOnRefresh: true,
      onUpdate: liftFromScroll,
      onRefresh: liftFromScroll,
    });

    var zoneST = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      endTrigger: grafikiCta || section,
      end: "bottom top",
      onEnter: function () {
        document.body.classList.add("is-grafiki-zone");
        window.cosgralCube?.setGrafikiMenuActive?.(true);
        syncGrafikiCubeFade();
      },
      onLeave: function () {
        document.body.classList.remove("is-grafiki-zone");
        window.cosgralCube?.setGrafikiMenuActive?.(false);
        restoreCubePortalOutsideGrafiki();
      },
      onEnterBack: function () {
        document.body.classList.add("is-grafiki-zone");
        window.cosgralCube?.setGrafikiMenuActive?.(true);
        syncGrafikiCubeFade();
      },
      onLeaveBack: function () {
        document.body.classList.remove("is-grafiki-zone");
        window.cosgralCube?.setGrafikiMenuActive?.(false);
        restoreCubePortalOutsideGrafiki();
      },
    });

    grafikiMenuState.bloomTl = bloomST;
    grafikiMenuState.darkenTl = null;
    grafikiMenuState.triggers = [bloomST, zoneST];

    syncGrafikiCubeFade();
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
    if (window.CosgralPortfolioColorZone && document.body.classList.contains("graphics-gallery-page")) {
      window.CosgralPortfolioColorZone.watch(galleryRoot, ".graphics-masonry__item", { observe: galleryRoot });
    }
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

  fetch("portfolio-media/graphics/manifest.json?v=20260919h")
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
