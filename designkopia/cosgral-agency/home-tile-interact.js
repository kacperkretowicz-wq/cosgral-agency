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
  var lastTiltX = "";
  var lastTiltY = "";

  /* Przechyl byl zapisywany na <html>, przez co KAZDY ruch myszy uniewazniał styl
     calego dokumentu — zmierzone 6,9 ms na jedno przeliczenie, ok. 1000 ms na 4 s
     ruchu kursorem. Zmienna trafia teraz tylko na elementy, ktore ja czytaja
     (albo sa przodkami czytajacych), wiec przeliczaja sie ich poddrzewa, a nie cala
     strona. Domyslne 0deg zostaje w :root, wiec nic nie znika, gdy ktoregos zabraknie. */
  var TILT_TARGETS =
    ".site-nav, .home-scroll-rail, .site-footer, " +
    ".home-scene.is-in-view, #main > .is-in-view, " +
    ".portfolio-hero.is-in-view, [data-portfolio-section].is-in-view";
  var tiltTargets = null;

  function refreshTiltTargets() {
    tiltTargets = document.querySelectorAll(TILT_TARGETS);
    // Nowo dolaczony element startuje bez zmiennej — wymus jeden zapis.
    lastTiltX = "";
    lastTiltY = "";
    return tiltTargets;
  }

  /* --lx / --ly byly tu zapisywane na <html> co klatke, a karmily wylacznie
     .services-fan__card-liquid i .home-process__step::before — oba wlaczane klasa
     .is-cursor-active, ktora w calym kodzie jest tylko USUWANA, nigdy dodawana.
     Czyli: uniewaznianie stylu calego dokumentu 60x na sekunde dla dwoch gradientow
     z opacity: 0. Zapisy usuniete, wartosci domyslne z CSS zostaja.

     --global-tilt-x/y zostaje (napedza realne rotateX/rotateY na nawigacji, szynie
     i panelach), ale petla usypia, gdy przechyl przestaje sie zmieniac. */
  var running = false;

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

    // Krok 0,1 stopnia: przy zakresie +/-5,8 stopnia to niewidoczne, a kilkukrotnie
    // zmniejsza liczbe zapisow (a wiec i przeliczen stylu).
    var tx = (ptr.ny * TILT_PITCH).toFixed(1) + "deg";
    var ty = (ptr.nx * TILT_YAW).toFixed(1) + "deg";

    if (document.documentElement.classList.contains("is-nav-menu-open")) {
      // Regula CSS zerujaca przechyl przy otwartym menu siedziala na :root, a wartosc
      // ustawiona na elemencie by ja przeslonila — wiec zerujemy tutaj.
      tx = "0deg";
      ty = "0deg";
    }

    if (tx !== lastTiltX || ty !== lastTiltY) {
      lastTiltX = tx;
      lastTiltY = ty;
      var targets = tiltTargets || refreshTiltTargets();
      for (var i = 0; i < targets.length; i++) {
        targets[i].style.setProperty("--global-tilt-x", tx);
        targets[i].style.setProperty("--global-tilt-y", ty);
      }
      idleFrames = 0;
    } else {
      idleFrames += 1;
    }

    // Kursor stoi od pol sekundy — nie ma czego przeliczac, spimy do ruchu myszy.
    if (idleFrames > 30) {
      running = false;
      return;
    }

    requestAnimationFrame(applyGlobalTilt);
  }

  var idleFrames = 0;

  function wakeTilt() {
    idleFrames = 0;
    if (running) return;
    running = true;
    requestAnimationFrame(applyGlobalTilt);
  }

  function watchVisibleScenes() {
    var scenes = document.querySelectorAll(".home-scene, [data-portfolio-section], .portfolio-hero");
    if (!scenes.length && !document.body.classList.contains("about-page")) return;

    var io = new IntersectionObserver(
      function (entries) {
        var changed = false;
        entries.forEach(function (entry) {
          var next = entry.isIntersecting && entry.intersectionRatio >= 0.35;
          if (entry.target.classList.contains("is-in-view") !== next) changed = true;
          entry.target.classList.toggle("is-in-view", next);
        });
        // Zmienil sie zbior widocznych sekcji — przeadresuj zapisy przechylu.
        if (changed) {
          refreshTiltTargets();
          wakeTilt();
        }
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
    refreshTiltTargets();
    document.addEventListener("mousemove", wakeTilt, { passive: true });
    window.addEventListener("deviceorientation", wakeTilt, { passive: true });
    wakeTilt();

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
