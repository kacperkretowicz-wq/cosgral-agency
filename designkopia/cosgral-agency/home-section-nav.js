/**
 * Nawigacja po sekcjach — BEZ dopasowywania scrolla.
 *
 * Scroll jest zwykły: kółko, gładzik i palec należą do przeglądarki (Lenis
 * dokłada tylko inercję). Ten moduł wie jedynie, GDZIE leżą sekcje, i udostępnia
 * to reszcie strony:
 *   • skoki z menu, railu, panelu usług i linków #kotwic,
 *   • bieżący indeks sekcji (rail, wachlarz Usług czytają go przez getIndex),
 *   • zdarzenie `cosgral:section-step` przy zmianie sekcji.
 *
 * API `window.cosgralSectionSnap` zostaje takie samo jak wcześniej, żeby nie
 * ruszać wołających (home-nav-menu, home-scroll-rail, service-panel,
 * page-transitions) — zmienia się tylko to, co robi w środku.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var SCENES = [
    { stId: "hero-pin", hold: 0.52, id: "top" },
    { stId: "scene-uslugi", hold: 0.48, id: "uslugi" },
    { stId: "scene-realizacje", hold: 0.48, id: "realizacje" },
    { stId: "scene-proces", hold: 0.48, id: "proces" },
    { stId: "scene-faq", hold: 0.48, id: "faq" },
    { stId: "scene-kontakt", hold: 0.48, id: "kontakt" },
    { id: "footer", footer: true },
  ];
  var SECTION_IDS = SCENES.filter(function (c) { return !c.footer; }).map(function (c) { return c.id; });

  var SCROLL_DURATION = MOBILE ? 1.05 : 1.25;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : document.documentElement.scrollHeight;
    if (!footer) return max;
    /* Full-viewport footer section — pin its top to the viewport top */
    return Math.min(max, Math.max(0, footer.offsetTop));
  }

  function holdY(st, hold) {
    return st.start + (st.end - st.start) * hold;
  }

  function buildHolds() {
    var holds = [];
    SCENES.forEach(function (cfg) {
      if (cfg.footer) {
        holds.push(footerHoldY());
        return;
      }
      var st = ScrollTrigger.getById(cfg.stId);
      if (st) holds.push(holdY(st, cfg.hold));
    });
    return holds;
  }

  function init() {
    var lenis = window.cosgralSmoothScroll?.lenis;
    if (!window.ScrollTrigger) return;

    var holds = buildHolds();
    if (holds.length < 2) return;

    var lastIdx = holds.length - 1;
    var activeIndex = -1;
    var syncRaf = 0;

    function scrollY() {
      return lenis ? lenis.scroll : window.scrollY || document.documentElement.scrollTop || 0;
    }

    function nearestIndex(y) {
      var best = 0;
      var dist = Infinity;
      for (var i = 0; i < holds.length; i++) {
        var d = Math.abs(y - holds[i]);
        if (d < dist) {
          dist = d;
          best = i;
        }
      }
      return best;
    }

    /* Sekcja „bieżąca" to ta, której scena jest przypięta na ekranie; poza pinami
       (np. w stopce) spadamy na najbliższy punkt sekcji. */
    function currentIndex() {
      for (var i = 0; i < SCENES.length; i++) {
        var cfg = SCENES[i];
        if (cfg.footer) continue;
        var st = ScrollTrigger.getById(cfg.stId);
        if (st && st.isActive) return i;
      }
      return nearestIndex(scrollY());
    }

    function scrollTo(y, opts) {
      opts = opts || {};
      if (lenis) {
        lenis.scrollTo(y, {
          immediate: !!opts.immediate,
          duration: opts.immediate ? 0 : opts.duration != null ? opts.duration : SCROLL_DURATION,
          force: true,
        });
        return;
      }
      window.scrollTo({ top: y, behavior: opts.immediate || REDUCED ? "auto" : "smooth" });
    }

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

    function syncSectionFocus(index) {
      document.querySelectorAll(".home-scene").forEach(function (scene) {
        scene.classList.remove("is-in-view");
      });
      var cfg = SCENES[index];
      if (!cfg || cfg.footer) return;
      var section = document.getElementById(cfg.id);
      if (section) section.classList.add("is-in-view");
    }

    function announce(index) {
      window.dispatchEvent(
        new CustomEvent("cosgral:section-step", {
          detail: { index: index, id: SCENES[index]?.id || null },
        })
      );
    }

    function setActive(index, force) {
      if (index === activeIndex && !force) return;
      activeIndex = index;
      syncStepView(index);
      syncSectionFocus(index);
      announce(index);
      if (index === 0 && window.cosgralRestoreHero) window.cosgralRestoreHero();
    }

    function syncFromScroll() {
      syncRaf = 0;
      setActive(currentIndex(), false);
    }

    function scheduleSync() {
      if (syncRaf) return;
      syncRaf = window.requestAnimationFrame(syncFromScroll);
    }

    function goTo(index, duration, immediate) {
      holds = buildHolds();
      lastIdx = holds.length - 1;
      index = clamp(index, 0, lastIdx);
      scrollTo(holds[index], { duration: duration, immediate: immediate });
      setActive(index, true);
    }

    /* Twarde cięcie przez kurtynę — używa go menu i przejścia między stronami. */
    function jumpTo(index) {
      holds = buildHolds();
      lastIdx = holds.length - 1;
      index = clamp(index, 0, lastIdx);
      var curtain = document.querySelector("[data-scene-curtain]");

      if (!window.gsap || REDUCED) {
        goTo(index, 0, true);
        return;
      }

      /* Na czas cięcia kurtyna należy do nas, nie do sterownika scen. */
      window.cosgralSceneCurtain?.suspend?.();
      var tl = gsap.timeline({
        onComplete: function () {
          window.cosgralSceneCurtain?.resume?.();
        },
      });
      if (curtain) tl.to(curtain, { autoAlpha: 0.88, duration: 0.28, ease: "power2.in" }, 0);
      tl.add(function () {
        goTo(index, 0, true);
        if (window.ScrollTrigger) ScrollTrigger.update();
      }, 0.3);
      if (curtain) tl.to(curtain, { autoAlpha: 0, duration: 0.38, ease: "power2.out" }, 0.34);
    }

    /* Formularz sam dosuwa sobie pole do widoku (home-director) — trzymamy klasę,
       bo korzysta z niej CSS, ale scroll nie jest już niczym blokowany. */
    function setFormFocusLock(on) {
      document.documentElement.classList.toggle("is-form-focus", !!on);
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener(
        "click",
        function (e) {
          if (link.closest(".nav-overlay")) return;
          var href = link.getAttribute("href");
          if (!href || href === "#") return;
          var cfgIdx = SECTION_IDS.indexOf(href.slice(1));
          if (cfgIdx < 0) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          goTo(cfgIdx);
        },
        true
      );
    });

    if (lenis) lenis.on("scroll", scheduleSync);
    else window.addEventListener("scroll", scheduleSync, { passive: true });

    ScrollTrigger.addEventListener("refresh", function () {
      holds = buildHolds();
      lastIdx = holds.length - 1;
      window.cosgralSectionSnap.holds = holds;
      scheduleSync();
    });

    window.cosgralSectionSnap = {
      holds: holds,
      refreshHolds: buildHolds,
      goTo: goTo,
      jumpTo: jumpTo,
      stepUp: function () {
        goTo(currentIndex() - 1);
      },
      stepDown: function () {
        goTo(currentIndex() + 1);
      },
      setFormFocusLock: setFormFocusLock,
      goToY: function (y) {
        goTo(nearestIndex(y));
      },
      goToFooter: function () {
        goTo(holds.length - 1);
      },
      getIndex: function () {
        return activeIndex < 0 ? currentIndex() : activeIndex;
      },
    };

    var hash = (location.hash || "").replace(/^#/, "");
    var bootIdx = SECTION_IDS.indexOf(hash);
    if (bootIdx > 0 && !sessionStorage.getItem("cosgral-scroll-target")) {
      goTo(bootIdx, 0, true);
    } else {
      setActive(currentIndex(), true);
    }
  }

  (async function () {
    await window.cosgralSmoothScroll?.ready;

    await new Promise(function (resolve) {
      if (document.body.classList.contains("is-ready")) {
        resolve();
        return;
      }
      window.addEventListener("load", function () { window.setTimeout(resolve, 50); }, { once: true });
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
