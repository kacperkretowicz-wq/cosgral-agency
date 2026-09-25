/**
 * Portfolio — scroll-telling: kafelki wlatują ze scrolla i lądują w finalnym układzie.
 * Grafiki (cinema) ma własny pin+scrub w portfolio-graphics.js.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var sceneBridgeReady = false;
  var tileBound = {};

  function getCurtain() {
    return document.querySelector("[data-portfolio-scene-curtain]");
  }

  function smoothstep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function coverAmount(next) {
    if (!next) return 0;
    var top = next.getBoundingClientRect().top;
    var vh = window.innerHeight || 1;
    if (top <= 0) return 1;
    return 1 - Math.max(0, Math.min(1, top / vh));
  }

  function poseTarget(el) {
    if (!el) return null;
    // Grafiki: recess .graphics-stage only when leaving (pin forces recess 0 while active)
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

  function applyRecess(el, p) {
    if (!el || !window.gsap) return;
    var target = poseTarget(el);
    var hold = 0.02;
    var exitScale = MOBILE ? 0.82 : 0.72;
    var exitBlur = MOBILE ? 6 : 12;
    var exitY = MOBILE ? -2 : -5;
    if (p <= hold) {
      el.classList.remove("is-depth-recessed", "is-depth-gone");
      el.style.pointerEvents = "";
      gsap.set(el, { clearProps: "opacity,visibility" });
      gsap.set(target, {
        clearProps: "opacity,visibility,transform,filter,yPercent,scale",
      });
      return;
    }
    var u = easeInOut((p - hold) / Math.max(1 - hold, 0.001));
    var fade = u * u;
    /* Continuous fade/scale/blur — no sudden visibility snap mid-cover */
    gsap.set(target, {
      opacity: Math.max(0, 1 - fade),
      visibility: "visible",
      yPercent: exitY * u,
      scale: 1 - (1 - exitScale) * u,
      filter: "blur(" + (exitBlur * u).toFixed(2) + "px)",
      transformOrigin: "50% 42%",
      force3D: true,
    });
    el.classList.add("is-depth-recessed");
    if (u >= 0.995) {
      el.classList.add("is-depth-gone");
      el.style.pointerEvents = "none";
      gsap.set(el, { opacity: 0 });
      gsap.set(target, { opacity: 0, filter: "blur(0px)" });
    } else {
      el.classList.remove("is-depth-gone");
      gsap.set(el, { opacity: 1, visibility: "visible" });
      el.style.pointerEvents = "";
    }
  }

  function setCurtain(amount) {
    var curtain = getCurtain();
    if (!curtain || !window.gsap) return;
    var a = Math.max(0, Math.min(0.88, amount));
    gsap.set(curtain, {
      autoAlpha: a,
      visibility: a > 0.01 ? "visible" : "hidden",
    });
    document.body.classList.toggle("is-portfolio-scene-bridge", a > 0.08);
  }

  function syncCurtainFromCovers(pairs) {
    var peak = 0;
    pairs.forEach(function (pair) {
      var p = coverAmount(pair.enter);
      var pulse = Math.sin(p * Math.PI) * 0.72;
      if (pulse > peak) peak = pulse;
    });
    setCurtain(peak);
  }

  function wireCover(leave, enter, opts) {
    opts = opts || {};
    if (!leave || !enter || REDUCED || !window.ScrollTrigger) return;
    function sync() {
      if (opts.afterPin) {
        var pin = window.ScrollTrigger && ScrollTrigger.getById(opts.afterPin);
        if (pin && pin.isActive) {
          applyRecess(leave, 0);
          return;
        }
      }
      applyRecess(leave, coverAmount(enter));
    }
    ScrollTrigger.create({
      id: (leave.id || "leave") + "-cover-" + (enter.id || "enter"),
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      onUpdate: sync,
      onRefresh: sync,
    });
  }

  function initChapterPin() {
    var chapter = document.getElementById("automatyzacje-intro");
    if (!chapter || REDUCED || !window.gsap || !window.ScrollTrigger) return;

    var title = chapter.querySelector(".portfolio-chapter__title");
    if (title) gsap.set(title, { autoAlpha: 0, y: 28, scale: 0.94 });

    gsap.set(chapter, { width: "100%", maxWidth: "none", clearProps: "left" });

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
        if (!title) return;
        var p = self.progress;
        var show = smoothstep(0, 0.22, p);
        var hold = 1 - smoothstep(0.72, 1, p);
        var amt = Math.min(show, hold);
        gsap.set(title, {
          autoAlpha: amt,
          y: (1 - amt) * 24,
          scale: 0.94 + amt * 0.06,
        });
      },
      onRefresh: function (self) {
        gsap.set(chapter, { width: "100%", maxWidth: "none" });
        if (!title) return;
        var p = self.progress || 0;
        var show = smoothstep(0, 0.22, p);
        var hold = 1 - smoothstep(0.72, 1, p);
        var amt = p <= 0 ? 0 : Math.min(show, hold);
        gsap.set(title, {
          autoAlpha: amt,
          y: (1 - amt) * 24,
          scale: 0.94 + amt * 0.06,
        });
      },
    });
  }

  function initPortfolioCinema() {
    if (sceneBridgeReady || REDUCED || !window.gsap || !window.ScrollTrigger) return;
    sceneBridgeReady = true;

    var strony = document.getElementById("strony");
    var montaz = document.getElementById("montaz");
    var grafiki = document.getElementById("grafiki");
    var chapter = document.getElementById("automatyzacje-intro");
    var auto = document.getElementById("automatyzacje");
    var endBand = document.querySelector(".portfolio-end");

    var pairs = [
      { leave: strony, enter: chapter },
      { leave: chapter, enter: auto },
      { leave: auto, enter: montaz },
      { leave: montaz, enter: grafiki },
      { leave: grafiki, enter: endBand, afterPin: "grafiki-pin" },
    ].filter(function (pair) {
      return pair.leave && pair.enter;
    });

    pairs.forEach(function (pair) {
      wireCover(pair.leave, pair.enter, {
        afterPin: pair.afterPin || null,
      });
    });

    ScrollTrigger.create({
      id: "portfolio-curtain-sync",
      start: 0,
      end: "max",
      onUpdate: function () {
        syncCurtainFromCovers(pairs);
      },
      onRefresh: function () {
        syncCurtainFromCovers(pairs);
      },
    });

    initChapterPin();
    ScrollTrigger.refresh();
    requestAnimationFrame(function () {
      ScrollTrigger.refresh();
    });
  }

  function revealAutoSection(auto) {
    if (!auto) return;
    auto.classList.add("is-entered", "is-visible");
    if (window.gsap) {
      var panel = auto.querySelector(".home-tilt-layer, .portfolio-scene__panel, .container") || auto;
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
    ScrollTrigger.refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("portfolio:media-ready", function () {
    initPortfolioCinema();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
  window.addEventListener("load", function () {
    window.setTimeout(initPortfolioCinema, 180);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
