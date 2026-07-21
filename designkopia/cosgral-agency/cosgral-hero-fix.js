/**
 * COSGRAL — stabilniejszy hero, vv meet gap, footer branding.
 */
(function () {
  "use strict";

  function patchVvLabels() {
    const v1 = document.querySelector('[data-vv="1"] h2');
    const v2 = document.querySelector('[data-vv="2"] h2');
    if (v1 && !v1.querySelector('.char-span')) v1.textContent = "COSGRAL";
    if (v2 && !v2.querySelector('.char-span')) v2.textContent = "AGENCY";
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
  };
  if (document.readyState === "complete") {
    handleLoad();
  } else {
    window.addEventListener("load", handleLoad);
  }
})();
