/**
 * Portfolio — prawy suwak sekcji (jak na homepage).
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var SCENES = [
    { id: "portfolio-top", selector: ".portfolio-hero", label: "Portfolio" },
    { id: "strony", selector: "#strony", label: "Strony", showTitle: true },
    { id: "montaz", selector: "#montaz", label: "Montaż", showTitle: true },
    { id: "grafiki", selector: "#grafiki", label: "Grafiki", showTitle: true },
    { id: "automatyzacje", selector: "#automatyzacje", label: "Automatyzacje", showTitle: true },
    { id: "footer", selector: ".site-footer", label: "Stopka" },
  ];

  function sceneY(selector) {
    var el = document.querySelector(selector);
    if (!el) return 0;
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function buildRail() {
    var rail = document.createElement("nav");
    rail.className = "home-scroll-rail";
    rail.setAttribute("data-scroll-rail", "");
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
        title.textContent = scene.label;
        title.setAttribute("data-scroll-rail-title", scene.id);
        title.setAttribute("data-scene-index", String(i));
        title.disabled = true;
        title.setAttribute("aria-hidden", "true");
        title.tabIndex = -1;
        li.appendChild(title);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "home-scroll-rail__dot";
      btn.setAttribute("data-scroll-rail-dot", scene.id);
      btn.setAttribute("data-scene-index", String(i));
      btn.setAttribute("aria-label", scene.label);
      btn.title = scene.label;
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
      }
    }

    function refreshMetrics() {
      holdPositions = SCENES.map(function (scene) {
        return sceneY(scene.selector);
      });
    }

    function activeIndex() {
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

    function update() {
      refreshMetrics();
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      ui.fill.style.height = ((window.scrollY / max) * 100).toFixed(2) + "%";

      var idx = activeIndex();
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
