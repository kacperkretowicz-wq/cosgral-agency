/**
 * Kinowe sceny: pin + fade przez ciemność + zoom. Nie zwykłe przewijanie.
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

  function setCurtain(amount) {
    if (!curtain) return;
    gsap.set(curtain, { autoAlpha: amount });
  }

  /* Uchwyt do trwajacej animacji rozpadu kostki (hero -> Uslugi). */
  var tweenRozpadu = null;

  function rozpadTrwa() {
    return !!(tweenRozpadu && tweenRozpadu.isActive && tweenRozpadu.isActive());
  }

  /* Wymusza koncowy stan piasku. Jest podpiete pod onEnter/onEnterBack kilku
     ScrollTriggerow, wiec odpala sie, gdy tylko scroll ruszy w strone kolejnej
     sceny — czyli praktycznie natychmiast po rozpoczeciu przejscia z hero.
     Deptalo to animacje rozpadu: kostka zamiast rozsypywac sie przez ~1,4 s
     przeskakiwala do stanu koncowego w mniej niz 0,4 s i po prostu znikala.
     Dopoki rozpad trwa, oddajemy mu pierwszenstwo — sam dojdzie do 1.0
     i wtedy setCinema wywola lockSandStream ponownie. */
  function lockSandStream() {
    document.documentElement.classList.add("is-sand-stream");
    if (rozpadTrwa()) return;
    window.cosgralSand = window.cosgralSand || {};
    if ((window.cosgralSand.cinema || 0) < 0.96) {
      window.cosgralSand.cinema = 0.96;
      window.cosgralSand.motion = 0.96;
      window.cosgralSand.break = 0.98;
      window.cosgralSand.stream = 0.98;
    }
    window.cosgralSand.locked = true;
    window.cosgralSand.break = Math.max(window.cosgralSand.break || 0, 0.98);
    window.cosgralSand.stream = Math.max(window.cosgralSand.stream || 0, 0.98);
  }

  function setCinema(value) {
    window.cosgralSand = window.cosgralSand || {};
    var c = Math.max(0, Math.min(1, value));
    window.cosgralSand.cinema = c;
    window.cosgralSand.motion = c;
    window.cosgralSand.break = smooth01(0.08, 0.58, c) * 0.52;
    window.cosgralSand.stream = smooth01(0.2, 0.94, c) * 0.96;

    if (c >= 0.96) {
      lockSandStream();
    } else if (c <= 0.04) {
      window.cosgralSand.locked = false;
      document.documentElement.classList.remove("is-sand-stream");
    } else {
      window.cosgralSand.locked = false;
      document.documentElement.classList.add("is-sand-stream");
    }
  }

  window.cosgralSceneFlow = {
    setCinema: setCinema,
    animateCinemaTo: function (target, duration) {
      if (REDUCED || !window.gsap) {
        setCinema(target);
        return null;
      }
      var tween = { value: window.cosgralSand?.cinema || 0 };
      if (tweenRozpadu && tweenRozpadu.kill) tweenRozpadu.kill();
      tweenRozpadu = gsap.to(tween, {
        value: target,
        duration: duration || 2.2,
        ease: "power2.inOut",
        onUpdate: function () {
          setCinema(tween.value);
        },
        onComplete: function () {
          tweenRozpadu = null;
          // Domkniecie: teraz stan koncowy moze juz zostac zatrzasniety.
          if (target >= 0.96) lockSandStream();
        },
      });
      return tweenRozpadu;
    },
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
    var fadeOut = opts.fadeOut !== false;

    gsap.set(panel, {
      autoAlpha: 0,
      scale: MOBILE ? 1.04 : 1.07,
      filter: MOBILE ? "none" : "blur(14px)",
    });

    var tl = gsap.timeline({
      scrollTrigger: {
        id: opts.id || scene.id,
        trigger: scene,
        start: "top top",
        end: pinLen,
        pin: true,
        pinSpacing: true,
        scrub: MOBILE ? 1.2 : 1.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: opts.priority || 1,
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

    // 0–12%: szybki wjazd z ciemności
    tl.to(
      panel,
      {
        autoAlpha: 1,
        scale: 1,
        filter: MOBILE ? "none" : "blur(0px)",
        duration: 0.12,
        ease: "power3.out",
      },
      0
    );

    if (curtain) {
      tl.to(curtain, { autoAlpha: 0.78, duration: 0.05, ease: "power1.in" }, 0)
        .to(curtain, { autoAlpha: 0, duration: 0.1, ease: "power2.out" }, 0.05);
    }

    // 12–84%: długa pauza na treści
    tl.to(panel, { autoAlpha: 1, scale: 1, duration: 0.72, ease: "none" }, 0.12);

    if (fadeOut) {
      // 84–100%: szybki zjazd w ciemność
      tl.to(
        panel,
        {
          autoAlpha: 0,
          scale: MOBILE ? 0.96 : 0.94,
          filter: MOBILE ? "none" : "blur(12px)",
          duration: 0.16,
          ease: "power3.in",
        },
        0.84
      );
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0.88, duration: 0.12, ease: "power3.in" }, 0.88);
      }
    } else {
      tl.to(panel, { autoAlpha: 1, duration: 0.16, ease: "none" }, 0.84);
    }

    return tl;
  }

  function holdScroll(st, hold) {
    return st.start + (st.end - st.start) * hold;
  }

  function smooth01(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
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
    var shatter = document.getElementById("rozpad");
    var services = document.getElementById("uslugi");
    var work = document.getElementById("realizacje");
    var process = document.getElementById("proces");
    var faq = document.getElementById("faq");
    var contact = document.getElementById("kontakt");

    if (REDUCED) {
      [hero, shatter, services, work, process, faq, contact].forEach(function (s) {
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
      window.addEventListener(
        "cosgral:cube-intro-done",
        function () {
          playSceneEnters(hero, { stagger: true, force: true });
        },
        { once: true }
      );

      gsap
        .timeline({
          scrollTrigger: {
            id: "hero-pin",
            trigger: hero,
            start: "top top",
            end: MOBILE ? "+=72%" : "+=95%",
            pin: true,
            pinSpacing: true,
            scrub: MOBILE ? 1.15 : 1.4,
            anticipatePin: 1,
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
        .to(heroScroll, { autoAlpha: 0, duration: 0.2, ease: "none" }, 0.62)
        .to(curtain, { autoAlpha: 0.65, duration: 0.18, ease: "power3.in" }, 0.72);
    }

    // ——— 2. SHATTER ———
    if (shatter) {
      var shatterPanel = panelOf(shatter);
      gsap.set(shatterPanel, { autoAlpha: 1 });
      gsap.set(shatter, { autoAlpha: 1 });

      gsap.timeline({
        scrollTrigger: {
          id: "shatter-beat",
          trigger: shatter,
          start: "top top",
          end: MOBILE ? "+=218%" : "+=272%",
          pin: true,
          pinSpacing: true,
          scrub: MOBILE ? 1.85 : 2.15,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 5,
          onEnter: function () {
            shatter.classList.add("is-active");
            document.documentElement.classList.add("is-shattering");
            document.documentElement.classList.remove("is-sand-stream");
            gsap.set(shatter, { autoAlpha: 1, visibility: "visible" });
            gsap.set(shatterPanel, { autoAlpha: 1, clearProps: "filter" });
            gsap.set(curtain, { autoAlpha: 0.55 });
          },
          onEnterBack: function () {
            shatter.classList.add("is-active");
            document.documentElement.classList.add("is-shattering");
            document.documentElement.classList.remove("is-sand-stream");
            gsap.set(shatter, { autoAlpha: 1, visibility: "visible" });
            gsap.set(shatterPanel, { autoAlpha: 1 });
          },
          onLeave: function () {
            shatter.classList.remove("is-active");
            document.documentElement.classList.remove("is-shattering");
            setCinema(1);
            gsap.set(shatterPanel, { autoAlpha: 0 });
            gsap.set(shatter, { autoAlpha: 0, visibility: "hidden" });
          },
          onLeaveBack: function () {
            shatter.classList.add("is-active");
            document.documentElement.classList.remove("is-shattering");
            gsap.set(shatter, { autoAlpha: 1, visibility: "visible" });
            gsap.set(shatterPanel, { autoAlpha: 1 });
          },
          onUpdate: function (self) {
            var p = self.progress;
            setCinema(p);

            var out = p > 0.86 ? (p - 0.86) / 0.14 : 0;
            var shatterProps = { autoAlpha: 1 - out };
            if (!MOBILE) {
              shatterProps.filter = out ? "blur(" + out * 8 + "px)" : "blur(0px)";
            }
            gsap.set(shatterPanel, shatterProps);

            if (curtain) {
              var c = p > 0.78 ? (p - 0.78) / 0.22 : 0.5 * (1 - p / 0.78);
              gsap.set(curtain, { autoAlpha: Math.min(0.9, c) });
            }
          },
        },
      });
    }

    // ——— 3–6: kinowe sceny (pin + fade) ———
    wireScene(services, {
      id: "scene-uslugi",
      pin: MOBILE ? "+=95%" : "+=118%",
      priority: 2,
      onEnter: function () {
        lockSandStream();
        window.cosgralSand.servicesVisible = true;
      },
      onEnterBack: function () {
        lockSandStream();
        window.cosgralSand.servicesVisible = true;
      },
      onLeave: function () {
        lockSandStream();
        if (window.cosgralSand) window.cosgralSand.servicesVisible = false;
      },
      onLeaveBack: function () {
        lockSandStream();
        window.cosgralSand.servicesVisible = true;
      },
    });

    if (services) {
      ScrollTrigger.create({
        id: "cube-motion-tail",
        trigger: services,
        start: "top bottom",
        end: "top 22%",
        scrub: MOBILE ? 2.4 : 2.85,
        onUpdate: function (self) {
          var q = self.progress;
          var tail = 1 - Math.pow(1 - q, 1.12);
          window.cosgralSand = window.cosgralSand || {};
          window.cosgralSand.motionTail = tail;
          setCinema(Math.min(1, 0.8 + tail * 0.2));
          window.cosgralSand.servicesVisible = q > 0.06;
        },
      });
    }

    wireScene(work, {
      id: "scene-realizacje",
      pin: MOBILE ? "+=88%" : "+=108%",
      priority: 2,
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
    });

    wireScene(process, {
      id: "scene-proces",
      pin: MOBILE ? "+=82%" : "+=102%",
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
    });
    wireScene(faq, {
      id: "scene-faq",
      pin: MOBILE ? "+=76%" : "+=94%",
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
    });
    wireScene(contact, {
      id: "scene-kontakt",
      pin: MOBILE ? "+=84%" : "+=104%",
      fadeOut: false,
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
    });

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

    ScrollTrigger.refresh();
    window.dispatchEvent(new CustomEvent("cosgral:sections-ready"));
  })();
})();
