/**
 * Subtle global pointer tilt — CSS vars + visible-section targeting.
 * Never transforms #main (breaks scroll-snap layout).
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

  // --global-tilt-x/y czytają tylko: .site-nav, .home-scroll-rail, .site-footer
  // oraz bloki z klasą .is-in-view (i ich potomkowie — zmienna dziedziczy).
  // Zapis na <html> unieważniał styl całego dokumentu w każdej klatce ruchu
  // kursora; zapis na tych kilku hostach ogranicza przeliczenie do ich poddrzew.
  // Żywe HTMLCollection łapią też elementy dodawane później (np. scroll rail).
  var tiltHostLists = [
    document.getElementsByClassName("site-nav"),
    document.getElementsByClassName("home-scroll-rail"),
    document.getElementsByClassName("site-footer"),
    document.getElementsByClassName("is-in-view"),
  ];

  // Odczyt inline style nie wymusza przeliczenia stylu, więc porównanie co
  // klatkę jest tanie — a łapie hosty, które właśnie dostały .is-in-view
  // z innego skryptu (services-fan, stepper) albo dopiero powstały (rail).
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
    // --lx/--ly (poświata .services-fan__card-liquid) — efekt nigdy nie był
    // aktywowany (.is-cursor-active tylko usuwane), a .home-process__step
    // nadpisuje zmienną lokalnie; zapis co klatkę był czystym kosztem.

    requestAnimationFrame(applyGlobalTilt);
  }

  function watchVisibleScenes() {
    var scenes = document.querySelectorAll(".home-scene, [data-portfolio-section], .portfolio-hero");
    if (!scenes.length && !document.body.classList.contains("about-page")) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-in-view", entry.isIntersecting && entry.intersectionRatio >= 0.35);
        });
      },
      { threshold: [0.2, 0.35, 0.5, 0.65] }
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
      document.querySelectorAll("#main > header, #main > .graphics-gallery, #main > .reels-gallery, #graphics-gallery, #reels-gallery").forEach(function (block) {
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
      if (card.getBoundingClientRect().height > 0) video.play().catch(function () {});
    });
  }

  function init() {
    document.documentElement.classList.add("has-global-tilt");
    bindWorkCardVideos();
    watchVisibleScenes();
    requestAnimationFrame(applyGlobalTilt);

    if (!MOBILE) {
      bindHoverTargets();
      observeDynamicTiles();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
