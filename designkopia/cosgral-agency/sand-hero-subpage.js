/**
 * Substrony z hero + piaskiem (O nas, galeria grafik) — intro i przejście do treści.
 */
(function () {
  "use strict";

  var config = null;
  if (document.body.classList.contains("about-page")) {
    config = {
      hero: ".about-hero",
      content: ".about-team",
      ids: ["about-hero", "about-team"],
    };
  } else if (document.body.classList.contains("graphics-gallery-page")) {
    config = {
      hero: ".gallery-hero",
      content: "#graphics-gallery",
      ids: ["gallery-hero", "graphics-gallery"],
    };
  } else if (document.body.classList.contains("reels-gallery-page")) {
    config = {
      hero: ".gallery-hero",
      content: "#reels-gallery",
      ids: ["gallery-hero", "reels-gallery"],
    };
  }
  if (!config) return;

  var hero = document.querySelector(config.hero);
  var content = document.querySelector(config.content);
  if (!hero) return;

  function dispatchStep(index, initial) {
    window.dispatchEvent(
      new CustomEvent("cosgral:section-step", {
        detail: {
          index: index,
          id: config.ids[index] || config.ids[0],
          initial: !!initial,
        },
      })
    );
  }

  function bootIndex() {
    if (!content) return 0;
    var contentTop = content.getBoundingClientRect().top + window.scrollY;
    return window.scrollY + window.innerHeight * 0.42 < contentTop ? 0 : 1;
  }

  function boot() {
    dispatchStep(bootIndex(), true);
  }

  if (window.cosgralCube) boot();
  else window.addEventListener("cosgral:cube-ready", boot, { once: true });

  if (!window.ScrollTrigger) return;

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
})();
