/**
 * Slideshow scroll — jeden gest = jedna sekcja (kropka). Nigdy nie zatrzymuje między.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var HOLDS_CONFIG = [
    { stId: "hero-pin", hold: 0.52, id: "top" },
    { stId: "scene-uslugi", hold: 0.48, id: "uslugi" },
    { stId: "scene-proces", hold: 0.48, id: "proces" },
    { stId: "scene-faq", hold: 0.48, id: "faq" },
    { stId: "scene-kontakt", hold: 0.48, id: "kontakt" },
    { id: "footer", footer: true },
  ];
  var SECTION_IDS = HOLDS_CONFIG.filter(function (c) { return !c.footer; }).map(function (c) { return c.id; });

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : document.documentElement.scrollHeight;
    if (!footer) return max;
    return Math.min(max, Math.max(0, footer.offsetTop - (MOBILE ? 162 : 234)));
  }

  function buildHolds() {
    var holds = [];
    HOLDS_CONFIG.forEach(function (cfg) {
      if (cfg.footer) {
        holds.push(footerHoldY());
        return;
      }
      var st = ScrollTrigger.getById(cfg.stId);
      if (st) holds.push(holdY(st, cfg.hold));
    });
    return holds;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function holdY(st, hold) {
    return st.start + (st.end - st.start) * hold;
  }

  function isFanHorizontalWheel(e) {
    var stage = document.querySelector("[data-fan-stage]");
    var section = document.getElementById("uslugi");
    if (!stage || !section || !section.classList.contains("is-in-view")) return false;
    var rect = stage.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    if (e.clientX < rect.left || e.clientX > rect.right) return false;
    var dx = Math.abs(e.deltaX);
    var dy = Math.abs(e.deltaY);
    if (e.shiftKey && dy > dx) dx = dy;
    return dx > 4 && dx > dy * 2.2;
  }

  function shouldIgnore() {
    if (!document.body.classList.contains("is-ready")) return true;
    if (document.querySelector(".nav-overlay.is-open")) return true;
    return false;
  }

  function init() {
    var lenis = window.cosgralSmoothScroll?.lenis;
    if (!lenis || !window.ScrollTrigger) return;

    var holds = buildHolds();
    if (holds.length < 2) return;

    var activeIndex = 0;
    var locked = false;
    var wheelAccum = 0;
    var wheelTimer = null;
    var guardTimer = null;
    var STEP_MS = MOBILE ? 4.32 : 5.28;
    var SNAP_MS = 1.44;
    var WHEEL_END = MOBILE ? 42 : 52;
    var WHEEL_MIN = 6;
    var WHEEL_INSTANT = 16;
    var lastCommitDir = 0;

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

    function isHeroHandoff(fromIndex, toIndex) {
      return (
        (fromIndex === 0 && toIndex === 1) ||
        (fromIndex === 1 && toIndex === 0)
      );
    }

    function stepDurationDown(fromIndex, toIndex) {
      if (isHeroHandoff(fromIndex, toIndex)) return STEP_MS * 2;
      if (fromIndex >= 1 && toIndex > fromIndex) return STEP_MS / 3;
      return STEP_MS;
    }

    function stepDurationUp(fromIndex, toIndex) {
      if (isHeroHandoff(fromIndex, toIndex)) return STEP_MS * 2;
      if (fromIndex >= 1 && toIndex < fromIndex) return STEP_MS / 3;
      return STEP_MS / 3;
    }

    function syncStepView(index) {
      var isFooter = index === holds.length - 1;
      document.documentElement.classList.toggle("is-footer-step", isFooter);
      var contact = document.getElementById("kontakt");
      if (contact) contact.classList.toggle("is-footer-handoff", isFooter);
    }

    function scenePanel(index) {
      var cfg = HOLDS_CONFIG[index];
      if (!cfg) return null;
      if (cfg.footer) return document.querySelector(".site-footer");
      var section = document.getElementById(cfg.id);
      if (!section) return null;
      return section.querySelector(".home-scene__panel") || section;
    }

    function syncSandForJump(index) {
      window.cosgralSand = window.cosgralSand || {};
      if (index === 0) {
        window.cosgralSand.cinema = 0;
        window.cosgralSand.motion = 0;
        window.cosgralSand.locked = false;
        window.cosgralSand.resetCube = true;
        document.documentElement.classList.remove("is-sand-stream");
      } else {
        window.cosgralSand.cinema = 1;
        window.cosgralSand.motion = 1;
        window.cosgralSand.locked = true;
        window.cosgralSand.break = 0.98;
        window.cosgralSand.stream = 0.98;
        document.documentElement.classList.add("is-sand-stream");
      }
    }

    function jumpTo(index) {
      holds = buildHolds();
      index = clamp(index, 0, holds.length - 1);
      var target = holds[index];

      if (index === activeIndex && Math.abs(lenis.scroll - target) < 4) return;

      if (!window.gsap) {
        goTo(index, 0, true);
        return;
      }

      var fromPanel = scenePanel(activeIndex);
      var toPanel = scenePanel(index);
      var curtain = document.querySelector("[data-scene-curtain]");

      locked = true;
      wheelAccum = 0;

      var tl = gsap.timeline({
        onComplete: function () {
          locked = false;
          if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
        },
      });

      if (fromPanel && toPanel && fromPanel !== toPanel) {
        tl.to(
          fromPanel,
          { autoAlpha: 0, filter: "blur(10px)", duration: 0.42, ease: "power2.in" },
          0
        );
      }
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0.88, duration: 0.38, ease: "power2.in" }, 0);
      }

      tl.add(function () {
        lenis.scrollTo(target, { immediate: true });
        if (window.ScrollTrigger) ScrollTrigger.update();
        activeIndex = index;
        syncStepView(index);
        syncSandForJump(index);
        if (index === 0 && window.cosgralRestoreHero) window.cosgralRestoreHero();

        if (toPanel) {
          var scene = toPanel.closest(".home-scene");
          if (scene) scene.classList.add("is-entered", "is-visible");
          gsap.set(toPanel, { autoAlpha: 1, scale: 1, filter: "blur(0px)", y: 0 });
        }
      }, 0.4);

      if (toPanel) {
        gsap.set(toPanel, { autoAlpha: 0, filter: "blur(12px)" });
        tl.to(toPanel, { autoAlpha: 1, filter: "blur(0px)", duration: 0.52, ease: "power2.out" }, 0.44);
      }
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, 0.44);
      }

      tl.add(function () {
        window.dispatchEvent(
          new CustomEvent("cosgral:section-step", {
            detail: { index: index, id: HOLDS_CONFIG[index]?.id || null },
          })
        );
      });
    }

    function goTo(index, duration, immediate) {
      holds = buildHolds();
      index = clamp(index, 0, holds.length - 1);
      var target = holds[index];
      var fromIndex = activeIndex;

      if (!immediate && index === activeIndex && Math.abs(lenis.scroll - target) < 4) {
        return;
      }

      locked = true;
      activeIndex = index;
      syncStepView(index);

      lenis.scrollTo(target, {
        immediate: !!immediate,
        duration: immediate ? 0 : duration != null ? duration : stepDurationDown(fromIndex, index),
        easing: easeOutCubic,
        lock: true,
        onComplete: function () {
          locked = false;
          if (Math.abs(lenis.scroll - target) > 2) {
            lenis.scrollTo(target, { immediate: true });
          }
          if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
        },
      });

      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: index, id: HOLDS_CONFIG[index]?.id || null },
        })
      );

      if (index === 0 && fromIndex !== 0 && window.cosgralRestoreHero) {
        window.cosgralRestoreHero();
      }
    }

    function stepUp() {
      if (activeIndex <= 0) {
        goTo(0, SNAP_MS);
        return;
      }
      var target = activeIndex - 1;
      if (target === 0) syncSandForJump(0);
      goTo(target, stepDurationUp(activeIndex, target));
      lastCommitDir = -1;
    }

    function enforceHold() {
      if (locked) return;
      holds = buildHolds();
      var idx = nearestIndex(lenis.scroll);
      var dist = Math.abs(lenis.scroll - holds[idx]);
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
      if (isFanHorizontalWheel(e)) return;

      e.preventDefault();
      e.stopPropagation();

      if (locked) {
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
      if (locked) {
        wheelAccum = 0;
        return;
      }

      if (Math.abs(wheelAccum) < WHEEL_MIN) {
        wheelAccum = 0;
        return;
      }

      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;

      if (dir > 0) {
        lastCommitDir = 1;
        if (activeIndex >= holds.length - 1) {
          goTo(activeIndex, SNAP_MS);
          return;
        }
        goTo(activeIndex + 1);
        return;
      }

      stepUp();
    }

    var touchStartY = 0;
    window.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches[0]) return;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      function (e) {
        if (REDUCED || shouldIgnore() || !e.changedTouches[0]) return;
        var dy = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(dy) < 22) {
          return;
        }
        if (locked) return;
        if (dy > 0) {
          lastCommitDir = 1;
          if (activeIndex >= holds.length - 1) {
            goTo(activeIndex, SNAP_MS);
            return;
          }
          goTo(activeIndex + 1);
          return;
        }
        stepUp();
      },
      { passive: true }
    );

    lenis.on("scroll", function () {
      if (!locked) scheduleGuard();
    });

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener(
        "click",
        function (e) {
          var href = link.getAttribute("href");
          if (!href || href === "#") return;
          var id = href.slice(1);
          var cfgIdx = SECTION_IDS.indexOf(id);
          if (cfgIdx < 0 && id === "rozpad") cfgIdx = SECTION_IDS.indexOf("uslugi");
          if (cfgIdx < 0) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          goTo(cfgIdx);
        },
        true
      );
    });

    activeIndex = nearestIndex(lenis.scroll);
    syncStepView(activeIndex);
    goTo(activeIndex, 0, true);

    window.cosgralSectionSnap = {
      holds: holds,
      refreshHolds: buildHolds,
      goTo: function (index) {
        goTo(index);
      },
      jumpTo: function (index) {
        jumpTo(index);
      },
      goToY: function (y) {
        goTo(nearestIndex(y));
      },
      goToFooter: function () {
        goTo(holds.length - 1);
      },
      getIndex: function () {
        return activeIndex;
      },
    };

    ScrollTrigger.addEventListener("refresh", function () {
      holds = buildHolds();
      window.cosgralSectionSnap.holds = holds;
    });
  }

  (async function () {
    if (REDUCED) return;
    await window.cosgralSmoothScroll?.ready;

    await new Promise(function (resolve) {
      if (document.body.classList.contains("is-ready")) {
        resolve();
        return;
      }
      window.addEventListener(
        "load",
        function () {
          window.setTimeout(resolve, 50);
        },
        { once: true }
      );
      window.setTimeout(resolve, 4000);
    });

    await new Promise(function (resolve) {
      if (window.ScrollTrigger?.getById("hero-pin")) {
        resolve();
        return;
      }
      window.addEventListener("cosgral:sections-ready", resolve, { once: true });
      window.setTimeout(resolve, 3000);
    });

    if (window.ScrollTrigger) ScrollTrigger.refresh();
    init();
  })();
})();
