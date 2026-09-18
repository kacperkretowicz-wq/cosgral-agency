/**
 * Subtle global pointer / gyro tilt — CSS vars on visible hosts.
 * Tilt lives on a dedicated .home-tilt-layer so card/GSAP transforms
 * compose inside it (images + tiles tilt with the section, not only copy).
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  var TILT_PITCH = MOBILE ? 3.2 : 5.8;
  var TILT_YAW = MOBILE ? 4.0 : 7.5;
  var tiltFrame = 0;

  var tiltHostLists = [
    document.getElementsByClassName("site-nav"),
    document.getElementsByClassName("home-scroll-rail"),
    document.getElementsByClassName("site-footer"),
    document.getElementsByClassName("is-in-view"),
    document.getElementsByClassName("home-tilt-layer"),
  ];

  function writeTilt(tx, ty) {
    for (var l = 0; l < tiltHostLists.length; l++) {
      var list = tiltHostLists[l];
      for (var i = 0; i < list.length; i++) {
        var st = list[i].style;
        if (st.getPropertyValue("--global-tilt-x") === tx && st.getPropertyValue("--global-tilt-y") === ty) continue;
        st.setProperty("--global-tilt-x", tx);
        st.setProperty("--global-tilt-y", ty);
      }
    }
  }

  function applyGlobalTilt() {
    if (MOBILE) return;
    var ptr = window.cosgralPointer;
    if (!ptr) {
      requestAnimationFrame(applyGlobalTilt);
      return;
    }

    tiltFrame += 1;
    if (tiltFrame % 2 !== 0) {
      requestAnimationFrame(applyGlobalTilt);
      return;
    }

    var tx = (ptr.ny * TILT_PITCH).toFixed(2) + "deg";
    var ty = (ptr.nx * TILT_YAW).toFixed(2) + "deg";
    writeTilt(tx, ty);

    requestAnimationFrame(applyGlobalTilt);
  }

  function wrapChildren(host, skipSelector) {
    if (!host || host.querySelector(":scope > .home-tilt-layer")) return null;
    var layer = document.createElement("div");
    layer.className = "home-tilt-layer";
    var skip = skipSelector ? host.querySelectorAll(":scope > " + skipSelector) : null;
    var skipSet = skip && skip.length ? Array.prototype.slice.call(skip) : [];
    var nodes = Array.prototype.slice.call(host.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 1 && skipSet.indexOf(node) !== -1) return;
      layer.appendChild(node);
    });
    if (!layer.childNodes.length) return null;
    host.appendChild(layer);
    return layer;
  }

  function ensureTiltLayers() {
    document.querySelectorAll(".home-scene > .home-scene__panel").forEach(function (panel) {
      /* Hero: absolute content + fixed cube — bez warstwy (psuje centrówanie napisu) */
      if (panel.closest(".home-hero")) return;
      wrapChildren(panel);
    });

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section) {
      wrapChildren(section, ".portfolio-section__curtain");
    });

    if (document.body.classList.contains("about-page")) {
      document.querySelectorAll("#main > header, #main > section").forEach(function (block) {
        wrapChildren(block);
      });
    }

    if (
      document.body.classList.contains("graphics-gallery-page") ||
      document.body.classList.contains("reels-gallery-page")
    ) {
      document
        .querySelectorAll(
          "#main > header, #main > .graphics-gallery, #main > .reels-gallery, #graphics-gallery, #reels-gallery"
        )
        .forEach(function (block) {
          if (block) wrapChildren(block);
        });
    }

    var hero = document.querySelector(".portfolio-hero");
    if (hero) wrapChildren(hero);
  }

  function watchVisibleScenes() {
    var scenes = document.querySelectorAll(".home-scene, [data-portfolio-section], .portfolio-hero");
    if (!scenes.length && !document.body.classList.contains("about-page")) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle(
            "is-in-view",
            entry.isIntersecting && entry.intersectionRatio >= 0.28
          );
        });
      },
      { threshold: [0.15, 0.28, 0.45, 0.65] }
    );

    scenes.forEach(function (scene) {
      io.observe(scene);
    });

    if (document.body.classList.contains("about-page")) {
      document.querySelectorAll("#main > header, #main > section").forEach(function (block) {
        io.observe(block);
      });
    }

    if (
      document.body.classList.contains("graphics-gallery-page") ||
      document.body.classList.contains("reels-gallery-page")
    ) {
      document
        .querySelectorAll(
          "#main > header, #main > .graphics-gallery, #main > .reels-gallery, #graphics-gallery, #reels-gallery"
        )
        .forEach(function (block) {
          if (block) io.observe(block);
        });
    }
  }

  function observeDynamicTiles() {
    ["reels-tiles", "graphics-collage"].forEach(function (id) {
      var root = document.getElementById(id);
      if (!root) return;
      var mo = new MutationObserver(bindHoverTargets);
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
        "[data-tile-interact], .home-work__card, .services-fan__card, .portfolio-web-card, .reels-tiles__card, .graphics-cinema__tile"
      )
      .forEach(bindHoverMedia);
  }

  function bindWorkCardVideos() {
    document.querySelectorAll(".home-work__card[data-tile-interact], .home-work__card").forEach(function (card) {
      var video = card.querySelector("video");
      if (!video) return;

      video.muted = true;
      video.setAttribute("playsinline", "");
      /* Mobile: poster only — dekoder wielu video = główne źródło przycinania */
      if (MOBILE) {
        video.removeAttribute("autoplay");
        video.pause();
        return;
      }

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) video.play().catch(function () {});
            else video.pause();
          });
        },
        { threshold: 0.42, rootMargin: "8% 0px" }
      );
      io.observe(card);
      if (card.getBoundingClientRect().height > 0) video.play().catch(function () {});
    });
  }

  function init() {
    if (!MOBILE) {
      document.documentElement.classList.add("has-global-tilt");
      ensureTiltLayers();
      requestAnimationFrame(applyGlobalTilt);
      bindHoverTargets();
      observeDynamicTiles();
    }
    bindWorkCardVideos();
    watchVisibleScenes();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
