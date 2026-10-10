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
    var fanWheelLock = 0;
    var FAN_WHEEL_MS = 780;

    root.classList.add("sys-fan");
    root.classList.toggle("sys-fan--catalog", mode === "catalog");
    root.classList.toggle("sys-fan--detail", mode === "detail");
    root.innerHTML =
      '<div class="sys-fan__head" data-sys-fan-head>' +
      '<div class="sys-fan__stage" data-sys-fan-stage>' +
      '<div class="sys-fan__arc" data-sys-fan-arc></div>' +
      '<button type="button" class="sys-fan__pill" data-sys-fan-pill></button>' +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__copy" data-sys-fan-copy aria-live="polite"></div>'
        : "") +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__article" data-sys-fan-article hidden></div>'
        : "") +
      '<div class="sys-fan__nav" data-sys-fan-nav aria-label="Nawigacja systemów">' +
      '<svg class="sys-fan__goo-svg" aria-hidden="true"><filter id="sys-fan-goo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></svg>' +
      '<div class="sys-fan__nav-goo">' +
      '<div class="sys-fan__semi" aria-hidden="true"></div>' +
      '<div class="sys-fan__ring" data-sys-fan-dots role="tablist" aria-label="Systemy"></div>' +
      "</div>" +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-prev aria-label="Poprzedni"></button>' +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-next aria-label="Następny"></button>' +
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
      var disc = document.createElement("span");
      disc.className = "sys-fan__disc";
      var img = document.createElement("img");
      img.src = item.img;
      img.alt = item.title;
      img.decoding = "async";
      img.draggable = false;
      disc.appendChild(img);
      fig.appendChild(disc);
      fig.addEventListener("click", function () {
        if (Math.abs(vel) > 0.08 || didDrag) return;
        if (mode === "catalog" && i === clampIndex(Math.round(index), n)) {
          playIris();
          return;
        }
        setIndex(i, true);
      });
      arc.appendChild(fig);
      cards.push(fig);
    });

    var pill = root.querySelector("[data-sys-fan-pill]");
    function pillLabel() {
      var t =
        window.cosgralI18n && window.cosgralI18n.t && window.cosgralI18n.t("portfolio.view_more");
      return String(t || "Zobacz więcej").replace(/\s*→\s*$/, "");
    }
    if (pill) {
      pill.textContent = pillLabel();
      pill.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        didDrag = false;
      });
      pill.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (mode === "catalog") {
          playIris();
          return;
        }
        var item = CASES[clampIndex(Math.round(index), n)];
        if (item) expandArticle(item);
      });
    }
    window.addEventListener("cosgral:langchange", function () {
      if (pill) pill.textContent = pillLabel();
    });

    function getScrollParent() {
      if (scrollParent && scrollParent.isConnected) return scrollParent;
      scrollParent = root.closest(".expand-systems") || root;
      return scrollParent;
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
          articleEl.style.maxHeight = "0px";
          void articleEl.offsetHeight;
          var full = articleEl.scrollHeight;
          articleEl.style.maxHeight = full + "px";
          /* Stay at top — forced scroll was clipping the sticky head / first tiles */
          var scroller = getScrollParent();
          if (scroller) scroller.scrollTop = 0;
          articleLoading = false;
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
          articleEl.style.maxHeight = "12rem";
        });
    }

    function enhanceInjectedCase(rootEl) {
      if (!rootEl) return;
      rootEl.querySelectorAll(".case-viz-tile").forEach(function (tile) {
        tile.classList.add("is-entered");
      });
    }

    var metrics = { w: 1, h: 1, mobile: false };
    function readMetrics() {
      metrics.w = stage.clientWidth || window.innerWidth || 1;
      metrics.h = stage.clientHeight || window.innerHeight * 0.55 || 1;
      metrics.mobile = (window.innerWidth || metrics.w) < 760;
    }
    readMetrics();
    window.addEventListener("resize", function () {
      readMetrics();
      layout();
    });
    var chapterScroller = root.closest("[data-chapters-scroller]");
    if (chapterScroller) {
      chapterScroller.addEventListener(
        "scroll",
        function () {
          layout();
        },
        { passive: true }
      );
    }

    function clusterSlot(k, w, h, mobile) {
      var table = mobile
        ? {
            "0": { x: -w * 0.02, y: -h * 0.1, s: 0.78 },
            "1": { x: w * 0.18, y: h * 0.02, s: 0.42 },
            "-1": { x: -w * 0.2, y: h * 0.04, s: 0.46 },
            "2": { x: w * 0.08, y: -h * 0.22, s: 0.28 },
            "-2": { x: -w * 0.1, y: -h * 0.2, s: 0.26 },
          }
        : {
            "0": { x: -w * 0.1, y: -h * 0.02, s: 0.86 },
            "1": { x: w * 0.04, y: h * 0.16, s: 0.42 },
            "-1": { x: -w * 0.26, y: h * 0.1, s: 0.5 },
            "2": { x: -w * 0.02, y: -h * 0.22, s: 0.3 },
            "-2": { x: -w * 0.24, y: -h * 0.18, s: 0.28 },
          };
      return table[String(k)] || null;
    }

    function lerpSlot(a, b, t) {
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        s: a.s + (b.s - a.s) * t,
      };
    }

    /* cubic-bezier(.25, 1, .5, 1) — y controls are both 1 */
    function swipeEase(t) {
      var u = t;
      var i;
      for (i = 0; i < 8; i++) {
        var x =
          3 * (1 - u) * (1 - u) * u * 0.25 +
          3 * (1 - u) * u * u * 0.5 +
          u * u * u;
        var dx =
          3 * (1 - u) * (1 - u) * 0.25 +
          6 * (1 - u) * u * (0.5 - 0.25) +
          3 * u * u * (1 - 0.5);
        if (Math.abs(dx) < 1e-5) break;
        u -= (x - t) / dx;
        if (u < 0) u = 0;
        if (u > 1) u = 1;
      }
      return 3 * u - 3 * u * u + u * u * u;
    }

    function wrapRaw(i) {
      var raw = i - index;
      if (raw > n / 2) raw -= n;
      if (raw < -n / 2) raw += n;
      return raw;
    }

    function circlePose(raw) {
      var vw = window.innerWidth || 480;
      var vh = window.innerHeight || 600;
      var ad = Math.abs(raw);
      var x = vw * (0.5 + raw * 0.5);
      var y = ad < 1 ? vh * (0.4075 + (0.515 - 0.4075) * ad) : vh * 0.515;
      var o = ad > 1.05 ? Math.max(0, 1 - (ad - 1.05) / 0.4) : 1;
      return { x: x, y: y, s: 1, o: o };
    }

    var pillTimer = 0;
    function pillOut() {
      if (!pill) return;
      pill.classList.remove("is-in");
      pill.classList.add("is-out");
    }
    function pillIn() {
      if (!pill || root.classList.contains("is-iris-open")) return;
      pill.classList.remove("is-out");
      pill.classList.add("is-in");
    }

    function layout() {
      if (destroyed) return;
      var nearest = clampIndex(Math.round(index), n);
      var stageRect = stage.getBoundingClientRect();
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;

      cards.forEach(function (card, i) {
        var raw = wrapRaw(i);
        var pose = circlePose(raw);
        var ad = Math.abs(raw);
        card.style.left = pose.x - stageRect.left + "px";
        card.style.top = pose.y - stageRect.top + "px";
        card.style.transform =
          "translate(-50%, -50%) scale(" + pose.s.toFixed(4) + ")";
        card.style.opacity = String(Math.max(0, Math.min(1, pose.o)));
        card.style.visibility = pose.o < 0.04 ? "hidden" : "visible";
        card.style.pointerEvents = ad < 0.45 || pose.o < 0.12 ? (ad < 0.45 ? "auto" : "none") : "auto";
        if (pose.o < 0.12) card.style.pointerEvents = "none";
        card.style.zIndex = String(Math.round(30 - ad * 8));
        card.classList.toggle("is-front", i === nearest);
        card.classList.toggle("is-side", ad > 0.55);
      });

      if (pill && mode === "catalog") {
        var slot = circlePose(0);
        pill.style.left = slot.x - stageRect.left + "px";
        pill.style.top = slot.y - stageRect.top + vw * 0.045 + "px";
      }

      var navRect = navEl.getBoundingClientRect();
      var arcCx = vw * 0.5;
      var arcCy = vh * 0.989;
      var arcR = vw * 0.2925;
      dotButtons.forEach(function (dot, i) {
        var raw = wrapRaw(i);
        var ang = raw * 47.5 * (Math.PI / 180);
        var x = arcCx + Math.sin(ang) * arcR;
        var y = arcCy - Math.cos(ang) * arcR;
        var on = i === nearest;
        var show = Math.abs(raw) < 2.35 && y < vh + 4;
        dot.style.left = x - navRect.left + "px";
        dot.style.top = y - navRect.top + "px";
        dot.style.opacity = show ? "1" : "0";
        dot.style.pointerEvents = show ? "auto" : "none";
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
        pillIn();
        return;
      }
      var delta = to - from;
      while (delta > n / 2) delta -= n;
      while (delta < -n / 2) delta += n;
      if (Math.abs(delta) < 0.001) {
        index = clampIndex(Math.round(from), n);
        layout();
        pillIn();
        return;
      }
      to = from + delta;
      pillOut();
      if (pillTimer) window.clearTimeout(pillTimer);
      var t0 = performance.now();
      var dur = 800;
      if (raf) cancelAnimationFrame(raf);
      function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = swipeEase(p);
        index = from + (to - from) * e;
        layout();
        if (p < 1) raf = requestAnimationFrame(tick);
        else {
          index = clampIndex(Math.round(to), n);
          layout();
          raf = 0;
          pillTimer = window.setTimeout(pillIn, 0);
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
      if (!autoplay || destroyed || reduced) return;
      autoTimer = window.setInterval(function () {
        if (dragging || destroyed || document.hidden) return;
        nudge(1);
      }, 6400);
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
      pillOut();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
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
      var pxPer = Math.max(88, (metrics.w || window.innerWidth || 360) * (metrics.mobile ? 0.34 : 0.22));
      vel = dx / pxPer;
      index -= dx / pxPer;
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
      /* Rozwinięty opis — wolny natywny scroll, nie przełączaj systemów */
      if (
        mode === "detail" &&
        articleOpen &&
        e.target &&
        e.target.closest &&
        e.target.closest("[data-sys-fan-article]")
      ) {
        return;
      }
      if (mode === "catalog" && !root.matches(":hover")) return;
      var dominantX = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.15;
      /* Detail + article open: vertical outside stage scrolls the case slowly */
      if (
        mode === "detail" &&
        articleOpen &&
        !dominantX &&
        !(e.target && e.target.closest && e.target.closest("[data-sys-fan-stage]"))
      ) {
        return;
      }
      var delta = dominantX ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();
      e.stopPropagation();
      /* Jeden scroll = jeden kafelek systemu / automatyzacji */
      var now = Date.now();
      if (now - fanWheelLock < FAN_WHEEL_MS) return;
      fanWheelLock = now;
      nudge(delta > 0 ? 1 : -1);
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    layout();
    requestAnimationFrame(function () {
      if (destroyed) return;
      readMetrics();
      layout();
      pillIn();
    });
    if (autoplay) startAuto();

    var irisEl = null;
    var irisOpen = false;

    function scrollWord() {
      var t = window.cosgralI18n && window.cosgralI18n.t && window.cosgralI18n.t("hero.scroll");
      return t || "Przewiń";
    }

    function buildIris(item, prev, next, rect) {
      var el = document.createElement("div");
      el.className = "sys-iris";
      el.innerHTML =
        '<svg class="sys-fan__goo-svg" aria-hidden="true"><filter id="sys-iris-goo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></svg>' +
        '<div class="sys-iris__disc"></div>' +
        '<div class="sys-iris__sat sys-iris__sat--a"><img alt=""></div>' +
        '<div class="sys-iris__sat sys-iris__sat--b"><img alt=""></div>' +
        '<div class="sys-iris__sat sys-iris__sat--c"><img alt=""></div>' +
        '<div class="sys-iris__hint"><span data-iris-scroll></span><div class="sys-iris__dots" aria-hidden="true"><i></i><i></i><i></i></div></div>' +
        '<div class="sys-iris__copy"><p class="sys-iris__kicker"></p><h3 class="sys-iris__h"></h3><p class="sys-iris__p"></p><a class="sys-iris__more"></a></div>' +
        '<div class="sys-iris__nav"><div class="sys-iris__nav-goo"><div class="sys-iris__semi"></div><div class="sys-iris__neck"></div></div></div>';
      var sats = el.querySelectorAll(".sys-iris__sat");
      var imgs = [item, prev, next];
      for (var s = 0; s < sats.length; s++) {
        var img = sats[s].querySelector("img");
        img.src = imgs[s].img;
        img.alt = imgs[s].title;
      }
      el.querySelector("[data-iris-scroll]").textContent = scrollWord();
      el.querySelector(".sys-iris__kicker").textContent = item.tag || "";
      el.querySelector(".sys-iris__h").textContent = item.title || "";
      el.querySelector(".sys-iris__p").textContent = item.desc || "";
      var more = el.querySelector(".sys-iris__more");
      more.href = item.href || "#";
      more.textContent = pillLabel();
      var disc = el.querySelector(".sys-iris__disc");
      disc.style.left = rect.left + "px";
      disc.style.top = rect.top + "px";
      disc.style.width = rect.width + "px";
      disc.style.height = rect.height + "px";
      return el;
    }

    function placeSats(el, cx, cy, open) {
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      var targets = open
        ? [
            { x: vw * 0.506, y: vh * 0.513 },
            { x: vw * 0.41, y: vh * 0.329 },
            { x: vw * 0.636, y: vh * 0.36 },
          ]
        : [
            { x: cx, y: cy },
            { x: cx, y: cy },
            { x: cx, y: cy },
          ];
      var sats = el.querySelectorAll(".sys-iris__sat");
      for (var s = 0; s < sats.length; s++) {
        sats[s].style.left = targets[s].x + "px";
        sats[s].style.top = targets[s].y + "px";
      }
    }

    function playIris() {
      if (destroyed || mode !== "catalog" || irisOpen) return;
      stopAuto();
      var i = clampIndex(Math.round(index), n);
      var item = CASES[i];
      var prev = CASES[(i - 1 + n) % n];
      var next = CASES[(i + 1) % n];
      var rect = cards[i].getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      pillOut();
      root.classList.add("is-iris-open");
      var el = buildIris(item, prev, next, rect);
      placeSats(el, cx, cy, false);
      el.querySelectorAll(".sys-iris__sat").forEach(function (sat) {
        sat.style.transition = "none";
      });
      document.body.appendChild(el);
      irisEl = el;
      irisOpen = true;
      el.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("a")) return;
        closeIris();
      });
      if (reduced) {
        el.classList.add("is-open");
        placeSats(el, cx, cy, true);
        return;
      }
      requestAnimationFrame(function () {
        if (!irisEl) return;
        el.querySelectorAll(".sys-iris__sat").forEach(function (sat) {
          sat.style.transition = "";
        });
        requestAnimationFrame(function () {
          if (!irisEl) return;
          placeSats(el, cx, cy, true);
          el.classList.add("is-open");
        });
      });
    }

    function closeIris(done) {
      if (!irisEl) {
        irisOpen = false;
        if (done) done();
        return;
      }
      var el = irisEl;
      var disc = el.querySelector(".sys-iris__disc");
      var rect = disc
        ? disc.getBoundingClientRect()
        : cards[clampIndex(Math.round(index), n)].getBoundingClientRect();
      /* disc is scaled; its layout box is still the original rect via left/top/width */
      var cx = (parseFloat(disc.style.left) || 0) + (parseFloat(disc.style.width) || 0) / 2;
      var cy = (parseFloat(disc.style.top) || 0) + (parseFloat(disc.style.height) || 0) / 2;
      el.classList.remove("is-open");
      el.classList.add("is-closing");
      placeSats(el, cx, cy, false);
      root.classList.remove("is-iris-open");
      var wait = reduced ? 0 : 900;
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (irisEl === el) {
          irisEl = null;
          irisOpen = false;
        }
        pillIn();
        if (autoplay) startAuto();
        if (done) done();
      }, wait);
      void rect;
    }

    function onIrisKey(e) {
      if (!irisOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeIris();
      }
    }
    window.addEventListener("keydown", onIrisKey);

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
      playIris: playIris,
      closeIris: closeIris,
      isIrisOpen: function () {
        return irisOpen;
      },
      destroy: function () {
        destroyed = true;
        stopAuto();
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("keydown", onIrisKey);
        if (irisEl && irisEl.parentNode) irisEl.parentNode.removeChild(irisEl);
        window.removeEventListener("resize", readMetrics);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        root.removeEventListener("wheel", onWheel);
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
