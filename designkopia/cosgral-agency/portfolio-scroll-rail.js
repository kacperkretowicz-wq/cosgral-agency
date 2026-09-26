/**
 * Portfolio — prawy suwak sekcji (jak na homepage).
 * Showcase / film: dots without chapter titles.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var FILM = document.body.classList.contains("portfolio-page--film");
  var SHOWCASE = document.body.classList.contains("portfolio-page--showcase");

  var SCENES = SHOWCASE
    ? [
        { id: "intro", selector: "#portfolio-intro", label: "Start", i18n: "portfolio.rail_portfolio" },
        { id: "collage", selector: "#portfolio-collage", label: "Overview", i18n: "portfolio.selected_title" },
        { id: "strony", selector: "#strony", label: "Strony", i18n: "portfolio.rail_strony" },
        { id: "automatyzacje", selector: "#automatyzacje", label: "Automatyzacje", i18n: "portfolio.rail_automation" },
        { id: "montaz", selector: "#montaz", label: "Montaż", i18n: "portfolio.rail_montaz" },
        { id: "grafiki", selector: "#grafiki", label: "Grafiki", i18n: "portfolio.rail_grafiki" },
        { id: "footer", selector: ".site-footer", label: "Stopka", i18n: "rail.footer", footer: true },
      ]
    : FILM
    ? [
        { id: "open", act: "open", label: "Start", i18n: "portfolio.rail_portfolio" },
        { id: "strony", act: "web", label: "Strony", i18n: "portfolio.rail_strony" },
        { id: "automatyzacje", act: "auto", label: "Automatyzacje", i18n: "portfolio.rail_automation" },
        { id: "montaz", act: "reels", label: "Montaż", i18n: "portfolio.rail_montaz" },
        { id: "grafiki", act: "gfx", label: "Grafiki", i18n: "portfolio.rail_grafiki" },
        { id: "footer", selector: ".site-footer", label: "Stopka", i18n: "rail.footer", footer: true },
      ]
    : [
        { id: "portfolio-top", selector: ".portfolio-hero", label: "Portfolio", i18n: "portfolio.rail_portfolio" },
        { id: "strony", selector: "#strony", label: "Strony", i18n: "portfolio.rail_strony", showTitle: true },
        { id: "automatyzacje", selector: "#automatyzacje", label: "Automatyzacje", i18n: "portfolio.rail_automation", showTitle: false },
        { id: "montaz", selector: "#montaz", label: "Montaż", i18n: "portfolio.rail_montaz", showTitle: true },
        { id: "grafiki", selector: "#grafiki", label: "Grafiki", i18n: "portfolio.rail_grafiki", showTitle: true },
        { id: "footer", selector: ".site-footer", label: "Stopka", i18n: "rail.footer", footer: true },
      ];

  /* Film act midpoints within pin progress (0–1) */
  var FILM_ACT_PROGRESS = {
    open: 0.04,
    web: 0.16,
    auto: 0.38,
    reels: 0.62,
    gfx: 0.84,
  };

  function sceneLabel(scene) {
    if (window.cosgralI18n?.t && scene.i18n) {
      var translated = window.cosgralI18n.t(scene.i18n);
      if (translated) return translated;
    }
    return scene.label;
  }

  function applyI18n() {
    if (window.cosgralI18n?.applyLang) {
      window.cosgralI18n.applyLang(window.cosgralI18n.getLang());
    }
  }

  function sceneY(selector) {
    var el = document.querySelector(selector);
    if (!el) return 0;
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function railSpanFrom(positions) {
    var first = positions[0] ?? 0;
    var last = positions[positions.length - 1] ?? first + 1;
    var span = last - first;
    return { first: first, last: last, span: span <= 0 ? 1 : span };
  }

  function yToRailPct(y, positions) {
    var s = railSpanFrom(positions);
    return Math.min(100, Math.max(0, ((y - s.first) / s.span) * 100));
  }

  function ensureIncreasing(positions) {
    // Keep a meaningful scroll gap so rail labels never stack on one %
    var minGap = Math.max(280, Math.round(window.innerHeight * 0.38));
    for (var i = 1; i < positions.length; i++) {
      if (!(positions[i] > positions[i - 1] + minGap)) {
        positions[i] = positions[i - 1] + minGap;
      }
    }
    return positions;
  }

  /** Map scroll holds → rail % with a hard minimum visual gap between dots. */
  function layoutPercents(positions) {
    if (!positions || positions.length < 1) return [];
    var pcts = positions.map(function (y) {
      return yToRailPct(y ?? 0, positions);
    });
    var n = pcts.length;
    if (n < 2) return pcts;
    // ~label height on a ~560px track ≈ 3–4%; keep ≥ 9% so titles never collide
    var minPct = Math.max(9, Math.min(16, 92 / (n - 1)));
    pcts[0] = 0;
    for (var i = 1; i < n; i++) {
      if (!(pcts[i] > pcts[i - 1] + minPct)) {
        pcts[i] = pcts[i - 1] + minPct;
      }
    }
    // If we overshot 100%, compress proportionally while keeping order
    if (pcts[n - 1] > 100) {
      var span = pcts[n - 1] || 1;
      for (var j = 0; j < n; j++) {
        pcts[j] = (pcts[j] / span) * 100;
      }
      // Re-assert min gap after compress if still feasible
      var fitGap = Math.min(minPct, 100 / (n - 1));
      pcts[0] = 0;
      for (var k = 1; k < n; k++) {
        if (!(pcts[k] > pcts[k - 1] + fitGap)) {
          pcts[k] = pcts[k - 1] + fitGap;
        }
      }
      if (pcts[n - 1] > 100) {
        for (var m = 0; m < n; m++) {
          pcts[m] = (m / (n - 1)) * 100;
        }
      }
    }
    return pcts;
  }

  function layoutDots(ui, positions) {
    if (!positions || positions.length < 1) return;
    var pcts = layoutPercents(positions);
    ui.dots.forEach(function (dot, i) {
      var li = dot.closest(".home-scroll-rail__item");
      if (!li) return;
      li.style.top = (pcts[i] ?? 0).toFixed(2) + "%";
    });
  }

  function buildRail() {
    var rail = document.createElement("nav");
    rail.className = "home-scroll-rail";
    rail.setAttribute("data-scroll-rail", "");
    rail.setAttribute("data-i18n-aria-label", "rail.portfolio_aria");
    rail.setAttribute("aria-label", FILM || SHOWCASE ? "Postęp Realizacji" : "Postęp sekcji portfolio");
    if (FILM || SHOWCASE) rail.classList.add("home-scroll-rail--film");

    var track = document.createElement("div");
    track.className = "home-scroll-rail__track";
    track.setAttribute("aria-hidden", "true");
    var fill = document.createElement("span");
    fill.className = "home-scroll-rail__fill";
    track.appendChild(fill);

    var list = document.createElement("ol");
    list.className = "home-scroll-rail__dots";

    SCENES.forEach(function (scene, i) {
      var li = document.createElement("li");
      li.className = "home-scroll-rail__item";
      if (scene.showTitle && !FILM && !SHOWCASE) {
        var title = document.createElement("button");
        title.type = "button";
        title.className = "home-scroll-rail__title";
        title.textContent = sceneLabel(scene);
        title.setAttribute("data-scroll-rail-title", scene.id);
        title.setAttribute("data-scene-index", String(i));
        title.disabled = true;
        title.setAttribute("aria-hidden", "true");
        title.tabIndex = -1;
        if (scene.i18n) title.setAttribute("data-i18n", scene.i18n);
        li.appendChild(title);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "home-scroll-rail__dot";
      btn.setAttribute("data-scroll-rail-dot", scene.id);
      btn.setAttribute("data-scene-index", String(i));
      btn.setAttribute("aria-label", sceneLabel(scene));
      btn.title = sceneLabel(scene);
      if (scene.i18n) btn.setAttribute("data-i18n-aria-label", scene.i18n);
      if (scene.i18n) btn.setAttribute("data-i18n-title", scene.i18n);
      li.appendChild(btn);
      list.appendChild(li);
    });

    rail.appendChild(track);
    rail.appendChild(list);
    document.body.appendChild(rail);
    return { rail: rail, fill: fill, dots: list.querySelectorAll("[data-scroll-rail-dot]") };
  }

  function initFilmRail(ui) {
    var lastIndex = -1;
    var filmProgress = 0;
    var railPositions = [];

    applyI18n();
    window.addEventListener("cosgral:langchange", applyI18n);
    window.addEventListener("cosgral:i18n-ready", applyI18n);

    function actIndexFromProgress(p) {
      if (p < 0.14) return 0;
      if (p < 0.38) return 1;
      if (p < 0.58) return 2;
      if (p < 0.8) return 3;
      return 4;
    }

    function footerReached() {
      var footer = document.querySelector(".site-footer");
      if (!footer) return false;
      var rect = footer.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.72;
    }

    function refreshRailPositions() {
      var pin = window.ScrollTrigger && ScrollTrigger.getById("portfolio-film-pin");
      var footer = document.querySelector(".site-footer");
      var footerY = footer
        ? footer.getBoundingClientRect().top + window.scrollY
        : (pin ? pin.end : window.scrollY) + window.innerHeight;
      railPositions = SCENES.map(function (scene) {
        if (scene.footer) return footerY;
        if (!pin) return 0;
        var t = FILM_ACT_PROGRESS[scene.act] != null ? FILM_ACT_PROGRESS[scene.act] : 0;
        return pin.start + (pin.end - pin.start) * t;
      });
      ensureIncreasing(railPositions);
      layoutDots(ui, railPositions);
    }

    function sync(p) {
      filmProgress = Math.max(0, Math.min(1, p == null ? filmProgress : p));
      refreshRailPositions();
      var pin = window.ScrollTrigger && ScrollTrigger.getById("portfolio-film-pin");
      var scrollY = window.scrollY;
      if (pin && !footerReached()) {
        scrollY = pin.start + (pin.end - pin.start) * filmProgress;
      }
      var idx = footerReached() ? SCENES.length - 1 : actIndexFromProgress(filmProgress);
      var fillPct = footerReached() ? 100 : yToRailPct(scrollY, railPositions);
      ui.fill.style.height = fillPct.toFixed(2) + "%";

      if (idx !== lastIndex) lastIndex = idx;

      ui.dots.forEach(function (dot, i) {
        var isCurrent = i === idx;
        dot.classList.toggle("is-active", isCurrent);
        dot.classList.toggle("is-hold", isCurrent);
        if (isCurrent) dot.setAttribute("aria-current", "step");
        else dot.removeAttribute("aria-current");
        var li = dot.closest(".home-scroll-rail__item");
        if (li) li.classList.toggle("is-current", isCurrent);
      });
    }

    function goToScene(index) {
      var scene = SCENES[index];
      if (!scene) return;
      if (scene.footer) {
        var footer = document.querySelector(".site-footer");
        if (!footer) return;
        var y = footer.getBoundingClientRect().top + window.scrollY - (MOBILE ? 72 : 96);
        var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
        if (lenis && lenis.scrollTo) lenis.scrollTo(y, { duration: 1 });
        else window.scrollTo({ top: y, behavior: "smooth" });
        return;
      }
      if (window.cosgralPortfolioFilm && window.cosgralPortfolioFilm.scrollToAct) {
        window.cosgralPortfolioFilm.scrollToAct(scene.act);
        return;
      }
      var pin = window.ScrollTrigger && ScrollTrigger.getById("portfolio-film-pin");
      if (!pin) return;
      var t = FILM_ACT_PROGRESS[scene.act] != null ? FILM_ACT_PROGRESS[scene.act] : 0;
      var y = pin.start + (pin.end - pin.start) * t;
      var lenis2 = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
      if (lenis2 && lenis2.scrollTo) lenis2.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    }

    ui.dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        goToScene(Number(dot.getAttribute("data-scene-index")));
      });
    });

    window.cosgralFilmRail = {
      sync: sync,
      refresh: function () {
        var film = window.cosgralPortfolioFilm;
        sync(film && film.getProgress ? film.getProgress() : filmProgress);
      },
    };
    window.cosgralPortfolioRail = { refresh: window.cosgralFilmRail.refresh, scenes: SCENES };

    window.addEventListener("scroll", function () {
      if (footerReached()) sync(filmProgress);
    }, { passive: true });
    window.addEventListener("resize", function () {
      window.cosgralFilmRail.refresh();
    });
    window.addEventListener("load", function () {
      window.cosgralFilmRail.refresh();
    });

    sync(0);
  }

  function initClassicRail(ui) {
    var visited = Object.create(null);
    var holdPositions = [];
    var lastIndex = -1;

    applyI18n();
    window.addEventListener("cosgral:langchange", applyI18n);
    window.addEventListener("cosgral:i18n-ready", applyI18n);

    function revealTitle(index) {
      var scene = SCENES[index];
      if (!scene?.showTitle || visited[scene.id]) return;
      visited[scene.id] = true;
      var li = ui.dots[index]?.closest(".home-scroll-rail__item");
      if (!li) return;
      li.classList.add("is-title-revealed");
      var titleBtn = li.querySelector("[data-scroll-rail-title]");
      if (titleBtn) {
        titleBtn.disabled = false;
        titleBtn.removeAttribute("aria-hidden");
        titleBtn.tabIndex = 0;
        titleBtn.setAttribute("aria-label", sceneLabel(scene));
      }
    }

    function sceneHoldY(scene) {
      if (!scene) return 0;
      if (scene.footer) {
        var footer = document.querySelector(".site-footer");
        if (!footer) return document.documentElement.scrollHeight;
        return Math.max(0, footer.getBoundingClientRect().top + window.scrollY - (MOBILE ? 72 : 96));
      }
      if (scene.id === "automatyzacje") {
        return sceneY(scene.selector);
      }
      if (scene.id === "grafiki") {
        var grafikiPin = window.ScrollTrigger && ScrollTrigger.getById("grafiki-pin");
        if (grafikiPin) return grafikiPin.start;
      }
      return sceneY(scene.selector);
    }

    function refreshMetrics() {
      // Always rebuild — stepper.holds can go stale after pinSpacing settles
      var live = null;
      if (typeof window.cosgralPortfolioStepper?.refreshHolds === "function") {
        live = window.cosgralPortfolioStepper.refreshHolds();
        if (live && live.length) window.cosgralPortfolioStepper.holds = live;
      }
      if (live && live.length === SCENES.length) {
        holdPositions = live.slice();
      } else {
        holdPositions = SCENES.map(sceneHoldY);
      }
      ensureIncreasing(holdPositions);
      layoutDots(ui, holdPositions);
    }

    function activeIndex() {
      // Prefer live last-hold over stepper cache (can lag one frame behind Lenis)
      var scroll = window.scrollY;
      if (window.cosgralSmoothScroll && typeof window.cosgralSmoothScroll.scroll === "number") {
        scroll = window.cosgralSmoothScroll.scroll;
      }
      var best = 0;
      var slop = Math.max(24, Math.round(window.innerHeight * 0.04));
      for (var i = 0; i < holdPositions.length; i++) {
        if (scroll + slop >= (holdPositions[i] ?? 0)) best = i;
      }
      return best;
    }

    function fillHeightForScroll(scroll) {
      if (!holdPositions.length) return 0;
      var pcts = layoutPercents(holdPositions);
      if (scroll <= holdPositions[0]) return pcts[0] || 0;
      var last = holdPositions.length - 1;
      if (scroll >= holdPositions[last]) return pcts[last] || 100;
      for (var i = 1; i <= last; i++) {
        if (scroll <= holdPositions[i]) {
          var a = holdPositions[i - 1];
          var b = holdPositions[i];
          var t = b === a ? 0 : (scroll - a) / (b - a);
          return (pcts[i - 1] || 0) + ((pcts[i] || 0) - (pcts[i - 1] || 0)) * t;
        }
      }
      return pcts[last] || 100;
    }

    function update() {
      refreshMetrics();
      var scroll = window.scrollY;
      var idx = activeIndex();
      var fillPct = fillHeightForScroll(scroll);
      ui.fill.style.height = fillPct.toFixed(2) + "%";

      if (idx !== lastIndex) {
        revealTitle(idx);
        lastIndex = idx;
      }

      ui.dots.forEach(function (dot, i) {
        var isCurrent = i === idx;
        var el = document.querySelector(SCENES[i].selector);
        var inHold = false;
        if (el) {
          var rect = el.getBoundingClientRect();
          inHold = rect.top < window.innerHeight * 0.55 && rect.bottom > window.innerHeight * 0.35;
        }
        dot.classList.toggle("is-active", isCurrent);
        dot.classList.toggle("is-hold", isCurrent && inHold);
        if (isCurrent) dot.setAttribute("aria-current", "step");
        else dot.removeAttribute("aria-current");
        var li = dot.closest(".home-scroll-rail__item");
        if (li) li.classList.toggle("is-current", isCurrent);
      });
    }

    function goToScene(index) {
      if (window.cosgralPortfolioStepper?.goTo) {
        window.cosgralPortfolioStepper.goTo(index);
        return;
      }
      var scene = SCENES[index];
      if (scene?.id === "grafiki" && window.cosgralGrafikiStepper?.snapToHold) {
        var current = activeIndex();
        window.cosgralGrafikiStepper.snapToHold(index < current ? 1 : 0);
        return;
      }
      var y = holdPositions[index];
      if (y == null) return;
      window.scrollTo({ top: Math.max(0, y - (MOBILE ? 72 : 96)), behavior: REDUCED ? "auto" : "smooth" });
    }

    ui.dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        goToScene(Number(dot.getAttribute("data-scene-index")));
      });
    });

    ui.rail.querySelectorAll("[data-scroll-rail-title]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goToScene(Number(btn.getAttribute("data-scene-index")));
      });
    });

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("load", update);
    window.addEventListener("cosgral:section-step", update);
    window.addEventListener("cosgral:grafiki-beat", update);
    document.addEventListener("portfolio:media-ready", function () {
      window.setTimeout(update, 80);
    });

    update();
    window.cosgralPortfolioRail = { refresh: update, scenes: SCENES };
  }

  function init() {
    if (REDUCED) return;
    var ui = buildRail();
    if (FILM) initFilmRail(ui);
    else initClassicRail(ui);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
