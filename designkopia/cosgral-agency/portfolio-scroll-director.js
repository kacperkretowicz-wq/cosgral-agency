/**
 * Portfolio — jeden dyrygent scroll-tellingu.
 *
 * Wcześniej każdy efekt (depth cover, kurtyna, cinema grafik, bloom) miał własny
 * ScrollTrigger `start: 0 / end: "max"`. Każdy z nich czytał geometrię przez
 * getBoundingClientRect w trakcie zapisywania stylów — przeplatane read/write
 * wymuszały reflow kilkanaście razy na klatkę (layout thrashing) i scroll się zacinał.
 *
 * Tutaj jest jeden przebieg na klatkę: najpierw pomiar (tylko przy refreshu),
 * potem zapisy. Każdy kanał sam pilnuje, żeby nie zapisywać wartości, która się
 * nie zmieniła — dzięki temu przy spokojnym scrollu nie robimy nic.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  var channels = [];
  var stage = { vh: 1, vw: 1, max: 0 };
  var lastY = -1;
  var measured = false;
  var refreshQueued = false;
  var refreshTimer = null;

  function currentY() {
    var smooth = window.cosgralSmoothScroll;
    if (smooth && smooth.lenis && typeof smooth.lenis.scroll === "number") {
      return smooth.lenis.scroll;
    }
    return window.scrollY || window.pageYOffset || 0;
  }

  /** Faza pomiaru — jedyne miejsce, w którym wolno czytać layout. */
  function measureAll() {
    stage.vh = window.innerHeight || 1;
    stage.vw = window.innerWidth || 1;
    stage.max =
      window.ScrollTrigger && ScrollTrigger.maxScroll
        ? ScrollTrigger.maxScroll(window)
        : Math.max(0, document.documentElement.scrollHeight - stage.vh);

    for (var i = 0; i < channels.length; i++) {
      var channel = channels[i];
      if (!channel.measure) continue;
      try {
        channel.geo = channel.measure(stage) || null;
      } catch (err) {
        channel.geo = null;
      }
    }
    measured = true;
    lastY = -1;
  }

  /** Faza zapisu — bez odczytów layoutu. */
  function applyAll(force) {
    if (!measured) measureAll();
    var y = currentY();
    if (!force && Math.abs(y - lastY) < 0.5) return;
    lastY = y;

    for (var i = 0; i < channels.length; i++) {
      var channel = channels[i];
      try {
        channel.apply(y, channel.geo, stage);
      } catch (err) {
        /* jeden zepsuty kanał nie może zatrzymać reszty */
      }
    }
  }

  /**
   * ScrollTrigger.refresh() przelicza wszystkie piny i potrafi szarpnąć stroną.
   * Wołane bywa z kilku miejsc naraz przy starcie — zbieramy je w jedno.
   */
  function requestRefresh(delay) {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      refreshTimer = null;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      else {
        measureAll();
        applyAll(true);
      }
    }, delay != null ? delay : 120);
  }

  function register(name, measure, apply, order) {
    if (typeof apply !== "function") return;
    var existing = null;
    for (var i = 0; i < channels.length; i++) {
      if (channels[i].name === name) existing = channels[i];
    }
    var channel = existing || { name: name };
    channel.measure = measure;
    channel.apply = apply;
    channel.order = order != null ? order : 10;
    channel.geo = null;
    if (!existing) channels.push(channel);
    channels.sort(function (a, b) {
      return a.order - b.order;
    });

    if (measured) {
      try {
        channel.geo = measure ? measure(stage) : null;
      } catch (err) {
        channel.geo = null;
      }
      applyAll(true);
    }
  }

  var api = {
    register: register,
    refresh: function () {
      measureAll();
      applyAll(true);
    },
    requestRefresh: requestRefresh,
    update: function () {
      applyAll(true);
    },
    scrollY: currentY,
    stage: stage,
    reduced: REDUCED,
  };

  window.cosgralScrollDirector = api;

  if (REDUCED) return;

  function boot() {
    if (!window.gsap) return;

    /* Lenis kręci się na tickerze gsapa — dopisujemy się za nim, więc widzimy
       już zaktualizowaną pozycję scrolla w tej samej klatce. */
    gsap.ticker.add(function () {
      applyAll(false);
    });

    if (window.ScrollTrigger) {
      ScrollTrigger.addEventListener("refresh", function () {
        measureAll();
        applyAll(true);
      });
    }

    window.addEventListener(
      "resize",
      function () {
        if (refreshQueued) return;
        refreshQueued = true;
        window.requestAnimationFrame(function () {
          refreshQueued = false;
          measureAll();
          applyAll(true);
        });
      },
      { passive: true }
    );

    measureAll();
    applyAll(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
