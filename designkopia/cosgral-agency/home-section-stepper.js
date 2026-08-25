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
    { stId: "scene-realizacje", hold: 0.48, id: "realizacje" },
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
    if (MOBILE) {
      var viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      var footerH = footer.offsetHeight;
      var topInset = 64;
      var bottomInset = 12;
      if (footerH + topInset + bottomInset <= viewH) {
        return Math.min(max, Math.max(0, footer.offsetTop - topInset));
      }
      return Math.min(
        max,
        Math.max(0, footer.offsetTop + footerH - viewH + bottomInset)
      );
    }
    return Math.min(max, Math.max(0, footer.offsetTop - 234));
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

  function fanStageRect() {
    var section = document.getElementById("uslugi");
    if (!section || !section.classList.contains("is-in-view")) return null;
    return section.getBoundingClientRect();
  }

  function pointInFanStage(x, y) {
    var rect = fanStageRect();
    if (!rect) return false;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function isFanHorizontalWheel(e) {
    if (!pointInFanStage(e.clientX, e.clientY)) return false;
    var dx = Math.abs(e.deltaX);
    var dy = Math.abs(e.deltaY);
    if (e.shiftKey && dy > dx) dx = dy;
    return dx > 4 && dx > dy * 2.2;
  }

  function shouldIgnore() {
    if (!document.body.classList.contains("is-ready")) return true;
    if (document.querySelector(".nav-overlay.is-open")) return true;
    if (document.documentElement.classList.contains("is-service-panel-open")) return true;
    if (document.documentElement.classList.contains("is-form-focus")) return true;
    return false;
  }

  function isHomeReload() {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    return !!(nav && nav.type === "reload");
  }

  function hasStoredHashNav() {
    return !!sessionStorage.getItem("cosgral-scroll-target");
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
    var STEP_MS = 5.28;
    var SNAP_MS = 1.44;
    var WHEEL_END = 52;
    var WHEEL_MIN = 6;
    var WHEEL_INSTANT = 16;
    // Mobile: dużo wyższy próg — inaczej swipe po kafelkach Usług od razu zmienia sekcję.
    var TOUCH_STEP_MIN = MOBILE ? 92 : 28;
    var TOUCH_FAN_STEP_MIN = 140;
    var TOUCH_AXIS_LOCK_PX = 12;
    var HOLD_COOLDOWN_MS = 100;
    var SECTION_READY_MS = 1000;
    var SECTION_REACH_PX = 16;
    var lastCommitDir = 0;
    var cooldownUntil = 0;
    var formFocusLock = false;
    var scrollUnlockTimer = null;
    var scrollUnlockRaf = 0;

    function beginCooldown() {
      cooldownUntil = Date.now() + HOLD_COOLDOWN_MS;
    }

    function canStep() {
      if (locked) return false;
      if (formFocusLock) return false;
      if (Date.now() < cooldownUntil) return false;
      return true;
    }

    function setFormFocusLock(on) {
      formFocusLock = !!on;
      document.documentElement.classList.toggle("is-form-focus", formFocusLock);
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

    function isHeroHandoff(fromIndex, toIndex) {
      return (
        (fromIndex === 0 && toIndex === 1) ||
        (fromIndex === 1 && toIndex === 0)
      );
    }

    function stepDurationDown(fromIndex, toIndex) {
      if (isHeroHandoff(fromIndex, toIndex)) return STEP_MS * 2;
      if (fromIndex === 1 && toIndex > fromIndex) return STEP_MS / 4.2;
      if (fromIndex >= 1 && toIndex > fromIndex) return STEP_MS / 3;
      return STEP_MS;
    }

    function stepDurationUp(fromIndex, toIndex) {
      if (isHeroHandoff(fromIndex, toIndex)) return STEP_MS * 2;
      if (fromIndex === 1 && toIndex < fromIndex) return STEP_MS / 4.2;
      if (fromIndex >= 1 && toIndex < fromIndex) return STEP_MS / 3;
      return STEP_MS / 3;
    }

    function clearScrollUnlockWatch() {
      if (scrollUnlockTimer) {
        window.clearTimeout(scrollUnlockTimer);
        scrollUnlockTimer = null;
      }
      if (scrollUnlockRaf) {
        window.cancelAnimationFrame(scrollUnlockRaf);
        scrollUnlockRaf = 0;
      }
    }

    function finishScrollStep(target) {
      if (!locked) return;
      clearScrollUnlockWatch();
      locked = false;
      beginCooldown();
      if (Math.abs(lenis.scroll - target) > 2) {
        lenis.scrollTo(target, { immediate: true });
      }
      if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
    }

    function watchScrollUnlock(target) {
      clearScrollUnlockWatch();
      var reachedAt = 0;

      function tryScheduleUnlock() {
        if (!locked || reachedAt) return;
        if (Math.abs(lenis.scroll - target) > SECTION_REACH_PX) return;
        reachedAt = Date.now();
        scrollUnlockTimer = window.setTimeout(function () {
          finishScrollStep(target);
        }, SECTION_READY_MS);
      }

      function tick() {
        if (!locked) return;
        tryScheduleUnlock();
        if (!locked) return;
        scrollUnlockRaf = window.requestAnimationFrame(tick);
      }

      scrollUnlockRaf = window.requestAnimationFrame(tick);
    }

    function syncStepView(index) {
      var isFooter = index === holds.length - 1;
      document.documentElement.classList.toggle("is-footer-step", isFooter);
      if (isFooter && window.gsap) {
        window.gsap.utils.toArray(".site-footer [data-enter]").forEach(function (el) {
          window.gsap.set(el, { autoAlpha: 1, y: 0, clearProps: "filter" });
        });
      }
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
        window.cosgralSand.locked = false;
        window.cosgralSand.cinema = 0;
        window.cosgralSand.motion = 0;
        window.cosgralSand.break = 0;
        window.cosgralSand.stream = 0;
        window.cosgralSand.motionTail = 0;
        window.cosgralSand.resetCube = true;
        document.documentElement.classList.remove("is-sand-stream");
        return;
      }
      window.cosgralSand.cinema = 1;
      window.cosgralSand.motion = 1;
      window.cosgralSand.locked = true;
      window.cosgralSand.break = 0.98;
      window.cosgralSand.stream = 0.98;
      document.documentElement.classList.add("is-sand-stream");
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
          beginCooldown();
          if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
        },
      });

      if (fromPanel && toPanel && fromPanel !== toPanel) {
        tl.to(fromPanel, { autoAlpha: 0, filter: "blur(10px)", duration: 0.42, ease: "power2.in" }, 0);
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
      if (index === 0 && fromIndex !== 0) {
        syncSandForJump(0);
      } else if (index >= 1 && fromIndex >= 1) {
        syncSandForJump(index);
      }
      clearScrollUnlockWatch();

      var scrollDuration = immediate ? 0 : duration != null ? duration : stepDurationDown(fromIndex, index);

      lenis.scrollTo(target, {
        immediate: !!immediate,
        duration: scrollDuration,
        easing: easeOutCubic,
        lock: true,
        onComplete: function () {
          if (Math.abs(lenis.scroll - target) > 2) {
            lenis.scrollTo(target, { immediate: true });
          }
          if (index >= 1) syncSandForJump(index);
          if (immediate || scrollDuration <= 0.05) {
            finishScrollStep(target);
            return;
          }
          if (!locked) {
            if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
            return;
          }
          if (scrollUnlockTimer) return;
          finishScrollStep(target);
        },
      });

      if (!immediate && scrollDuration > 0.05) {
        watchScrollUnlock(target);
      }

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
      if (!canStep()) return;
      if (activeIndex <= 0) {
        goTo(0, SNAP_MS);
        return;
      }
      var target = activeIndex - 1;
      if (target === 0) syncSandForJump(0);
      goTo(target, stepDurationUp(activeIndex, target));
      lastCommitDir = -1;
    }

    function stepDown() {
      if (!canStep()) return;
      if (activeIndex >= holds.length - 1) {
        goTo(activeIndex, SNAP_MS);
        return;
      }
      goTo(activeIndex + 1);
      lastCommitDir = 1;
    }

    function enforceHold() {
      if (locked || formFocusLock || Date.now() < cooldownUntil) return;
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
      if (formFocusLock) return;
      guardTimer = window.setTimeout(enforceHold, 32);
    }

    function onWheel(e) {
      if (REDUCED || shouldIgnore()) return;
      if (isFanHorizontalWheel(e)) return;

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

      if (dir > 0) {
        stepDown();
        return;
      }

      stepUp();
    }

    var touchStartX = 0;
    var touchStartY = 0;
    var touchLastY = 0;
    var touchAccum = 0;
    var touchActive = false;
    var touchAxis = null; // "x" | "y" | null
    var touchOnFan = false;

    window.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches[0] || REDUCED || shouldIgnore()) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchLastY = touchStartY;
        touchAccum = 0;
        touchAxis = null;
        touchOnFan = pointInFanStage(touchStartX, touchStartY);
        touchActive = true;
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "touchmove",
      function (e) {
        if (!touchActive || !e.touches[0] || REDUCED || shouldIgnore()) return;
        var x = e.touches[0].clientX;
        var y = e.touches[0].clientY;
        var dx = x - touchStartX;
        var dy = y - touchStartY;

        if (!touchAxis) {
          if (Math.abs(dx) < TOUCH_AXIS_LOCK_PX && Math.abs(dy) < TOUCH_AXIS_LOCK_PX) return;
          // Na Usługach lekko faworyzuj gest poziomy (zmiana kafelka).
          var xBias = touchOnFan ? 0.85 : 1.1;
          touchAxis = Math.abs(dx) > Math.abs(dy) * xBias ? "x" : "y";
        }

        // Swipe w lewo/prawo po karuzeli — nie bierz do zmiany sekcji.
        if (touchAxis === "x" && touchOnFan) {
          touchAccum = 0;
          return;
        }
        if (touchAxis === "x" && !touchOnFan) {
          // Poziomy gest poza fanem — nie zmieniaj sekcji przypadkiem.
          touchAccum = 0;
          return;
        }

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
        if (REDUCED || shouldIgnore()) {
          touchAccum = 0;
          touchAxis = null;
          return;
        }
        if (touchAxis === "x") {
          touchAccum = 0;
          touchAxis = null;
          return;
        }
        if (!canStep()) {
          touchAccum = 0;
          touchAxis = null;
          return;
        }
        var min = touchOnFan ? TOUCH_FAN_STEP_MIN : TOUCH_STEP_MIN;
        if (Math.abs(touchAccum) < min) {
          touchAccum = 0;
          touchAxis = null;
          return;
        }
        var dir = touchAccum > 0 ? 1 : -1;
        touchAccum = 0;
        touchAxis = null;
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
        touchAxis = null;
        touchOnFan = false;
      },
      { passive: true, capture: true }
    );

    lenis.on("scroll", function () {
      if (!locked) scheduleGuard();
    });

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener(
        "click",
        function (e) {
          if (link.closest(".nav-overlay")) return;
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

    function bootSectionIndex() {
      if (hasStoredHashNav()) return 0;

      var hash = (location.hash || "").replace(/^#/, "");
      if (hash) {
        var cfgIdx = SECTION_IDS.indexOf(hash);
        if (cfgIdx >= 0) return cfgIdx;
        if (hash === "rozpad") {
          var uslIdx = SECTION_IDS.indexOf("uslugi");
          if (uslIdx >= 0) return uslIdx;
        }
      }

      if (isHomeReload()) {
        return nearestIndex(lenis.scroll);
      }

      return 0;
    }

    var bootIndex = bootSectionIndex();
    activeIndex = bootIndex;
    syncStepView(bootIndex);
    syncSandForJump(bootIndex);
    goTo(bootIndex, 0, true);
    beginCooldown();

    window.cosgralSectionSnap = {
      holds: holds,
      refreshHolds: buildHolds,
      goTo: function (index, duration, immediate) {
        goTo(index, duration, immediate);
      },
      stepUp: stepUp,
      stepDown: stepDown,
      setFormFocusLock: setFormFocusLock,
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
    if (MOBILE && !isHomeReload()) {
      await new Promise(function (resolve) {
        if (window.cosgralCube?.introDone?.()) {
          resolve();
          return;
        }
        var done = function () {
          resolve();
        };
        window.addEventListener("cosgral:cube-intro-done", done, { once: true });
        window.setTimeout(done, 3800);
      });
    }
    init();
  })();
})();
