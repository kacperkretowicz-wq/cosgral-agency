/**
 * Portfolio — kolor w pasie środka ekranu (sześcian w tle), poza nim grayscale.
 */
(function () {
  "use strict";

  var BAND_RATIO = 0.38;

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function mixForRect(rect) {
    var centerY = window.innerHeight * 0.5;
    var halfBand = window.innerHeight * BAND_RATIO;
    var itemY = rect.top + rect.height * 0.5;
    var dist = Math.abs(itemY - centerY);
    if (dist >= halfBand) return 0;
    return smoothstep(1 - dist / halfBand);
  }

  function applyToElements(elements) {
    elements.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > window.innerHeight + 40) {
        el.style.setProperty("--color-mix", "0");
        el.classList.remove("is-in-color-zone", "is-in-focus");
        return;
      }
      var mix = mixForRect(rect);
      el.style.setProperty("--color-mix", mix.toFixed(3));
      var on = mix > 0.1;
      el.classList.toggle("is-in-color-zone", on);
      el.classList.toggle("is-in-focus", on);
    });
  }

  function watch(root, selector, options) {
    options = options || {};
    if (!root) return function () {};

    var reduced = document.documentElement.classList.contains("reduce-motion");
    var nodes = function () {
      return root.querySelectorAll(selector);
    };

    if (reduced) {
      nodes().forEach(function (el) {
        el.style.setProperty("--color-mix", "1");
        el.classList.add("is-in-color-zone", "is-in-focus");
      });
      return function () {};
    }

    var running = false;
    var observeEl = options.observe || root;

    function tick() {
      if (!running) return;
      applyToElements(nodes());
      if (options.onUpdate) options.onUpdate();
      requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      nodes().forEach(function (el) {
        el.style.setProperty("--color-mix", "0");
        el.classList.remove("is-in-color-zone", "is-in-focus");
      });
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0.02, rootMargin: "14% 0px" }
    );

    io.observe(observeEl);
    window.addEventListener(
      "scroll",
      function () {
        if (running) applyToElements(nodes());
      },
      { passive: true }
    );
    window.addEventListener("resize", function () {
      if (running) applyToElements(nodes());
    });

    return stop;
  }

  window.CosgralPortfolioColorZone = {
    watch: watch,
    mixForRect: mixForRect,
    applyToElements: applyToElements,
  };
})();
