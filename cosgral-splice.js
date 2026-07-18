/**
 * COSGRAL — Parhouse Swiper only (no custom cursor).
 */
(function () {
  "use strict";

  function initParhouseSwiper() {
    const el = document.querySelector("#cosgral-parhouse #swiper-case-studies-slider");
    if (!el || typeof Swiper === "undefined") return;
    if (el.swiper) return;
    new Swiper(el, {
      slidesPerView: "auto",
      spaceBetween: 24,
      grabCursor: true,
      freeMode: { enabled: true, momentum: true },
      breakpoints: { 768: { spaceBetween: 32 } },
    });
  }

  function lazyLoadParhouseImages() {
    document.querySelectorAll("#cosgral-parhouse img[data-src]").forEach((img) => {
      const src = img.getAttribute("data-src");
      if (src) {
        img.src = src;
        img.removeAttribute("data-src");
      }
    });
  }

  function boot() {
    lazyLoadParhouseImages();
    if (typeof Swiper === "undefined") {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js";
      s.onload = initParhouseSwiper;
      document.head.appendChild(s);
    } else {
      initParhouseSwiper();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
