/**
 * Portfolio Strony — 3D scrolltelling: logo seed → depth split → tilt → click zoom-in.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var section = document.getElementById("strony");
  if (!section || !document.querySelector(".web-stage")) return;

  var seed = section.querySelector("[data-web-seed]");
  var grid = section.querySelector("[data-web-grid]");
  var cards = Array.prototype.slice.call(section.querySelectorAll("[data-web-card]"));
  var copy = section.querySelector(".web-stage__copy");
  var overlay = section.querySelector("[data-web-overlay]");
  var pinST = null;
  var videosStarted = false;
  var flip = [];
  var navigating = false;
  var tiltRaf = 0;
  var tiltTargets = [];

  var DEPTH = {
    rotX: MOBILE ? 18 : 42,
    rotY: MOBILE ? 10 : 28,
    rotZ: MOBILE ? 4 : 12,
    z: MOBILE ? -120 : -420,
  };

  function playCardVideos() {
    if (videosStarted) return;
    videosStarted = true;
    cards.forEach(function (card) {
      var video = card.querySelector("video");
      if (!video) return;
      if (window.CosgralPortfolioVideo) {
        window.CosgralPortfolioVideo.register(video);
        window.CosgralPortfolioVideo.play(video);
      } else {
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      }
    });
  }

  function pauseCardVideos() {
    videosStarted = false;
    if (window.CosgralPortfolioVideo) {
      window.CosgralPortfolioVideo.pauseAllIn(section);
    } else {
      cards.forEach(function (card) {
        var video = card.querySelector("video");
        if (video) video.pause();
      });
    }
  }

  function captureFlip() {
    flip = [];
    if (!seed || !cards.length) return;
    cards.forEach(function (card) {
      gsap.set(card, {
        clearProps: "transform",
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        autoAlpha: 1,
      });
    });
    if (grid) gsap.set(grid, { autoAlpha: 1 });
    var seedRect = seed.getBoundingClientRect();
    var sx = seedRect.left + seedRect.width * 0.5;
    var sy = seedRect.top + seedRect.height * 0.5;
    cards.forEach(function (card, i) {
      var rect = card.getBoundingClientRect();
      var cx = rect.left + rect.width * 0.5;
      var cy = rect.top + rect.height * 0.5;
      var side = i === 0 ? -1 : i === 1 ? 1 : 0;
      flip.push({
        x: sx - cx,
        y: sy - cy,
        scale: Math.min(seedRect.width / Math.max(rect.width, 1), 0.58),
        rotY: side * DEPTH.rotY,
        rotX: DEPTH.rotX * (i === 2 ? 0.7 : 1),
        rotZ: side * DEPTH.rotZ * 0.6,
        z: DEPTH.z,
      });
    });
  }

  function setFinalState() {
    section.classList.add("is-web-split", "is-web-copy-on");
    if (seed) gsap.set(seed, { autoAlpha: 0 });
    if (grid) gsap.set(grid, { autoAlpha: 1 });
    cards.forEach(function (card) {
      gsap.set(card, {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        autoAlpha: 1,
      });
    });
    if (copy) gsap.set(copy, { autoAlpha: 1, y: 0, visibility: "visible" });
    if (overlay) overlay.setAttribute("aria-hidden", "false");
    playCardVideos();
  }

  function poseCard(card, f, local) {
    var inv = 1 - local;
    gsap.set(card, {
      x: f.x * inv,
      y: f.y * inv,
      z: f.z * inv,
      scale: f.scale + (1 - f.scale) * local,
      rotationX: f.rotX * inv,
      rotationY: f.rotY * inv,
      rotationZ: f.rotZ * inv,
      autoAlpha: local > 0.02 ? 1 : 0,
      transformPerspective: 1200,
      force3D: true,
    });
  }

  function applyProgress(p) {
    var hold = 0.2;
    var splitEnd = 0.7;
    var t;
    var ease;
    var i;
    var local;
    var f;

    if (!flip.length) captureFlip();

    if (p <= hold) {
      section.classList.remove("is-web-split", "is-web-copy-on");
      if (seed) gsap.set(seed, { autoAlpha: 1, scale: 1, rotationY: 0 });
      if (grid) gsap.set(grid, { autoAlpha: 0 });
      for (i = 0; i < cards.length; i++) {
        f = flip[i] || { x: 0, y: 0, scale: 0.5, rotX: 0, rotY: 0, rotZ: 0, z: 0 };
        poseCard(cards[i], f, 0);
      }
      if (copy) gsap.set(copy, { autoAlpha: 0, y: 24, visibility: "hidden" });
      if (overlay) overlay.setAttribute("aria-hidden", "true");
      pauseCardVideos();
      return;
    }

    if (p < splitEnd) {
      t = (p - hold) / (splitEnd - hold);
      ease = t * t * (3 - 2 * t);
      section.classList.add("is-web-split");
      section.classList.remove("is-web-copy-on");
      if (seed) {
        gsap.set(seed, {
          autoAlpha: Math.max(0, 1 - ease * 1.2),
          scale: 1 - ease * 0.14,
          rotationY: (MOBILE ? 8 : 18) * ease,
        });
      }
      if (grid) gsap.set(grid, { autoAlpha: 1 });
      for (i = 0; i < cards.length; i++) {
        local = Math.max(0, Math.min(1, (ease - i * 0.08) / 0.82));
        local = local * local * (3 - 2 * local);
        f = flip[i] || { x: 0, y: 0, scale: 0.5, rotX: 0, rotY: 0, rotZ: 0, z: 0 };
        poseCard(cards[i], f, local);
      }
      if (copy) gsap.set(copy, { autoAlpha: 0, y: 24, visibility: "hidden" });
      if (overlay) overlay.setAttribute("aria-hidden", "true");
      if (ease > 0.28) playCardVideos();
      return;
    }

    t = (p - splitEnd) / Math.max(0.001, 1 - splitEnd);
    ease = t * t * (3 - 2 * t);
    section.classList.add("is-web-split", "is-web-copy-on");
    if (seed) gsap.set(seed, { autoAlpha: 0 });
    if (grid) gsap.set(grid, { autoAlpha: 1 });
    for (i = 0; i < cards.length; i++) {
      gsap.set(cards[i], {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        autoAlpha: 1,
      });
    }
    if (copy) {
      gsap.set(copy, {
        autoAlpha: ease,
        y: (1 - ease) * 28,
        visibility: ease > 0.02 ? "visible" : "hidden",
      });
    }
    if (overlay) overlay.setAttribute("aria-hidden", ease > 0.05 ? "false" : "true");
    playCardVideos();
  }

  function bindTilt() {
    if (REDUCED || MOBILE || !FINE || !window.gsap) return;

    cards.forEach(function (card) {
      card.classList.add("portfolio-web-card--tilt");
      var shine = card.querySelector(".portfolio-web-card__shine");
      if (!shine) {
        shine = document.createElement("span");
        shine.className = "portfolio-web-card__shine";
        shine.setAttribute("aria-hidden", "true");
        card.appendChild(shine);
      }

      card.addEventListener("pointermove", function (e) {
        if (navigating || !section.classList.contains("is-web-split")) return;
        var rect = card.getBoundingClientRect();
        var nx = (e.clientX - rect.left) / rect.width - 0.5;
        var ny = (e.clientY - rect.top) / rect.height - 0.5;
        tiltTargets[cards.indexOf(card)] = { nx: nx, ny: ny, card: card, shine: shine };
        if (!tiltRaf) {
          tiltRaf = requestAnimationFrame(flushTilt);
        }
      });

      card.addEventListener("pointerleave", function () {
        var idx = cards.indexOf(card);
        tiltTargets[idx] = { nx: 0, ny: 0, card: card, shine: shine, reset: true };
        if (!tiltRaf) tiltRaf = requestAnimationFrame(flushTilt);
      });
    });
  }

  function flushTilt() {
    tiltRaf = 0;
    tiltTargets.forEach(function (t) {
      if (!t || !t.card) return;
      var max = 7.5;
      gsap.to(t.card, {
        rotationY: t.nx * max * 2,
        rotationX: -t.ny * max * 2,
        transformPerspective: 900,
        duration: t.reset ? 0.55 : 0.28,
        ease: "power2.out",
        overwrite: "auto",
      });
      if (t.shine) {
        gsap.to(t.shine, {
          opacity: t.reset ? 0 : 0.55,
          xPercent: t.nx * 40,
          yPercent: t.ny * 40,
          duration: t.reset ? 0.45 : 0.25,
          overwrite: "auto",
        });
      }
    });
  }

  function bindClickZoom() {
    if (REDUCED || !window.gsap) return;
    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (navigating) {
          e.preventDefault();
          return;
        }
        if (!section.classList.contains("is-web-split")) return;
        var href = card.getAttribute("href");
        if (!href) return;
        e.preventDefault();
        navigating = true;
        section.classList.add("is-web-zooming");

        var others = cards.filter(function (c) {
          return c !== card;
        });
        gsap.to(others, {
          autoAlpha: 0,
          scale: 0.88,
          z: -80,
          duration: 0.45,
          ease: "power2.in",
        });
        if (copy) gsap.to(copy, { autoAlpha: 0, duration: 0.3 });
        gsap.to(card, {
          scale: MOBILE ? 1.18 : 1.35,
          z: MOBILE ? 40 : 120,
          rotationX: MOBILE ? 0 : 6,
          transformOrigin: "50% 45%",
          duration: 0.55,
          ease: "power3.in",
          onComplete: function () {
            window.location.href = href;
          },
        });
      });
    });
  }

  function initPin() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) {
      setFinalState();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    if (grid) gsap.set(grid, { autoAlpha: 0, transformPerspective: 1400, transformStyle: "preserve-3d" });
    if (copy) gsap.set(copy, { autoAlpha: 0, y: 24, visibility: "hidden" });
    if (seed) gsap.set(seed, { autoAlpha: 1 });
    cards.forEach(function (card) {
      gsap.set(card, { transformPerspective: 1200, transformStyle: "preserve-3d", force3D: true });
    });

    bindTilt();
    bindClickZoom();

    requestAnimationFrame(function () {
      captureFlip();
      applyProgress(0);

      pinST = ScrollTrigger.create({
        id: "strony-pin",
        trigger: section,
        start: "top top",
        end: MOBILE ? "+=120%" : "+=170%",
        pin: true,
        pinSpacing: true,
        scrub: true,
        anticipatePin: 0.35,
        invalidateOnRefresh: true,
        refreshPriority: -1,
        onUpdate: function (self) {
          applyProgress(self.progress);
        },
        onRefresh: function (self) {
          captureFlip();
          applyProgress(self.progress || 0);
        },
        onLeaveBack: function () {
          pauseCardVideos();
        },
      });

      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPin);
  } else {
    initPin();
  }

  window.addEventListener("load", function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
