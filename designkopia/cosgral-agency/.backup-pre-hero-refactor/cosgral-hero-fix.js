/**
 * COSGRAL — stabilniejszy hero, vv meet gap, footer branding.
 */
(function () {
  "use strict";

  const VV_GAP_REM = 1.35;

  function patchVvLabels() {
    const v1 = document.querySelector('[data-vv="1"] h2');
    const v2 = document.querySelector('[data-vv="2"] h2');
    if (v1 && !v1.querySelector('.char-span')) v1.textContent = "COSGRAL";
    if (v2 && !v2.querySelector('.char-span')) v2.textContent = "agency";
  }

  function stabilizeHeroText() {
    document.querySelectorAll(".hero_decor").forEach((el) => {
      el.style.display = "none";
    });
    const main = document.querySelector("[data-hero-heading='main']");
    if (main && window.gsap) {
      gsap.set(main, { force3D: true, transformPerspective: 1000 });
      gsap.set(main.querySelectorAll("span"), { force3D: true });
    }
  }

  function patchVvLabelsAbout() {
    document.querySelectorAll(".about_heading.decor").forEach((el) => {
      el.style.display = "none";
    });
    document.querySelectorAll(".about_decor").forEach((el) => {
      el.style.display = "none";
    });
    document.querySelectorAll(".cosgral-about-tile, .about_tile").forEach((el) => {
      el.remove();
    });
  }

  function fixHeroBgPosition() {
    const bg = document.querySelector("img.hero_bg");
    if (bg) {
      bg.style.objectPosition = "center 8%";
      bg.style.transform = "scale(1)";
      bg.style.transformOrigin = "center 8%";
      if (window.gsap) {
        gsap.set(bg, { scale: 1, transformOrigin: "center 8%" });
      }
    }
  }

  function vvInnerHalfWidth() {
    const rootFS = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (window.innerWidth - 8 * rootFS) / 2;
  }

  function vvMeetTargets(gapPx) {
    const v1 = document.querySelector('[data-vv="1"]');
    const v2 = document.querySelector('[data-vv="2"]');
    if (!v1 || !v2) return null;

    const innerW = vvInnerHalfWidth();
    const w1 = v1.getBoundingClientRect().width;
    const w2 = v2.getBoundingClientRect().width;
    const gap = gapPx ?? parseFloat(getComputedStyle(document.documentElement).fontSize) * VV_GAP_REM;

    return {
      v1,
      v2,
      x1: innerW - gap / 2 - w1,
      x2: -(innerW - gap / 2 - w2),
    };
  }

  /** Po podmianie labeli przelicz x tweenów hero — inaczej COSGRAL/agency nachodzą. */
  function fixVvConvergence() {
    if (!window.gsap || !window.ScrollTrigger) return;

    patchVvLabels();
    const meet = vvMeetTargets();
    const wrapper = document.querySelector(".hero_stack_wrapper");
    if (!meet || !wrapper) return;

    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger !== wrapper || !st.animation) return;
      st.animation.getChildren(false, true, false).forEach((tween) => {
        const targets = tween.targets();
        if (targets.includes(meet.v1)) tween.vars.x = () => meet.x1;
        if (targets.includes(meet.v2)) tween.vars.x = () => meet.x2;
      });
    });
    ScrollTrigger.refresh();
  }

  function patchFooterWordmark() {
    document.querySelectorAll(".footer_logo, .footer_logo.difference").forEach((el) => {
      el.style.display = "none";
    });
    const wrap = document.querySelector(".footer_logo_wrapper");
    if (!wrap || wrap.querySelector(".cosgral-footer-wordmark")) return;
    const p = document.createElement("p");
    p.className = "cosgral-footer-wordmark";
    p.textContent = "cosgral design";
    wrap.appendChild(p);
  }

  function boot() {
    patchVvLabels();
    stabilizeHeroText();
    patchVvLabelsAbout();
    patchFooterWordmark();
    fixHeroBgPosition();
    fixVvConvergence();
    if (window.ScrollTrigger) {
      setTimeout(() => {
        fixVvConvergence();
        ScrollTrigger.refresh();
      }, 1200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  const handleLoad = () => {
    patchVvLabels();
    patchFooterWordmark();
    stabilizeHeroText();
    fixVvConvergence();
  };
  if (document.readyState === "complete") {
    handleLoad();
  } else {
    window.addEventListener("load", handleLoad);
  }
  window.addEventListener("resize", () => {
    clearTimeout(fixVvConvergence._t);
    fixVvConvergence._t = setTimeout(fixVvConvergence, 120);
  });
})();
