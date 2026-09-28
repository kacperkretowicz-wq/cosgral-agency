/**
 * Systems fan (wachlarz) — arc carousel shared by catalog + expand.
 * Catalog: larger, slow auto-rotate. Detail: smaller, manual drag, copy below.
 */
(function () {
  "use strict";

  var STILL = "portfolio-media/showcase/chapter-stills/systems/bw/";

  var CASES = [
    {
      id: "tfo-crm",
      href: "portfolio-telforceone-crm.html",
      tag: "CRM / sprzedaż terenowa",
      client: "TelForceOne S.A.",
      title: "CRM z mapą handlowców",
      desc: "Jedno miejsce na dane klientów, planowanie wizyt i pracę przedstawicieli w terenie. Mapa tras, etykiety i raporty — bez Exceli i telefonów.",
      img: STILL + "ui-crm-map-bw.jpg",
    },
    {
      id: "tfo-code39",
      href: "portfolio-telforceone-code39.html",
      tag: "Narzędzie / identyfikacja",
      client: "TelForceOne S.A.",
      title: "Generator kodów Code 39",
      desc: "Szybkie generowanie i podgląd etykiet Code 39 — gotowych do druku i skanowania w magazynie.",
      img: STILL + "ui-barcode-bw.jpg",
    },
    {
      id: "tfo-forecast",
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka / zapasy",
      client: "TelForceOne S.A.",
      title: "Stany i prognozowanie",
      desc: "Widok zapasów, rotacji i prognoz popytu wspiera planowanie zakupów zanim braknie towaru na półce.",
      img: STILL + "ui-forecast-bw.jpg",
    },
    {
      id: "trove-panel",
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Panel sklepu i monitoring cen",
      desc: "Stany magazynowe, porównanie cen z marketplace’ami i alerty przecen w jednym panelu operacyjnym.",
      img: STILL + "ui-price-monitor-bw.jpg",
    },
    {
      id: "crm-leady",
      href: "portfolio-crm-leady.html",
      tag: "CRM",
      client: "",
      title: "CRM leadów i dealów",
      desc: "Leady → deale → pipeline, notatki, statusy i przypomnienia. Zespół widzi cały lejek bez przełączania narzędzi.",
      img: STILL + "ui-kanban-bw.jpg",
    },
    {
      id: "chatbot",
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Chatbot AI dla klientów",
      desc: "Asystent AI na Instagram, Facebook i WWW — odpowiada na FAQ, zbiera leady i przekazuje rozmowę do konsultanta.",
      img: STILL + "ui-chatbot-bw.jpg",
    },
    {
      id: "trove-flow",
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "Trove",
      title: "Zamówienie → faktura → paczka",
      desc: "Workflow e-commerce: zamówienie → faktura → paczka → powiadomienie. Mniej ręcznej roboty, mniej błędów.",
      img: STILL + "ui-invoice-flow-bw.jpg",
    },
    {
      id: "ai-agent",
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Agent AI i integracje",
      desc: "Łączy chat, mail, CRM i bazę w jednym przepływie — decyzje i handoff bez ręcznego klejenia narzędzi.",
      img: STILL + "ui-ai-agent-bw.jpg",
    },
    {
      id: "shelf",
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Shelf Sync",
      desc: "Podgląd półek i stanów w czasie zbliżonym do rzeczywistego — alerty, gdy produkt znika z widoku sprzedaży.",
      img: STILL + "ui-shelf-sync-bw.jpg",
    },
    {
      id: "kpi",
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka",
      client: "TelForceOne S.A.",
      title: "KPI board",
      desc: "Kluczowe wskaźniki sprzedaży i operacji na jednym ekranie — szybki puls firmy bez budowania raportów od zera.",
      img: STILL + "ui-kpi-board-bw.jpg",
    },
    {
      id: "network",
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "",
      title: "Graf workflow",
      desc: "Wizualny przepływ procesów: triggery, warunki i akcje w czytelnej sieci — łatwiej utrzymywać i rozwijać automatyzacje.",
      img: STILL + "ui-network-bw.jpg",
    },
  ];

  var instances = [];

  function clampIndex(i, n) {
    var x = i % n;
    return x < 0 ? x + n : x;
  }

  function createFan(root, opts) {
    opts = opts || {};
    var mode = opts.mode || "catalog"; /* catalog | detail */
    var reduced =
      document.documentElement.classList.contains("reduce-motion") || !!opts.reduced;
    var n = CASES.length;
    var index = typeof opts.index === "number" ? clampIndex(opts.index, n) : 0;
    var autoplay = mode === "catalog" && !reduced && opts.autoplay !== false;
    var destroyed = false;
    var dragging = false;
    var didDrag = false;
    var lastX = 0;
    var vel = 0;
    var raf = 0;
    var autoTimer = 0;
    var copyEl = null;

    root.classList.add("sys-fan");
    root.classList.toggle("sys-fan--catalog", mode === "catalog");
    root.classList.toggle("sys-fan--detail", mode === "detail");
    root.innerHTML =
      '<div class="sys-fan__stage" data-sys-fan-stage>' +
      '<div class="sys-fan__arc" data-sys-fan-arc></div>' +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__copy" data-sys-fan-copy aria-live="polite"></div>'
        : "") +
      '<div class="sys-fan__nav" data-sys-fan-nav>' +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-prev aria-label="Poprzedni">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M14.5 5.5L8.5 12l6 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-next aria-label="Następny">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9.5 5.5L15.5 12l-6 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      "</div>";

    var arc = root.querySelector("[data-sys-fan-arc]");
    var stage = root.querySelector("[data-sys-fan-stage]");
    copyEl = root.querySelector("[data-sys-fan-copy]");
    var cards = [];

    CASES.forEach(function (item, i) {
      var fig = document.createElement("figure");
      fig.className = "sys-fan__card";
      fig.setAttribute("data-sys-fan-card", String(i));
      fig.setAttribute("data-case-id", item.id);
      var img = document.createElement("img");
      img.src = item.img;
      img.alt = item.title;
      img.decoding = "async";
      img.draggable = false;
      fig.appendChild(img);
      var cap = document.createElement("figcaption");
      cap.className = "sys-fan__cap";
      cap.textContent = item.tag;
      fig.appendChild(cap);
      fig.addEventListener("click", function (e) {
        if (Math.abs(vel) > 0.08) return;
        var nearest = Math.round(index);
        if (i === clampIndex(nearest, n)) {
          if (mode === "detail") window.location.href = item.href;
          else setIndex(i, true);
        } else {
          setIndex(i, true);
        }
      });
      arc.appendChild(fig);
      cards.push(fig);
    });

    function layout() {
      if (destroyed) return;
      var nearest = clampIndex(Math.round(index), n);
      var span = mode === "catalog" ? 168 : 150; /* degrees of visible arc */
      var step = span / Math.max(9, n - 1);
      var radiusX = mode === "catalog" ? 46 : 36; /* vw */
      var radiusY = mode === "catalog" ? 34 : 22; /* vh — taller arch like the pin */
      var baseScale = mode === "catalog" ? 1 : 0.92;

      cards.forEach(function (card, i) {
        var raw = i - index;
        /* wrap shortest path on ring */
        if (raw > n / 2) raw -= n;
        if (raw < -n / 2) raw += n;
        var angDeg = raw * step;
        var ang = (angDeg * Math.PI) / 180;
        var x = Math.sin(ang) * radiusX;
        var y = (1 - Math.cos(ang)) * radiusY - (mode === "catalog" ? 2 : 0);
        var depth = Math.cos(ang);
        var s = baseScale * (0.72 + 0.28 * depth);
        var o = 0.28 + 0.72 * Math.pow(Math.max(0, depth), 1.15);
        var rot = angDeg * 0.85;
        card.style.transform =
          "translate3d(calc(-50% + " +
          x.toFixed(3) +
          "vw), calc(-50% + " +
          y.toFixed(3) +
          "vh), 0) rotate(" +
          rot.toFixed(2) +
          "deg) scale(" +
          s.toFixed(3) +
          ")";
        card.style.opacity = String(Math.max(0.18, Math.min(1, o)));
        card.style.zIndex = String(Math.round(20 + depth * 30));
        card.classList.toggle("is-front", i === nearest);
        card.classList.toggle("is-side", Math.abs(raw) > 0.55);
      });

      if (copyEl) paintCopy(nearest);
      if (typeof opts.onChange === "function") opts.onChange(nearest, CASES[nearest]);
    }

    function paintCopy(i) {
      if (!copyEl) return;
      var item = CASES[i];
      copyEl.innerHTML =
        '<p class="sys-fan__tag"></p>' +
        (item.client ? '<p class="sys-fan__client"></p>' : "") +
        '<h3 class="sys-fan__title"></h3>' +
        '<p class="sys-fan__desc"></p>' +
        '<a class="sys-fan__more" data-no-transition></a>';
      copyEl.querySelector(".sys-fan__tag").textContent = item.tag;
      if (item.client) copyEl.querySelector(".sys-fan__client").textContent = item.client;
      copyEl.querySelector(".sys-fan__title").textContent = item.title;
      copyEl.querySelector(".sys-fan__desc").textContent = item.desc;
      var more = copyEl.querySelector(".sys-fan__more");
      more.href = item.href;
      more.textContent = "Zobacz realizację →";
    }

    function setIndex(next, animate) {
      var from = index;
      var to = typeof next === "number" ? next : Math.round(index);
      if (!animate || reduced) {
        index = clampIndex(Math.round(to), n);
        layout();
        return;
      }
      /* shortest wrap on the ring */
      var delta = to - from;
      while (delta > n / 2) delta -= n;
      while (delta < -n / 2) delta += n;
      to = from + delta;
      var t0 = performance.now();
      var dur = 520;
      if (raf) cancelAnimationFrame(raf);
      function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        index = from + (to - from) * e;
        layout();
        if (p < 1) raf = requestAnimationFrame(tick);
        else {
          index = clampIndex(Math.round(to), n);
          layout();
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function nudge(dir) {
      stopAuto();
      setIndex(index + dir, true);
      if (autoplay) startAuto(2400);
    }

    function startAuto(delay) {
      stopAuto();
      if (!autoplay || destroyed) return;
      autoTimer = window.setInterval(function () {
        if (dragging || destroyed) return;
        index += 0.028;
        if (index >= n) index -= n;
        layout();
      }, 40);
    }

    function stopAuto() {
      if (autoTimer) {
        window.clearInterval(autoTimer);
        autoTimer = 0;
      }
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      didDrag = false;
      vel = 0;
      lastX = e.clientX != null ? e.clientX : e.touches && e.touches[0].clientX;
      stopAuto();
      stage.classList.add("is-dragging");
      document.body.classList.add("is-sys-fan-dragging");
    }
    function onPointerMove(e) {
      if (!dragging) return;
      var x = e.clientX != null ? e.clientX : e.touches && e.touches[0].clientX;
      if (x == null) return;
      var dx = x - lastX;
      lastX = x;
      if (Math.abs(dx) > 2) didDrag = true;
      vel = dx * 0.012;
      index -= dx * 0.012;
      while (index < 0) index += n;
      while (index >= n) index -= n;
      layout();
      if (e.cancelable) e.preventDefault();
    }
    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      /* inertia snap */
      var target = index - vel * 8;
      setIndex(target, true);
      if (autoplay) startAuto(1800);
      if (didDrag) {
        /* swallow the click that follows a drag so expand doesn't close */
        var swallow = function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          document.removeEventListener("click", swallow, true);
        };
        document.addEventListener("click", swallow, true);
        window.setTimeout(function () {
          document.removeEventListener("click", swallow, true);
          document.body.classList.remove("is-sys-fan-dragging");
        }, 80);
      } else {
        document.body.classList.remove("is-sys-fan-dragging");
      }
    }

    root.querySelector("[data-sys-fan-prev]").addEventListener("click", function (e) {
      e.stopPropagation();
      nudge(-1);
    });
    root.querySelector("[data-sys-fan-next]").addEventListener("click", function (e) {
      e.stopPropagation();
      nudge(1);
    });

    stage.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    function onWheel(e) {
      if (destroyed) return;
      /* Only when pointer is over fan or in detail mode */
      if (mode === "catalog" && !root.matches(":hover")) return;
      var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();
      e.stopPropagation();
      stopAuto();
      index += delta > 0 ? 0.35 : -0.35;
      while (index < 0) index += n;
      while (index >= n) index -= n;
      layout();
      window.clearTimeout(onWheel._t);
      onWheel._t = window.setTimeout(function () {
        setIndex(Math.round(index), true);
        if (autoplay) startAuto(1600);
      }, 140);
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    layout();
    if (autoplay) startAuto();

    var api = {
      root: root,
      mode: mode,
      cases: CASES,
      getIndex: function () {
        return clampIndex(Math.round(index), n);
      },
      setIndex: function (i) {
        setIndex(i, true);
      },
      pause: stopAuto,
      resume: function () {
        if (autoplay) startAuto();
      },
      setMode: function (nextMode) {
        mode = nextMode;
        root.classList.toggle("sys-fan--catalog", mode === "catalog");
        root.classList.toggle("sys-fan--detail", mode === "detail");
        autoplay = mode === "catalog" && !reduced;
        if (mode === "detail" && !copyEl) {
          copyEl = document.createElement("div");
          copyEl.className = "sys-fan__copy";
          copyEl.setAttribute("data-sys-fan-copy", "");
          copyEl.setAttribute("aria-live", "polite");
          root.appendChild(copyEl);
        }
        if (mode === "catalog") stopAuto();
        layout();
        if (autoplay) startAuto();
      },
      destroy: function () {
        destroyed = true;
        stopAuto();
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        root.removeEventListener("wheel", onWheel);
        instances = instances.filter(function (x) {
          return x !== api;
        });
      },
    };
    instances.push(api);
    return api;
  }

  window.CosgralSystemsFan = {
    cases: CASES,
    create: createFan,
    getCatalog: function () {
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].mode === "catalog") return instances[i];
      }
      return null;
    },
  };
})();
