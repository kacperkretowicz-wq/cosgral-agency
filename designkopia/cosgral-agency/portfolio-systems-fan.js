/**
 * Systems fan (wachlarz) — arc carousel shared by catalog + expand.
 * Catalog: larger, slow auto-rotate.
 * Detail: manual drag + short copy; "Zobacz więcej" expands full case under the fan.
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
      desc: "Handlowcy jeździli z Excelami i notatkami w telefonie — nikt nie wiedział, kto u kogo był. CRM z mapą zbiera klientów, trasy i raporty dnia w jednym miejscu, więc planowanie wizyt zajmuje minuty zamiast godziny.",
      img: STILL + "ui-crm-map-bw.jpg",
    },
    {
      id: "tfo-code39",
      href: "portfolio-telforceone-code39.html",
      tag: "Narzędzie / identyfikacja",
      client: "TelForceOne S.A.",
      title: "Generator kodów Code 39",
      desc: "Etykiety powstawały w kilku narzędziach i często wracały ze skanera jako błąd. Generator daje podgląd Code 39 i batch do druku — oznaczenie SKU w sekundach, bez poprawek na magazynie.",
      img: STILL + "ui-barcode-bw.jpg",
    },
    {
      id: "tfo-forecast",
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka / zapasy",
      client: "TelForceOne S.A.",
      title: "Stany i prognozowanie",
      desc: "Zakupy szły „na wyczucie”: braki na półce albo zamrożony towar. Panel łączy stany, rotację i prognozę z alertami — widać, co dokupić zanim sprzedaż stanie.",
      img: STILL + "ui-forecast-bw.jpg",
    },
    {
      id: "trove-panel",
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Panel sklepu i monitoring cen",
      desc: "Trove ręcznie porównywało ceny na Allegro i własnym sklepie w arkuszach. Panel zbiera stany i ceny kanałów z alertami przecen — reakcja na spadek marży tego samego dnia, nie po tygodniu.",
      img: STILL + "ui-price-monitor-bw.jpg",
    },
    {
      id: "crm-leady",
      href: "portfolio-crm-leady.html",
      tag: "CRM",
      client: "",
      title: "CRM leadów i dealów",
      desc: "Leady ginęły między skrzynką, czatem i karteczkami — follow-upy się spóźniały. CRM prowadzi od pierwszego kontaktu do deala: pipeline, notatki i przypomnienia w jednym lejku.",
      img: STILL + "ui-kanban-bw.jpg",
    },
    {
      id: "chatbot",
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Chatbot AI dla klientów",
      desc: "Po godzinach Instagram i Messenger zasypywały te same pytania, a zespół odpisywał rano z opóźnieniem. Bot zamyka FAQ 24/7, zbiera lead i oddaje rozmowę konsultantowi z kontekstem.",
      img: STILL + "ui-chatbot-bw.jpg",
    },
    {
      id: "trove-flow",
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "Trove",
      title: "Zamówienie → faktura → paczka",
      desc: "Każde zamówienie Trove wymagało ręcznego klejenia faktury, statusu i maila do klienta. Workflow odpala cały łańcuch sam — mniej klikania, mniej pomyłek przy fulfillmentcie.",
      img: STILL + "ui-invoice-flow-bw.jpg",
    },
    {
      id: "ai-agent",
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Agent AI i integracje",
      desc: "Chat, mail i CRM żyły osobno — handoff to było kopiuj-wklej. Agent łączy kanały w jednym przepływie: klasyfikuje sprawę, uzupełnia kartę i przekazuje ją właściwej osobie.",
      img: STILL + "ui-ai-agent-bw.jpg",
    },
    {
      id: "shelf",
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Shelf Sync",
      desc: "Produkt znikał z półki sprzedażowej, zanim magazyn zdążył zareagować. Shelf Sync pilnuje widoczności stanów i alarmuje, gdy oferta wypada z rynku.",
      img: STILL + "ui-shelf-sync-bw.jpg",
    },
    {
      id: "kpi",
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka",
      client: "TelForceOne S.A.",
      title: "KPI board",
      desc: "Raporty tygodnia powstawały z kilku Exceli i zajmowały pół dnia. Board pokazuje sprzedaż i operacje na żywo — puls firmy bez budowania tabel od zera.",
      img: STILL + "ui-kpi-board-bw.jpg",
    },
    {
      id: "network",
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "",
      title: "Graf workflow",
      desc: "Automatyzacje siedziały w głowie jednej osoby albo w chaotycznych regułach. Graf pokazuje triggery, warunki i akcje — łatwiej utrzymać proces i dokładać kolejne kroki.",
      img: STILL + "ui-network-bw.jpg",
    },
  ];

  var instances = [];
  var pageCache = {};

  function clampIndex(i, n) {
    var x = i % n;
    return x < 0 ? x + n : x;
  }

  function fetchCaseHtml(href) {
    if (pageCache[href]) return Promise.resolve(pageCache[href]);
    return fetch(href, { credentials: "same-origin" })
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        pageCache[href] = html;
        return html;
      });
  }

  function extractCaseBody(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var article = doc.querySelector("article.case-study");
    if (!article) return null;
    var wrap = document.createElement("div");
    wrap.className = "sys-fan__case";
    var intro = article.querySelector(".case-viz-intro");
    var story = article.querySelector(".case-viz-close__copy");
    var rail = article.querySelector(".case-viz-rail");
    var aside = article.querySelector(".case-study__aside");
    if (intro) {
      var introClone = intro.cloneNode(true);
      var back = introClone.querySelector(".case-study__back");
      if (back && back.parentNode) back.parentNode.removeChild(back);
      wrap.appendChild(introClone);
    }
    /* Case narrative (problem → solution → result) before interactive viz tiles */
    if (story) {
      var storyWrap = document.createElement("div");
      storyWrap.className = "sys-fan__case-story case-viz-close__copy";
      storyWrap.innerHTML = story.innerHTML;
      wrap.appendChild(storyWrap);
    }
    if (rail) wrap.appendChild(rail.cloneNode(true));
    if (aside) wrap.appendChild(aside.cloneNode(true));
    if (!wrap.childNodes.length) {
      wrap.innerHTML = article.innerHTML;
      var b2 = wrap.querySelector(".case-study__back");
      if (b2 && b2.parentNode) b2.parentNode.removeChild(b2);
    }
    /* Case footer: keep CTA only — no "Wróć do realizacji" */
    wrap.querySelectorAll(".case-study__visit").forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    /* neutralize in-page hash jumps escaping the panel */
    wrap.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        var target = wrap.querySelector("#" + CSS.escape(id));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    return wrap;
  }

  function createFan(root, opts) {
    opts = opts || {};
    var mode = opts.mode || "catalog";
    var reduced =
      document.documentElement.classList.contains("reduce-motion") || !!opts.reduced;
    var n = CASES.length;
    var index = typeof opts.index === "number" ? clampIndex(opts.index, n) : 0;
    var painted = -1;
    var autoplay = mode === "catalog" && !reduced && opts.autoplay !== false;
    var destroyed = false;
    var dragging = false;
    var didDrag = false;
    var lastX = 0;
    var vel = 0;
    var raf = 0;
    var autoTimer = 0;
    var copyEl = null;
    var articleEl = null;
    var articleOpen = false;
    var articleLoading = false;
    var scrollParent = null;
    var articleWheelLock = 0;
    var articleSnapIndex = -1; /* -1 = top (intro/story), then 0..tiles-1 */
    var ARTICLE_WHEEL_MS = 780;

    root.classList.add("sys-fan");
    root.classList.toggle("sys-fan--catalog", mode === "catalog");
    root.classList.toggle("sys-fan--detail", mode === "detail");
    root.innerHTML =
      '<div class="sys-fan__head" data-sys-fan-head>' +
      '<div class="sys-fan__stage" data-sys-fan-stage>' +
      '<div class="sys-fan__arc" data-sys-fan-arc></div>' +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__copy" data-sys-fan-copy aria-live="polite"></div>'
        : "") +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__article" data-sys-fan-article hidden></div>'
        : "") +
      '<div class="sys-fan__nav" data-sys-fan-nav aria-label="Nawigacja systemów">' +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-prev aria-label="Poprzedni">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M10.2 2.6L5.4 8l4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<div class="sys-fan__dots" data-sys-fan-dots role="tablist" aria-label="Systemy"></div>' +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-next aria-label="Następny">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M5.8 2.6L10.6 8l-4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      "</div>";

    var arc = root.querySelector("[data-sys-fan-arc]");
    var stage = root.querySelector("[data-sys-fan-stage]");
    copyEl = root.querySelector("[data-sys-fan-copy]");
    articleEl = root.querySelector("[data-sys-fan-article]");
    var navEl = root.querySelector("[data-sys-fan-nav]");
    var dotsEl = root.querySelector("[data-sys-fan-dots]");
    var cards = [];
    var dotButtons = [];

    CASES.forEach(function (item, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "sys-fan__dot" + (i === index ? " is-active" : "");
      dot.setAttribute("data-sys-fan-dot", String(i));
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", item.title);
      if (i === index) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        stopAuto();
        setIndex(i, true);
        if (autoplay) startAuto();
      });
      dotsEl.appendChild(dot);
      dotButtons.push(dot);
    });

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
      fig.addEventListener("click", function () {
        if (Math.abs(vel) > 0.08 || didDrag) return;
        setIndex(i, true);
      });
      arc.appendChild(fig);
      cards.push(fig);
    });

    function getScrollParent() {
      if (scrollParent && scrollParent.isConnected) return scrollParent;
      scrollParent = root.closest(".expand-systems") || root;
      return scrollParent;
    }

    function setCaseSnap(on) {
      var scroller = getScrollParent();
      if (!scroller || scroller === root) return;
      scroller.classList.toggle("is-case-snap", !!on);
    }

    function stickyArticlePad() {
      var head = root.querySelector("[data-sys-fan-head]");
      if (!head) return 16;
      return Math.round(head.getBoundingClientRect().height) + 16;
    }

    function getArticleSnapTargets() {
      if (!articleEl) return [];
      var caseRoot = articleEl.querySelector(".sys-fan__case");
      if (!caseRoot) return [];
      return Array.prototype.slice.call(caseRoot.querySelectorAll(".case-viz-tile"));
    }

    function targetScrollTop(el, scroller, pad) {
      var sRect = scroller.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      return Math.max(0, r.top - sRect.top + scroller.scrollTop - pad);
    }

    function snapArticleBy(dir) {
      var scroller = getScrollParent();
      var tiles = getArticleSnapTargets();
      if (!scroller || !tiles.length) return;
      var pad = stickyArticlePad();
      var maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      var nextIdx = articleSnapIndex + (dir > 0 ? 1 : -1);
      if (nextIdx < -1) nextIdx = -1;
      if (nextIdx > tiles.length - 1) nextIdx = tiles.length - 1;
      if (nextIdx === articleSnapIndex && scroller.scrollTop <= 2 && dir < 0) return;
      if (nextIdx === articleSnapIndex && scroller.scrollTop >= maxScroll - 2 && dir > 0) return;
      articleSnapIndex = nextIdx;

      var nextTop = 0;
      if (articleSnapIndex >= 0) {
        nextTop = targetScrollTop(tiles[articleSnapIndex], scroller, pad);
      }
      nextTop = Math.max(0, Math.min(maxScroll, nextTop));
      scroller.scrollTo({
        top: nextTop,
        behavior: reduced ? "auto" : "smooth",
      });
    }

    function restoreNav() {
      if (!navEl || !root) return;
      if (navEl.parentNode !== root) root.appendChild(navEl);
      navEl.classList.remove("is-in-case");
    }

    function placeNavInCaseAside(caseRoot) {
      if (!navEl || !caseRoot) return;
      var aside = caseRoot.querySelector(".case-study__aside");
      if (!aside) return;
      var cta = aside.querySelector(".case-study__cta");
      navEl.classList.add("is-in-case");
      if (cta && cta.parentNode === aside) aside.insertBefore(navEl, cta);
      else aside.appendChild(navEl);
    }

    function collapseArticle(immediate) {
      if (!articleEl) return;
      articleOpen = false;
      articleLoading = false;
      root.classList.remove("is-article-open");
      articleEl.classList.remove("is-open");
      setCaseSnap(false);
      restoreNav();
      if (immediate) {
        articleEl.hidden = true;
        articleEl.innerHTML = "";
        return;
      }
      articleEl.style.maxHeight = articleEl.scrollHeight + "px";
      void articleEl.offsetHeight;
      articleEl.style.maxHeight = "0px";
      window.setTimeout(function () {
        if (articleOpen) return;
        articleEl.hidden = true;
        articleEl.innerHTML = "";
        articleEl.style.maxHeight = "";
      }, reduced ? 0 : 1000);
    }

    function expandArticle(item) {
      if (!articleEl || articleLoading) return;
      articleLoading = true;
      articleEl.hidden = false;
      articleEl.classList.add("is-loading");
      articleEl.innerHTML = '<p class="sys-fan__article-loading">Ładowanie opisu…</p>';
      articleEl.style.maxHeight = "4rem";
      fetchCaseHtml(item.href)
        .then(function (html) {
          if (destroyed || clampIndex(Math.round(index), n) !== CASES.indexOf(item) && CASES[clampIndex(Math.round(index), n)].href !== item.href) {
            /* index moved — abort */
            articleLoading = false;
            return;
          }
          var nearest = CASES[clampIndex(Math.round(index), n)];
          if (nearest.id !== item.id && nearest.href !== item.href) {
            articleLoading = false;
            return;
          }
          var body = extractCaseBody(html);
          articleEl.classList.remove("is-loading");
          articleEl.innerHTML = "";
          if (!body) {
            articleEl.innerHTML =
              '<p class="sys-fan__article-fallback">Nie udało się wczytać opisu. <a href="' +
              item.href +
              '">Otwórz stronę realizacji →</a></p>';
          } else {
            articleEl.appendChild(body);
            enhanceInjectedCase(body);
            placeNavInCaseAside(body);
          }
          articleOpen = true;
          root.classList.add("is-article-open");
          articleEl.classList.add("is-open");
          setCaseSnap(true);
          articleEl.style.maxHeight = "0px";
          void articleEl.offsetHeight;
          var full = articleEl.scrollHeight;
          articleEl.style.maxHeight = full + "px";
          /* Stay at top — forced scroll was clipping the sticky head / first tiles */
          var scroller = getScrollParent();
          if (scroller) scroller.scrollTop = 0;
          articleLoading = false;
          articleWheelLock = 0;
          articleSnapIndex = -1;
          window.setTimeout(function () {
            if (articleOpen) articleEl.style.maxHeight = "none";
          }, reduced ? 0 : 1400);
        })
        .catch(function () {
          articleLoading = false;
          articleEl.classList.remove("is-loading");
          articleEl.innerHTML =
            '<p class="sys-fan__article-fallback">Nie udało się wczytać opisu. <a href="' +
            item.href +
            '">Otwórz stronę realizacji →</a></p>';
          articleOpen = true;
          root.classList.add("is-article-open");
          articleEl.classList.add("is-open");
          setCaseSnap(true);
          articleEl.style.maxHeight = "12rem";
        });
    }

    function enhanceInjectedCase(rootEl) {
      if (!rootEl) return;
      rootEl.querySelectorAll(".case-viz-tile").forEach(function (tile) {
        tile.classList.add("is-entered");
      });
    }

    function layout() {
      if (destroyed) return;
      var nearest = clampIndex(Math.round(index), n);
      /* Same geometry in catalog + detail — click only pulls the camera back */
      var span = 172;
      var step = span / Math.max(8, n - 1);
      var radiusX = 78;
      var radiusY = 12;
      var baseScale = 1;

      cards.forEach(function (card, i) {
        var raw = i - index;
        if (raw > n / 2) raw -= n;
        if (raw < -n / 2) raw += n;
        var angDeg = raw * step;
        var ang = (angDeg * Math.PI) / 180;
        var x = Math.sin(ang) * radiusX;
        var y = (1 - Math.cos(ang)) * radiusY;
        var depth = Math.cos(ang);
        var s = baseScale * (0.58 + 0.42 * depth);
        var o = Math.max(0, 0.18 + 0.82 * Math.pow(Math.max(0, depth), 1.05));
        var rot = angDeg * 0.92;
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
        card.style.opacity = String(Math.max(0, Math.min(1, o)));
        card.style.visibility = o < 0.04 ? "hidden" : "visible";
        card.style.pointerEvents = o < 0.12 ? "none" : "auto";
        card.style.zIndex = String(Math.round(20 + depth * 30));
        card.classList.toggle("is-front", i === nearest);
        card.classList.toggle("is-side", Math.abs(raw) > 0.55);
      });

      dotButtons.forEach(function (dot, i) {
        var on = i === nearest;
        dot.classList.toggle("is-active", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });

      if (copyEl && nearest !== painted) {
        if (articleOpen || articleLoading) collapseArticle(false);
        paintCopy(nearest);
        painted = nearest;
        var scroller = getScrollParent();
        if (scroller.scrollTop > 8) {
          if (reduced) scroller.scrollTop = 0;
          else {
            var from = scroller.scrollTop;
            var t0 = performance.now();
            function tick(now) {
              var p = Math.min(1, (now - t0) / 840);
              var e = 1 - Math.pow(1 - p, 4);
              scroller.scrollTop = from * (1 - e);
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          }
        }
      }
      if (typeof opts.onChange === "function") opts.onChange(nearest, CASES[nearest]);
    }

    function paintCopy(i) {
      if (!copyEl) return;
      var item = CASES[i];
      copyEl.classList.add("is-swapping");
      copyEl.innerHTML =
        '<p class="sys-fan__tag"></p>' +
        (item.client ? '<p class="sys-fan__client"></p>' : "") +
        '<h3 class="sys-fan__title"></h3>' +
        '<p class="sys-fan__desc"></p>' +
        '<button type="button" class="sys-fan__more" data-sys-fan-more></button>';
      copyEl.querySelector(".sys-fan__tag").textContent = item.tag;
      if (item.client) copyEl.querySelector(".sys-fan__client").textContent = item.client;
      copyEl.querySelector(".sys-fan__title").textContent = item.title;
      copyEl.querySelector(".sys-fan__desc").textContent = item.desc;
      var more = copyEl.querySelector("[data-sys-fan-more]");
      more.textContent = "Zobacz więcej";
      more.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (articleOpen && !articleLoading) {
          /* already open for this case — soft scroll to it */
          var scroller = getScrollParent();
          var targetTop = Math.min(
            160,
            Math.max(48, Math.round(window.innerHeight * 0.12))
          );
          scroller.scrollTo({ top: targetTop, behavior: reduced ? "auto" : "smooth" });
          return;
        }
        expandArticle(item);
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          copyEl.classList.remove("is-swapping");
        });
      });
    }

    function setIndex(next, animate) {
      var from = index;
      var to = typeof next === "number" ? next : Math.round(index);
      if (!animate || reduced) {
        index = clampIndex(Math.round(to), n);
        layout();
        return;
      }
      var delta = to - from;
      while (delta > n / 2) delta -= n;
      while (delta < -n / 2) delta += n;
      to = from + delta;
      var t0 = performance.now();
      var dur = 1040;
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

    function startAuto() {
      stopAuto();
      if (!autoplay || destroyed) return;
      autoTimer = window.setInterval(function () {
        if (dragging || destroyed) return;
        index += 0.014;
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
      vel = dx * 0.006;
      index -= dx * 0.006;
      while (index < 0) index += n;
      while (index >= n) index -= n;
      layout();
      if (e.cancelable) e.preventDefault();
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      setIndex(index - vel * 8, true);
      if (autoplay) startAuto();
      if (didDrag) {
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
      if (mode === "catalog" && !root.matches(":hover")) return;
      var dominantX = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.15;
      var overStage = !!(e.target && e.target.closest && e.target.closest("[data-sys-fan-stage]"));

      /* After „Zobacz więcej”: one wheel tick → one viz tile (no free salvo scroll) */
      if (mode === "detail" && articleOpen && !dominantX) {
        var dy = e.deltaY;
        if (Math.abs(dy) < 4 && Math.abs(e.deltaX) < 4) return;
        e.preventDefault();
        e.stopPropagation();
        var now = Date.now();
        if (now - articleWheelLock < ARTICLE_WHEEL_MS) return;
        articleWheelLock = now;
        snapArticleBy(dy > 0 ? 1 : -1);
        return;
      }

      var delta = dominantX ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();
      e.stopPropagation();
      stopAuto();
      index += delta > 0 ? 0.18 : -0.18;
      while (index < 0) index += n;
      while (index >= n) index -= n;
      layout();
      window.clearTimeout(onWheel._t);
      onWheel._t = window.setTimeout(function () {
        setIndex(Math.round(index), true);
        if (autoplay) startAuto();
      }, 280);
    }
    root.addEventListener("wheel", onWheel, { passive: false });
    /* Capture on scroller too — wheel often targets article children inside .expand-systems */
    var caseSnapScroller = getScrollParent();
    if (caseSnapScroller && caseSnapScroller !== root) {
      caseSnapScroller.addEventListener("wheel", onWheel, { passive: false });
    }

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
      collapseArticle: function () {
        collapseArticle(true);
      },
      destroy: function () {
        destroyed = true;
        stopAuto();
        setCaseSnap(false);
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        root.removeEventListener("wheel", onWheel);
        if (caseSnapScroller && caseSnapScroller !== root) {
          caseSnapScroller.removeEventListener("wheel", onWheel);
        }
        document.body.classList.remove("is-sys-fan-dragging");
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
