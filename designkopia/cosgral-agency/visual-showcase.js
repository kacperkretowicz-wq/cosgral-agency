/**
 * COSGRAL — immersive visual showcase (3D reels + flying graphics).
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stage = document.querySelector("[data-showcase-stage]");
  var reelsWrap = document.querySelector("[data-showcase-reels]");
  var graphicsField = document.querySelector("[data-showcase-graphics]");
  var ambientVids = document.querySelectorAll(".visual-showcase__ambient-vid");
  var section = document.querySelector(".visual-showcase");

  if (!stage || !reelsWrap) return;

  var tiles = Array.prototype.slice.call(reelsWrap.querySelectorAll("[data-reel-tile]"));
  var graphics = graphicsField
    ? Array.prototype.slice.call(graphicsField.querySelectorAll("[data-graphic]"))
    : [];
  var focused = tiles[0] || null;
  var popInterval = null;

  function playVideo(v) {
    if (!v) return;
    v.currentTime = v.currentTime || 0;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function pauseVideo(v) {
    if (!v) return;
    v.pause();
  }

  function setFocus(tile) {
    if (!tile || tile === focused) return;
    focused = tile;
    tiles.forEach(function (t) {
      var v = t.querySelector("video");
      var on = t === tile;
      t.classList.toggle("is-focused", on);
      t.setAttribute("aria-current", on ? "true" : "false");
      if (on) playVideo(v);
      else pauseVideo(v);
    });
  }

  function bindReelFocus() {
    tiles.forEach(function (tile) {
      tile.addEventListener("mouseenter", function () {
        setFocus(tile);
      });
      tile.addEventListener("focus", function () {
        setFocus(tile);
      });
      tile.addEventListener("click", function () {
        setFocus(tile);
      });
    });
  }

  function surprisePop() {
    if (REDUCED || tiles.length < 2) return;
    var candidates = tiles.filter(function (t) {
      return t !== focused;
    });
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!pick || !window.gsap) {
      setFocus(pick || focused);
      return;
    }
    gsap.fromTo(
      pick,
      { scale: 0.82, rotateX: 24, rotateY: -18, z: -120, filter: "blur(16px)" },
      {
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        z: 0,
        filter: "blur(10px)",
        duration: 0.85,
        ease: "power3.out",
        onComplete: function () {
          gsap.set(pick, { clearProps: "transform,filter" });
          setFocus(pick);
        },
      }
    );
  }

  function startAmbient() {
    ambientVids.forEach(function (v, i) {
      v.playbackRate = 0.85 + i * 0.05;
      playVideo(v);
    });
  }

  function initReelVideos() {
    tiles.forEach(function (tile, i) {
      var v = tile.querySelector("video");
      if (!v) return;
      if (i === 0) {
        tile.classList.add("is-focused");
        playVideo(v);
      } else {
        pauseVideo(v);
      }
      v.addEventListener("loadeddata", function () {
        if (tile.classList.contains("is-focused")) playVideo(v);
      });
    });
  }

  function entranceReels() {
    if (REDUCED || !window.gsap) {
      tiles.forEach(function (t) {
        t.style.opacity = "1";
      });
      return;
    }

    gsap.from(tiles, {
      opacity: 0,
      y: function () {
        return gsap.utils.random(100, 200);
      },
      rotateX: function () {
        return gsap.utils.random(-45, 45);
      },
      rotateY: function () {
        return gsap.utils.random(-55, 55);
      },
      z: function () {
        return gsap.utils.random(-220, -60);
      },
      scale: 0.65,
      filter: "blur(16px)",
      duration: 1.35,
      ease: "power4.out",
      stagger: {
        each: 0.11,
        from: "random",
      },
      scrollTrigger: {
        trigger: stage,
        start: "top 82%",
        toggleActions: "play none none none",
      },
      onComplete: function () {
        gsap.set(tiles, { clearProps: "transform" });
        tiles.forEach(function (t) {
          if (!t.classList.contains("is-focused")) {
            t.style.filter = "";
          }
        });
        popInterval = window.setInterval(surprisePop, 7000);
      },
    });
  }

  function entranceGraphics() {
    if (!graphicsField || !graphics.length) return;

    if (REDUCED || !window.gsap) {
      graphics.forEach(function (g) {
        g.classList.add("is-visible");
      });
      return;
    }

    graphics.forEach(function (g) {
      var from = g.getAttribute("data-from") || "bottom";
      var dx = 0;
      var dy = 0;
      if (from === "left") dx = -140;
      if (from === "right") dx = 140;
      if (from === "top") dy = -120;
      if (from === "bottom") dy = 120;

      gsap.set(g, {
        x: dx,
        y: dy,
        rotate: function () {
          return gsap.utils.random(-18, 18);
        },
        scale: 0.6,
        opacity: 0,
        filter: "blur(12px)",
      });

      gsap.to(g, {
        x: 0,
        y: 0,
        rotate: g.style.getPropertyValue("--gr") || "0deg",
        scale: g.style.getPropertyValue("--gs") || 1,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: graphicsField,
          start: "top 88%",
          end: "top 35%",
          scrub: 1.4,
        },
        delay: gsap.utils.random(0, 0.35),
      });
    });
  }

  function parallaxSection() {
    if (REDUCED || !window.gsap || !section) return;

    gsap.to(".visual-showcase__ambient-vid", {
      y: function (i) {
        return (i + 1) * -40;
      },
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.8,
      },
    });

    gsap.to(reelsWrap, {
      rotateX: 2,
      rotateY: -3,
      ease: "none",
      scrollTrigger: {
        trigger: stage,
        start: "top bottom",
        end: "bottom top",
        scrub: 2,
      },
    });
  }

  function boot() {
    initReelVideos();
    bindReelFocus();
    startAmbient();

    (async function () {
      await window.cosgralSmoothScroll?.ready;
      if (!window.gsap || !window.ScrollTrigger) return;
      entranceReels();
      entranceGraphics();
      parallaxSection();
      ScrollTrigger.refresh();
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("beforeunload", function () {
    if (popInterval) window.clearInterval(popInterval);
  });
})();
