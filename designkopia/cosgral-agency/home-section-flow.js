/**
 * Kinowe sceny: pin + fade przez ciemność + zoom.
 *
 * Scroll jest zwykły — sceny tylko reagują na jego postęp (scrub). Nie ma tu
 * żadnego dopasowywania pozycji ani sterowania kostką 3D: obie te rzeczy
 * zostały usunięte.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var CYCLE = ["left", "right", "top", "bottom"];
  var curtain = document.querySelector("[data-scene-curtain]");

  function buildRevealWords(el) {
    if (!el) return;
    if (el.dataset.wordsReady) return;
    var key = el.getAttribute("data-i18n");
    var text = el.textContent.trim();
    if (key && window.cosgralI18n) {
      var translated = window.cosgralI18n.t(key);
      if (translated) text = translated;
    }
    if (!text) return;
    el.textContent = "";
    text.split(/\s+/).forEach(function (word, i) {
      var wrap = document.createElement("span");
      wrap.className = "reveal-word";
      wrap.setAttribute("data-enter", CYCLE[i % CYCLE.length]);
      var inner = document.createElement("span");
      inner.textContent = word;
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
    el.dataset.wordsReady = "1";
  }

  window.cosgralRevealWords = {
    build: buildRevealWords,
    rebuildAll: function () {
      document.querySelectorAll("[data-reveal-words]").forEach(function (el) {
        delete el.dataset.wordsReady;
        buildRevealWords(el);
      });
    },
  };

  var enteredScenes = new WeakSet();

  function enterFrom(dir) {
    switch (dir) {
      case "left":
        return { x: -42, y: 0 };
      case "right":
        return { x: 42, y: 0 };
      case "top":
        return { x: 0, y: -32 };
      default:
        return { x: 0, y: 32 };
    }
  }

  function sceneEnterTargets(scene) {
    var panel = panelOf(scene);
    if (!panel) return [];
    return Array.prototype.slice.call(panel.querySelectorAll("[data-enter], .reveal-word > span"));
  }

  function ensureScenePanelVisible(scene) {
    if (!scene || REDUCED) return;
    var panel = panelOf(scene);
    if (!panel || !window.gsap) return;
    gsap.set(panel, {
      autoAlpha: 1,
      scale: 1,
      filter: MOBILE ? "none" : "blur(0px)",
    });
    scene.classList.add("is-entered", "is-visible");
  }

  function playSceneEnters(scene, opts) {
    if (!scene || REDUCED || !window.gsap) return;
    opts = opts || {};
    if (!opts.force && enteredScenes.has(scene)) return;
    enteredScenes.add(scene);

    var targets = sceneEnterTargets(scene);
    if (!targets.length) return;

    gsap.killTweensOf(targets);
    targets.forEach(function (el, i) {
      var dir =
        el.getAttribute("data-enter") ||
        (el.parentElement && el.parentElement.getAttribute("data-enter")) ||
        "bottom";
      var from = enterFrom(dir);
      gsap.fromTo(
        el,
        {
          autoAlpha: 0,
          x: from.x,
          y: from.y,
          filter: MOBILE ? "none" : "blur(8px)",
        },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          filter: "none",
          duration: 0.82,
          ease: "power3.out",
          delay: opts.stagger === false ? 0 : i * 0.055,
          overwrite: true,
        }
      );
    });
  }

  window.cosgralSceneEnters = {
    play: playSceneEnters,
    ensurePanel: ensureScenePanelVisible,
    reset: function (scene) {
      if (scene) enteredScenes.delete(scene);
    },
  };

  function panelOf(scene) {
    return scene.querySelector(".home-scene__panel") || scene;
  }

  /**
   * Kurtyna ma JEDNEGO właściciela.
   *
   * Wcześniej każda pinowana scena animowała ją własnym scrubem, a resetowała ją
   * przy okazji scena rozpadu. Po jej usunięciu osie czasu zaczęły sobie
   * nadpisywać wartość i czerń zostawała na ekranie także na postoju w sekcji.
   * Teraz zaciemnienie liczymy w jednym miejscu, wprost z postępu przypiętej
   * sceny: ciemno tylko na styku scen, jasno w środku każdej z nich.
   */
  var CURTAIN_SCENES = [
    { id: "hero-pin", fadeIn: false },
    { id: "scene-uslugi", fadeIn: true },
    { id: "scene-realizacje", fadeIn: true },
    { id: "scene-proces", fadeIn: true },
    { id: "scene-faq", fadeIn: true },
    { id: "scene-kontakt", fadeIn: true },
  ];
  var CURTAIN_IN_END = 0.14;
  var CURTAIN_OUT_START = 0.84;
  var curtainSuspended = 0;

  function curtainAmount() {
    var dark = 0;
    for (var i = 0; i < CURTAIN_SCENES.length; i++) {
      var cfg = CURTAIN_SCENES[i];
      var st = ScrollTrigger.getById(cfg.id);
      if (!st || !st.isActive) continue;
      var p = st.progress;
      if (cfg.fadeIn && p < CURTAIN_IN_END) {
        dark = Math.max(dark, (1 - p / CURTAIN_IN_END) * 0.72);
      }
      if (p > CURTAIN_OUT_START) {
        dark = Math.max(dark, ((p - CURTAIN_OUT_START) / (1 - CURTAIN_OUT_START)) * 0.85);
      }
    }
    return dark;
  }

  /* Malujemy od razu w obsłudze scrolla: Lenis woła ją raz na klatkę, już po
     ScrollTrigger.update, więc postępy scen są aktualne. Odkładanie tego na
     osobny rAF potrafiło zostawić na ekranie czerń z poprzedniej klatki. */
  function scheduleCurtain() {
    if (!curtain || curtainSuspended) return;
    gsap.set(curtain, { autoAlpha: curtainAmount() });
  }

  /* Twarde cięcie (menu, przejścia między stronami) przejmuje kurtynę na chwilę
     dla siebie — patrz home-section-nav.js. */
  window.cosgralSceneCurtain = {
    suspend: function () {
      curtainSuspended += 1;
    },
    resume: function () {
      curtainSuspended = Math.max(0, curtainSuspended - 1);
      scheduleCurtain();
    },
    refresh: scheduleCurtain,
  };

  /** Pinowana scena: ciemność → zoom in → długa pauza → ciemność */
  function wireScene(scene, opts) {
    if (!scene || REDUCED) {
      if (scene) scene.classList.add("is-entered", "is-visible");
      return;
    }

    opts = opts || {};
    var panel = panelOf(scene);
    var pinLen = opts.pin || (MOBILE ? "+=88%" : "+=108%");

    gsap.set(panel, {
      autoAlpha: 0,
      scale: MOBILE ? 1.04 : 1.07,
      filter: MOBILE ? "none" : "blur(14px)",
    });

    /* Wejście sceny gra na DOJEŹDZIE do ekranu, nie dopiero po przypięciu.
       Wcześniej robiły to pierwsze 12% osi czasu pinu — przy dopasowywanym
       scrollu to nie miało znaczenia, bo do sekcji się skakało. Przy zwykłym
       scrollu sekcja wisiała rozmyta przez cały ekran, zanim pin ruszył. */
    gsap.to(panel, {
      autoAlpha: 1,
      scale: 1,
      filter: MOBILE ? "none" : "blur(0px)",
      ease: "power2.out",
      immediateRender: false,
      scrollTrigger: {
        id: (opts.id || scene.id) + "-approach",
        trigger: scene,
        start: "top bottom",
        end: "top top",
        scrub: MOBILE ? 0.4 : 0.5,
        invalidateOnRefresh: true,
        refreshPriority: opts.priority,
      },
    });

    var tl = gsap.timeline({
      scrollTrigger: {
        id: opts.id || scene.id,
        trigger: scene,
        start: "top top",
        end: pinLen,
        pin: true,
        pinSpacing: true,
        scrub: MOBILE ? 0.5 : 0.55,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: opts.priority,
        onEnter: function () {
          scene.classList.add("is-entered", "is-visible");
          playSceneEnters(scene, { stagger: true });
          if (opts.onEnter) opts.onEnter();
        },
        onEnterBack: function () {
          scene.classList.add("is-entered", "is-visible");
          playSceneEnters(scene, { stagger: true, force: true });
          if (opts.onEnterBack) opts.onEnterBack();
        },
        onLeave: function () {
          scene.classList.remove("is-visible");
          if (opts.onLeave) opts.onLeave();
        },
        onLeaveBack: function () {
          scene.classList.remove("is-visible");
          if (opts.onLeaveBack) opts.onLeaveBack();
        },
      },
    });

    /* Pin to sam postój na treści: panel jest już ostry, nic tu nie gaśnie.
       Po odpięciu sekcja odjeżdża widoczna — gdy gasła do czerni, między
       scenami zostawał pusty ekran. */
    tl.to(panel, { autoAlpha: 1, scale: 1, duration: 1, ease: "none" }, 0);

    return tl;
  }

  (async function () {
    var main = document.querySelector("main.home-film");
    if (!main || !window.gsap) {
      if (main) {
        main.querySelectorAll(".home-scene").forEach(function (s) {
          s.classList.add("is-entered", "is-visible");
        });
      }
      return;
    }

    await window.cosgralSmoothScroll?.ready;

    document.querySelectorAll("[data-reveal-words]").forEach(buildRevealWords);

    if (curtain) gsap.set(curtain, { autoAlpha: 0 });

    var hero = document.getElementById("top");
    var services = document.getElementById("uslugi");
    var work = document.getElementById("realizacje");
    var process = document.getElementById("proces");
    var faq = document.getElementById("faq");
    var contact = document.getElementById("kontakt");

    if (REDUCED) {
      [hero, services, work, process, faq, contact].forEach(function (s) {
        if (s) s.classList.add("is-entered", "is-visible");
      });
      return;
    }

    // ——— 1. HERO ———
    if (hero) {
      var heroContent = hero.querySelector(".home-hero__content");
      var heroScroll = hero.querySelector(".home-hero__scroll");
      hero.classList.add("is-entered", "is-visible");
      gsap.set(panelOf(hero), { autoAlpha: 1 });
      playSceneEnters(hero, { stagger: true, force: true });

      gsap
        .timeline({
          scrollTrigger: {
            id: "hero-pin",
            trigger: hero,
            start: "top top",
            end: MOBILE ? "+=72%" : "+=95%",
            pin: true,
            pinSpacing: true,
            scrub: MOBILE ? 0.45 : 0.5,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            /* Piny muszą się odświeżać w kolejności występowania na stronie —
               patrz PIN_PRIORITY niżej. */
            refreshPriority: 6,
            onEnterBack: function () {
              if (window.cosgralRestoreHero) window.cosgralRestoreHero();
            },
          },
        })
        .to(heroContent, { autoAlpha: 1, duration: 0.18, ease: "none" }, 0)
        .to(heroContent, { autoAlpha: 1, duration: 0.48, ease: "none" }, 0.18)
        .to(
          heroContent,
          {
            autoAlpha: 0,
            y: -48,
            filter: MOBILE ? "none" : "blur(10px)",
            ease: "power3.in",
            duration: 0.22,
          },
          0.66
        )
        .to(heroScroll, { autoAlpha: 0, duration: 0.2, ease: "none" }, 0.62);
    }

    // ——— 2–5: kinowe sceny (pin + fade) ———
    wireScene(services, { id: "scene-uslugi", pin: MOBILE ? "+=95%" : "+=118%", priority: 5 });

    wireScene(work, { id: "scene-realizacje", pin: MOBILE ? "+=88%" : "+=108%", priority: 4 });

    wireScene(process, { id: "scene-proces", pin: MOBILE ? "+=82%" : "+=102%", priority: 3 });
    wireScene(faq, { id: "scene-faq", pin: MOBILE ? "+=76%" : "+=94%", priority: 2 });
    wireScene(contact, { id: "scene-kontakt", pin: MOBILE ? "+=84%" : "+=104%", priority: 1 });

    gsap.utils.toArray(".site-footer [data-enter]").forEach(function (el) {
      gsap.from(el, {
        y: 20,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: ".site-footer",
          start: "top 92%",
          toggleActions: "play none none none",
          once: true,
        },
      });
    });

    if (window.cosgralSmoothScroll?.lenis) {
      window.cosgralSmoothScroll.lenis.on("scroll", scheduleCurtain);
    } else {
      window.addEventListener("scroll", scheduleCurtain, { passive: true });
    }
    ScrollTrigger.addEventListener("refresh", scheduleCurtain);

    ScrollTrigger.refresh();
    scheduleCurtain();
    window.dispatchEvent(new CustomEvent("cosgral:sections-ready"));
  })();
})();
