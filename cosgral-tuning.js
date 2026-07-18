/**
 * COSGRAL tuning — no laggy cursors, calmer scroll, readable hero.
 */
(function () {
  "use strict";

  function killLaggyCursors() {
    [
      "#cosgral-ph-cursor",
      "#parhouse-custom-cursor",
      "#cosgral-cursor",
      "[data-stacked-trail-area]",
      ".image_trail",
      "#cosgral-pf-trail",
      ".cosgral-splice-label",
      "#clone-preview-badge",
    ].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.display = "none";
        el.remove();
      });
    });
    document.body.style.cursor = "auto";
    document.documentElement.style.cursor = "auto";
  }

  function tuneScrollSmoother() {
    const apply = (s) => {
      if (!s || typeof s.smooth !== "function") return;
      try {
        s.smooth(0.45);
      } catch (_) {}
    };
    apply(window.smoother || window.cosgralSmoother);
    if (window.smootherReady && typeof window.smootherReady.then === "function") {
      window.smootherReady.then(apply);
    }
    if (window.ScrollSmoother && window.ScrollSmoother.get) {
      requestAnimationFrame(() => apply(ScrollSmoother.get()));
    }
  }

  function tuneHeroReadability() {
    if (!window.gsap || !window.ScrollTrigger) return;
    const wrapper = document.querySelector(".hero_stack_wrapper");
    if (!wrapper) return;
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger !== wrapper) return;
      st.end = st.start + window.innerHeight * 9;
      if (st.animation) st.animation.scrollTrigger?.refresh();
    });
    ScrollTrigger.refresh();
  }

  killLaggyCursors();
  tuneScrollSmoother();

  document.addEventListener("DOMContentLoaded", () => {
    killLaggyCursors();
    tuneScrollSmoother();
    setTimeout(() => {
      killLaggyCursors();
      tuneHeroReadability();
      tuneScrollSmoother();
    }, 1200);
  });
})();
