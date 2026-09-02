/**
 * Slideshow scroll — jeden gest = jedna sekcja.
 *
 * CALY STAN TO CZTERY RZECZY:
 *   sekcja  — numer sekcji, na ktorej stoimy;
 *   gestOd  — znacznik czasu, od ktorego przyjmujemy kolejny gest;
 *   ruchDo  — znacznik czasu, do ktorego trwa ruch (straznik ma nie ruszac);
 *   holds   — pozycje sekcji w pikselach (cache).
 *
 * REGULY:
 *   1. Jeden gest = jeden krok, zawsze o jedna sekcje. Nigdy o dwie.
 *   2. Gest z pierwszych 70% kroku jest odrzucany (nie kolejkowany i nie
 *      przerywajacy przejscia skokiem — stad braly sie "latajace" sekcje).
 *      W ostatnich 30% kolejny gest jest juz przyjmowany i plynnie przestawia
 *      cel, wiec szybkie scrollowanie nie odbija sie od sciany.
 *   3. Przejscie ma z gory znana dlugosc i JEDNA sciezke zakonczenia (timer).
 *      onComplete Lenisa jest niewiarygodny — proxy ScrollTriggera przerywa
 *      animacje i odpala je za wczesnie — wiec nie sluzy tu do niczego.
 *   4. Straznik tylko koryguje dryf. Sekcje zmienia wylacznie gest albo jawne
 *      goTo (kotwica, nawigacja, kropki paska).
 *   5. Rozpad kostki nie blokuje scrolla: warstwa piasku jest position:fixed
 *      i widac ja w kazdej sekcji, wiec animacja moze spokojnie trwac dalej,
 *      kiedy uzytkownik jest juz w Uslugach.
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

  /* ——— czasy (sekundy / milisekundy) ———
     Kazdy krok trwa tyle samo. Rowne czasy to warunek tego, zeby scroll byl
     przewidywalny: uzytkownik po jednym przejsciu wie, ile trwa kazde nastepne.
     Wyjatek to przejscie hero <-> Uslugi, ktore pokonuje ~4 ekrany (pinowana
     sekcja rozpadu), wiec dostaje troche wiecej czasu — ale nadal liczonego
     w sekundach, nie w dziesiatkach sekund jak wczesniej. */
  var STEP_S = 1.0;
  var HERO_STEP_S = 1.6;
  var SNAP_S = 0.5;
  /* Rozpad kostki jest niezalezny od dlugosci kroku — patrz regula 5. */
  var SHATTER_S = 3.2;
  var RETURN_S = 1.2;
  /* Przerwa po zakonczeniu kroku, zanim przyjmiemy kolejny gest. */
  var GEST_GAP_MS = 160;
  /* Ulamek kroku, po ktorym wolno juz przyjac nastepny gest. Ponizej tego
     progu gest przepada — inaczej jedno machniecie potrafiloby przeskoczyc
     dwie sekcje. Powyzej: cel przestawia sie plynnie, bez skoku. */
  var GEST_TAIL = 0.7;
  /* Cisza, po ktorej uznajemy machniecie kolkiem za zakonczone. Dobrana
     pomiedzy odstep zdarzen gladzika (~16 ms, tez w bezwladnym ogonie) a odstep
     zabkow myszy (~130 ms): jedno machniecie gladzikiem = jeden krok, a kazdy
     zabek myszy liczy sie osobno (i tak ogranicza go gestOd). */
  var WHEEL_QUIET_MS = 90;
  /* Prog jednego gestu. Celowo wysoki: zabek myszy to ~100 px, machniecie
     gladzikiem 300-700 px, a bezwladny ogon machniecia dostarcza juz tylko
     1-3 px na zdarzenie. Nizszy prog (mielismy 6, potem 24) powodowal, ze
     sam ogon jednego machniecia zbieral sie na drugi krok — i uzytkownik
     przeskakiwal dwie sekcje naraz, widzac te posrednia tylko przez chwile. */
  var WHEEL_MIN = 80;
  var FAN_WHEEL_CARD_MIN = 32;
  var FAN_WHEEL_SECTION_MIN = 140;
  var TOUCH_MIN = 24;
  var TOUCH_MIN_USLUGI = 96;

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : document.documentElement.scrollHeight;
    if (!footer) return max;
    /* Sekcja stopki jest na caly ekran — przypinamy jej gore do gory okna. */
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
      if (st) holds.push(st.start + (st.end - st.start) * cfg.hold);
    });
    return holds;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
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
    // Najpierw test osi (czysta arytmetyka), dopiero potem trafienie w sekcje.
    // pointInUslugiSection() wola getBoundingClientRect, czyli wymusza layout —
    // przy scrollu gladzikiem to setki wymuszonych reflow na sekunde, na
    // sciezce krytycznej wejscia. Zwykly scroll w pionie odpada juz tutaj.
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

    /* holds przeliczamy TYLKO przy refreshu ScrollTriggera (ten sam refresh
       obsluguje resize). Wczesniej buildHolds() wolal footer.offsetTop przy
       kazdym tiku straznika, czyli wymuszal reflow kilkadziesiat razy na
       sekunde w trakcie scrollowania — to byla czesc "lagowania". */
    var holds = buildHolds();
    if (holds.length < 2) return;

    var sekcja = 0;
    var gestOd = 0;
    var ruchDo = 0;
    var krokTimer = null;
    var formFocusLock = false;
    var uslugiIdx = SECTION_IDS.indexOf("uslugi");

    function trwaRuch() {
      return Date.now() < ruchDo;
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

    // ——————————————————————————————————————————————— scena

    function scenePanel(index) {
      var cfg = HOLDS_CONFIG[index];
      if (!cfg) return null;
      if (cfg.footer) return document.querySelector(".site-footer");
      var section = document.getElementById(cfg.id);
      if (!section) return null;
      return section.querySelector(".home-scene__panel") || section;
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

    // ——————————————————————————————————————————————— kostka

    /* Uchwyt do animacji rozpadu. Rozpad jest prowadzony w CZASIE, nie pozycja
       scrolla: jego dlugosc (SHATTER_S) nie ma nic wspolnego z tym, jak szybko
       przewinela sie strona. Wczesniej bylo odwrotnie — rozpad dostawal
       "czas kroku * 0,42", wiec kazde skrocenie kroku skracalo tez rozpad
       i kostka odlatywala tym szybciej, im plynniej dzialal scroll. */
    var rozpad = null;

    function rozpadTrwa() {
      return !!(rozpad && rozpad.isActive && rozpad.isActive());
    }

    function przerwijRozpad() {
      if (rozpad && rozpad.kill) rozpad.kill();
      rozpad = null;
    }

    function graRozpad(duration) {
      var shatter = document.getElementById("rozpad");
      if (shatter) shatter.classList.add("is-active");
      document.documentElement.classList.add("is-shattering");
      if (!window.cosgralSceneFlow?.animateCinemaTo) {
        syncSandForJump(1);
        return;
      }
      rozpad = window.cosgralSceneFlow.animateCinemaTo(1, duration);
      dopiszDomkniecie(function () {});
    }

    /* animateCinemaTo ma wlasne domkniecie (zatrzasniecie stanu koncowego
       piasku). Nie nadpisujemy go — dowieszamy sie za nim. */
    function dopiszDomkniecie(potem) {
      if (!rozpad || !rozpad.eventCallback) return;
      var wlasne = rozpad.eventCallback("onComplete");
      rozpad.eventCallback("onComplete", function () {
        rozpad = null;
        if (wlasne) wlasne.call(this);
        potem();
      });
    }

    function graPowrot() {
      /* Droga powrotna: kostka sklada sie w czasie, tak samo jak sie rozpada.
         Twardy reset (resetCube) dopiero na koncu — inaczej kostka wracalaby
         skokiem, jeszcze zanim hero pojawi sie na ekranie. */
      przerwijRozpad();
      document.documentElement.classList.remove("is-shattering");
      var shatter = document.getElementById("rozpad");
      if (shatter) shatter.classList.remove("is-active");
      if (!window.cosgralSceneFlow?.animateCinemaTo) {
        syncSandForJump(0);
        return;
      }
      rozpad = window.cosgralSceneFlow.animateCinemaTo(0, RETURN_S);
      dopiszDomkniecie(function () {
        syncSandForJump(0);
      });
    }

    /* Ustawia scene w stanie koncowym danej sekcji — skokowo. */
    function syncSandForJump(index) {
      window.cosgralSand = window.cosgralSand || {};
      if (index === 0) {
        przerwijRozpad();
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
      /* Dopoki rozpad trwa, nie ruszamy piasku — inaczej zadeptalibysmy
         animacje i kostka po prostu znikalaby w polowie. */
      if (rozpadTrwa()) return;
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

    function syncCube(from, to) {
      if (to === 0 && from !== 0) {
        graPowrot();
        if (window.cosgralRestoreHero) window.cosgralRestoreHero();
        return;
      }
      if (to === 0) return;
      if (from === 0) {
        graRozpad(SHATTER_S);
        return;
      }
      /* Uzytkownik poszedl dalej niz Uslugi — rozpadu i tak juz nie oglada,
         a scena 3D chodzi przez ten czas na pelnej czestotliwosci. Domykamy. */
      if (to >= 2) przerwijRozpad();
      syncSandForJump(to);
    }

    // ——————————————————————————————————————————————— krok

    function czasKroku(from, to) {
      return from === 0 || to === 0 ? HERO_STEP_S : STEP_S;
    }

    /**
     * Jedyne miejsce, ktore zmienia sekcje. Zawsze konczy sie dokladnie jedna
     * animacja i dokladnie jednym timerem odblokowania.
     */
    function goTo(index, duration, immediate) {
      index = clamp(index, 0, holds.length - 1);
      var from = sekcja;
      var y = holds[index];
      if (y == null) return;

      var czas = immediate ? 0 : duration != null ? duration : czasKroku(from, index);

      sekcja = index;
      var teraz = Date.now();
      ruchDo = teraz + czas * 1000 + GEST_GAP_MS;
      gestOd = teraz + czas * 1000 * GEST_TAIL + GEST_GAP_MS;

      syncStepView(index);
      syncSectionFocus(index);
      syncCube(from, index);

      lenis.scrollTo(y, {
        immediate: !!immediate,
        duration: czas,
        easing: easeOutCubic,
        lock: true,
      });

      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: index, id: HOLDS_CONFIG[index]?.id || null },
        })
      );

      if (krokTimer) window.clearTimeout(krokTimer);
      krokTimer = window.setTimeout(function () {
        krokTimer = null;
        dojechal(y);
      }, czas * 1000 + 40);
    }

    /** Domkniecie kroku: dociagniecie pozycji i wejscia elementow sekcji. */
    function dojechal(y) {
      if (Math.abs(lenis.scroll - y) > 2) {
        lenis.scrollTo(y, { immediate: true });
      }
      ensureScenePanelVisible(sekcja);
      if (window.cosgralScrollRail?.refresh) window.cosgralScrollRail.refresh();
    }

    /** Wejscie dla wszystkich gestow: kolko, dotyk, klawiatura. */
    function krok(dir) {
      if (formFocusLock || Date.now() < gestOd) return;
      var cel = clamp(sekcja + dir, 0, holds.length - 1);
      if (cel === sekcja) {
        /* Kraniec listy — nie ma dokad isc, ale gest byl, wiec go zuzywamy. */
        gestOd = Date.now() + GEST_GAP_MS;
        return;
      }
      goTo(cel);
    }

    // ——————————————————————————————————————————————— straznik

    /* Straznik pilnuje wylacznie tego, zeby strona nie stala miedzy sekcjami.
       Nie przypisuje sekcji na nowo — to robi gest albo jawne goTo. Wyjatkiem
       jest dryf wiekszy niz pol ekranu, ktory moze pochodzic tylko z zewnatrz
       (pasek przewijania, "znajdz na stronie", kotwica z innej strony). */
    var guardTimer = null;

    function scheduleGuard() {
      if (formFocusLock) return;
      if (guardTimer) window.clearTimeout(guardTimer);
      guardTimer = window.setTimeout(guard, 180);
    }

    function guard() {
      guardTimer = null;
      if (formFocusLock || trwaRuch()) return;
      var y = holds[sekcja];
      if (y == null) return;
      var d = Math.abs(lenis.scroll - y);
      if (d < 2) return;
      if (d > window.innerHeight * 0.5) {
        goTo(nearestIndex(lenis.scroll), SNAP_S);
        return;
      }
      lenis.scrollTo(y, { duration: SNAP_S, easing: easeOutCubic, lock: true });
      ruchDo = Date.now() + SNAP_S * 1000 + GEST_GAP_MS;
      gestOd = Date.now() + SNAP_S * 1000 * GEST_TAIL + GEST_GAP_MS;
    }

    // ——————————————————————————————————————————————— przejscie z zaslona

    /* Uzywane przez nawigacje i pasek kropek: skok o wiele sekcji naraz, wiec
       zamiast przewijac przez wszystko po drodze — sciemnienie, przeskok,
       rozjasnienie. */
    function jumpTo(index) {
      index = clamp(index, 0, holds.length - 1);
      var y = holds[index];
      if (y == null) return;
      if (index === sekcja && Math.abs(lenis.scroll - y) < 4) return;

      if (!window.gsap) {
        goTo(index, 0, true);
        return;
      }

      var from = sekcja;
      var fromPanel = scenePanel(from);
      var toPanel = scenePanel(index);
      var curtain = document.querySelector("[data-scene-curtain]");
      var CZAS = 1.36;

      sekcja = index;
      ruchDo = Date.now() + CZAS * 1000 + GEST_GAP_MS;
      gestOd = ruchDo;
      if (krokTimer) {
        window.clearTimeout(krokTimer);
        krokTimer = null;
      }

      var tl = gsap.timeline({
        onComplete: function () {
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
        lenis.scrollTo(y, { immediate: true });
        if (window.ScrollTrigger) ScrollTrigger.update();
        syncStepView(index);
        syncSectionFocus(index);
        /* Skok z zaslona: kostka nie ma czasu na pelny rozpad, wiec dostaje
           krotsza wersje — uzytkownik i tak patrzy na ciemny ekran. */
        if (index === 0 && from !== 0) {
          syncSandForJump(0);
          if (window.cosgralRestoreHero) window.cosgralRestoreHero();
        } else if (from === 0 && index >= 1) {
          graRozpad(1.4);
        } else if (index >= 1) {
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

    // ——————————————————————————————————————————————— kolko

    /* Jedno machniecie = jeden krok, niezaleznie od tego, ile zdarzen wchodzi
       w sklad machniecia i jak obciazony jest watek glowny. Kolko uzbraja sie
       ponownie dopiero wtedy, gdy od poprzedniego zdarzenia minelo
       WHEEL_QUIET_MS — czyli gdy wygasl tez bezwladny ogon gladzika. Wczesniej o liczbie krokow decydowal wyscig
       progu z cooldownem — stad "raz reaguje, raz nie" i przeskoki o dwie
       sekcje naraz. */
    var wheelAccum = 0;
    var wheelArmed = true;
    var wheelLast = 0;
    var fanAccum = 0;

    /* Uzbrojenie kolka to zwykle porownanie znacznikow czasu — bez zadnego
       timera. Timer ustawiany przy KAZDYM zdarzeniu kolka to kilkaset
       niepotrzebnych zadan na jedno przewiniecie strony, w dodatku dokladnie
       na sciezce obslugi wejscia. */
    function wheelTick(teraz) {
      if (teraz - wheelLast > WHEEL_QUIET_MS) {
        wheelArmed = true;
        wheelAccum = 0;
        fanAccum = 0;
      }
      wheelLast = teraz;
    }

    function onWheel(e) {
      if (REDUCED || shouldIgnore()) return;
      if (isFanHorizontalWheel(e)) return;

      e.preventDefault();
      e.stopPropagation();
      wheelTick(Date.now());

      /* Uslugi: kolko pionowe przewija kafelki karuzeli, a na ostatnim kafelku
         w danym kierunku wyprowadza z sekcji. O tym, czy gest nalezy do
         karuzeli, decyduje jej stan (atEdge), nie zegar. */
      if (sekcja === uslugiIdx && pointInUslugiSection(e.clientX, e.clientY)) {
        /* Karuzela podlega tej samej zasadzie co sekcje: jedno machniecie =
           jeden kafelek. Bez tego ogon machniecia, ktore dopiero WESZLO
           w Uslugi, od razu przewijal kafelki — a wtedy powrot w gore nie
           wychodzil z sekcji, tylko cofal karty, wiec wygladalo to jak
           "nie da sie wrocic". */
        if (!wheelArmed) return;

        var fan = window.cosgralServicesFan;
        fanAccum += e.deltaY;
        var dirFan = fanAccum > 0 ? 1 : -1;
        // Brak atEdge (starsza wersja skryptu) traktujemy jak kraniec — lepiej
        // przepuscic gest dalej, niz uwiezic uzytkownika w sekcji.
        var naKrancu = fan?.atEdge ? fan.atEdge(dirFan) : true;

        if (!naKrancu) {
          if (Math.abs(fanAccum) < FAN_WHEEL_CARD_MIN || !fan?.stepFromWheel) return;
          if (fan.stepFromWheel(fanAccum)) {
            fanAccum = 0;
            wheelArmed = false;
          }
          return;
        }

        if (Math.abs(fanAccum) < FAN_WHEEL_SECTION_MIN) return;
        var dirOut = fanAccum > 0 ? 1 : -1;
        fanAccum = 0;
        wheelArmed = false;
        krok(dirOut);
        return;
      }

      fanAccum = 0;
      if (!wheelArmed) return;

      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_MIN) return;

      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      wheelArmed = false;
      krok(dir);
    }

    // ——————————————————————————————————————————————— dotyk

    var touchStartX = 0;
    var touchStartY = 0;
    var touchLastY = 0;
    var touchAccum = 0;
    var touchActive = false;
    var touchIgnoreStep = false; // poziomy swipe w Uslugach — tylko kafelki
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
        touchFromUslugi = sekcja === uslugiIdx || pointInUslugiSection(touchStartX, touchStartY);
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

        // Uslugi: tylko wyrazny gest w poziomie = kafelki (nie sekcja).
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
        var accum = touchAccum;
        var zUslug = touchFromUslugi;
        var pomin = touchIgnoreStep;
        touchAccum = 0;
        touchIgnoreStep = false;
        touchFromUslugi = false;
        if (REDUCED || shouldIgnore() || pomin) return;
        if (Math.abs(accum) < (zUslug ? TOUCH_MIN_USLUGI : TOUCH_MIN)) return;
        krok(accum > 0 ? 1 : -1);
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

    // ——————————————————————————————————————————————— klawiatura

    /* Kolko jest przechwycone przez stepper, a zadnej obslugi klawiszy nie
       bylo — natywne przewijanie od razu wracalo na miejsce przez straznika.
       Dla korzystajacych z klawiatury strona byla nieprzewijalna (WCAG 2.1.1).
       Strzalki lewo/prawo zostawiamy karuzeli Uslug, ktora juz ich uzywa. */
    document.addEventListener("keydown", function (e) {
      if (REDUCED || shouldIgnore()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;

      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          krok(1);
          break;
        case "ArrowUp":
        case "PageUp":
          krok(-1);
          break;
        case " ":
        case "Spacebar":
          krok(e.shiftKey ? -1 : 1);
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

    // ——————————————————————————————————————————————— podpiecia

    lenis.on("scroll", function () {
      if (!trwaRuch()) scheduleGuard();
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

    ScrollTrigger.addEventListener("refresh", function () {
      holds = buildHolds();
      if (window.cosgralSectionSnap) window.cosgralSectionSnap.holds = holds;
    });

    // ——————————————————————————————————————————————— start

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

      if (isHomeReload()) return nearestIndex(lenis.scroll);
      return 0;
    }

    window.cosgralSectionSnap = {
      holds: holds,
      refreshHolds: buildHolds,
      goTo: goTo,
      stepUp: function () { krok(-1); },
      stepDown: function () { krok(1); },
      setFormFocusLock: setFormFocusLock,
      jumpTo: jumpTo,
      goToY: function (y) { goTo(nearestIndex(y)); },
      goToFooter: function () { goTo(holds.length - 1); },
      getIndex: function () { return sekcja; },
    };

    var bootIndex = bootSectionIndex();
    sekcja = bootIndex;
    syncStepView(bootIndex);
    syncSectionFocus(bootIndex);
    syncSandForJump(bootIndex);
    goTo(bootIndex, 0, true);
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
