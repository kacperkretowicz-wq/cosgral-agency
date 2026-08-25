/**
 * Portfolio — slideshow scroll: jeden gest = jedna sekcja (kropka w kropkę).
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var HOLDS_CONFIG = [
    { id: "portfolio-top", selector: ".portfolio-hero" },
    { id: "strony", selector: "#strony" },
    { id: "montaz", selector: "#montaz" },
    { stId: "grafiki-pin", hold: 0, id: "grafiki" },
    { stId: "scene-automatyzacje", hold: 0.48, id: "automatyzacje" },
    { id: "footer", footer: true },
  ];
  var SECTION_IDS = HOLDS_CONFIG.filter(function (c) {
    return !c.footer;
  }).map(function (c) {
    return c.id;
  });
  var GRAFIKI_IDX = SECTION_IDS.indexOf("grafiki");
  var MONTAZ_IDX = SECTION_IDS.indexOf("montaz");
  var AUTO_IDX = SECTION_IDS.indexOf("automatyzacje");

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : document.documentElement.scrollHeight;
    if (!footer) return max;
    if (MOBILE) {
      var viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      var footerH = footer.offsetHeight;
      /* Keep footer higher; leave room above home-indicator so bottom isn't clipped */
      var topInset = 28;
      var bottomInset = 104;
      if (footerH + topInset + bottomInset <= viewH) {
        var free = viewH - footerH;
        var top = Math.min(topInset, Math.max(12, Math.round(free * 0.22)));
        return Math.min(max, Math.max(0, footer.offsetTop - top));
      }
      return Math.min(max, Math.max(0, footer.offsetTop + footerH - viewH + bottomInset));
    }
    return Math.min(max, Math.max(0, footer.offsetTop - 234));
  }

  function sectionHoldY(selector) {
    var el = document.querySelector(selector);
    if (!el) return 0;
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY - (MOBILE ? 72 : 96));
  }

  function holdY(st, hold) {
    return st.start + (st.end - st.start) * hold;
  }

  function buildHolds() {
    var holds = [];
    HOLDS_CONFIG.forEach(function (cfg) {
      if (cfg.footer) {
        holds.push(footerHoldY());
        return;
      }
      if (cfg.stId) {
        var st = ScrollTrigger.getById(cfg.stId);
        if (st) holds.push(holdY(st, cfg.hold));
        return;
      }
      if (cfg.selector) holds.push(sectionHoldY(cfg.selector));
    });
    return holds;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function shouldIgnore() {
    if (!document.body.classList.contains("portfolio-page")) return true;
    if (document.querySelector(".nav-overlay.is-open")) return true;
    if (document.body.classList.contains("is-lightbox-open")) return true;
    return false;
  }

  function init() {
    if (!window.ScrollTrigger || !window.gsap) return;

    var holds = buildHolds();
    if (holds.length < 2) return;

    var activeIndex = 0;
    var portfolioBooted = false;
    var locked = false;
    var wheelAccum = 0;
    var wheelTimer = null;
    var guardTimer = null;
    var scrollTween = null;
    var STEP_MS = 2.4;
    var SNAP_MS = 0.9;
    var WHEEL_END = 52;
    var WHEEL_MIN = 6;
    var WHEEL_INSTANT = 16;
    var HOLD_COOLDOWN_MS = 100;
    var cooldownUntil = 0;

    function grafikiApi() {
      return window.cosgralGrafikiStepper;
    }

    function beginCooldown() {
      cooldownUntil = Date.now() + HOLD_COOLDOWN_MS;
    }

    function canStep() {
      if (locked) return false;
      if (Date.now() < cooldownUntil) return false;
      if (grafikiApi()?.isAnimating?.()) return false;
      return true;
    }

    function nearestIndex(scroll) {
      var best = 0;
      var dist = Infinity;
      for (var i = 0; i < holds.length; i++) {
        var d = Math.abs(scroll - holds[i]);
        if (d < dist) {
          dist = d;
          best = i;
        }
      }
      return best;
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function stepDurationDown(fromIndex, toIndex) {
      if (fromIndex === GRAFIKI_IDX && toIndex === AUTO_IDX) return STEP_MS * 1.35;
      if (fromIndex >= 1 && toIndex > fromIndex) return STEP_MS / 2.2;
      return STEP_MS;
    }

    function stepDurationUp(fromIndex, toIndex) {
      if (fromIndex === AUTO_IDX && toIndex === GRAFIKI_IDX) return STEP_MS * 1.35;
      if (fromIndex >= 1 && toIndex < fromIndex) return STEP_MS / 2.2;
      return STEP_MS / 2.2;
    }

    function syncStepView(index) {
      var isFooter = index === holds.length - 1;
      document.documentElement.classList.toggle("is-footer-step", isFooter);
      if (isFooter && window.gsap) {
        window.gsap.utils.toArray(".site-footer [data-enter]").forEach(function (el) {
          window.gsap.set(el, { autoAlpha: 1, y: 0, clearProps: "filter" });
        });
      }
    }

    function scenePanel(index) {
      var cfg = HOLDS_CONFIG[index];
      if (!cfg) return null;
      if (cfg.footer) return document.querySelector(".site-footer");
      if (cfg.id === "grafiki") {
        var grafiki = document.getElementById("grafiki");
        return grafiki ? grafiki.querySelector(".graphics-stage") || grafiki : null;
      }
      var section = document.getElementById(cfg.id) || document.querySelector(cfg.selector);
      if (!section) return null;
      return section.querySelector(".portfolio-scene__panel") || section;
    }

    function setScrollY(target, onDone) {
      var g = grafikiApi();
      if (g?.suspendHold) g.suspendHold(true);
      window.scrollTo(0, target);
      window.requestAnimationFrame(function () {
        window.scrollTo(0, target);
        if (window.ScrollTrigger) ScrollTrigger.update();
        if (g?.suspendHold) g.suspendHold(false);
        if (onDone) onDone();
      });
    }

    function scrollToY(target, duration, immediate, onComplete) {
      if (scrollTween) scrollTween.kill();
      if (immediate || !duration) {
        setScrollY(target, onComplete);
        return;
      }
      var g = grafikiApi();
      if (g?.suspendHold) g.suspendHold(true);
      var obj = { y: window.scrollY };
      scrollTween = gsap.to(obj, {
        y: target,
        duration: duration,
        ease: easeOutCubic,
        onUpdate: function () {
          window.scrollTo(0, obj.y);
        },
        onComplete: function () {
          scrollTween = null;
          setScrollY(target, onComplete);
        },
      });
    }

    function dispatchSectionStep(index) {
      var detail = { index: index, id: HOLDS_CONFIG[index]?.id || null };
      if (!portfolioBooted) {
        detail.initial = true;
        portfolioBooted = true;
      }
      window.dispatchEvent(new CustomEvent("cosgral:section-step", { detail: detail }));
    }

    function afterGrafikiBeat(beat) {
      locked = false;
      beginCooldown();
      if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: GRAFIKI_IDX, id: "grafiki", beat: beat },
        })
      );
    }

    function isSceneJump(fromIndex, toIndex) {
      return (
        (fromIndex === GRAFIKI_IDX && toIndex === AUTO_IDX) ||
        (fromIndex === AUTO_IDX && toIndex === GRAFIKI_IDX) ||
        (fromIndex === GRAFIKI_IDX && toIndex === MONTAZ_IDX)
      );
    }

    function jumpTo(index) {
      holds = buildHolds();
      index = clamp(index, 0, holds.length - 1);
      var target = holds[index];
      var fromIndex = activeIndex;

      if (index === activeIndex && Math.abs(window.scrollY - target) < 4) return;

      var fromPanel = scenePanel(fromIndex);
      var toPanel = scenePanel(index);
      var curtain = document.querySelector("[data-portfolio-scene-curtain]");

      locked = true;
      wheelAccum = 0;
      if (scrollTween) scrollTween.kill();

      function commitScroll() {
        setScrollY(target, function () {
          activeIndex = index;
          syncStepView(index);
          if (index === GRAFIKI_IDX) {
            var beat = fromIndex > index ? 1 : 0;
            var g = grafikiApi();
            if (g?.revealHold) g.revealHold(beat);
            else if (g?.snapToHold) g.snapToHold(beat);
          } else if (fromIndex === GRAFIKI_IDX) {
            document.body.classList.remove(
              "is-grafiki-overlay-reveal",
              "is-grafiki-cinema-end",
              "is-grafiki-cinema-start",
              "is-grafiki-cinema-animating",
              "is-grafiki-light"
            );
            var leavingGrafiki = grafikiApi();
            if (leavingGrafiki?.resetForReentry) leavingGrafiki.resetForReentry();
          }
          if (toPanel) {
            var scene = toPanel.closest(".portfolio-scene");
            if (scene) scene.classList.add("is-entered", "is-visible");
            gsap.set(toPanel, { autoAlpha: 1, scale: 1, filter: MOBILE ? "none" : "blur(0px)", y: 0, visibility: "visible" });
          }
        });
      }

      if (!fromPanel && !toPanel && !curtain) {
        commitScroll();
        locked = false;
        beginCooldown();
        if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
        dispatchSectionStep(index);
        return;
      }

      var tl = gsap.timeline({
        onComplete: function () {
          locked = false;
          beginCooldown();
          if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
          dispatchSectionStep(index);
        },
      });

      if (fromPanel && toPanel && fromPanel !== toPanel) {
        tl.to(fromPanel, { autoAlpha: 0, filter: MOBILE ? "none" : "blur(10px)", duration: 0.42, ease: "power2.in" }, 0);
      }
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0.88, duration: 0.38, ease: "power2.in", visibility: "visible" }, 0);
      }

      tl.add(commitScroll, 0.36);

      if (toPanel) {
        gsap.set(toPanel, { autoAlpha: 0, filter: MOBILE ? "none" : "blur(12px)" });
        tl.to(toPanel, { autoAlpha: 1, filter: MOBILE ? "none" : "blur(0px)", duration: 0.52, ease: "power2.out" }, 0.4);
      }
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, 0.44);
      }
    }

    function goTo(index, duration, immediate, onComplete) {
      holds = buildHolds();
      index = clamp(index, 0, holds.length - 1);
      var target = holds[index];
      var fromIndex = activeIndex;

      if (!immediate && index === activeIndex && Math.abs(window.scrollY - target) < 4) {
        if (onComplete) onComplete();
        return;
      }

      if (isSceneJump(fromIndex, index)) {
        jumpTo(index);
        return;
      }

      locked = true;
      wheelAccum = 0;
      activeIndex = index;
      syncStepView(index);

      var dur = immediate ? 0 : duration != null ? duration : stepDurationDown(fromIndex, index);

      scrollToY(target, dur, immediate, function () {
        locked = false;
        beginCooldown();
        if (Math.abs(window.scrollY - target) > 2) {
          window.scrollTo(0, target);
          if (window.ScrollTrigger) ScrollTrigger.update();
        }
        if (index === GRAFIKI_IDX && grafikiApi()) {
          var g = grafikiApi();
          if (fromIndex < index && g.transitionToBeat) {
            if (g.resetForReentry) g.resetForReentry();
            if (!g.isAnimating?.()) g.transitionToBeat(1);
          } else if (g.snapToHold) {
            g.snapToHold(fromIndex > index ? 1 : 0);
          }
        }
        if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
        if (onComplete) onComplete();
        dispatchSectionStep(index);
      });
    }

    function stepUp() {
      if (!canStep()) return;

      if (activeIndex === GRAFIKI_IDX) {
        jumpTo(MONTAZ_IDX);
        return;
      }

      if (activeIndex === AUTO_IDX) {
        jumpTo(GRAFIKI_IDX);
        return;
      }

      if (activeIndex <= 0) {
        goTo(0, SNAP_MS);
        return;
      }
      goTo(activeIndex - 1, stepDurationUp(activeIndex, activeIndex - 1));
    }

    function stepDown() {
      if (!canStep()) return;

      if (activeIndex === GRAFIKI_IDX) {
        var g = grafikiApi();
        var beat = g?.getBeat?.() ?? 0;
        var passDown = g?.getPassDown?.() ?? false;
        if (beat === 0 && !passDown) {
          locked = true;
          g.transitionToBeat(1);
          return;
        }
        jumpTo(AUTO_IDX);
        return;
      }

      if (activeIndex >= holds.length - 1) {
        goTo(activeIndex, SNAP_MS);
        return;
      }
      goTo(activeIndex + 1);
    }

    function enforceHold() {
      if (locked || Date.now() < cooldownUntil) return;
      if (grafikiApi()?.isAnimating?.()) return;
      holds = buildHolds();
      var idx = nearestIndex(window.scrollY);
      var dist = Math.abs(window.scrollY - holds[idx]);
      if (dist > 2) {
        goTo(idx, SNAP_MS);
      } else {
        activeIndex = idx;
      }
    }

    function scheduleGuard() {
      if (guardTimer) window.clearTimeout(guardTimer);
      guardTimer = window.setTimeout(enforceHold, 32);
    }

    function onWheel(e) {
      if (REDUCED || shouldIgnore()) return;

      e.preventDefault();
      e.stopPropagation();

      if (!canStep()) {
        wheelAccum = 0;
        return;
      }

      wheelAccum += e.deltaY;

      if (Math.abs(wheelAccum) >= WHEEL_INSTANT) {
        if (wheelTimer) window.clearTimeout(wheelTimer);
        commitWheel();
        return;
      }

      if (wheelTimer) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(commitWheel, WHEEL_END);
    }

    function commitWheel() {
      wheelTimer = null;
      if (!canStep()) {
        wheelAccum = 0;
        return;
      }
      if (Math.abs(wheelAccum) < WHEEL_MIN) {
        wheelAccum = 0;
        return;
      }
      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      if (dir > 0) stepDown();
      else stepUp();
    }

    var touchStartY = 0;
    var touchLastY = 0;
    var touchAccum = 0;
    var touchActive = false;

    window.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches[0] || REDUCED || shouldIgnore()) return;
        touchStartY = e.touches[0].clientY;
        touchLastY = touchStartY;
        touchAccum = 0;
        touchActive = true;
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "touchmove",
      function (e) {
        if (!touchActive || !e.touches[0] || REDUCED || shouldIgnore()) return;
        var y = e.touches[0].clientY;
        touchAccum += touchLastY - y;
        touchLastY = y;
        e.preventDefault();
      },
      { passive: false, capture: true }
    );

    window.addEventListener(
      "touchend",
      function () {
        if (!touchActive) return;
        touchActive = false;
        if (REDUCED || shouldIgnore() || !canStep()) {
          touchAccum = 0;
          return;
        }
        if (Math.abs(touchAccum) < WHEEL_MIN) {
          touchAccum = 0;
          return;
        }
        var dir = touchAccum > 0 ? 1 : -1;
        touchAccum = 0;
        if (dir > 0) stepDown();
        else stepUp();
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "touchcancel",
      function () {
        touchActive = false;
        touchAccum = 0;
      },
      { passive: true, capture: true }
    );

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });

    window.addEventListener("scroll", function () {
      if (!locked) scheduleGuard();
    }, { passive: true });

    window.addEventListener("cosgral:grafiki-beat", function (e) {
      afterGrafikiBeat(e.detail?.beat);
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener(
        "click",
        function (e) {
          if (link.closest(".nav-overlay")) return;
          var href = link.getAttribute("href");
          if (!href || href === "#") return;
          var id = href.slice(1);
          var cfgIdx = SECTION_IDS.indexOf(id);
          if (cfgIdx < 0) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          if (isSceneJump(activeIndex, cfgIdx)) jumpTo(cfgIdx);
          else goTo(cfgIdx);
        },
        true
      );
    });

    activeIndex = nearestIndex(window.scrollY);
    syncStepView(activeIndex);
    goTo(activeIndex, 0, true);
    beginCooldown();

    window.cosgralPortfolioStepper = {
      holds: holds,
      refreshHolds: buildHolds,
      goTo: function (index) {
        if (isSceneJump(activeIndex, index)) jumpTo(index);
        else goTo(index);
      },
      stepUp: stepUp,
      stepDown: stepDown,
      jumpTo: jumpTo,
      getIndex: function () {
        return activeIndex;
      },
      SECTION_IDS: SECTION_IDS,
    };

    ScrollTrigger.addEventListener("refresh", function () {
      holds = buildHolds();
      window.cosgralPortfolioStepper.holds = holds;
    });
  }

  function tryInit() {
    if (REDUCED) return;
    if (!document.body.classList.contains("portfolio-page")) return;
    if (window.cosgralPortfolioStepper) return;
    if (!window.ScrollTrigger || !window.gsap) return;
    if (!ScrollTrigger.getById("grafiki-pin") || !ScrollTrigger.getById("scene-automatyzacje")) return;
    init();
  }

  function boot() {
    if (REDUCED) return;
    tryInit();
    if (!window.cosgralPortfolioStepper) {
      document.addEventListener(
        "portfolio:media-ready",
        function () {
          window.setTimeout(function () {
            if (window.ScrollTrigger) ScrollTrigger.refresh();
            tryInit();
          }, 140);
        },
        { once: true }
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
