/**
 * Portfolio — scroll-telling: kafelki wlatują ze scrolla i lądują w finalnym układzie.
 * Grafiki (cinema) mają własny pin w portfolio-graphics.js.
 *
 * Depth cover (sekcja wychodząca chowa się pod wchodzącą) jedzie przez
 * portfolio-scroll-director.js: geometria mierzona jest raz przy refreshu,
 * a style zapisujemy tylko wtedy, gdy wartość faktycznie się zmieniła.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var sceneBridgeReady = false;
  var tileBound = {};

  function director() {
    return window.cosgralScrollDirector || null;
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function smoothstep(edge0, edge1, x) {
    var t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function docTop(el) {
    if (!el) return 0;
    var smooth = window.cosgralSmoothScroll;
    var y =
      smooth && smooth.lenis && typeof smooth.lenis.scroll === "number"
        ? smooth.lenis.scroll
        : window.scrollY || window.pageYOffset || 0;
    return el.getBoundingClientRect().top + y;
  }

  /** Element, który faktycznie cofamy w głąb — reszta sekcji zostaje w layoucie. */
  function poseTarget(el) {
    if (!el) return null;
    if (el.id === "grafiki" || el.classList.contains("portfolio-section--grafiki")) {
      return el.querySelector(".graphics-stage") || el;
    }
    return (
      el.querySelector(".home-tilt-layer") ||
      el.querySelector(
        ".graphics-stage, .portfolio-scene__panel, .container, .portfolio-chapter__title"
      ) ||
      el
    );
  }

  /**
   * Cofnięcie sekcji w głąb. Zapis tylko przy realnej zmianie — blur jest
   * kwantyzowany do 0.5px, bo przy każdej nowej wartości przeglądarka przelicza
   * całą teksturę rozmycia (to był główny koszt tej animacji).
   */
  function applyRecess(entry, p) {
    var el = entry.leave;
    if (!el || !window.gsap) return;

    var hold = 0.02;
    var target = entry.target || el;
    var exitScale = MOBILE ? 0.82 : 0.72;
    var exitBlur = MOBILE ? 6 : 12;
    var exitY = MOBILE ? -2 : -5;

    if (p <= hold) {
      if (entry.state === "idle") return;
      entry.state = "idle";
      entry.blur = -1;
      el.classList.remove("is-depth-recessed", "is-depth-gone");
      el.style.pointerEvents = "";
      gsap.set(el, { clearProps: "opacity,visibility" });
      gsap.set(target, {
        clearProps: "opacity,visibility,transform,filter,yPercent,scale",
      });
      return;
    }

    var u = easeInOut((p - hold) / (1 - hold));
    var fade = u * u;
    var blur = Math.round(exitBlur * u * 2) / 2;
    var gone = u >= 0.995;

    /* Ciągłe fade/scale/blur — bez skokowej zmiany visibility w połowie przejścia. */
    if (entry.blur !== blur || Math.abs((entry.u || 0) - u) > 0.003) {
      entry.u = u;
      entry.blur = blur;
      gsap.set(target, {
        opacity: gone ? 0 : Math.max(0, 1 - fade),
        visibility: "visible",
        yPercent: exitY * u,
        scale: 1 - (1 - exitScale) * u,
        filter: gone ? "blur(0px)" : "blur(" + blur + "px)",
        transformOrigin: "50% 42%",
        force3D: true,
      });
    }

    var nextState = gone ? "gone" : "recessed";
    if (entry.state === nextState) return;
    entry.state = nextState;

    el.classList.add("is-depth-recessed");
    if (gone) {
      el.classList.add("is-depth-gone");
      el.style.pointerEvents = "none";
      gsap.set(el, { opacity: 0 });
    } else {
      el.classList.remove("is-depth-gone");
      gsap.set(el, { opacity: 1, visibility: "visible" });
      el.style.pointerEvents = "";
    }
  }

  var curtainState = { amount: -1, bridge: null };

  function setCurtain(curtain, amount) {
    if (!curtain || !window.gsap) return;
    var a = Math.max(0, Math.min(0.88, amount));
    if (Math.abs(a - curtainState.amount) < 0.004) return;
    curtainState.amount = a;
    gsap.set(curtain, {
      autoAlpha: a,
      visibility: a > 0.01 ? "visible" : "hidden",
    });
    var bridge = a > 0.08;
    if (bridge !== curtainState.bridge) {
      curtainState.bridge = bridge;
      document.body.classList.toggle("is-portfolio-scene-bridge", bridge);
    }
  }

  /** Depth cover + kurtyna jako jeden kanał dyrygenta. */
  function initPortfolioCinema() {
    if (sceneBridgeReady || REDUCED || !window.gsap || !window.ScrollTrigger) return;
    var dir = director();
    if (!dir) return;
    sceneBridgeReady = true;

    initChapterPin();

    dir.register(
      "portfolio-depth-cover",
      function measure() {
        var strony = document.getElementById("strony");
        var montaz = document.getElementById("montaz");
        var grafiki = document.getElementById("grafiki");
        var chapter = document.getElementById("automatyzacje-intro");
        var auto = document.getElementById("automatyzacje");
        var endBand = document.querySelector(".portfolio-end");
        var pin = ScrollTrigger.getById("grafiki-pin");

        var raw = [
          { leave: strony, enter: chapter },
          { leave: chapter, enter: auto },
          { leave: auto, enter: montaz },
          { leave: montaz, enter: grafiki, enterAt: pin ? pin.start : null },
          { leave: grafiki, enter: endBand, duringPin: "skip" },
        ];

        var entries = [];
        for (var i = 0; i < raw.length; i++) {
          var pair = raw[i];
          if (!pair.leave || !pair.enter) continue;
          entries.push({
            leave: pair.leave,
            target: poseTarget(pair.leave),
            enterAt: pair.enterAt != null ? pair.enterAt : docTop(pair.enter),
            duringPin: pair.duringPin || null,
            state: null,
            blur: -1,
            u: 0,
          });
        }

        /* Późniejsze sekcje malują się nad wcześniejszymi — koniec z nachodzeniem.
           Pin przenosi sekcję do .pin-spacer, więc warstwę dostaje też opakowanie. */
        var sections = document.querySelectorAll("[data-portfolio-section]");
        for (var s = 0; s < sections.length; s++) {
          var z = String(10 + s);
          sections[s].style.setProperty("--depth-z", z);
          var parent = sections[s].parentElement;
          if (parent && parent.classList.contains("pin-spacer")) {
            parent.style.setProperty("--depth-z", z);
            parent.style.zIndex = z;
          }
        }

        return {
          entries: entries,
          curtain: document.querySelector("[data-portfolio-scene-curtain]"),
          pinStart: pin ? pin.start : null,
          pinEnd: pin ? pin.end : null,
        };
      },
      function apply(y, geo, st) {
        if (!geo) return;
        var vh = st.vh;
        var pinActive =
          geo.pinStart != null && y >= geo.pinStart - 1 && y <= geo.pinEnd + 1;
        var peak = 0;

        for (var i = 0; i < geo.entries.length; i++) {
          var entry = geo.entries[i];
          var cover =
            entry.duringPin === "skip" && pinActive
              ? 0
              : clamp01(1 - (entry.enterAt - y) / vh);
          applyRecess(entry, cover);
          var pulse = Math.sin(cover * Math.PI) * 0.72;
          if (pulse > peak) peak = pulse;
        }

        setCurtain(geo.curtain, peak);
      },
      20
    );

    dir.requestRefresh(60);
  }

  function initChapterPin() {
    var chapter = document.getElementById("automatyzacje-intro");
    if (!chapter || REDUCED || !window.gsap || !window.ScrollTrigger) return;
    if (ScrollTrigger.getById("auto-chapter-pin")) return;

    var title = chapter.querySelector(".portfolio-chapter__title");
    if (title) gsap.set(title, { autoAlpha: 0, y: 28, scale: 0.94 });

    gsap.set(chapter, { width: "100%", maxWidth: "none", clearProps: "left" });

    var lastAmt = -1;
    function paint(p) {
      if (!title) return;
      var show = smoothstep(0, 0.22, p);
      var hold = 1 - smoothstep(0.72, 1, p);
      var amt = p <= 0 ? 0 : Math.min(show, hold);
      if (Math.abs(amt - lastAmt) < 0.004) return;
      lastAmt = amt;
      gsap.set(title, {
        autoAlpha: amt,
        y: (1 - amt) * 24,
        scale: 0.94 + amt * 0.06,
      });
    }

    ScrollTrigger.create({
      id: "auto-chapter-pin",
      trigger: chapter,
      start: "top top",
      end: MOBILE ? "+=72%" : "+=90%",
      pin: true,
      pinSpacing: true,
      scrub: true,
      anticipatePin: 0.3,
      invalidateOnRefresh: true,
      refreshPriority: -2,
      onUpdate: function (self) {
        paint(self.progress);
      },
      onRefresh: function (self) {
        gsap.set(chapter, { width: "100%", maxWidth: "none" });
        lastAmt = -1;
        paint(self.progress || 0);
      },
    });
  }

  function revealAutoSection(auto) {
    if (!auto) return;
    auto.classList.add("is-entered", "is-visible");
    if (window.gsap) {
      var panel =
        auto.querySelector(".home-tilt-layer, .portfolio-scene__panel, .container") || auto;
      gsap.set(auto, { clearProps: "opacity,visibility" });
      gsap.set(panel, { clearProps: "opacity,visibility,transform,filter" });
      auto.classList.remove("is-depth-gone", "is-depth-recessed");
      auto.style.pointerEvents = "";
    }
  }

  /** Scrub: kafelki wlatują i lądują w finalnym układzie CSS. */
  function bindTileScrollTell(key, selector, opts) {
    opts = opts || {};
    function run() {
      if (tileBound[key] || REDUCED || !window.gsap || !window.ScrollTrigger) return;
      var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
      if (!nodes.length) return;
      tileBound[key] = true;

      var section = nodes[0].closest("[data-portfolio-section]") || nodes[0];
      var from = opts.from || {};
      var stagger = opts.stagger != null ? opts.stagger : 0.1;
      var start = opts.start || "top 78%";
      var end = opts.end || "top 36%";
      var scrub = opts.scrub != null ? opts.scrub : 1.1;

      var tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          id: "tile-tell-" + key,
          trigger: opts.trigger || section,
          start: start,
          end: end,
          scrub: scrub,
          invalidateOnRefresh: true,
        },
      });

      nodes.forEach(function (node, i) {
        var side = i % 2 === 0 ? -1 : 1;
        var depth = i % 3;
        gsap.set(node, {
          autoAlpha: 0,
          x: from.x != null ? from.x * side : (MOBILE ? 36 : 72) * side,
          y: from.y != null ? from.y : (MOBILE ? 48 : 88) + depth * 12,
          z: from.z != null ? from.z : MOBILE ? -80 : -220,
          rotationX: from.rotationX != null ? from.rotationX : MOBILE ? 10 : 22,
          rotationY: from.rotationY != null ? from.rotationY * side : (MOBILE ? 8 : 18) * side,
          rotationZ: from.rotationZ != null ? from.rotationZ * side : side * (MOBILE ? 2 : 4),
          scale: from.scale != null ? from.scale : 0.82,
          transformPerspective: 1200,
          force3D: true,
        });
        tl.to(
          node,
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scale: 1,
            duration: 1,
          },
          i * stagger
        );
      });
    }

    run();
    document.addEventListener("portfolio:media-ready", run);
  }

  function bindHeroTell() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;
    var hero = document.querySelector(".portfolio-hero");
    if (!hero) return;
    var title = hero.querySelector(".portfolio-hero__title");
    var lead = hero.querySelector(".portfolio-hero__lead");
    if (title) {
      gsap.fromTo(
        title,
        { autoAlpha: 0, y: 36, scale: 0.94, filter: MOBILE ? "none" : "blur(8px)" },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: "none",
          ease: "power3.out",
          scrollTrigger: {
            trigger: hero,
            start: "top 90%",
            end: "top 45%",
            scrub: 0.9,
          },
        }
      );
    }
    if (lead) {
      gsap.fromTo(
        lead,
        { autoAlpha: 0, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: hero,
            start: "top 75%",
            end: "top 40%",
            scrub: 1,
          },
        }
      );
    }
  }

  function bindHeadTell(section) {
    if (!section || REDUCED) return;
    var head = section.querySelector("[data-portfolio-head]");
    if (!head || section.id === "automatyzacje" || section.id === "grafiki") return;
    var kids = head.children;
    if (!kids.length) return;
    gsap.fromTo(
      kids,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          end: "top 52%",
          scrub: 1.05,
        },
      }
    );
  }

  function boot() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    var auto = document.getElementById("automatyzacje");
    if (auto) revealAutoSection(auto);

    bindHeroTell();

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section) {
      bindHeadTell(section);
    });

    bindTileScrollTell("web", "#strony .web-deck__card", {
      stagger: MOBILE ? 0.12 : 0.16,
      start: "top 72%",
      end: "top 34%",
      scrub: 1.2,
      from: { scale: 0.72, z: MOBILE ? -120 : -360, rotationX: MOBILE ? 16 : 34 },
    });

    bindTileScrollTell(
      "reels",
      "#montaz .reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card",
      {
        stagger: 0.05,
        start: "top 76%",
        end: "top 38%",
        scrub: 1.15,
        from: { y: MOBILE ? 60 : 100, scale: 0.88, rotationX: 0, rotationY: 0, rotationZ: 0, z: 0 },
      }
    );

    if (!MOBILE) {
      bindTileScrollTell("auto", "#automatyzacje .portfolio-case-card", {
        stagger: 0.09,
        start: "top 70%",
        end: "top 32%",
        scrub: 1.15,
        from: { y: 72, scale: 0.9, rotationZ: -3, rotationX: 8, z: -80 },
      });
    }

    initPortfolioCinema();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("portfolio:media-ready", function () {
    initPortfolioCinema();
    if (director()) director().requestRefresh(140);
  });

  window.addEventListener("load", function () {
    initPortfolioCinema();
    if (director()) director().requestRefresh(180);
  });
})();
