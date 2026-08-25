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

  function revealAutoSection(auto) {
    if (!auto) return;
    auto.classList.add("is-entered", "is-visible");
    var panel = auto.querySelector(".portfolio-scene__panel");
    if (panel && window.gsap) {
      gsap.set(panel, {
        autoAlpha: 1,
        scale: 1,
        filter: "none",
        visibility: "visible",
        clearProps: "transform",
      });
    }
    if (window.gsap) {
      gsap.set(auto.querySelectorAll(".portfolio-case-card"), {
        autoAlpha: 1,
        clearProps: "transform,filter",
      });
    }
  }

  /** Delikatne wyjście z Grafik pod koniec pinu — bez pinowania Automatyzacji. */
  function initGrafikiExitFade(curtain, grafiki) {
    if (ScrollTrigger.getById("grafiki-auto-bridge")) return;

    var stage = grafiki.querySelector(".graphics-stage");
    if (!stage) return;

    ScrollTrigger.create({
      id: "grafiki-auto-bridge",
      trigger: grafiki,
      start: function () {
        var pin = ScrollTrigger.getById("grafiki-pin");
        if (!pin) return "top bottom";
        return pin.start + (pin.end - pin.start) * 0.82;
      },
      end: function () {
        var pin = ScrollTrigger.getById("grafiki-pin");
        return pin ? pin.end : "bottom top";
      },
      scrub: MOBILE ? 1.15 : 1.4,
      invalidateOnRefresh: true,
      onLeaveBack: function () {
        document.body.classList.remove("is-portfolio-scene-bridge");
        resetGrafikiStage(grafiki);
        if (curtain) gsap.set(curtain, { autoAlpha: 0 });
      },
      onUpdate: function (self) {
        var p = self.progress;
        var grafikiHide = smoothstep(0, 1, p);
        var curtainAmt = Math.sin(p * Math.PI) * 0.55;

        setGrafikiStage(stage, grafikiHide);

        if (curtain) {
          gsap.set(curtain, {
            autoAlpha: curtainAmt,
            visibility: curtainAmt > 0.01 ? "visible" : "hidden",
          });
        }

        if (p > 0.2) document.body.classList.add("is-portfolio-scene-bridge");
        else document.body.classList.remove("is-portfolio-scene-bridge");

        if (p < 0.04) resetGrafikiStage(grafiki);
      },
    });
  }

  function initSceneBridge() {
    if (sceneBridgeReady || REDUCED || !window.gsap || !window.ScrollTrigger) return;

    var pin = ScrollTrigger.getById("grafiki-pin");
    var auto = document.getElementById("automatyzacje");
    var grafiki = document.getElementById("grafiki");
    if (!pin || !auto || !grafiki) return;

    sceneBridgeReady = true;

    var curtain = getCurtain();
    if (curtain) gsap.set(curtain, { autoAlpha: 0, visibility: "hidden" });

    revealAutoSection(auto);
    initGrafikiExitFade(curtain, grafiki);

    ScrollTrigger.refresh();
  }

  function boot() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    var auto = document.getElementById("automatyzacje");
    if (auto) revealAutoSection(auto);

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section, i) {
      var head = section.querySelector("[data-portfolio-head]");
      var body = section.querySelector("[data-portfolio-body]");
      var curtain = section.querySelector(".portfolio-section__curtain");
      var staticMobileSection =
        MOBILE && (section.id === "strony" || section.id === "montaz" || section.id === "automatyzacje");

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
      bindTileMotion("#automatyzacje .portfolio-case-card", {
        from: { y: 64, rotateZ: -2, scale: 0.96 },
        stagger: 0.1,
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
