/**
 * Portfolio — scroll-driven przejścia sekcji i kafelków.
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

  function resetGrafikiStage(section) {
    if (!section || !window.gsap) return;
    var stage = section.querySelector(".graphics-stage");
    if (!stage) return;
    gsap.set(stage, { autoAlpha: 1, scale: 1, filter: "blur(0px)" });
  }

  function setGrafikiStage(stage, hideAmt) {
    gsap.set(stage, {
      autoAlpha: 1 - hideAmt,
      scale: 1 - hideAmt * (MOBILE ? 0.04 : 0.06),
      filter: MOBILE ? "none" : "blur(" + hideAmt * 12 + "px)",
    });
  }

  function setAutoPanel(panel, showAmt) {
    gsap.set(panel, {
      autoAlpha: showAmt,
      scale: (MOBILE ? 0.96 : 0.94) + showAmt * (MOBILE ? 0.04 : 0.06),
      filter: MOBILE ? "none" : "blur(" + (1 - showAmt) * 14 + "px)",
    });
  }

  /** Pin + fade przez ciemność — jak wireScene na homepage (proces → FAQ). */
  function wirePortfolioScene(section, panel, opts) {
    if (!section || !panel || REDUCED) {
      if (section) section.classList.add("is-entered", "is-visible");
      return null;
    }

    opts = opts || {};
    var curtain = getCurtain();
    var pinLen = opts.pin || (MOBILE ? "+=76%" : "+=94%");
    var fadeOut = opts.fadeOut !== false;
    var skipFadeIn = opts.skipFadeIn === true;

    if (!skipFadeIn) {
      gsap.set(panel, {
        autoAlpha: 0,
        scale: MOBILE ? 1.04 : 1.07,
        filter: MOBILE ? "none" : "blur(14px)",
      });
    } else {
      gsap.set(panel, {
        autoAlpha: 0,
        scale: MOBILE ? 0.96 : 0.94,
        filter: MOBILE ? "none" : "blur(14px)",
      });
    }

    var tl = gsap.timeline({
      scrollTrigger: {
        id: opts.id || section.id,
        trigger: section,
        start: "top top",
        end: pinLen,
        pin: true,
        pinSpacing: true,
        scrub: MOBILE ? 1.2 : 1.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: opts.priority || 0,
        onEnter: function () {
          section.classList.add("is-entered", "is-visible");
        },
        onEnterBack: function () {
          section.classList.add("is-entered", "is-visible");
        },
        onLeave: function () {
          section.classList.remove("is-visible");
        },
        onLeaveBack: function () {
          section.classList.remove("is-visible");
        },
      },
    });

    if (skipFadeIn) {
      tl.to({}, { duration: 0.84, ease: "none" }, 0);
    } else {
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
        tl.to(curtain, { autoAlpha: 0.78, duration: 0.05, ease: "power1.in" }, 0).to(
          curtain,
          { autoAlpha: 0, duration: 0.1, ease: "power2.out" },
          0.05
        );
      }

      tl.to(panel, { autoAlpha: 1, scale: 1, duration: 0.72, ease: "none" }, 0.12);
    }

    if (fadeOut) {
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

  /** Dwukierunkowy most Grafiki ↔ Automatyzacje przez ciemność. */
  function initGrafikiAutoBridge(curtain, grafiki, auto, panel) {
    if (ScrollTrigger.getById("grafiki-auto-bridge")) return;

    var stage = grafiki.querySelector(".graphics-stage");
    if (!stage) return;

    ScrollTrigger.create({
      id: "grafiki-auto-bridge",
      trigger: grafiki,
      start: function () {
        var pin = ScrollTrigger.getById("grafiki-pin");
        if (!pin) return "top bottom";
        return pin.start + (pin.end - pin.start) * 0.76;
      },
      end: function () {
        var autoPin = ScrollTrigger.getById("scene-automatyzacje");
        if (!autoPin) {
          var gPin = ScrollTrigger.getById("grafiki-pin");
          return gPin ? gPin.end + 120 : "bottom top";
        }
        return autoPin.start + (autoPin.end - autoPin.start) * 0.14;
      },
      scrub: MOBILE ? 1.25 : 1.55,
      invalidateOnRefresh: true,
      onEnter: function () {
        document.body.classList.add("is-portfolio-scene-bridge");
      },
      onEnterBack: function () {
        document.body.classList.add("is-portfolio-scene-bridge");
      },
      onLeave: function () {
        document.body.classList.remove("is-portfolio-scene-bridge");
      },
      onLeaveBack: function () {
        document.body.classList.remove("is-portfolio-scene-bridge");
        resetGrafikiStage(grafiki);
        gsap.set(panel, { autoAlpha: 0, visibility: "hidden" });
        if (curtain) gsap.set(curtain, { autoAlpha: 0 });
      },
      onUpdate: function (self) {
        var p = self.progress;
        var grafikiHide = smoothstep(0, 0.46, p);
        var autoShow = smoothstep(0.54, 1, p);
        var curtainAmt = Math.sin(p * Math.PI) * 0.88;

        setGrafikiStage(stage, grafikiHide);
        setAutoPanel(panel, autoShow);

        if (curtain) {
          gsap.set(curtain, {
            autoAlpha: curtainAmt,
            visibility: curtainAmt > 0.01 ? "visible" : "hidden",
          });
        }

        if (p < 0.04) resetGrafikiStage(grafiki);
        if (p > 0.96) {
          gsap.set(panel, { autoAlpha: 1, scale: 1, filter: MOBILE ? "none" : "blur(0px)", visibility: "visible" });
        }
      },
    });
  }

  function initSceneBridge() {
    if (sceneBridgeReady || REDUCED || !window.gsap || !window.ScrollTrigger) return;

    var pin = ScrollTrigger.getById("grafiki-pin");
    var auto = document.getElementById("automatyzacje");
    var grafiki = document.getElementById("grafiki");
    var panel = auto && auto.querySelector(".portfolio-scene__panel");
    if (!pin || !auto || !grafiki || !panel) return;

    sceneBridgeReady = true;

    var curtain = getCurtain();
    if (curtain) gsap.set(curtain, { autoAlpha: 0, visibility: "hidden" });

    initGrafikiAutoBridge(curtain, grafiki, auto, panel);
    wirePortfolioScene(auto, panel, {
      id: "scene-automatyzacje",
      pin: MOBILE ? "+=76%" : "+=94%",
      fadeOut: true,
      skipFadeIn: true,
    });

    ScrollTrigger.refresh();
  }

  function boot() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section, i) {
      if (section.id === "automatyzacje") return;

      var head = section.querySelector("[data-portfolio-head]");
      var body = section.querySelector("[data-portfolio-body]");
      var curtain = section.querySelector(".portfolio-section__curtain");
      var staticMobileSection = MOBILE && (section.id === "strony" || section.id === "montaz");

      if (staticMobileSection && window.gsap) {
        if (head) gsap.set(head.children, { clearProps: "opacity,transform,filter" });
        if (body) gsap.set(body, { clearProps: "opacity,transform,filter" });
      }

      if (curtain && !staticMobileSection) {
        gsap.fromTo(
          curtain,
          { scaleY: 0, transformOrigin: "top center" },
          {
            scaleY: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              end: "top 55%",
              scrub: 1.1,
            },
          }
        );
      }

      if (head && section.id !== "grafiki" && !staticMobileSection) {
        gsap.fromTo(
          head.children,
          {
            opacity: 0,
            y: i % 2 === 0 ? 72 : -56,
            x: i % 2 === 0 ? -36 : 36,
            filter: MOBILE ? "none" : "blur(12px)",
            rotateZ: i % 2 === 0 ? -2 : 2,
          },
          {
            opacity: 1,
            y: 0,
            x: 0,
            filter: MOBILE ? "none" : "blur(0px)",
            rotateZ: 0,
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

      if (body && section.id !== "grafiki" && !staticMobileSection) {
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
      bindTileMotion("#strony .portfolio-web-card", {
        from: { y: 90, rotateZ: -6, scale: 0.9 },
        stagger: 0.12,
      });
    }

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

  document.addEventListener("portfolio:media-ready", initSceneBridge);
  window.addEventListener("load", function () {
    window.setTimeout(initSceneBridge, 180);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
