/**
 * Prawy suwak sekcji — kropki = pauzy, wypełnienie = postęp filmu.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var SCENES = [
    { id: "top", stId: "hero-pin", label: "Start", hold: 0.52, holdStart: 0.18, holdEnd: 0.72 },
    {
      id: "uslugi",
      stId: "scene-uslugi",
      label: "Usługi",
      i18n: "nav.services",
      hold: 0.48,
      holdStart: 0.14,
      holdEnd: 0.82,
      showTitle: true,
    },
    {
      id: "proces",
      stId: "scene-proces",
      label: "Proces",
      i18n: "nav.process",
      hold: 0.48,
      holdStart: 0.14,
      holdEnd: 0.82,
      showTitle: true,
    },
    {
      id: "faq",
      stId: "scene-faq",
      label: "FAQ",
      i18n: "nav.faq",
      hold: 0.48,
      holdStart: 0.14,
      holdEnd: 0.82,
      showTitle: true,
    },
    {
      id: "kontakt",
      stId: "scene-kontakt",
      label: "Kontakt",
      i18n: "nav.contact",
      hold: 0.48,
      holdStart: 0.14,
      holdEnd: 0.88,
      showTitle: true,
    },
    { id: "footer", label: "Stopka", footer: true, holdStart: 0, holdEnd: 1 },
  ];

  function footerHoldY() {
    var footer = document.querySelector(".site-footer");
    var max = window.ScrollTrigger ? ScrollTrigger.maxScroll(window) : 1;
    if (!footer) return max;
    return Math.min(max, Math.max(0, footer.offsetTop - (MOBILE ? 162 : 234)));
  }

  function holdScroll(st, hold) {
    return st.start + (st.end - st.start) * hold;
  }

  function buildRail() {
    var rail = document.createElement("nav");
    rail.className = "home-scroll-rail";
    rail.setAttribute("data-scroll-rail", "");
    rail.setAttribute("aria-label", "Postęp sekcji");

    var track = document.createElement("div");
    track.className = "home-scroll-rail__track";
    track.setAttribute("aria-hidden", "true");
    var fill = document.createElement("span");
    fill.className = "home-scroll-rail__fill";
    fill.setAttribute("data-scroll-rail-fill", "");
    track.appendChild(fill);

    var list = document.createElement("ol");
    list.className = "home-scroll-rail__dots";
    list.setAttribute("data-scroll-rail-dots", "");

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
        if (scene.i18n) title.setAttribute("data-i18n", scene.i18n);
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
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;

    var ui = buildRail();
    var maxScroll = 0;
    var snapPoints = [];
    var holdPositions = [];
    var visited = Object.create(null);
    var lastIndex = -1;

    function goToScene(index, opts) {
      opts = opts || {};
      var scene = SCENES[index];
      if (!scene) return;
      if (opts.jump && window.cosgralSectionSnap?.jumpTo) {
        window.cosgralSectionSnap.jumpTo(index);
        revealTitle(index);
        return;
      }
      if (window.cosgralSectionSnap?.goTo) {
        window.cosgralSectionSnap.goTo(index);
        return;
      }
      if (scene.footer) {
        var footerY = footerHoldY();
        if (window.cosgralSmoothScroll?.scrollTo) {
          window.cosgralSmoothScroll.scrollTo(footerY, { duration: MOBILE ? 4.4 : 5.28 });
        }
        return;
      }
      var st = ScrollTrigger.getById(scene.stId);
      if (!st) return;
      var target = holdScroll(st, scene.hold);
      if (window.cosgralSectionSnap?.goToY) {
        window.cosgralSectionSnap.goToY(target);
      } else if (window.cosgralSmoothScroll?.scrollTo) {
        window.cosgralSmoothScroll.scrollTo(target, { duration: MOBILE ? 2.2 : 2.7 });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    }

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
        titleBtn.setAttribute("aria-label", scene.label);
      }
    }

    if (window.cosgralI18n?.applyLang) {
      window.cosgralI18n.applyLang(window.cosgralI18n.getLang());
    }
    window.addEventListener("cosgral:langchange", function () {
      if (window.cosgralI18n?.applyLang) {
        window.cosgralI18n.applyLang(window.cosgralI18n.getLang());
      }
    });

    function refreshMetrics() {
      maxScroll = ScrollTrigger.maxScroll(window) || 1;
      snapPoints = [];
      holdPositions = [];

      SCENES.forEach(function (scene, i) {
        var li = ui.dots[i]?.closest(".home-scroll-rail__item");
        if (scene.footer) {
          var footerY = footerHoldY();
          holdPositions.push(footerY);
          snapPoints.push(footerY / maxScroll);
          if (li) li.style.top = ((footerY / maxScroll) * 100).toFixed(2) + "%";
          return;
        }
        var st = ScrollTrigger.getById(scene.stId);
        if (!st) {
          if (li) li.style.top = (i / Math.max(1, SCENES.length - 1) * 100).toFixed(2) + "%";
          return;
        }
        var pos = holdScroll(st, scene.hold);
        holdPositions.push(pos);
        snapPoints.push(pos / maxScroll);
        if (li) li.style.top = ((pos / maxScroll) * 100).toFixed(2) + "%";
      });
    }

    function activeScene() {
      var best = null;
      var bestDist = Infinity;

      SCENES.forEach(function (scene, i) {
        if (scene.footer) {
          var footerY = footerHoldY();
          var scroll = window.cosgralSmoothScroll?.lenis?.scroll ?? window.scrollY;
          var dist = Math.abs(scroll - footerY);
          if (dist < bestDist) {
            bestDist = dist;
            best = { scene: scene, st: null, index: i };
          }
          return;
        }
        var st = ScrollTrigger.getById(scene.stId);
        if (!st) return;
        var scroll = window.cosgralSmoothScroll?.lenis?.scroll ?? window.scrollY;
        var center = holdScroll(st, scene.hold);
        var dist = Math.abs(scroll - center);
        if (st.isActive && dist < bestDist) {
          bestDist = dist;
          best = { scene: scene, st: st, index: i };
        }
      });

      if (best) return best;

      var scroll = window.cosgralSmoothScroll?.lenis?.scroll ?? window.scrollY;
      SCENES.forEach(function (scene, i) {
        if (scene.footer) {
          var footerY = footerHoldY();
          var scroll = window.cosgralSmoothScroll?.lenis?.scroll ?? window.scrollY;
          var dist = Math.abs(scroll - footerY);
          if (dist < bestDist) {
            bestDist = dist;
            best = { scene: scene, st: null, index: i };
          }
          return;
        }
        var st = ScrollTrigger.getById(scene.stId);
        if (!st) return;
        var scroll = window.cosgralSmoothScroll?.lenis?.scroll ?? window.scrollY;
        var center = holdScroll(st, scene.hold);
        var dist = Math.abs(scroll - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = { scene: scene, st: st, index: i };
        }
      });

      return best;
    }

    function update() {
      refreshMetrics();
      var scroll = window.cosgralSmoothScroll?.lenis?.scroll ?? window.scrollY;
      var progress = maxScroll > 0 ? scroll / maxScroll : 0;
      ui.fill.style.height = (progress * 100).toFixed(2) + "%";

      var current = activeScene();
      if (current && current.index !== lastIndex) {
        revealTitle(current.index);
        lastIndex = current.index;
      }

      ui.dots.forEach(function (dot, i) {
        var scene = SCENES[i];
        var st = scene.footer ? null : ScrollTrigger.getById(scene.stId);
        var isCurrent = current && current.index === i;
        var inHold = false;

        if (scene.footer && isCurrent) {
          inHold = true;
        } else if (st && isCurrent) {
          inHold = st.progress >= scene.holdStart && st.progress <= scene.holdEnd;
        }

        dot.classList.toggle("is-active", !!isCurrent);
        dot.classList.toggle("is-hold", !!inHold);
        if (isCurrent) dot.setAttribute("aria-current", "step");
        else dot.removeAttribute("aria-current");

        var li = dot.closest(".home-scroll-rail__item");
        if (li) li.classList.toggle("is-current", !!isCurrent);
      });
    }

    ui.dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var idx = Number(dot.getAttribute("data-scene-index"));
        if (idx >= 0) goToScene(idx);
      });
    });

    ui.rail.querySelectorAll("[data-scroll-rail-title]").forEach(function (titleBtn) {
      titleBtn.addEventListener("click", function () {
        var idx = Number(titleBtn.getAttribute("data-scene-index"));
        if (idx >= 0) goToScene(idx, { jump: true });
      });
    });

    ScrollTrigger.addEventListener("refresh", update);
    if (window.cosgralSmoothScroll?.lenis) {
      window.cosgralSmoothScroll.lenis.on("scroll", update);
    } else {
      window.addEventListener("scroll", update, { passive: true });
    }

    window.addEventListener("cosgral:section-step", function (e) {
      var idx = e.detail?.index;
      if (typeof idx === "number") revealTitle(idx);
    });

    update();
    window.cosgralScrollRail = { refresh: update, scenes: SCENES, revealTitle: revealTitle };
  }

  (async function () {
    if (REDUCED) return;
    if (window.cosgralSmoothScroll?.ready) {
      await window.cosgralSmoothScroll.ready;
    }
    await new Promise(function (resolve) {
      if (window.ScrollTrigger?.getById("hero-pin")) {
        resolve();
        return;
      }
      window.addEventListener("cosgral:sections-ready", resolve, { once: true });
      window.setTimeout(resolve, 2400);
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    init();
  })();
})();
