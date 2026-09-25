/**
 * Homepage scroll — wolny ciągły scroll (pin+scrub GSAP).
 * Snap „jeden gest = jedna sekcja” wyłączony (FREE_SCROLL).
 * API cosgralSectionSnap zostaje dla menu / rail / paneli.
 */
(function () {
  "use strict";

  var FREE_SCROLL = true;
  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var HOLDS_CONFIG = [
    { stId: "hero-pin", hold: 0.52, id: "top" },
    { stId: "scene-uslugi", hold: 0.48, id: "uslugi" },
    { stId: "scene-realizacje", hold: 0.48, id: "realizacje" },
    { stId: "scene-faq", hold: 0.48, id: "faq" },
    { stId: "scene-proces", hold: 0.48, id: "proces" },
    { stId: "scene-kontakt", hold: 0.48, id: "kontakt" },
    { id: "footer", footer: true },
  ];
  var SECTION_IDS = HOLDS_CONFIG.filter(function (c) { return !c.footer; }).map(function (c) { return c.id; });

  /* Klasa od razu przy ewaluacji (jak portfolio-section-stepper): layout free-scroll
     (sticky, marginesy dwell, tor stopki) musi istnieć ZANIM section-flow zrobi
     ScrollTrigger.refresh() — inaczej start/end triggerów liczą się dla innego dokumentu. */
  if (FREE_SCROLL && !REDUCED) document.documentElement.classList.add("is-free-scroll");

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : document.documentElement.scrollHeight;
    if (!footer) return max;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    if (window.cosgralSmoothScroll && typeof window.cosgralSmoothScroll.scroll === "number") {
      scrollY = window.cosgralSmoothScroll.scroll;
    }
    var y = footer.getBoundingClientRect().top + scrollY;
    return Math.min(max, Math.max(0, y));
  }

  function verticalMargins(el) {
    var cs = window.getComputedStyle(el);
    return (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }

  /** Stabilny top layoutu (sticky psuje offsetTop). offsetHeight nie obejmuje
      marginesów, a sceny depth mają margin-bottom (dwell) — liczymy je jawnie. */
  function sectionLayoutTop(el) {
    if (!el) return 0;
    var parent = el.parentElement;
    if (!parent) return Math.max(0, el.offsetTop || 0);
    var y = 0;
    for (var child = parent.firstElementChild; child && child !== el; child = child.nextElementSibling) {
      y += (child.offsetHeight || 0) + verticalMargins(child);
    }
    return y + (parseFloat(window.getComputedStyle(el).marginTop) || 0);
  }

  function buildHolds() {
    var holds = [];
    HOLDS_CONFIG.forEach(function (cfg) {
      if (cfg.footer) {
        holds.push(footerHoldY());
        return;
      }
      /* Free-scroll + depth sticky: sumuj wysokości siblingów zamiast offsetTop/ST. */
      if (FREE_SCROLL && cfg.id) {
        var el = document.getElementById(cfg.id);
        if (el) {
          holds.push(Math.max(0, sectionLayoutTop(el)));
          return;
        }
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

  function pointInUslugiSection(x, y) {
    var section = document.getElementById("uslugi");
    if (!section) return false;
    var snapIdx = window.cosgralSectionSnap?.getIndex?.();
    var active =
      snapIdx === 1 ||
      section.classList.contains("is-in-view") ||
      section.classList.contains("is-visible") ||
      section.classList.contains("is-entered");
    if (!active) return false;
    var rect = section.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function isFanHorizontalWheel(e) {
    // Najpierw test osi (czysta arytmetyka), dopiero potem trafienie w sekcję.
    // pointInUslugiSection() woła getBoundingClientRect, czyli wymusza layout —
    // przy scrollu gładzikiem to setki wymuszonych reflow na sekundę, na
    // ścieżce krytycznej wejścia. Zwykły scroll w pionie odpada już tutaj.
    var dx = Math.abs(e.deltaX);
    var dy = Math.abs(e.deltaY);
    if (e.shiftKey && dy > dx) dx = dy;
    if (!(dx > 4 && dx > dy * 2.2)) return false;
    return pointInUslugiSection(e.clientX, e.clientY);
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
    // Tylko w Usługach: większy gest pionowy, żeby dało się zmieniać kafelki bez skoku sekcji.
    var TOUCH_USLUGI_STEP_MIN = 96;
    var uslugiIdx = SECTION_IDS.indexOf("uslugi");
    var HOLD_COOLDOWN_MS = 100;
    var SECTION_READY_MS = 1000;
    var SECTION_REACH_PX = 16;
    var lastCommitDir = 0;
    var cooldownUntil = 0;
    var fanVerticalAccum = 0;
    var FAN_WHEEL_CARD_MIN = 32;
    var FAN_WHEEL_SECTION_MIN = 140;
    var scrollUnlockTimer = null;
    var scrollUnlockRaf = 0;
    var formFocusLock = false;

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

    var lastScrollY = 0;
    var footerEl = document.querySelector(".site-footer");

    /* Aktywna sekcja z viewportu, nie z najbliższego holda.
       Sticky Kontakt ma top=0 gdy stopka już wjeżdża — nearest-hold
       przełączał rail za wcześnie i powodował skok klas. */
    function indexFromViewport() {
      var vh = window.innerHeight || 1;
      var y = lenis.scroll;
      var down = y >= lastScrollY - 0.5;
      lastScrollY = y;
      var enter = down ? 0.28 : 0.52;

      if (footerEl) {
        var ft = footerEl.getBoundingClientRect().top;
        if (ft <= vh * enter) return holds.length - 1;
      }

      for (var i = SECTION_IDS.length - 1; i >= 0; i--) {
        var el = document.getElementById(SECTION_IDS[i]);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= vh * enter) return i;
      }
      return 0;
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
      ensureScenePanelVisible(activeIndex);
      if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
    }

    function ensureScenePanelVisible(index) {
      if (FREE_SCROLL) return;
      var cfg = HOLDS_CONFIG[index];
      if (!cfg || cfg.footer) return;
      var section = document.getElementById(cfg.id);
      if (!section) return;
      if (window.cosgralSceneEnters?.ensurePanel) {
        window.cosgralSceneEnters.ensurePanel(section);
      } else if (window.gsap) {
        var panel = section.querySelector(".home-scene__panel") || section;
        window.gsap.set(panel, {
          autoAlpha: 1,
          scale: 1,
          filter: MOBILE ? "none" : "blur(0px)",
        });
      }
      if (window.cosgralSceneEnters?.play) {
        window.cosgralSceneEnters.play(section, { stagger: true });
      }
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
      var footer = footerEl || document.querySelector(".site-footer");
      if (!footer) return;
      var footerDominant = index === holds.length - 1;
      if (footerDominant && window.gsap) {
        window.gsap.utils.toArray(".site-footer [data-enter]").forEach(function (el) {
          window.gsap.set(el, { autoAlpha: 1, y: 0, clearProps: "filter" });
        });
      }
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
        document.documentElement.classList.remove("is-sand-stream", "is-shattering");
        var shatter = document.getElementById("rozpad");
        if (shatter) shatter.classList.remove("is-active");
        return;
      }
      window.cosgralSand.cinema = 1;
      window.cosgralSand.motion = 1;
      window.cosgralSand.locked = true;
      window.cosgralSand.break = 0.98;
      window.cosgralSand.stream = 0.98;
      document.documentElement.classList.add("is-sand-stream");
      document.documentElement.classList.remove("is-shattering");
      var shatterDone = document.getElementById("rozpad");
      if (shatterDone) shatterDone.classList.remove("is-active");
    }

    function syncSectionFocus(index) {
      document.querySelectorAll(".home-scene").forEach(function (scene) {
        scene.classList.remove("is-in-view");
      });
      var cfg = HOLDS_CONFIG[index];
      if (!cfg || cfg.footer) return;
      var section = document.getElementById(cfg.id);
      if (!section) return;
      section.classList.add("is-in-view", "is-entered", "is-visible");
      /* Free scroll: nie ruszaj transformów panelu — depth scrub w section-flow */
      if (FREE_SCROLL) return;
      if (window.cosgralSceneEnters?.ensurePanel) {
        window.cosgralSceneEnters.ensurePanel(section);
      }
    }

    function playHeroToServicesHandoff(duration) {
      var shatter = document.getElementById("rozpad");
      if (shatter) shatter.classList.add("is-active");
      document.documentElement.classList.add("is-shattering");
      if (window.cosgralSceneFlow?.animateCinemaTo) {
        window.cosgralSceneFlow.animateCinemaTo(1, duration || 2.4);
      } else {
        syncSandForJump(1);
      }
    }

    function jumpTo(index) {
      holds = buildHolds();
      index = clamp(index, 0, holds.length - 1);
      var target = holds[index];
      var fromIndex = activeIndex;

      if (index === activeIndex && Math.abs(lenis.scroll - target) < 4) return;

      /* Free scroll: płynny dojazd bez kurtyny — cinema scrubuje się po drodze.
         Natychmiastowy skok (brak GSAP) nadal synchronizuje sand. */
      if (FREE_SCROLL) {
        if (!window.gsap) {
          goTo(index, 0, true);
          return;
        }
        locked = true;
        wheelAccum = 0;
        activeIndex = index;
        syncStepView(index);
        syncSectionFocus(index);
        lenis.scrollTo(target, {
          duration: MOBILE ? 0.95 : 1.15,
          easing: easeOutCubic,
          onComplete: function () {
            locked = false;
            beginCooldown();
            if (index === 0 && window.cosgralRestoreHero) window.cosgralRestoreHero();
            if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
          },
        });
        window.dispatchEvent(
          new CustomEvent("cosgral:section-step", {
            detail: { index: index, id: HOLDS_CONFIG[index]?.id || null },
          })
        );
        return;
      }

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
        tl.to(fromPanel, { autoAlpha: 0, filter: MOBILE ? "none" : "blur(10px)", duration: 0.42, ease: "power2.in" }, 0);
      }
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0.88, duration: 0.38, ease: "power2.in" }, 0);
      }

      tl.add(function () {
        lenis.scrollTo(target, { immediate: true });
        if (window.ScrollTrigger) ScrollTrigger.update();
        activeIndex = index;
        syncStepView(index);
        syncSectionFocus(index);
        if (index === 0) {
          syncSandForJump(0);
          if (window.cosgralRestoreHero) window.cosgralRestoreHero();
        } else if (fromIndex === 0) {
          playHeroToServicesHandoff(1.8);
        } else {
          syncSandForJump(index);
        }

        if (toPanel) {
          var scene = toPanel.closest(".home-scene");
          if (scene) scene.classList.add("is-entered", "is-visible");
          gsap.set(toPanel, { autoAlpha: 1, scale: 1, filter: MOBILE ? "none" : "blur(0px)", y: 0 });
          if (scene && window.cosgralSceneEnters) {
            if (index > fromIndex) {
              window.cosgralSceneEnters.reset(scene);
              window.cosgralSceneEnters.play(scene, { stagger: true, force: true });
            } else if (window.cosgralSceneEnters.snap) {
              window.cosgralSceneEnters.snap(scene);
            }
          }
        }
      }, 0.4);

      if (toPanel) {
        gsap.set(toPanel, { autoAlpha: 0, filter: MOBILE ? "none" : "blur(12px)" });
        tl.to(toPanel, { autoAlpha: 1, filter: MOBILE ? "none" : "blur(0px)", duration: 0.52, ease: "power2.out" }, 0.44);
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

      activeIndex = index;
      syncStepView(index);
      syncSectionFocus(index);
      clearScrollUnlockWatch();

      var scrollDuration = immediate ? 0 : duration != null ? duration : (FREE_SCROLL ? 1.1 : stepDurationDown(fromIndex, index));

      /* Free scroll: nie forsuj cinema — ScrollTrigger (#rozpad) scrubuje sześcian.
         Tylko immediate (boot / hash) ustawia stan sand od razu. */
      if (!FREE_SCROLL) {
        locked = true;
        if (index === 0 && fromIndex !== 0) {
          syncSandForJump(0);
        } else if (fromIndex === 0 && index >= 1) {
          playHeroToServicesHandoff(scrollDuration > 0.05 ? scrollDuration * 0.42 : 2.2);
        } else if (index >= 1 && fromIndex >= 1) {
          syncSandForJump(index);
        }
      } else if (immediate) {
        syncSandForJump(index);
      }

      lenis.scrollTo(target, {
        immediate: !!immediate,
        duration: scrollDuration,
        easing: easeOutCubic,
        lock: FREE_SCROLL ? false : true,
        onComplete: function () {
          if (FREE_SCROLL) {
            if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
            return;
          }
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

      if (!FREE_SCROLL && !immediate && scrollDuration > 0.05) {
        watchScrollUnlock(target);
      }

      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: index, id: HOLDS_CONFIG[index]?.id || null },
        })
      );

      if (index === 0 && fromIndex !== 0 && window.cosgralRestoreHero && (FREE_SCROLL ? immediate : true)) {
        window.cosgralRestoreHero();
      }
    }

    function stepUp() {
      if (!canStep()) return;
      if (activeIndex <= 0) {
        goTo(0, FREE_SCROLL ? 0.9 : SNAP_MS);
        return;
      }
      var target = activeIndex - 1;
      if (!FREE_SCROLL && target === 0) syncSandForJump(0);
      goTo(target, FREE_SCROLL ? 0.95 : stepDurationUp(activeIndex, target));
      lastCommitDir = -1;
    }

    function stepDown() {
      if (!canStep()) return;
      if (activeIndex >= holds.length - 1) {
        goTo(activeIndex, FREE_SCROLL ? 0.9 : SNAP_MS);
        return;
      }
      goTo(activeIndex + 1, FREE_SCROLL ? 1.05 : undefined);
      lastCommitDir = 1;
    }

    function enforceHold() {
      if (FREE_SCROLL) return;
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
      if (FREE_SCROLL) return;
      if (guardTimer) window.clearTimeout(guardTimer);
      if (formFocusLock) return;
      guardTimer = window.setTimeout(enforceHold, 32);
    }

    function syncIndexFromScroll() {
      var idx = indexFromViewport();
      if (idx === activeIndex) return;
      activeIndex = idx;
      syncStepView(idx);
      syncSectionFocus(idx);
      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: idx, id: HOLDS_CONFIG[idx]?.id || null },
        })
      );
      if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
    }

    function onWheel(e) {
      if (FREE_SCROLL) return;
      if (REDUCED || shouldIgnore()) return;
      if (isFanHorizontalWheel(e)) return;

      // Desktop: w sekcji Usługi kółko pionowe przewija kafelki (jak tap/swipe na mobile).
      if (activeIndex === uslugiIdx && pointInUslugiSection(e.clientX, e.clientY)) {
        e.preventDefault();
        e.stopPropagation();
        fanVerticalAccum += e.deltaY;
        if (Math.abs(fanVerticalAccum) >= FAN_WHEEL_CARD_MIN && window.cosgralServicesFan?.stepFromWheel) {
          if (window.cosgralServicesFan.stepFromWheel(fanVerticalAccum)) {
            fanVerticalAccum = 0;
            return;
          }
        }
        if (Math.abs(fanVerticalAccum) >= FAN_WHEEL_SECTION_MIN) {
          wheelAccum = fanVerticalAccum;
          fanVerticalAccum = 0;
          commitWheel();
          return;
        }
        return;
      }

      fanVerticalAccum = 0;

      e.preventDefault();
      e.stopPropagation();

      if (!canStep()) {
        wheelAccum = 0;
        return;
      }

      wheelAccum += e.deltaY;

      var instant = activeIndex === uslugiIdx ? 48 : WHEEL_INSTANT;
      if (Math.abs(wheelAccum) >= instant) {
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

      var min = activeIndex === uslugiIdx ? 36 : WHEEL_MIN;
      if (Math.abs(wheelAccum) < min) {
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
    var touchIgnoreStep = false; // poziomy swipe w Usługach — tylko kafelki
    var touchFromUslugi = false;

    if (!FREE_SCROLL) {
      window.addEventListener(
        "touchstart",
        function (e) {
          if (!e.touches[0] || REDUCED || shouldIgnore()) return;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchLastY = touchStartY;
          touchAccum = 0;
          touchIgnoreStep = false;
          touchFromUslugi =
            activeIndex === uslugiIdx || pointInUslugiSection(touchStartX, touchStartY);
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

          if (
            touchFromUslugi &&
            !touchIgnoreStep &&
            Math.abs(dx) > 18 &&
            Math.abs(dx) > Math.abs(dy) * 1.45
          ) {
            touchIgnoreStep = true;
            touchAccum = 0;
            return;
          }

          if (touchIgnoreStep) return;

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
          if (REDUCED || shouldIgnore() || touchIgnoreStep) {
            touchAccum = 0;
            touchIgnoreStep = false;
            touchFromUslugi = false;
            return;
          }
          if (!canStep()) {
            touchAccum = 0;
            touchFromUslugi = false;
            return;
          }
          var min = touchFromUslugi ? TOUCH_USLUGI_STEP_MIN : WHEEL_MIN;
          if (Math.abs(touchAccum) < min) {
            touchAccum = 0;
            touchFromUslugi = false;
            return;
          }
          var dir = touchAccum > 0 ? 1 : -1;
          touchAccum = 0;
          touchFromUslugi = false;
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
          touchIgnoreStep = false;
          touchFromUslugi = false;
        },
        { passive: true, capture: true }
      );

      window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    }

    if (FREE_SCROLL) {
      lenis.on("scroll", syncIndexFromScroll);
    } else {
      lenis.on("scroll", function () {
        if (!locked) scheduleGuard();
      });
    }

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
    syncSectionFocus(bootIndex);
    syncSandForJump(bootIndex);
    goTo(bootIndex, 0, true);
    beginCooldown();

    window.cosgralSectionSnap = {
      holds: holds,
      freeScroll: FREE_SCROLL,
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
        if (FREE_SCROLL) {
          lenis.scrollTo(y, { duration: 1.0, easing: easeOutCubic });
          return;
        }
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
    if (!isHomeReload()) {
      await new Promise(function (resolve) {
        if (window.cosgralCube?.introDone?.()) {
          resolve();
          return;
        }
        var done = function () {
          resolve();
        };
        window.addEventListener("cosgral:cube-intro-done", done, { once: true });
        window.setTimeout(done, MOBILE ? 3800 : 5200);
      });
    }
    init();
  })();
})();
