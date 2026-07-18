/**
 * Film 1 (pan w okularach) — scroll-scrub: ostry kadr → odsłonięcie motion blur z PNG.
 */
(function () {
  "use strict";

  const SHARP_CLIP_LEFT = 56;
  const PIN_END = "+=900%";

  function init() {
    if (!window.gsap || !window.ScrollTrigger) return;

    const wrapper = document.querySelector(".hero_stack_wrapper");
    const film = document.querySelector('[data-film="1"]');
    const img = film?.querySelector(".film_img");
    if (!wrapper || !img) return;

    gsap.set(img, {
      clipPath: `inset(0 0 0 ${SHARP_CLIP_LEFT}%)`,
      webkitClipPath: `inset(0 0 0 ${SHARP_CLIP_LEFT}%)`,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: PIN_END,
        scrub: 1.25,
        invalidateOnRefresh: true,
      },
    });

    tl.to({}, { duration: 0.58 })
      .fromTo(
        img,
        {
          clipPath: `inset(0 0 0 ${SHARP_CLIP_LEFT}%)`,
          webkitClipPath: `inset(0 0 0 ${SHARP_CLIP_LEFT}%)`,
          objectPosition: "68% 42%",
        },
        {
          clipPath: "inset(0 0 0 0%)",
          webkitClipPath: "inset(0 0 0 0%)",
          objectPosition: "52% 42%",
          duration: 0.2,
          ease: "power2.inOut",
        },
      )
      .to({}, { duration: 0.22 });
  }

  function boot() {
    init();
    const handleLoad = () => {
      ScrollTrigger.refresh();
    };
    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
