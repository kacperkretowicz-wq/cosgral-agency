/**
 * Global pointer / gyro tilt — same effect on every section, every page.
 * Writes --global-tilt-* on <html> and applies rotate directly on
 * .home-tilt-face so GSAP / cascade cannot kill the effect.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;
  if (
    document.body.classList.contains("graphics-gallery-page") ||
    document.body.classList.contains("reels-gallery-page")
  ) {
    return;
  }

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Match the visible Usługi feel site-wide */
  var TILT_PITCH = MOBILE ? 5.2 : 7.2;
  var TILT_YAW = MOBILE ? 6.4 : 9.0;
  var CARD_PITCH = MOBILE ? 5.5 : 9.5;
  var CARD_YAW = MOBILE ? 7.0 : 12.5;

  var tiltFrame = 0;
  var lastTx = "";
  var lastTy = "";
  var lastFaceKey = "";
  var cardTiltRaf = 0;
  var cardTargets = new Map();
  var faceList = null;

  function faces() {
    if (!faceList || !faceList.length) {
      faceList = document.getElementsByClassName("home-tilt-face");
    }
    return faceList;
  }

  function writeTilt(tx, ty) {
    var root = document.documentElement;
    var menuOpen = root.classList.contains("is-nav-menu-open");
    if (menuOpen) {
      tx = "0deg";
      ty = "0deg";
    }

    if (tx !== lastTx || ty !== lastTy) {
      lastTx = tx;
      lastTy = ty;
      root.style.setProperty("--global-tilt-x", tx);
      root.style.setProperty("--global-tilt-y", ty);
    }

    var faceKey = tx + "|" + ty + "|" + faces().length;
    if (faceKey === lastFaceKey && !menuOpen) return;
    lastFaceKey = faceKey;

    var tf = menuOpen ? "none" : "rotateX(" + tx + ") rotateY(" + ty + ")";
    var list = faces();
    for (var i = 0; i < list.length; i++) {
      var face = list[i];
      if (face.closest(".home-hero") || face.closest("#kontakt") || face.closest(".home-contact")) {
        if (face.style.transform) face.style.transform = "";
        continue;
      }
      if (face.style.transform !== tf) face.style.transform = tf;
    }

    /* Nav / rail / footer — no face wrapper */
    ["site-nav", "home-scroll-rail", "site-footer"].forEach(function (cls) {
      var nodes = document.getElementsByClassName(cls);
      for (var j = 0; j < nodes.length; j++) {
        if (menuOpen) {
          nodes[j].style.transform = "";
        } else {
          nodes[j].style.transform = tf;
          nodes[j].style.transformOrigin = "50vw 50vh";
        }
      }
    });
  }

  function applyGlobalTilt() {
    var ptr = window.cosgralPointer;
    if (!ptr) {
      requestAnimationFrame(applyGlobalTilt);
      return;
    }

    tiltFrame += 1;
    if (MOBILE && tiltFrame % 2 !== 0) {
      requestAnimationFrame(applyGlobalTilt);
      return;
    }

    var tx = (ptr.ny * TILT_PITCH).toFixed(2) + "deg";
    var ty = (ptr.nx * TILT_YAW).toFixed(2) + "deg";
    writeTilt(tx, ty);

    if (MOBILE && ptr.fromOrientation) {
      applyGyroToCards(ptr.nx, ptr.ny);
    }

    requestAnimationFrame(applyGlobalTilt);
  }

  function applyGyroToCards(nx, ny) {
    document.querySelectorAll(".portfolio-web-card, .home-work__card").forEach(function (card) {
      var rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      setCardTilt(card, nx * 0.85, ny * 0.85, false);
    });
  }

  function setCardTilt(card, nx, ny, reset) {
    var rx = Math.max(-1, Math.min(1, -ny)) * CARD_PITCH;
    var ry = Math.max(-1, Math.min(1, nx)) * CARD_YAW;
    if (reset) {
      rx = 0;
      ry = 0;
      card.classList.remove("is-tilting");
    } else {
      card.classList.add("is-tilting");
    }
    var x = rx.toFixed(2) + "deg";
    var y = ry.toFixed(2) + "deg";
    card.style.setProperty("--card-tilt-x", x);
    card.style.setProperty("--card-tilt-y", y);
    var target = card.querySelector(".portfolio-web-card__preview") || card;
    target.style.transform =
      "perspective(900px) rotateX(" + x + ") rotateY(" + y + ")" +
      (target === card ? " translateY(var(--card-lift, 0px))" : "");
    var shine = card.querySelector(".portfolio-web-card__shine");
    if (shine) {
      shine.style.transform =
        "translate(" + (nx * 28).toFixed(1) + "%, " + (ny * 28).toFixed(1) + "%)";
      shine.style.opacity = reset ? "0" : "0.55";
    }
  }

  function flushCardTilts() {
    cardTiltRaf = 0;
    cardTargets.forEach(function (t, card) {
      if (!t) return;
      setCardTilt(card, t.nx, t.ny, !!t.reset);
      if (t.reset) cardTargets.delete(card);
    });
  }

  function bindCardTilt(card) {
    if (card.dataset.cardTiltBound === "1") return;
    card.dataset.cardTiltBound = "1";

    if (card.classList.contains("portfolio-web-card") && !card.querySelector(".portfolio-web-card__shine")) {
      var shine = document.createElement("span");
      shine.className = "portfolio-web-card__shine";
      shine.setAttribute("aria-hidden", "true");
      var preview = card.querySelector(".portfolio-web-card__preview");
      (preview || card).appendChild(shine);
    }

    if (!FINE) return;

    card.addEventListener(
      "pointermove",
      function (e) {
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var nx = (e.clientX - rect.left) / rect.width - 0.5;
        var ny = (e.clientY - rect.top) / rect.height - 0.5;
        cardTargets.set(card, { nx: nx * 2, ny: ny * 2, reset: false });
        if (!cardTiltRaf) cardTiltRaf = requestAnimationFrame(flushCardTilts);
      },
      { passive: true }
    );

    card.addEventListener(
      "pointerleave",
      function () {
        cardTargets.set(card, { nx: 0, ny: 0, reset: true });
        if (!cardTiltRaf) cardTiltRaf = requestAnimationFrame(flushCardTilts);
      },
      { passive: true }
    );
  }

  function wrapChildren(host, skipSelector) {
    if (!host || host.querySelector(":scope > .home-tilt-layer")) return null;
    var layer = document.createElement("div");
    layer.className = "home-tilt-layer";
    layer.style.perspective = "1200px";
    layer.style.webkitPerspective = "1200px";
    var face = document.createElement("div");
    face.className = "home-tilt-face";
    var skip = skipSelector ? host.querySelectorAll(":scope > " + skipSelector) : null;
    var skipSet = skip && skip.length ? Array.prototype.slice.call(skip) : [];
    var nodes = Array.prototype.slice.call(host.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 1 && skipSet.indexOf(node) !== -1) return;
      face.appendChild(node);
    });
    if (!face.childNodes.length) return null;
    layer.appendChild(face);
    host.appendChild(layer);
    faceList = null;
    return layer;
  }

  function ensureTiltLayers() {
    document.querySelectorAll(".home-scene > .home-scene__panel").forEach(function (panel) {
      if (panel.closest(".home-hero")) return;
      if (panel.closest("#kontakt") || panel.closest(".home-contact")) return;
      wrapChildren(panel);
    });

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section) {
      wrapChildren(section, ".portfolio-section__curtain");
    });

    var tiltHosts = document.querySelectorAll(
      [
        "#main > header",
        "#main > section",
        "#main > article",
        "#main > .case-study",
        "#main > .container",
        ".portfolio-hero",
        ".about-hero",
        ".service-page__hero",
        ".service-block",
        ".privacy-page #main > *",
        "body.subpage #main > *",
        "body.case-page #main > *",
        "body.about-page #main > *",
        "body.service-page #main > *",
      ].join(", ")
    );

    tiltHosts.forEach(function (block) {
      if (!block || block.closest(".home-hero")) return;
      if (block.id === "kontakt" || block.classList.contains("home-contact")) return;
      if (block.closest("#kontakt") || block.closest(".home-contact")) return;
      /* Case studies: large film reads badly under section gyro */
      if (block.classList.contains("case-study") || block.closest(".case-study")) return;
      if (document.body.classList.contains("case-page") && block.closest("#main")) {
        if (block.matches("article, .case-study")) return;
      }
      if (block.classList.contains("home-scene")) return;
      if (block.hasAttribute("data-portfolio-section")) return;
      /* GSAP pin-spacer + chapter title: wrapping breaks full-bleed pin bounds */
      if (block.classList.contains("pin-spacer") || (block.className && String(block.className).indexOf("pin-spacer") !== -1)) return;
      if (block.hasAttribute("data-portfolio-chapter") || block.classList.contains("portfolio-chapter")) return;
      if (block.classList.contains("about-scene") || block.classList.contains("about-scene-curtain")) return;
      if (block.querySelector(":scope > .home-scene__panel")) return;
      if (block.classList.contains("home-tilt-layer") || block.classList.contains("home-tilt-face")) return;
      wrapChildren(block);
    });

    /* Retrofit perspective on any pre-existing layers */
    document.querySelectorAll(".home-tilt-layer").forEach(function (layer) {
      if (!layer.style.perspective) {
        layer.style.perspective = "1200px";
        layer.style.webkitPerspective = "1200px";
      }
    });

    faceList = null;
  }

  function watchVisibleScenes() {
    var scenes = document.querySelectorAll(
      ".home-scene, [data-portfolio-section], .portfolio-hero, #main > header, #main > section, #main > article, #main > .case-study"
    );
    if (!scenes.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-in-view", entry.isIntersecting);
        });
      },
      { threshold: [0, 0.08, 0.2, 0.4], rootMargin: "8% 0px" }
    );

    scenes.forEach(function (scene) {
      io.observe(scene);
      var rect = scene.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        scene.classList.add("is-in-view");
      }
    });
  }

  function observeDynamicTiles() {
    ["reels-tiles", "graphics-collage"].forEach(function (id) {
      var root = document.getElementById(id);
      if (!root) return;
      var mo = new MutationObserver(function () {
        bindHoverTargets();
        bindCardTilts();
      });
      mo.observe(root, { childList: true, subtree: true });
    });
  }

  function bindHoverMedia(el) {
    if (el.dataset.hoverBound === "1") return;
    el.dataset.hoverBound = "1";

    el.addEventListener("mouseenter", function () {
      el.classList.add("is-hovered");
      var video = el.querySelector("video");
      if (video) video.play().catch(function () {});
    });

    el.addEventListener("mouseleave", function () {
      el.classList.remove("is-hovered", "is-cursor-active");
      var video = el.querySelector("video");
      if (video && el.classList.contains("home-work__card")) {
        video.pause();
        video.currentTime = 0;
      }
      if (video && el.classList.contains("services-fan__card") && !el.classList.contains("is-active")) {
        video.pause();
      }
    });
  }

  function bindHoverTargets() {
    document
      .querySelectorAll(
        "[data-tile-interact], .home-work__card, .services-fan__card, .portfolio-web-card, .reels-tiles__card, .reels-grid__card, .graphics-cinema__tile"
      )
      .forEach(bindHoverMedia);
  }

  function bindCardTilts() {
    document.querySelectorAll(".portfolio-web-card, .home-work__card").forEach(bindCardTilt);
  }

  function bindWorkCardVideos() {
    document.querySelectorAll(".home-work__card[data-tile-interact], .home-work__card").forEach(function (card) {
      var video = card.querySelector("video");
      if (!video) return;

      video.muted = true;
      video.setAttribute("playsinline", "");

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) video.play().catch(function () {});
            else video.pause();
          });
        },
        { threshold: MOBILE ? 0.28 : 0.42, rootMargin: "8% 0px" }
      );
      io.observe(card);
      /* Start od razu tylko dla karty faktycznie w kadrze — poza nim decyduje IO
         (wcześniej wszystkie wideo Realizacji ruszały przy ładowaniu strony). */
      var rect = card.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (rect.height > 0 && rect.bottom > 0 && rect.top < vh) video.play().catch(function () {});
    });
  }

  function init() {
    document.documentElement.classList.add("has-global-tilt");
    document.documentElement.style.setProperty("--global-tilt-x", "0deg");
    document.documentElement.style.setProperty("--global-tilt-y", "0deg");
    ensureTiltLayers();
    bindWorkCardVideos();
    bindCardTilts();
    watchVisibleScenes();
    requestAnimationFrame(applyGlobalTilt);

    if (!MOBILE) {
      bindHoverTargets();
      observeDynamicTiles();
    } else {
      observeDynamicTiles();
    }

    /* Page transitions may swap #main — re-wrap after settle */
    window.addEventListener("pageshow", function () {
      ensureTiltLayers();
      faceList = null;
      lastFaceKey = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
