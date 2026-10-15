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
    /* Free-scroll depth stack: nie nadpisuj scrubowanych scale/blur/y */
    if (document.documentElement.classList.contains("is-free-scroll")) {
      scene.classList.add("is-entered", "is-visible");
      return;
    }
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

  function snapSceneEntersVisible(scene) {
    if (!scene || !window.gsap) return;
    enteredScenes.add(scene);
    var targets = sceneEnterTargets(scene);
    if (!targets.length) return;
    gsap.killTweensOf(targets);
    gsap.set(targets, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      filter: "none",
    });
  }

  function resetSceneEnters(scene) {
    if (!scene) return;
    enteredScenes.delete(scene);
    if (!window.gsap || REDUCED) return;
    var targets = sceneEnterTargets(scene);
    if (!targets.length) return;
    gsap.killTweensOf(targets);
    targets.forEach(function (el) {
      var dir =
        el.getAttribute("data-enter") ||
        (el.parentElement && el.parentElement.getAttribute("data-enter")) ||
        "bottom";
      var from = enterFrom(dir);
      gsap.set(el, {
        autoAlpha: 0,
        x: from.x,
        y: from.y,
        filter: MOBILE ? "none" : "blur(8px)",
      });
    });
  }

  window.cosgralSceneEnters = {
    play: playSceneEnters,
    snap: snapSceneEntersVisible,
    reset: resetSceneEnters,
    ensurePanel: ensureScenePanelVisible,
  };

  function panelOf(scene) {
    return scene.querySelector(".home-scene__panel") || scene;
  }

  function setCurtain(amount) {
    if (!curtain) return;
    gsap.set(curtain, { autoAlpha: amount });
  }

  function lockSandStream() {
    document.documentElement.classList.add("is-sand-stream");
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
      return gsap.to(tween, {
        value: target,
        duration: duration || 2.2,
        ease: "power2.inOut",
        onUpdate: function () {
          setCinema(tween.value);
        },
      });
    },
  };

  /**
   * Warstwowy stack od Usług (sticky, bez GSAP pin):
   * sekcja trzyma się top:0, kolejna wjeżdża od dołu z wyższym z-index.
   * Blur/scale = scrub 1:1 do pozycji następnej (cover 0→1).
   * Scroll w górę = ten sam scrub wstecz — bez teleportów / klonów.
   */
  var depthStackIndex = 0;

  function wireScene(scene, opts) {
    if (!scene || REDUCED) {
      if (scene) scene.classList.add("is-entered", "is-visible");
      return;
    }

    opts = opts || {};
    var panel = panelOf(scene);
    var fadeOut = opts.fadeOut !== false;
    var depth = opts.depth !== false;
    var next = opts.next || null;
    var stackZ = 20 + depthStackIndex++ * 10;
    var holdEnd = 0.04;
    /* Do końca cover → znika w oddali (scale↓ blur↑ alpha→0), żeby nie zostawała pod kolejną */
    var exitScale = opts.exitScale != null ? opts.exitScale : MOBILE ? 0.78 : 0.68;
    var exitBlur = opts.exitBlur != null ? opts.exitBlur : MOBILE ? 10 : 20;
    var exitAlpha = opts.exitAlpha != null ? opts.exitAlpha : 0;
    var exitY = opts.exitY != null ? opts.exitY : MOBILE ? -4 : -8;
    var hideWhenGone = opts.hideWhenGone !== false;

    scene.classList.add("home-depth");
    scene.style.setProperty("--depth-z", String(stackZ));
    scene.style.zIndex = String(stackZ);

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function coverAmount() {
      if (!next) return 0;
      var top = next.getBoundingClientRect().top;
      var vh = window.innerHeight || 1;
      /* next już na górze lub wyżej = pełne przykrycie */
      if (top <= 0) return 1;
      return 1 - Math.max(0, Math.min(1, top / vh));
    }

    function applyPose(p) {
      p = Math.max(0, Math.min(1, p));
      if (!depth || !fadeOut) {
        gsap.set(panel, {
          autoAlpha: 1,
          yPercent: 0,
          scale: 1,
          filter: "blur(0px)",
          force3D: true,
        });
        scene.classList.toggle("is-depth-recessed", false);
        return;
      }
      if (p <= holdEnd) {
        gsap.set(panel, {
          autoAlpha: 1,
          yPercent: 0,
          scale: 1,
          filter: "blur(0px)",
          force3D: true,
        });
        gsap.set(scene, { autoAlpha: 1 });
        scene.classList.remove("is-depth-recessed", "is-depth-gone");
        scene.style.pointerEvents = "";
        return;
      }
      var u = easeInOut((p - holdEnd) / Math.max(1 - holdEnd, 0.001));
      /* Pod koniec przyspiesz zanik — w połowie jeszcze widać, przy cover=1 już nie */
      var fade = u * u;
      gsap.set(panel, {
        autoAlpha: 1 - (1 - exitAlpha) * fade,
        yPercent: exitY * u,
        scale: 1 - (1 - exitScale) * u,
        filter: "blur(" + (exitBlur * u).toFixed(2) + "px)",
        force3D: true,
      });
      scene.classList.add("is-depth-recessed");
      if (hideWhenGone && u >= 0.98) {
        scene.classList.add("is-depth-gone");
        scene.style.pointerEvents = "none";
        gsap.set(scene, { autoAlpha: 0 });
        gsap.set(panel, { autoAlpha: 0, filter: "blur(0px)" });
      } else {
        scene.classList.remove("is-depth-gone");
        gsap.set(scene, { autoAlpha: 1 });
        /* Interact while still partly visible — don't wait for a perfect snap */
        scene.style.pointerEvents = "";
      }
    }

    gsap.set(panel, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      filter: "blur(0px)",
      transformOrigin: "50% 42%",
      force3D: true,
    });
    /* Start ukryty — animacja tylko przy pierwszym wjeździe w dół */
    resetSceneEnters(scene);

    /* Wejście w viewport — bez pina */
    ScrollTrigger.create({
      id: opts.id || scene.id,
      trigger: scene,
      start: opts.enterStart || "top 92%",
      end: "bottom top",
      invalidateOnRefresh: true,
      refreshPriority: opts.priority || 1,
      onEnter: function () {
        scene.classList.add("is-entered", "is-visible", "is-depth-active");
        playSceneEnters(scene, { stagger: true });
        if (opts.onEnter) opts.onEnter();
      },
      onEnterBack: function () {
        /* Scroll w górę: bez animacji, od razu stan końcowy */
        scene.classList.add("is-entered", "is-visible", "is-depth-active");
        snapSceneEntersVisible(scene);
        if (opts.onEnterBack) opts.onEnterBack();
      },
      onLeave: function () {
        scene.classList.remove("is-depth-active");
        if (opts.onLeave) opts.onLeave();
      },
      onLeaveBack: function () {
        scene.classList.remove("is-visible", "is-depth-active");
        resetSceneEnters(scene);
        applyPose(0);
        if (opts.onLeaveBack) opts.onLeaveBack();
      },
    });

    /* Recess z live rect następnej — pełny zakres scrolla, bo sticky psuje
       start/end ST i zostawiał lukę (Kontakt na ostrym Procesie). */
    if (fadeOut && next) {
      function syncCover() {
        var amt = coverAmount();
        applyPose(amt);
        if (opts.onUpdate) opts.onUpdate({ progress: amt });
      }
      ScrollTrigger.create({
        id: (opts.id || scene.id) + "-cover",
        start: 0,
        end: "max",
        invalidateOnRefresh: true,
        refreshPriority: (opts.priority || 1) + 1,
        onUpdate: syncCover,
        onRefresh: syncCover,
      });
    }
  }

  /**
   * Horizontal swipe: leaveLayers lecą w lewo, enter wjeżdża z prawej (scrub 1:1).
   * progress z live getBoundingClientRect — odporne na offset ST/Lenis.
   */
  function wireHorizontalSwipe(opts) {
    opts = opts || {};
    var leave = (opts.leave || []).filter(Boolean);
    var enter = opts.enter;
    var runway = opts.runway || null;
    if (!enter || !leave.length || REDUCED) return;

    if (runway) {
      runway.classList.add("home-swipe-runway");
      runway.classList.remove("home-depth");
    }

    leave.forEach(function (el) {
      el.classList.add("is-swipe-layer");
    });
    enter.classList.add("home-depth", "is-swipe-layer", "is-swipe-enter");
    if (!enter.style.getPropertyValue("--depth-z")) {
      var z = 20 + depthStackIndex++ * 10;
      enter.style.setProperty("--depth-z", String(z));
      enter.style.zIndex = String(z);
    }

    var travel = window.innerHeight;
    function measureTravel() {
      travel = window.innerHeight || 1;
    }

    function swipeProgress() {
      var workEl = leave[leave.length - 1];
      var workTop = workEl.getBoundingClientRect().top;
      var faqTop = enter.getBoundingClientRect().top;
      var vh = window.innerHeight || 1;
      /* Czekaj aż Realizacje dojdą do góry — potem faqTop: vh→0 */
      if (workTop > 2) return 0;
      return 1 - Math.max(0, Math.min(1, faqTop / vh));
    }

    function applySwipe(p) {
      p = Math.max(0, Math.min(1, p));
      var ease = p; /* liniowo = synchroniczny swipe ze scrollem */
      var w = window.innerWidth;
      leave.forEach(function (el) {
        gsap.set(el, { x: -ease * w, force3D: true });
      });
      gsap.set(enter, { x: (1 - ease) * w, force3D: true });
      if (p > 0.08) {
        enter.classList.add("is-entered", "is-visible", "is-depth-active");
      }
      if (p > 0.15) playSceneEnters(enter, { stagger: true });
      if (p < 0.05) {
        enter.classList.remove("is-depth-active");
      }
      if (opts.onUpdate) opts.onUpdate(p);
    }

    gsap.set(leave, { x: 0, force3D: true });
    gsap.set(enter, { x: window.innerWidth, force3D: true });
    measureTravel();

    ScrollTrigger.create({
      id: opts.id || "swipe-horizontal",
      trigger: leave[leave.length - 1],
      start: "top bottom",
      endTrigger: enter,
      end: "top top-=80%",
      invalidateOnRefresh: true,
      refreshPriority: 5,
      onRefresh: function () {
        measureTravel();
        applySwipe(swipeProgress());
      },
      onUpdate: function () {
        applySwipe(swipeProgress());
      },
    });
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
            refreshPriority: 10,
            onEnterBack: function () {
              if (window.cosgralRestoreHero) window.cosgralRestoreHero();
              setCinema(0);
              document.documentElement.classList.remove("is-shattering", "is-sand-stream");
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

    // ——— 2. CUBE RUNWAY — cinema od wejścia toru (koniec hero) do Usługi top ———
    var runway = document.getElementById("cube-runway") || document.querySelector(".cube-runway");
    if (runway || shatter) {
      var shatterPanel = shatter ? panelOf(shatter) : null;
      if (shatterPanel) {
        gsap.set(shatterPanel, { autoAlpha: 1 });
        gsap.set(shatter, { autoAlpha: 1 });
      }

      /* start = koniec hero-pin (jawnie); end = Usługi top — bez luki i bez overlapu hero */
      ScrollTrigger.create({
        id: "shatter-beat",
        trigger: runway || shatter,
        start: function () {
          var heroSt = ScrollTrigger.getById("hero-pin");
          if (heroSt && isFinite(heroSt.end)) return heroSt.end;
          var el = runway || shatter;
          return Math.max(0, (el ? el.offsetTop : 0) - window.innerHeight);
        },
        end: function () {
          if (services) {
            /* sticky offsetTop bywa mylący — bierzemy layout top względem dokumentu */
            var y = services.getBoundingClientRect().top + window.scrollY;
            var heroSt = ScrollTrigger.getById("hero-pin");
            var startY = heroSt && isFinite(heroSt.end) ? heroSt.end : Math.max(0, (runway || shatter).offsetTop - window.innerHeight);
            return Math.max(startY + window.innerHeight * 0.5, y);
          }
          return "+=" + Math.round(window.innerHeight * (MOBILE ? 0.4 : 0.5));
        },
        scrub: MOBILE ? 1.45 : 1.65,
        invalidateOnRefresh: true,
        refreshPriority: 4,
        onEnter: function () {
          if (shatter) shatter.classList.add("is-active");
          document.documentElement.classList.add("is-shattering");
          document.documentElement.classList.remove("is-sand-stream");
          window.cosgralSand = window.cosgralSand || {};
          window.cosgralSand.locked = false;
          if (curtain) gsap.set(curtain, { autoAlpha: 0.55 });
        },
        onEnterBack: function () {
          if (shatter) shatter.classList.add("is-active");
          document.documentElement.classList.add("is-shattering");
          document.documentElement.classList.remove("is-sand-stream");
          window.cosgralSand = window.cosgralSand || {};
          window.cosgralSand.locked = false;
        },
        onLeave: function () {
          if (shatter) shatter.classList.remove("is-active");
          document.documentElement.classList.remove("is-shattering");
          setCinema(1);
          lockSandStream();
          if (curtain) gsap.set(curtain, { autoAlpha: 0 });
        },
        onLeaveBack: function () {
          if (shatter) shatter.classList.remove("is-active");
          document.documentElement.classList.remove("is-shattering");
          document.documentElement.classList.remove("is-sand-stream");
          window.cosgralSand = window.cosgralSand || {};
          window.cosgralSand.locked = false;
          setCinema(0);
        },
        onUpdate: function (self) {
          setCinema(self.progress);
          if (curtain) {
            var p = self.progress;
            var c = p > 0.78 ? (p - 0.78) / 0.22 : 0.5 * (1 - p / 0.78);
            gsap.set(curtain, { autoAlpha: Math.min(0.9, c) });
          }
        },
      });
    }

    // ——— Depth stack: Usługi → Realizacje → FAQ → Proces → Kontakt ———
    wireScene(services, {
      id: "scene-uslugi",
      next: work,
      priority: 2,
      exitAlpha: 0,
      exitScale: MOBILE ? 0.8 : 0.7,
      exitBlur: MOBILE ? 10 : 18,
      hideWhenGone: true,
      onEnter: function () {
        /* Nie lockuj cinema wcześnie — shatter-beat prowadzi do Usługi top */
        window.cosgralSand = window.cosgralSand || {};
        window.cosgralSand.servicesVisible = true;
        if ((window.cosgralSand.cinema || 0) >= 0.94) lockSandStream();
        if (curtain && (window.cosgralSand.cinema || 0) >= 0.85) {
          gsap.set(curtain, { autoAlpha: 0 });
        }
      },
      onEnterBack: function () {
        window.cosgralSand = window.cosgralSand || {};
        window.cosgralSand.servicesVisible = true;
        if ((window.cosgralSand.cinema || 0) >= 0.94) lockSandStream();
      },
      onLeave: function () {
        lockSandStream();
        if (window.cosgralSand) window.cosgralSand.servicesVisible = false;
      },
      onLeaveBack: function () {
        window.cosgralSand = window.cosgralSand || {};
        window.cosgralSand.servicesVisible = true;
      },
    });

    if (services) {
      ScrollTrigger.create({
        id: "cube-motion-tail",
        trigger: services,
        start: "top 28%",
        end: "top top",
        scrub: MOBILE ? 2.0 : 2.3,
        onUpdate: function (self) {
          var shatterSt = ScrollTrigger.getById("shatter-beat");
          if (shatterSt && shatterSt.progress < 0.97) {
            window.cosgralSand = window.cosgralSand || {};
            window.cosgralSand.servicesVisible = self.progress > 0.02;
            return;
          }
          var q = self.progress;
          var tail = 1 - Math.pow(1 - q, 1.12);
          window.cosgralSand = window.cosgralSand || {};
          window.cosgralSand.motionTail = tail;
          window.cosgralSand.servicesVisible = true;
        },
      });
    }

    wireScene(work, {
      id: "scene-realizacje",
      next: faq,
      priority: 3,
      exitAlpha: 0,
      exitScale: MOBILE ? 0.8 : 0.7,
      exitBlur: MOBILE ? 10 : 18,
      hideWhenGone: true,
      onEnter: function () {
        lockSandStream();
        if (curtain) gsap.set(curtain, { autoAlpha: 0 });
      },
      onEnterBack: lockSandStream,
      onLeave: lockSandStream,
      onLeaveBack: lockSandStream,
    });

    wireScene(faq, {
      id: "scene-faq",
      next: process,
      priority: 4,
      exitAlpha: 0,
      exitScale: MOBILE ? 0.8 : 0.7,
      exitBlur: MOBILE ? 10 : 18,
      hideWhenGone: true,
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
      onLeave: lockSandStream,
      onLeaveBack: lockSandStream,
    });

    wireScene(process, {
      id: "scene-proces",
      next: contact,
      priority: 5,
      exitAlpha: 0,
      exitScale: MOBILE ? 0.8 : 0.7,
      exitBlur: MOBILE ? 10 : 18,
      hideWhenGone: true,
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
      onLeave: lockSandStream,
      onLeaveBack: lockSandStream,
    });

    wireScene(contact, {
      id: "scene-kontakt",
      next: null,
      priority: 6,
      fadeOut: false,
      onEnter: lockSandStream,
      onEnterBack: lockSandStream,
      onLeave: lockSandStream,
      onLeaveBack: lockSandStream,
    });

    /* Kontakt + stopka: bez fade przez pusty runway — jedna ciągła sekcja na --bg */
    if (contact && document.querySelector(".site-footer")) {
      ScrollTrigger.create({
        id: "footer-handoff",
        trigger: ".site-footer",
        start: "top 92%",
        end: "bottom bottom",
        scrub: MOBILE ? 0.6 : 0.8,
        onUpdate: function (self) {
          var fade = self.progress;
          var eased = fade * fade * (3 - 2 * fade);
          document.documentElement.classList.toggle("is-footer-step", eased > 0.25);
          document.documentElement.classList.toggle("is-footer-covered", eased > 0.05);
          contact.classList.toggle("is-footer-handoff", eased > 0.05);
        },
        onLeaveBack: function () {
          contact.classList.remove("is-footer-handoff");
          document.documentElement.classList.remove("is-footer-step");
          document.documentElement.classList.remove("is-footer-covered");
        },
      });
    }

    /* Stopka: bez animacji napisów — od razu widoczne */
    ScrollTrigger.refresh();
    requestAnimationFrame(function () {
      ScrollTrigger.refresh();
    });
    window.dispatchEvent(new CustomEvent("cosgral:sections-ready"));
  })();
})();
