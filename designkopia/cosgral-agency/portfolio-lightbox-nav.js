/**
 * Portfolio lightbox — prev/next po wszystkich elementach na stronie.
 */
(function () {
  "use strict";

  function create(config) {
    var state = { triggers: [], index: 0 };
    var pageScope = config.pageScope || document;

    function allTriggers() {
      return Array.prototype.slice.call(pageScope.querySelectorAll(config.triggerSelector));
    }

    function updateNav() {
      var show = state.triggers.length > 1;
      config.lightbox.querySelectorAll("[data-portfolio-lightbox-prev],[data-portfolio-lightbox-next]").forEach(function (btn) {
        btn.hidden = !show;
      });
    }

    function openAt(index) {
      if (!state.triggers.length) return;
      if (index < 0) index = state.triggers.length - 1;
      if (index >= state.triggers.length) index = 0;
      state.index = index;
      var el = state.triggers[index];
      config.openItem(config.parseItem(el), el.getAttribute(config.altAttr) || "");
      updateNav();
    }

    function prev() {
      openAt(state.index - 1);
    }

    function next() {
      openAt(state.index + 1);
    }

    function openFrom(triggerEl) {
      state.triggers = allTriggers();
      var idx = state.triggers.indexOf(triggerEl);
      state.index = idx >= 0 ? idx : 0;
      openAt(state.index);
    }

    function bindTrigger(triggerEl) {
      triggerEl.addEventListener("click", function (e) {
        e.preventDefault();
        openFrom(triggerEl);
      });
    }

    var prevBtn = config.lightbox.querySelector("[data-portfolio-lightbox-prev]");
    var nextBtn = config.lightbox.querySelector("[data-portfolio-lightbox-next]");
    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        prev();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        next();
      });
    }

    var touchX = 0;
    config.lightbox.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    config.lightbox.addEventListener(
      "touchend",
      function (e) {
        if (config.lightbox.hidden || state.triggers.length < 2) return;
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) < 50) return;
        if (dx > 0) prev();
        else next();
      },
      { passive: true }
    );

    return {
      bindTrigger: bindTrigger,
      prev: prev,
      next: next,
      reset: function () {
        state.triggers = [];
        state.index = 0;
        updateNav();
      },
      onKeydown: function (e) {
        if (config.lightbox.hidden || state.triggers.length < 2) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
      },
    };
  }

  window.CosgralPortfolioLightboxNav = { create: create };
})();
