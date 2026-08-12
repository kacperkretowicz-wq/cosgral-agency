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

  function refreshGrafikiBloomState() {
    if (!window.ScrollTrigger) return;
    grafikiMenuState.triggers.forEach(function (st) {
      if (st) st.update();
    });
    ScrollTrigger.update();
  }

  window.addEventListener("cosgral:cube-menu", function (e) {
    if (e.detail && e.detail.open) return;
    refreshGrafikiBloomState();
    requestAnimationFrame(refreshGrafikiBloomState);
  });

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
  var FOCUS_HERO_END = [0, 1, 2, 3, 18, 19, 22, 23];
  var EARLY_VISIBLE = [0, 1, 2, 3, 18, 19, 20, 21, 22, 23];

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

  function buildCinemaTimeline(camera, watermark, tiles) {
    var mobile = window.matchMedia("(max-width: 900px)").matches;
    var juicy = clusterCenter(FOCUS_JUICY);
    var far = clusterCenter(FOCUS_FAR);
    var m = mobile ? 0.68 : 1;
    var spread = mobile ? 1.02 : 1.14;
    juicy = { x: juicy.x * m * spread, y: juicy.y * m * spread };
    far = { x: far.x * m * spread, y: far.y * m * spread };

    var z1 = mobile ? 2.35 : 2.85;
    var z2 = mobile ? 2.15 : 2.55;
    var z3 = mobile ? 0.72 : 0.88;

    var start = cameraFocus(juicy, mobile ? 1.28 : 1.48);
    var act1 = cameraFocus(juicy, z1);
    var act2 = cameraFocus(far, z2);
    var act2b = { x: act2.x - (mobile ? 18 : 42), y: act2.y + (mobile ? 10 : 22), scale: z2 + 0.06 };
    var full = { x: 0, y: 0, scale: z3 };

    var heroEnd = clusterCenter(FOCUS_HERO_END);
    heroEnd = { x: heroEnd.x * m * spread, y: heroEnd.y * m * spread - (mobile ? 60 : 100) };
    var endScale = mobile ? 0.82 : 1.02;
    var fullWide = cameraFocus(heroEnd, endScale);

    gsap.set(camera, start);
    if (watermark) gsap.set(watermark, { opacity: 0.07, scale: 1 });

    var tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
    tl.to(camera, Object.assign({ duration: 0.26, ease: "power1.inOut" }, act1), 0);
    tl.to(camera, Object.assign({ duration: 0.34, ease: "power2.inOut" }, act2), 0.24);
    /* Wolniejsze przejście widok → widok (~3–4 s odtwarzania) */
    tl.to(camera, Object.assign({ duration: 0.24, ease: "sine.inOut" }, act2b), 0.5);
    tl.to(camera, Object.assign({ duration: 0.4, ease: "power1.inOut" }, full), 0.62);
    tl.to(camera, Object.assign({ duration: 0.36, ease: "power1.inOut" }, fullWide), 0.9);

    if (watermark) {
      tl.to(watermark, { opacity: 0.11, scale: 1.04, duration: 0.4, ease: "power2.inOut" }, 0.62);
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
        0.66 + (idx % 9) * 0.014
      );
    });

    return tl;
  }

  function initGrafikiStepper(section, cinemaTl, pinST, pinHandlers) {
    var overlay = section.querySelector(".graphics-stage__overlay");
    var overlayCopy = section.querySelector(".graphics-stage__copy");
    var overlayCta = section.querySelector(".graphics-collage__footer");
    var CINEMA_MS = window.matchMedia("(max-width: 900px)").matches ? 6.12 : 7.08;
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

    function scheduleCtaReveal(immediate) {
      clearCtaRevealTimer();
      ctaRevealTimer = window.setTimeout(function () {
        ctaRevealTimer = null;
        document.body.classList.add("is-grafiki-overlay-reveal");
        setCtaVisible(true, !!immediate);
      }, CTA_AFTER_COPY_S * 1000);
    }

    function revealOverlayBeforeEnd() {
      if (!animating || overlayRevealShown) return;
      overlayRevealShown = true;
      document.body.classList.add("is-grafiki-overlay-reveal");
      setOverlayVisible(true, false, { nostalgic: true });
      scheduleCtaReveal(false);
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
          { autoAlpha: 0, y: 18, filter: "blur(8px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
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
        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: nostalgic ? 32 : 12, filter: nostalgic ? "blur(16px)" : "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
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
          filter: "blur(8px)",
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
      setPassFlags(beat, opts);
      updateSectionUI();
      if (!animating) {
        if (beat === 1) {
          setOverlayVisible(true, !!opts.fromBelow);
          scheduleCtaReveal(!!opts.fromBelow);
        } else {
          document.body.classList.remove("is-grafiki-overlay-reveal");
          clearCtaRevealTimer();
          setOverlayVisible(false, true);
          setCtaVisible(false, true);
        }
      }
    }

    function scheduleAutoCinema() {
      if (document.documentElement.classList.contains("reduce-motion")) return;
      window.setTimeout(function () {
        if (animating || activeBeat !== 0 || passDown) return;
        if (!inPinZone() || !atHoldPoint()) return;
        transitionToBeat(1);
      }, 160);
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
            scheduleAutoCinema();
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
          setOverlayVisible(true, false);
          scheduleCtaReveal(false);
        }
      } else {
        clearCtaRevealTimer();
        setOverlayVisible(false, true);
        setCtaVisible(false, true);
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
      snapToHold(0, { autoPlay: true, skipCooldown: true });
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
      snapToHold(fromBelow ? 1 : 0, fromBelow ? { fromBelow: true, skipAutoPlay: true, skipCooldown: true } : { autoPlay: true, skipCooldown: true });
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
    };
  }

  function initCinemaScroll() {
    var reduced = document.documentElement.classList.contains("reduce-motion");
    var cinema = collageRoot && collageRoot.querySelector(".graphics-cinema");
    var section = document.getElementById("grafiki");
    if (!cinema || !section) return;

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

    var cinemaTl = buildCinemaTimeline(camera, watermark, tiles);
    var pinLen = mobile ? "+=72%" : "+=80%";

    var pinHandlers = {};

    var pinST = ScrollTrigger.create({
      id: "grafiki-pin",
      trigger: section,
      start: "top top",
      end: pinLen,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: -1,
      onEnter: function () {
        if (pinHandlers.onEnter) pinHandlers.onEnter();
      },
      onEnterBack: function () {
        if (pinHandlers.onEnterBack) pinHandlers.onEnterBack();
      },
      onUpdate: function (self) {
        if (pinHandlers.onUpdate) pinHandlers.onUpdate(self);
      },
    });

    initGrafikiStepper(section, cinemaTl, pinST, pinHandlers);
    collageRoot.classList.add("is-ready");
    section.classList.add("is-cinema-ready");

    window.addEventListener("load", function () {
      ScrollTrigger.refresh();
      if (window.cosgralGrafikiStepper?.refresh) window.cosgralGrafikiStepper.refresh();
      if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
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

    var cinema = document.querySelector(".graphics-cinema");
    var grafikiCta = document.querySelector("#grafiki .graphics-collage__footer");
    var nextSection = document.getElementById("automatyzacje");
    var scrubSpeed = 3.4;

    var bloomTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
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

    grafikiMenuState.cube = cube;
    grafikiMenuState.bloomTl = bloomTl;
    grafikiMenuState.darkenTl = darkenTl;
    grafikiMenuState.triggers = [bloomTl.scrollTrigger, darkenTl.scrollTrigger].filter(Boolean);

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
