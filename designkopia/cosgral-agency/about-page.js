/**
 * O nas — hero „Kim jesteśmy”, cinematic przejście do zespołu.
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("about-page")) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var hero = document.querySelector("[data-about-hero], .about-hero");
  var bridge = document.querySelector("[data-about-bridge]");
  var team = document.querySelector(".about-team");
  var curtain = document.querySelector("[data-about-scene-curtain]");
  if (!hero) return;

  function dispatchStep(index, initial) {
    window.dispatchEvent(
      new CustomEvent("cosgral:section-step", {
        detail: {
          index: index,
          id: index === 0 ? "about-hero" : "about-team",
          initial: !!initial,
        },
      })
    );
  }

  function bootIndex() {
    if (!team) return 0;
    var teamTop = team.getBoundingClientRect().top + window.scrollY;
    return window.scrollY + window.innerHeight * 0.42 < teamTop ? 0 : 1;
  }

  function boot() {
    dispatchStep(bootIndex(), true);
  }

  if (window.cosgralCube) boot();
  else window.addEventListener("cosgral:cube-ready", boot, { once: true });

  if (!window.ScrollTrigger) return;

  var lead = hero.querySelector(".about-hero__lead");
  var cta = hero.querySelector(".about-hero__cta");
  var hint = hero.querySelector(".about-hero__scroll-hint");

  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom top",
    onLeave: function () {
      dispatchStep(1);
    },
    onEnterBack: function () {
      dispatchStep(0);
    },
  });

  if (REDUCED || !window.gsap) return;

  if (curtain) gsap.set(curtain, { autoAlpha: 0, visibility: "hidden" });

  ScrollTrigger.create({
    trigger: bridge || hero,
    start: "top bottom",
    end: function () {
      return team ? "+=" + Math.max(window.innerHeight * 0.55, 320) : "+=320";
    },
    scrub: 0.85,
    invalidateOnRefresh: true,
    onUpdate: function (self) {
      var p = self.progress;
      var fade = Math.min(1, p * 1.35);

      if (lead) gsap.set(lead, { autoAlpha: 1 - fade, y: fade * -18 });
      if (cta) gsap.set(cta, { autoAlpha: 1 - fade, y: fade * -12 });
      if (hint) gsap.set(hint, { autoAlpha: Math.max(0, 0.75 - p * 1.6) });

      var curtainAmt = Math.sin(p * Math.PI) * 0.82;
      if (curtain) {
        gsap.set(curtain, {
          autoAlpha: curtainAmt,
          visibility: curtainAmt > 0.01 ? "visible" : "hidden",
        });
      }

      document.body.classList.toggle("is-about-scene-bridge", p > 0.12);
    },
    onLeaveBack: function () {
      if (curtain) gsap.set(curtain, { autoAlpha: 0, visibility: "hidden" });
      if (lead) gsap.set(lead, { autoAlpha: 1, y: 0 });
      if (cta) gsap.set(cta, { autoAlpha: 1, y: 0 });
      if (hint) gsap.set(hint, { autoAlpha: 0.75 });
      document.body.classList.remove("is-about-scene-bridge");
    },
  });

  if (team) {
    gsap.set(team, { autoAlpha: 0.35, y: 36 });
    ScrollTrigger.create({
      trigger: team,
      start: "top 88%",
      end: "top 55%",
      scrub: 0.6,
      onUpdate: function (self) {
        var p = self.progress;
        gsap.set(team, {
          autoAlpha: 0.35 + p * 0.65,
          y: 36 * (1 - p),
        });
      },
      onLeaveBack: function () {
        gsap.set(team, { autoAlpha: 0.35, y: 36 });
      },
    });
  }
})();
