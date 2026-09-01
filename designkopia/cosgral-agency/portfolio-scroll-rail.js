/**
 * Portfolio — prawy suwak sekcji (jak na homepage).
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var SCENES = [
    { id: "portfolio-top", selector: ".portfolio-hero", label: "Portfolio", i18n: "portfolio.rail_portfolio" },
    { id: "strony", selector: "#strony", label: "Strony", i18n: "portfolio.rail_strony", showTitle: true },
    { id: "montaz", selector: "#montaz", label: "Montaż", i18n: "portfolio.rail_montaz", showTitle: true },
    { id: "grafiki", selector: "#grafiki", label: "Grafiki", i18n: "portfolio.rail_grafiki", showTitle: true },
    { id: "automatyzacje", selector: "#automatyzacje", label: "Automatyzacje", i18n: "portfolio.rail_automation", showTitle: true },
    { id: "footer", selector: ".site-footer", label: "Stopka", i18n: "rail.footer", footer: true },
  ];

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

  function dotPercent(index) {
    var n = SCENES.length;
    if (n <= 1) return 0;
    return (index / (n - 1)) * 100;
  }

  function buildRail() {
    var rail = document.createElement("nav");
    rail.className = "home-scroll-rail";
    rail.setAttribute("data-scroll-rail", "");
    rail.setAttribute("data-i18n-aria-label", "rail.portfolio_aria");
    rail.setAttribute("aria-label", "Postęp sekcji portfolio");

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
      if (scene.showTitle) {
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

  function init() {
    if (REDUCED) return;
    var ui = buildRail();
    var visited = Object.create(null);
    var holdPositions = [];
    var lastIndex = -1;

    // Uwaga: NIE podpinamy sie pod "cosgral:langchange". To zdarzenie emituje samo
    // applyLang(), a applyI18n() wywoluje applyLang() — podpiete razem daly
    // nieskonczona rekurencje (RangeError: Maximum call stack size exceeded).
    // Nie jest zreszta potrzebne: kropki i tytuly szyny maja atrybuty data-i18n,
    // data-i18n-aria-label i data-i18n-title, wiec applyLang aktualizuje je sam.
    applyI18n();
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

    function refreshMetrics() {
      if (window.cosgralPortfolioStepper?.holds) {
        holdPositions = window.cosgralPortfolioStepper.holds.slice();
        return;
      }
      holdPositions = SCENES.map(function (scene) {
        return sceneY(scene.selector);
      });
    }

    function activeIndex() {
      if (window.cosgralPortfolioStepper?.getIndex) {
        return window.cosgralPortfolioStepper.getIndex();
      }
      var scroll = window.scrollY;
      var best = 0;
      var bestDist = Infinity;
      holdPositions.forEach(function (y, i) {
        var dist = Math.abs(scroll - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    function fillHeightForScroll(scroll) {
      var snapIdx = window.cosgralPortfolioStepper?.getIndex?.();
      var idx = snapIdx != null && snapIdx >= 0 ? snapIdx : activeIndex();

      if (holdPositions.length < 2) return dotPercent(idx);

      var start = holdPositions[idx] ?? 0;
      var end = holdPositions[idx + 1];

      if (end == null) return dotPercent(idx);

      if (scroll <= start + 4) return dotPercent(idx);

      if (scroll >= end - 4) return dotPercent(Math.min(idx + 1, SCENES.length - 1));

      var span = end - start;
      if (span <= 0) return dotPercent(idx);

      var t = (scroll - start) / span;
      t = Math.min(1, Math.max(0, t));
      return dotPercent(idx) + t * (dotPercent(idx + 1) - dotPercent(idx));
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
