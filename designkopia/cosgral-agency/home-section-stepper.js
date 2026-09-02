/**
 * Analogowy rail sekcji — każdy ruch scrolla ma wartość.
 *
 * Zamiast „jeden gest = jeden skok o sekcję" trzymamy ciągłą pozycję w
 * jednostkach sekcji (0 = hero, 1 = usługi, …). Każde zdarzenie kółka/dotyku
 * przesuwa ją proporcjonalnie, a strona — scroll, rozpad kostki, panele —
 * idzie za nią klatka po klatce. Kilka kliknięć kółka przewija kostkę kawałek
 * po kawałku; po zakończeniu gestu pozycja dojeżdża do sekcji, na której
 * stoimy, albo do następnej, jeśli przejechaliśmy próg COMMIT.
 *
 * Kostka nie jest już sterowana scrubem (scrub = celowe opóźnienie), tylko
 * bezpośrednio z pozycji scrolla — dzięki temu reaguje w tej samej klatce.
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

  /* ——— czułość: ile „kliknięć” kółka na jedno przejście ——— */
  var NOTCH_PX = 100;                // referencyjny skok kółka myszy
  var NOTCHES_HERO = 8;              // hero → usługi: pełny rozpad kostki
  var NOTCHES_DEFAULT = 5;           // pozostałe przejścia
  var COMMIT = 0.24;                 // ułamek przejścia, po którym gest się zatwierdza
  var SETTLE_MS = 140;               // cisza po geście → decyzja commit / powrót
  var LEAD_MAX = 2;                  // jak daleko cel może uciec przed obrazem
  var EASE = MOBILE ? 0.2 : 0.17;    // dociąganie obrazu do celu (na klatkę 60 Hz)
  var MAX_UNITS_PER_FRAME = 1 / 30;  // limit prędkości: pełne przejście ≈ 0.7 s
  var FRAME_MS = 1000 / 60;
  var MAX_FRAME_STEP = 4;            // po zgubionych klatkach nie nadrabiamy skokiem
  var WHEEL_EVENT_CAP = 400;         // jedno zdarzenie nie teleportuje przez sekcje
  var SETTLED_EPS = 0.0008;
  var EXTERNAL_SCROLL_EPS = 6;

  /* Przejście hero → usługi ma trzy takty; podział 8 kliknięć między nie:
     1 na wyjście z hero, 5 na rozpad kostki, 2 na wjazd w Usługi. Dzięki temu
     „powoli przewijam kostkę" to realnie 5 kliknięć, a nie 2 z ośmiu. */
  var HERO_LEAD_F = 1 / NOTCHES_HERO;
  var HERO_TAIL_F = 2 / NOTCHES_HERO;

  /* ——— Usługi: kółko najpierw przerzuca kafelki, dopiero nadmiar rusza sekcję ——— */
  var FAN_CARD_MIN = 32;              // tyle pikseli gestu = jeden kafelek
  var FAN_DECAY_MS = 420;             // przerwa w geście zeruje licznik kafelków
  var FAN_MAX_CARDS_PER_GESTURE = 2;  // po tylu kafelkach kółko wraca do railu

  /* ——— dotyk ——— */
  var TOUCH_SECTION_RATIO = 0.45;    // ile wysokości ekranu = jedno przejście
  var TOUCH_USLUGI_MUL = 1.7;        // w Usługach gest musi być wyraźniejszy

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : document.documentElement.scrollHeight;
    if (!footer) return max;
    /* Full-viewport footer section — pin its top to the viewport top */
    return Math.min(max, Math.max(0, footer.offsetTop));
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
    if (document.documentElement.classList.contains("is-nav-menu-open")) return true;
    if (document.querySelector(".nav-overlay.is-open")) return true;
    if (document.documentElement.classList.contains("is-service-panel-open")) return true;
    if (document.documentElement.classList.contains("is-form-focus")) return true;
    return false;
  }

  function isTypingTarget(el) {
    if (!el || el === document.body) return false;
    if (el.isContentEditable) return true;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function isHomeReload() {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    return !!(nav && nav.type === "reload");
  }

  function hasStoredHashNav() {
    return !!sessionStorage.getItem("cosgral-scroll-target");
  }

  function wheelPixels(e) {
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight || 800;
    return clamp(d, -WHEEL_EVENT_CAP, WHEEL_EVENT_CAP);
  }

  function init() {
    var lenis = window.cosgralSmoothScroll?.lenis;
    if (!lenis || !window.ScrollTrigger) return;

    var holds = buildHolds();
    if (holds.length < 2) return;

    var lastIdx = holds.length - 1;

    /* pos = dokąd zaprowadził gest, render = co realnie widać, commitBase = ostatnia zatwierdzona sekcja */
    var pos = 0;
    var render = 0;
    var commitBase = 0;
    var activeIndex = 0;

    var driverRaf = 0;
    var driverLastAt = 0;
    var settleTimer = null;
    var driving = false;          // trwa nasz własny zapis scrolla
    var refreshing = false;       // ScrollTrigger przelicza pozycje pinów
    var lastAppliedY = -1;
    var formFocusLock = false;

    var fanAccum = 0;
    var fanLap = 0;
    var fanDecayTimer = null;

    /* ————————————————— mapowanie pozycja ↔ scroll ————————————————— */

    /* Punkty kontrolne odcinka: [ułamek gestu → pozycja scrolla]. Zwykły odcinek
       jest liniowy; hero → usługi dzieli się na takty wokół sceny rozpadu. */
    function segmentStops(i) {
      if (i !== 0) return null;
      var st = ScrollTrigger.getById("shatter-beat");
      if (!st) return null;
      var a = holds[0];
      var b = holds[1];
      var s0 = st.start;
      var s1 = st.end;
      if (!(s0 > a + 1) || !(s1 > s0 + 1) || !(b > s1 + 1)) return null;
      return [
        { f: 0, y: a },
        { f: HERO_LEAD_F, y: s0 },
        { f: 1 - HERO_TAIL_F, y: s1 },
        { f: 1, y: b },
      ];
    }

    function yFor(p) {
      if (p <= 0) return holds[0];
      if (p >= lastIdx) return holds[lastIdx];
      var i = Math.floor(p);
      var f = p - i;
      var stops = segmentStops(i);
      if (!stops) return holds[i] + (holds[i + 1] - holds[i]) * f;
      for (var k = 1; k < stops.length; k++) {
        if (f <= stops[k].f) {
          var f0 = stops[k - 1].f;
          var span = stops[k].f - f0;
          var t = span > 0 ? (f - f0) / span : 0;
          return stops[k - 1].y + (stops[k].y - stops[k - 1].y) * t;
        }
      }
      return stops[stops.length - 1].y;
    }

    function posInSegment(i, y) {
      var stops = segmentStops(i);
      if (!stops) {
        var span = holds[i + 1] - holds[i];
        return span > 0 ? (y - holds[i]) / span : 0;
      }
      for (var k = 1; k < stops.length; k++) {
        if (y <= stops[k].y) {
          var y0 = stops[k - 1].y;
          var dy = stops[k].y - y0;
          var t = dy > 0 ? (y - y0) / dy : 0;
          return stops[k - 1].f + (stops[k].f - stops[k - 1].f) * t;
        }
      }
      return 1;
    }

    function posFor(y) {
      if (y <= holds[0]) return 0;
      if (y >= holds[lastIdx]) return lastIdx;
      for (var i = 0; i < lastIdx; i++) {
        if (y <= holds[i + 1]) return i + posInSegment(i, y);
      }
      return lastIdx;
    }

    function segmentPixels(p) {
      var i = clamp(Math.floor(p), 0, Math.max(0, lastIdx - 1));
      return NOTCH_PX * (i === 0 ? NOTCHES_HERO : NOTCHES_DEFAULT);
    }

    /* ————————————————— kostka: bez scrubu, prosto ze scrolla ————————————————— */

    function progressOfTrigger(id, y) {
      var st = ScrollTrigger.getById(id);
      if (!st) return null;
      var span = st.end - st.start;
      if (!(span > 0)) return y >= st.end ? 1 : 0;
      return clamp((y - st.start) / span, 0, 1);
    }

    function cinemaForScroll(y) {
      var p = progressOfTrigger("shatter-beat", y);
      if (p != null) return p;
      /* bez sceny rozpadu: hero = 0, wszystko dalej = pełny strumień piasku */
      return y >= holds[1] - 2 ? 1 : clamp((y - holds[0]) / Math.max(1, holds[1] - holds[0]), 0, 1);
    }

    function tailForScroll(y) {
      var q = progressOfTrigger("cube-motion-tail", y);
      if (q == null) return cinemaForScroll(y) >= 0.999 ? 1 : 0;
      return 1 - Math.pow(1 - q, 1.12);
    }

    function driveSand(y) {
      var sand = (window.cosgralSand = window.cosgralSand || {});
      /* sygnał dla home-section-flow: scrubowane triggery nie nadpisują kostki */
      sand.cinemaDriven = true;

      var cin = cinemaForScroll(y);
      if (window.cosgralSceneFlow?.setCinema) {
        window.cosgralSceneFlow.setCinema(cin);
      } else {
        sand.cinema = cin;
        sand.motion = cin;
      }
      sand.motionTail = tailForScroll(y);
      sand.servicesVisible = cin > 0.9;
    }

    function resetCubeToHero() {
      var sand = (window.cosgralSand = window.cosgralSand || {});
      sand.resetCube = true;
      sand.locked = false;
      sand.cinema = 0;
      sand.motion = 0;
      sand.break = 0;
      sand.stream = 0;
      sand.motionTail = 0;
      document.documentElement.classList.remove("is-sand-stream", "is-shattering");
      var shatter = document.getElementById("rozpad");
      if (shatter) shatter.classList.remove("is-active");
    }

    /* ————————————————— widok sekcji ————————————————— */

    function syncStepView(index) {
      var isFooter = index === lastIdx;
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

    function syncSectionFocus(index) {
      document.querySelectorAll(".home-scene").forEach(function (scene) {
        scene.classList.remove("is-in-view");
      });
      var cfg = HOLDS_CONFIG[index];
      if (!cfg || cfg.footer) return;
      var section = document.getElementById(cfg.id);
      if (!section) return;
      section.classList.add("is-in-view", "is-entered", "is-visible");
      if (window.cosgralSceneEnters?.ensurePanel) {
        window.cosgralSceneEnters.ensurePanel(section);
      }
    }

    function ensureScenePanelVisible(index) {
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

    function announce(index) {
      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: index, id: HOLDS_CONFIG[index]?.id || null },
        })
      );
    }

    /* Sekcja przełącza się dopiero gdy realnie przy niej jesteśmy — inaczej
       wachlarz Usług przechwytywałby kółko w połowie przejścia. */
    function syncActive(force) {
      var k = clamp(Math.round(render), 0, lastIdx);
      if (!force && (k === activeIndex || Math.abs(render - k) > 0.34)) return;
      if (k === activeIndex && !force) return;
      activeIndex = k;
      resetFan();
      syncStepView(k);
      syncSectionFocus(k);
      ensureScenePanelVisible(k);
      announce(k);
      if (k === 0 && window.cosgralRestoreHero) window.cosgralRestoreHero();
      if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
    }

    /* ————————————————— pętla ————————————————— */

    function applyRender() {
      var y = yFor(render);
      if (Math.abs(lenis.scroll - y) > 0.5) {
        driving = true;
        lenis.scrollTo(y, { immediate: true, force: true });
        driving = false;
      }
      lastAppliedY = y;
      driveSand(y);
      syncActive(false);
    }

    function frame(now) {
      driverRaf = 0;
      if (formFocusLock || shouldIgnore()) {
        /* ktoś inny rządzi scrollem (menu, panel usługi, formularz) — nie walczymy */
        lastAppliedY = lenis.scroll;
        driverLastAt = 0;
        return;
      }

      /* Ruch liczony w czasie, nie w klatkach — na tej stronie scena 3D potrafi
         zejść poniżej 60 Hz, a przejście ma trwać tyle samo niezależnie od fps. */
      var frames = driverLastAt ? clamp((now - driverLastAt) / FRAME_MS, 0.5, MAX_FRAME_STEP) : 1;
      driverLastAt = now;

      var delta = pos - render;
      var abs = Math.abs(delta);
      if (abs < SETTLED_EPS) {
        render = pos;
        driverLastAt = 0;
        applyRender();
        return;
      }

      var k = 1 - Math.pow(1 - EASE, frames);
      var step = delta * k;
      var cap = MAX_UNITS_PER_FRAME * frames;
      if (Math.abs(step) > cap) step = step > 0 ? cap : -cap;
      if (Math.abs(step) > abs) step = delta;
      render += step;
      applyRender();
      driverRaf = window.requestAnimationFrame(frame);
    }

    function startDriver() {
      if (driverRaf) return;
      driverLastAt = 0;
      driverRaf = window.requestAnimationFrame(frame);
    }

    /* ————————————————— zatwierdzanie gestu ————————————————— */

    function commitTarget() {
      var d = pos - commitBase;
      var n = 0;
      if (d > 0) {
        var whole = Math.floor(d);
        n = whole + (d - whole >= COMMIT ? 1 : 0);
      } else if (d < 0) {
        var a = -d;
        var wholeUp = Math.floor(a);
        n = -(wholeUp + (a - wholeUp >= COMMIT ? 1 : 0));
      }
      return clamp(commitBase + n, 0, lastIdx);
    }

    function settle() {
      settleTimer = null;
      var target = commitTarget();
      commitBase = target;
      pos = target;
      startDriver();
    }

    function scheduleSettle() {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, SETTLE_MS);
    }

    function cancelSettle() {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = null;
      }
    }

    /* Po menu / panelu usługi / natywnym skoku strona mogła stanąć gdzie indziej,
       niż pamięta rail. Zanim doliczymy gest, bierzemy realną pozycję za swoją —
       inaczej pierwszy ruch kółka szarpnąłby stroną z powrotem. */
    function resyncIfDrifted() {
      if (driverRaf || settleTimer || touchActive || refreshing) return;
      if (lastAppliedY < 0) return;
      if (Math.abs(lenis.scroll - yFor(render)) < EXTERNAL_SCROLL_EPS) return;
      render = posFor(lenis.scroll);
      pos = render;
      commitBase = clamp(Math.round(render), 0, lastIdx);
      lastAppliedY = lenis.scroll;
    }

    /* Każdy piksel gestu przesuwa rail — to jest sedno „analogowego” scrolla. */
    function applyScrollPixels(px) {
      if (!px || formFocusLock) return;
      resyncIfDrifted();
      var next = pos + px / segmentPixels(pos);
      next = clamp(next, render - LEAD_MAX, render + LEAD_MAX);
      pos = clamp(next, 0, lastIdx);
      scheduleSettle();
      startDriver();
    }

    function commitTo(index, immediate) {
      holds = buildHolds();
      lastIdx = holds.length - 1;
      index = clamp(index, 0, lastIdx);
      cancelSettle();
      resyncIfDrifted();
      var wasIndex = activeIndex;
      commitBase = index;
      pos = index;
      resetFan();

      if (immediate) {
        render = index;
        applyRender();
        /* po applyRender: ScrollTrigger zdążył już przeliczyć sceny, więc reset
           kostki nie zostaje nadpisany przez onLeaveBack sceny rozpadu */
        if (index === 0 && wasIndex !== 0) resetCubeToHero();
        syncActive(true);
        return;
      }
      startDriver();
    }

    /* ————————————————— wejścia ————————————————— */

    function resetFan() {
      fanAccum = 0;
      fanLap = 0;
    }

    function scheduleFanDecay() {
      if (fanDecayTimer) window.clearTimeout(fanDecayTimer);
      fanDecayTimer = window.setTimeout(function () {
        fanDecayTimer = null;
        resetFan();
      }, FAN_DECAY_MS);
    }

    function fanBudget() {
      var n = window.cosgralServicesFan?.count?.();
      if (!(n > 1)) n = 6;
      return Math.min(n - 1, FAN_MAX_CARDS_PER_GESTURE);
    }

    /**
     * Usługi: pierwsze kliknięcia gestu przerzucają kafelki (jak swipe na mobile),
     * reszta należy do railu. Każde kliknięcie coś robi — albo przewija kafelek,
     * albo rusza sekcję — i nie da się utknąć kręcąc karuzelę w kółko. Przerwa
     * w geście (FAN_DECAY_MS) zeruje licznik, więc spokojne przeglądanie kafelków
     * działa jak wcześniej.
     */
    function handleUslugiWheel(px) {
      if (fanAccum !== 0 && (px > 0) !== (fanAccum > 0)) resetFan();
      scheduleFanDecay();

      if (fanLap < fanBudget() && window.cosgralServicesFan?.stepCards) {
        fanAccum += px;
        /* gładzik sypie drobnymi zdarzeniami — zbieramy je na pełny kafelek */
        if (Math.abs(fanAccum) < FAN_CARD_MIN) return;
        var dir = fanAccum > 0 ? 1 : -1;
        fanAccum = 0;
        if (window.cosgralServicesFan.stepCards(dir)) {
          fanLap++;
          return;
        }
      }

      fanAccum = 0;
      applyScrollPixels(px);
    }

    function onWheel(e) {
      if (REDUCED || shouldIgnore()) return;
      if (isFanHorizontalWheel(e)) return;

      e.preventDefault();
      e.stopPropagation();

      if (formFocusLock) return;

      var px = wheelPixels(e);
      if (!px) return;

      if (activeIndex === uslugiIdx && pointInUslugiSection(e.clientX, e.clientY)) {
        handleUslugiWheel(px);
        return;
      }

      resetFan();
      applyScrollPixels(px);
    }

    function onKey(e) {
      if (REDUCED || shouldIgnore() || formFocusLock) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      var handled = true;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          commitTo(activeIndex + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          commitTo(activeIndex - 1);
          break;
        case " ":
        case "Spacebar":
          /* spacja na przycisku/linku należy do niego, nie do railu */
          if (e.target?.closest?.('button, a, summary, [role="button"]')) return;
          commitTo(activeIndex + (e.shiftKey ? -1 : 1));
          break;
        case "Home":
          commitTo(0);
          break;
        case "End":
          commitTo(lastIdx);
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    }

    var uslugiIdx = SECTION_IDS.indexOf("uslugi");

    var touchStartX = 0;
    var touchStartY = 0;
    var touchLastY = 0;
    var touchActive = false;
    var touchIgnoreStep = false; // poziomy swipe w Usługach — tylko kafelki
    var touchFromUslugi = false;

    function touchSectionPx() {
      var base = (window.innerHeight || 800) * TOUCH_SECTION_RATIO;
      return touchFromUslugi ? base * TOUCH_USLUGI_MUL : base;
    }

    window.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches[0] || REDUCED || shouldIgnore()) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchLastY = touchStartY;
        touchIgnoreStep = false;
        touchFromUslugi =
          activeIndex === uslugiIdx || pointInUslugiSection(touchStartX, touchStartY);
        touchActive = true;
        cancelSettle();
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

        // Usługi: tylko wyraźny gest w poziomie = kafelki (nie sekcja).
        if (
          touchFromUslugi &&
          !touchIgnoreStep &&
          Math.abs(dx) > 18 &&
          Math.abs(dx) > Math.abs(dy) * 1.45
        ) {
          touchIgnoreStep = true;
          return;
        }

        if (touchIgnoreStep) return;

        e.preventDefault();
        var moved = touchLastY - y;
        touchLastY = y;
        if (!moved) return;
        /* palec ciągnie rail 1:1 — bez progu, bez czekania na koniec gestu */
        var next = pos + (moved / touchSectionPx());
        next = clamp(next, render - LEAD_MAX, render + LEAD_MAX);
        pos = clamp(next, 0, lastIdx);
        cancelSettle();
        startDriver();
      },
      { passive: false, capture: true }
    );

    function endTouch() {
      if (!touchActive) return;
      touchActive = false;
      touchIgnoreStep = false;
      touchFromUslugi = false;
      if (REDUCED || shouldIgnore() || formFocusLock) return;
      scheduleSettle();
    }

    window.addEventListener("touchend", endTouch, { passive: true, capture: true });
    window.addEventListener("touchcancel", endTouch, { passive: true, capture: true });

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKey, { capture: true });

    /* Scroll spoza railu (przywrócenie pozycji, focus, natywny skok) — przejmujemy
       go zamiast z nim walczyć. Bez tego wracał stary błąd „strona sama skacze”. */
    lenis.on("scroll", function () {
      if (driving || refreshing || driverRaf || settleTimer || touchActive) return;
      if (formFocusLock || shouldIgnore()) {
        lastAppliedY = lenis.scroll;
        return;
      }
      if (lastAppliedY < 0 || Math.abs(lenis.scroll - lastAppliedY) < EXTERNAL_SCROLL_EPS) return;
      render = posFor(lenis.scroll);
      pos = render;
      commitBase = clamp(Math.round(render), 0, lastIdx);
      lastAppliedY = lenis.scroll;
      scheduleSettle();
      startDriver();
    });

    /* ————————————————— nawigacja skokowa ————————————————— */

    function jumpTo(index) {
      holds = buildHolds();
      lastIdx = holds.length - 1;
      index = clamp(index, 0, lastIdx);
      if (!window.gsap) {
        commitTo(index, true);
        return;
      }

      var fromPanel = scenePanel(activeIndex);
      var toPanel = scenePanel(index);
      var curtain = document.querySelector("[data-scene-curtain]");

      cancelSettle();
      var tl = gsap.timeline();

      if (fromPanel && toPanel && fromPanel !== toPanel) {
        tl.to(fromPanel, { autoAlpha: 0, filter: MOBILE ? "none" : "blur(10px)", duration: 0.34, ease: "power2.in" }, 0);
      }
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0.88, duration: 0.3, ease: "power2.in" }, 0);
      }

      tl.add(function () {
        commitTo(index, true);
        if (window.ScrollTrigger) ScrollTrigger.update();
        if (toPanel) {
          var scene = toPanel.closest(".home-scene");
          if (scene) scene.classList.add("is-entered", "is-visible");
          gsap.set(toPanel, { autoAlpha: 1, scale: 1, filter: MOBILE ? "none" : "blur(0px)", y: 0 });
          if (scene && window.cosgralSceneEnters?.play) {
            window.cosgralSceneEnters.play(scene, { stagger: true, force: true });
          }
        }
      }, 0.32);

      if (curtain) {
        tl.to(curtain, { autoAlpha: 0, duration: 0.4, ease: "power2.out" }, 0.36);
      }
    }

    function setFormFocusLock(on) {
      formFocusLock = !!on;
      document.documentElement.classList.toggle("is-form-focus", formFocusLock);
      if (formFocusLock) {
        cancelSettle();
        return;
      }
      /* Podczas pisania pole samo dosuwa widok (home-director) — po wyjściu
         z formularza bierzemy tę pozycję za swoją i dociągamy do sekcji. */
      render = posFor(lenis.scroll);
      pos = render;
      commitBase = clamp(Math.round(render), 0, lastIdx);
      lastAppliedY = lenis.scroll;
      scheduleSettle();
      startDriver();
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
          commitTo(cfgIdx);
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
        return clamp(Math.round(posFor(lenis.scroll)), 0, lastIdx);
      }

      return 0;
    }

    var bootIndex = bootSectionIndex();
    activeIndex = bootIndex;
    commitTo(bootIndex, true);

    window.cosgralSectionSnap = {
      holds: holds,
      refreshHolds: buildHolds,
      goTo: function (index, duration, immediate) {
        commitTo(index, !!immediate);
      },
      stepUp: function () {
        commitTo(activeIndex - 1);
      },
      stepDown: function () {
        commitTo(activeIndex + 1);
      },
      setFormFocusLock: setFormFocusLock,
      jumpTo: jumpTo,
      goToY: function (y) {
        commitTo(Math.round(posFor(y)));
      },
      goToFooter: function () {
        commitTo(lastIdx);
      },
      getIndex: function () {
        return activeIndex;
      },
      getPosition: function () {
        return render;
      },
      getTarget: function () {
        return pos;
      },
    };

    /* W trakcie odświeżania ScrollTrigger sam przestawia scroll (przelicza piny).
       Gdybyśmy to przejęli jako „scroll spoza railu", resize wyrzucałby stronę na
       hero. Pozycję logiczną trzymamy, po przeliczeniu wracamy na nią w pikselach. */
    ScrollTrigger.addEventListener("refreshInit", function () {
      refreshing = true;
    });

    ScrollTrigger.addEventListener("refresh", function () {
      holds = buildHolds();
      lastIdx = holds.length - 1;
      window.cosgralSectionSnap.holds = holds;
      pos = clamp(pos, 0, lastIdx);
      render = clamp(render, 0, lastIdx);
      commitBase = clamp(commitBase, 0, lastIdx);
      /* pozycja logiczna zostaje ta sama — przeliczamy tylko piksele */
      applyRender();
      refreshing = false;
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
