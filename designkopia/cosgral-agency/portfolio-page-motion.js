/**
 * Portfolio — cinematic przejścia jak na homepage (curtain + recess),
 * wolny scroll wewnątrz długich sekcji.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var sceneBridgeReady = false;

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
    var hold = 0.04;
    if (p <= hold) {
      gsap.set(target, { autoAlpha: 1, yPercent: 0, scale: 1, filter: "blur(0px)", force3D: true });
      gsap.set(el, { autoAlpha: 1 });
      el.classList.remove("is-depth-recessed", "is-depth-gone");
      el.style.pointerEvents = "";
      return;
    }
    var u = easeInOut((p - hold) / Math.max(1 - hold, 0.001));
    var fade = u * u;
    gsap.set(target, {
      autoAlpha: 1 - fade,
      yPercent: (MOBILE ? -4 : -8) * u,
      scale: 1 - (MOBILE ? 0.2 : 0.3) * u,
      filter: MOBILE ? "none" : "blur(" + (18 * u).toFixed(2) + "px)",
      transformOrigin: "50% 42%",
      force3D: true,
    });
    el.classList.add("is-depth-recessed");
    if (u >= 0.98) {
      el.classList.add("is-depth-gone");
      el.style.pointerEvents = "none";
      gsap.set(el, { autoAlpha: 0 });
    } else {
      el.classList.remove("is-depth-gone");
      gsap.set(el, { autoAlpha: 1 });
      /* Keep clicks / wheel on tiles while anything is still on screen */
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

  function wireCover(leave, enter) {
    if (!leave || !enter || REDUCED || !window.ScrollTrigger) return;
    function sync() {
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

    /* Keep full-bleed: tilt layers / flex pin-spacer must not shrink the chapter. */
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
    var cta = document.querySelector(".portfolio-contact-cta");

    var pairs = [
      { leave: strony, enter: montaz },
      { leave: montaz, enter: grafiki },
      { leave: grafiki, enter: chapter },
      { leave: chapter, enter: auto },
      { leave: auto, enter: cta },
    ].filter(function (pair) {
      return pair.leave && pair.enter;
    });

    pairs.forEach(function (pair) {
      wireCover(pair.leave, pair.enter);
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

  function boot() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    var auto = document.getElementById("automatyzacje");
    if (auto) revealAutoSection(auto);

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section, i) {
      var head = section.querySelector("[data-portfolio-head]");
      var body = section.querySelector("[data-portfolio-body]");
      var skipReveal = section.id === "grafiki";
      var staticMobileSection =
        MOBILE && (section.id === "strony" || section.id === "montaz" || section.id === "automatyzacje");

      if (staticMobileSection && window.gsap) {
        if (head) gsap.set(head.children, { clearProps: "opacity,transform,filter" });
        if (body) gsap.set(body, { clearProps: "opacity,transform,filter" });
      }

      if (head && !skipReveal && section.id !== "automatyzacje" && !staticMobileSection) {
        gsap.fromTo(
          head.children,
          {
            opacity: 0,
            y: i % 2 === 0 ? 72 : -56,
            filter: MOBILE ? "none" : "blur(12px)",
          },
          {
            opacity: 1,
            y: 0,
            filter: MOBILE ? "none" : "blur(0px)",
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 78%",
              end: "top 48%",
              scrub: 1.15,
            },
          }
        );
      }

      if (body && !skipReveal && !staticMobileSection) {
        gsap.fromTo(
          body,
          { opacity: 0.35, y: 48, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 72%",
              end: "top 42%",
              scrub: 1.2,
            },
          }
        );
      }
    });

    if (!MOBILE) {
      bindTileMotion("#automatyzacje .portfolio-case-card", {
        from: { y: 64, rotateZ: -2, scale: 0.96 },
        stagger: 0.1,
      });
    }

    initPortfolioCinema();
    ScrollTrigger.refresh();
  }

  function bindTileMotion(selector, opts) {
    var bound = false;
    function run() {
      if (bound) return;
      var nodes = document.querySelectorAll(selector);
      if (!nodes.length) return;
      bound = true;
      gsap.fromTo(
        nodes,
        Object.assign({ opacity: 0, filter: MOBILE ? "none" : "blur(8px)" }, opts.from),
        {
          opacity: 1,
          y: 0,
          x: 0,
          rotateZ: 0,
          scale: 1,
          filter: MOBILE ? "none" : "blur(0px)",
          stagger: opts.stagger || 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: nodes[0].closest("[data-portfolio-section]") || nodes[0],
            start: "top 70%",
            end: "top 38%",
            scrub: 1.05,
          },
        }
      );
    }
    run();
    document.addEventListener("portfolio:media-ready", run);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("portfolio:media-ready", initPortfolioCinema);
  window.addEventListener("load", function () {
    window.setTimeout(initPortfolioCinema, 180);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
