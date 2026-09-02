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
    // Po dojechaniu do sekcji strona czekala jeszcze pelna sekunde, zanim
    // przyjela kolejny gest — to widoczna czesc wrazenia "nie reaguje".
    // 250 ms wystarcza, zeby wejscia elementow ruszyly, a scroll juz odpowiada.
    var SECTION_READY_MS = 250;
    var SECTION_REACH_PX = 16;
    var lastCommitDir = 0;
    var cooldownUntil = 0;
    var fanVerticalAccum = 0;
    var FAN_WHEEL_CARD_MIN = 32;
    var FAN_WHEEL_SECTION_MIN = 140;
    var scrollUnlockTimer = null;
    var scrollUnlockRaf = 0;
    var formFocusLock = false;

    /* PRZERYWANIE PRZEJSCIA I KOLEJKA GESTU
       Do tej pory kazdy gest, ktory trafil w trwajace przejscie, byl po cichu
       wyrzucany (canStep() -> false, wheelAccum = 0). Zmierzone czasy blokady:
       hero -> Uslugi 10,4 s, Uslugi -> hero 10,9 s, Realizacje -> Proces 2,9 s,
       Uslugi -> Realizacje 0,5 s. Stad wrazenie, ze strona raz reaguje, raz nie,
       i ze czasem nie da sie wrocic do poprzedniej sekcji — przez ponad 10 sekund
       faktycznie sie nie dalo.

       Teraz gest w trakcie przejscia domyka je natychmiast (scena laduje w stanie
       koncowym, wiec nic nie zostaje w polowie) i zostaje zapamietany jako
       zamiar — wykonuje sie zaraz po odblokowaniu. Zaden gest nie przepada. */
    var celKroku = null;
    var zamiar = 0;

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

    /* Przejscie hero <-> Uslugi trwalo STEP_MS * 2, czyli 10,56 s. Przez ten czas
       scroll byl martwy (zmierzone: 10,4 s w dol, 10,9 s w gore) — to glowne
       zrodlo wrazenia, ze strona nie reaguje i ze nie da sie wrocic. Poza tym
       nikt nie oglada rozpadu kostki do konca: kazdy scrolluje ponownie, wiec
       animacja i tak byla urywana i kostka "nagle znikala".
       STEP_MS / 1.6 to ok. 3,3 s — rozpad dostaje 1,4 s (0,42 * czas), czyli
       nadal peIna, czytelna sekwencja, ale bez trzymania uzytkownika. */
    function stepDurationDown(fromIndex, toIndex) {
      if (isHeroHandoff(fromIndex, toIndex)) return STEP_MS / 1.6;
      if (fromIndex === 1 && toIndex > fromIndex) return STEP_MS / 4.2;
      if (fromIndex >= 1 && toIndex > fromIndex) return STEP_MS / 3;
      return STEP_MS;
    }

    function stepDurationUp(fromIndex, toIndex) {
      if (isHeroHandoff(fromIndex, toIndex)) return STEP_MS / 1.6;
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
      celKroku = null;
      beginCooldown();
      if (Math.abs(lenis.scroll - target) > 2) {
        lenis.scrollTo(target, { immediate: true });
      }
      ensureScenePanelVisible(activeIndex);
      if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
      wykonajZamiar();
    }

    /* Domyka trwajace przejscie tu i teraz: dociaga pozycje do celu, ustawia
       scene w stanie koncowym (syncSandForJump robi to samo, co zrobiloby
       dojechanie do konca) i zdejmuje blokade. */
    function domknijPrzejscie() {
      if (!locked || celKroku == null) return false;
      var cel = celKroku;
      lenis.scrollTo(cel, { immediate: true });
      if (window.ScrollTrigger) ScrollTrigger.update();
      syncSandForJump(activeIndex, true);
      finishScrollStep(cel);
      return true;
    }

    /* Gest, ktory przyszedl w trakcie przejscia, czeka tu na swoja kolej.
       Tuz po domknieciu kroku trwa jeszcze 100 ms cooldownu — bez ponowienia
       zamiar wpadalby dokladnie w to okno i przepadal (zmierzone: dwa gesty
       dawaly jedna sekcje zamiast dwoch). Ponawiamy do skutku, ale nie dluzej
       niz ZAMIAR_OKNO_MS, zeby zamiar nie wisial w nieskonczonosc. */
    var ZAMIAR_OKNO_MS = 2000;
    var zamiarDo = 0;
    var zamiarTimer = null;

    function wykonajZamiar() {
      if (!zamiar) return;
      if (Date.now() > zamiarDo) {
        zamiar = 0;
        return;
      }
      if (!canStep()) {
        if (zamiarTimer) window.clearTimeout(zamiarTimer);
        zamiarTimer = window.setTimeout(
          wykonajZamiar,
          Math.max(20, Math.min(200, cooldownUntil - Date.now() + 10))
        );
        return;
      }
      var kierunek = zamiar;
      zamiar = 0;
      if (kierunek > 0) stepDown();
      else stepUp();
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

    /* Ustawia scene w stanie koncowym danej sekcji — skokowo.
       Wywolanie z onComplete Lenisa przychodzilo ZA WCZESNIE (proxy
       ScrollTriggera przerywa animacje kroku i odpala onComplete od razu),
       przez co rozpad kostki, ktory ma trwac 1,4 s, byl deptany w mniej niz
       0,4 s i kostka po prostu znikala. Dopoki animacja rozpadu zyje, nie
       ruszamy piasku; kto naprawde chce stan koncowy natychmiast (przerwanie
       przejscia gestem), wola z wymus = true. */
    function syncSandForJump(index, wymus) {
      if (!wymus && index >= 1 && rozpadTrwa()) return;
      if (wymus) przerwijRozpad();
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
      if (window.cosgralSceneEnters?.ensurePanel) {
        window.cosgralSceneEnters.ensurePanel(section);
      }
    }

    /* Animacja rozpadu kostki. Trzymamy do niej uchwyt, bo inaczej zostaje
       natychmiast zadeptana — patrz komentarz przy syncSandForJump. */
    var animacjaRozpadu = null;

    function playHeroToServicesHandoff(duration) {
      var shatter = document.getElementById("rozpad");
      if (shatter) shatter.classList.add("is-active");
      document.documentElement.classList.add("is-shattering");
      if (window.cosgralSceneFlow?.animateCinemaTo) {
        animacjaRozpadu = window.cosgralSceneFlow.animateCinemaTo(1, duration || 2.4);
        if (animacjaRozpadu && animacjaRozpadu.eventCallback) {
          animacjaRozpadu.eventCallback("onComplete", function () {
            animacjaRozpadu = null;
          });
        }
      } else {
        syncSandForJump(1);
      }
    }

    function rozpadTrwa() {
      return !!(animacjaRozpadu && animacjaRozpadu.isActive && animacjaRozpadu.isActive());
    }

    function przerwijRozpad() {
      if (animacjaRozpadu && animacjaRozpadu.kill) animacjaRozpadu.kill();
      animacjaRozpadu = null;
    }

    function jumpTo(index) {
      holds = buildHolds();
      index = clamp(index, 0, holds.length - 1);
      var target = holds[index];
      var fromIndex = activeIndex;

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
          if (scene && window.cosgralSceneEnters?.play) {
            window.cosgralSceneEnters.play(scene, { stagger: true, force: true });
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

      locked = true;
      celKroku = target;
      activeIndex = index;
      syncStepView(index);
      syncSectionFocus(index);
      clearScrollUnlockWatch();

      var scrollDuration = immediate ? 0 : duration != null ? duration : stepDurationDown(fromIndex, index);

      if (index === 0 && fromIndex !== 0) {
        syncSandForJump(0);
      } else if (fromIndex === 0 && index >= 1) {
        playHeroToServicesHandoff(scrollDuration > 0.05 ? scrollDuration * 0.42 : 2.2);
      } else if (index >= 1 && fromIndex >= 1) {
        syncSandForJump(index);
      }

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

    /* Wspolne dla wszystkich wejsc (kolko, dotyk, klawiatura): gest w trakcie
       przejscia domyka je i zostaje zapamietany, zamiast wpasc do kosza. */
    function przyjmijGest(kierunek) {
      if (canStep()) return true;
      if (formFocusLock) return false;
      zamiar = kierunek;
      zamiarDo = Date.now() + ZAMIAR_OKNO_MS;
      domknijPrzejscie();
      return false;
    }

    function stepUp() {
      if (!przyjmijGest(-1)) return;
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
      if (!przyjmijGest(1)) return;
      if (activeIndex >= holds.length - 1) {
        goTo(activeIndex, SNAP_MS);
        return;
      }
      goTo(activeIndex + 1);
      lastCommitDir = 1;
    }

    /* Straznik pozycji. Jego zadaniem jest KOREKTA DRYFU w obrebie biezacej
       sekcji, a nie przypisywanie sekcji na nowo.

       Wczesniej bral nearestIndex(lenis.scroll) bez zastrzezen i potrafil
       przeciagnac uzytkownika do innej sekcji niz ta, do ktorej wlasnie szedl:
       buildHolds() czyta pozycje ze ScrollTriggera, a te tuz po skroceniu
       przejscia bywaja jeszcze nieodswiezone. Zmierzony slad: uzytkownik daje
       gest w dol (goTo 0->1), a 1,9 s pozniej enforceHold robi goTo 1->0
       i wyrzuca go z powrotem na hero. Stad wrazenie, ze strona zyje wlasnym
       zyciem i ze "czasem nie da sie przejsc dalej".

       Teraz zmiana sekcji przez straznika jest dopuszczalna tylko wtedy, gdy
       pozycja naprawde odjechala od biezacej sekcji o ponad pol ekranu — czyli
       gdy scroll przyszedl z zewnatrz (kotwica, pasek przewijania, znajdz na
       stronie). W kazdym innym przypadku straznik dociaga do sekcji, w ktorej
       uzytkownik faktycznie jest. */
    var ostatniScrollStraznika = null;

    function enforceHold() {
      if (locked || formFocusLock || Date.now() < cooldownUntil) return;

      /* Straznik ma prawo ruszyc pozycje tylko wtedy, gdy ta stoi. Flaga `locked`
         tego nie gwarantuje: proxy ScrollTriggera ustawia pozycje przez
         lenis.scrollTo(..., immediate), co przerywa animacje kroku i odpala jej
         onComplete za wczesnie — blokada schodzi w polowie przejazdu. Straznik
         budzil sie wtedy w srodku 10-sekundowego przejscia hero -> Uslugi, liczyl
         najblizsza sekcje od pozycji POSREDNIEJ i ciagnal uzytkownika z powrotem.
         Jesli pozycja wciaz sie zmienia, odkladamy decyzje do momentu, az stanie. */
      var teraz = lenis.scroll;
      if (ostatniScrollStraznika !== null && Math.abs(teraz - ostatniScrollStraznika) > 2) {
        ostatniScrollStraznika = teraz;
        scheduleGuard();
        return;
      }
      ostatniScrollStraznika = teraz;

      holds = buildHolds();

      var idx = nearestIndex(lenis.scroll);
      var celBiezacej = holds[activeIndex];
      if (
        idx !== activeIndex &&
        celBiezacej != null &&
        Math.abs(lenis.scroll - celBiezacej) < window.innerHeight * 0.5
      ) {
        idx = activeIndex;
      }

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

      // Desktop: w sekcji Usługi kółko pionowe przewija kafelki (jak tap/swipe na
      // mobile), a na ostatnim kafelku w danym kierunku wyprowadza z sekcji.
      //
      // Wczesniej o tym, czy gest zostaje w karuzeli, decydowalo to, czy
      // stepFromWheel akurat zdazylo przeskoczyc karte — a to zalezy od jego
      // wewnetrznego cooldownu (620 ms). Efekt byl zalezny od rytmu scrollowania
      // i obciazenia maszyny: przy szybkich machnieciach pierwszy gest wynosil
      // ze sekcji, zanim uzytkownik zobaczyl kafelki (zmierzone: wyjscie po
      // 1 gescie, karuzela na kafelku 1 z 6); przy wolniejszych, na dlawionym
      // watku, sekcji nie dalo sie opuscic wcale (8 gestow, karty w kolko).
      // Teraz decyduje stan karuzeli, nie zegar: dopoki sa kafelki w te strone,
      // gest nalezy do karuzeli; na ostatnim — wyprowadza z sekcji.
      if (activeIndex === uslugiIdx && pointInUslugiSection(e.clientX, e.clientY)) {
        e.preventDefault();
        e.stopPropagation();
        fanVerticalAccum += e.deltaY;

        var fan = window.cosgralServicesFan;
        var fanDir = fanVerticalAccum > 0 ? 1 : -1;
        // Brak atEdge (starsza wersja skryptu) traktujemy jak kraniec — lepiej
        // przepuscic gest dalej, niz uwiezic uzytkownika w sekcji.
        var fanAtEdge = fan?.atEdge ? fan.atEdge(fanDir) : true;

        if (!fanAtEdge) {
          if (Math.abs(fanVerticalAccum) >= FAN_WHEEL_CARD_MIN && fan?.stepFromWheel) {
            if (fan.stepFromWheel(fanVerticalAccum)) fanVerticalAccum = 0;
          }
          return;
        }

        if (Math.abs(fanVerticalAccum) >= FAN_WHEEL_SECTION_MIN) {
          wheelAccum = fanVerticalAccum;
          fanVerticalAccum = 0;
          commitWheel();
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

        // Usługi: tylko wyraźny gest w poziomie = kafelki (nie sekcja).
        // Pion zawsze jak wcześniej: preventDefault + snap do holdów.
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
    syncSectionFocus(bootIndex);
    syncSandForJump(bootIndex);
    goTo(bootIndex, 0, true);
    beginCooldown();

    /* KLAWIATURA. Kolko jest przechwycone przez stepper, a zadnej obslugi
       klawiszy nie bylo — natywne przewijanie od razu wracalo na miejsce przez
       straznika. Zmierzone: PageDown przesuwal strone o 1 px, strzalka w dol
       nie robila nic. Dla korzystajacych z klawiatury strona byla wiec
       nieprzewijalna (WCAG 2.1.1). Strzalki lewo/prawo zostawiamy karuzeli
       Uslug, ktora juz ich uzywa. */
    document.addEventListener("keydown", function (e) {
      if (REDUCED || shouldIgnore()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;

      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          stepDown();
          break;
        case "ArrowUp":
        case "PageUp":
          stepUp();
          break;
        case " ":
        case "Spacebar":
          if (e.shiftKey) stepUp();
          else stepDown();
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(holds.length - 1);
          break;
        default:
          return;
      }
      e.preventDefault();
    });

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
