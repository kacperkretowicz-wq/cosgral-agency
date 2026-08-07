/**
 * Portfolio — scroll-driven przejścia sekcji i kafelków.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  function boot() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("[data-portfolio-section]").forEach(function (section, i) {
      var head = section.querySelector("[data-portfolio-head]");
      var body = section.querySelector("[data-portfolio-body]");
      var curtain = section.querySelector(".portfolio-section__curtain");

      if (curtain) {
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

      if (head) {
        gsap.fromTo(
          head.children,
          {
            opacity: 0,
            y: i % 2 === 0 ? 72 : -56,
            x: i % 2 === 0 ? -36 : 36,
            filter: "blur(12px)",
            rotateZ: i % 2 === 0 ? -2 : 2,
          },
          {
            opacity: 1,
            y: 0,
            x: 0,
            filter: "blur(0px)",
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

      if (body && section.id !== "grafiki") {
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

    bindTileMotion("#strony .portfolio-web-card", {
      from: { y: 90, rotateZ: -6, scale: 0.9 },
      stagger: 0.12,
    });

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
        Object.assign({ opacity: 0, filter: "blur(8px)" }, opts.from),
        {
          opacity: 1,
          y: 0,
          x: 0,
          rotateZ: 0,
          scale: 1,
          filter: "blur(0px)",
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

  window.addEventListener("load", function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
