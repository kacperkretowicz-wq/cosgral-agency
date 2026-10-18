/**
 * Systems fan (wachlarz) — arc carousel shared by catalog + expand.
 * Catalog: larger, slow auto-rotate.
 * Detail: manual drag + short copy; "Zobacz więcej" expands full case under the fan.
 */
(function () {
  "use strict";

  var STILL = "portfolio-media/showcase/chapter-stills/systems/bw/";

  var CASES_PL = [
    { id: "tfo-crm",      href: "portfolio-telforceone-crm.html",     tag: "CRM / sprzedaż terenowa",  client: "TelForceOne S.A.", title: "CRM z mapą handlowców",          desc: "Handlowcy jeździli z Excelami i notatkami w telefonie — nikt nie wiedział, kto u kogo był. CRM z mapą zbiera klientów, trasy i raporty dnia w jednym miejscu, więc planowanie wizyt zajmuje minuty zamiast godziny.", img: STILL + "ui-crm-map-bw.jpg" },
    { id: "tfo-code39",   href: "portfolio-telforceone-code39.html",   tag: "Narzędzie / identyfikacja", client: "TelForceOne S.A.", title: "Generator kodów Code 39",        desc: "Etykiety powstawały w kilku narzędziach i często wracały ze skanera jako błąd. Generator daje podgląd Code 39 i batch do druku — oznaczenie SKU w sekundach, bez poprawek na magazynie.", img: STILL + "ui-barcode-bw.jpg" },
    { id: "tfo-forecast", href: "portfolio-telforceone-forecast.html", tag: "Analityka / zapasy",        client: "TelForceOne S.A.", title: "Stany i prognozowanie",          desc: "Zakupy szły \u201ena wyczucie\u201f: braki na półce albo zamrożony towar. Panel łączy stany, rotację i prognozę z alertami — widać, co dokupić zanim sprzedaż stanie.", img: STILL + "ui-forecast-bw.jpg" },
    { id: "trove-panel",  href: "portfolio-trove-panel.html",          tag: "Aplikacja",                 client: "Trove",            title: "Panel sklepu i monitoring cen",  desc: "Trove ręcznie porównywało ceny na Allegro i własnym sklepie w arkuszach. Panel zbiera stany i ceny kanałów z alertami przecen — reakcja na spadek marży tego samego dnia, nie po tygodniu.", img: STILL + "ui-price-monitor-bw.jpg" },
    { id: "crm-leady",    href: "portfolio-crm-leady.html",            tag: "CRM",                       client: "",                 title: "CRM leadów i dealów",            desc: "Leady ginęły między skrzynką, czatem i karteczkami — follow-upy się spóźniały. CRM prowadzi od pierwszego kontaktu do deala: pipeline, notatki i przypomnienia w jednym lejku.", img: STILL + "ui-kanban-bw.jpg" },
    { id: "chatbot",      href: "portfolio-chatbot-ai.html",           tag: "Automatyzacja",             client: "",                 title: "Chatbot AI dla klientów",        desc: "Po godzinach Instagram i Messenger zasypywały te same pytania, a zespół odpisywał rano z opóźnieniem. Bot zamyka FAQ 24/7, zbiera lead i oddaje rozmowę konsultantowi z kontekstem.", img: STILL + "ui-chatbot-bw.jpg" },
    { id: "trove-flow",   href: "portfolio-trove-workflow.html",       tag: "Automatyzacja",             client: "Trove",            title: "Zamówienie \u2192 faktura \u2192 paczka", desc: "Każde zamówienie Trove wymagało ręcznego klejenia faktury, statusu i maila do klienta. Workflow odpala cały łańcuch sam — mniej klikania, mniej pomyłek przy fulfillmentcie.", img: STILL + "ui-invoice-flow-bw.jpg" },
    { id: "ai-agent",     href: "portfolio-chatbot-ai.html",           tag: "Automatyzacja",             client: "",                 title: "Agent AI i integracje",          desc: "Chat, mail i CRM żyły osobno — handoff to było kopiuj-wklej. Agent łączy kanały w jednym przepływie: klasyfikuje sprawę, uzupełnia kartę i przekazuje ją właściwej osobie.", img: STILL + "ui-ai-agent-bw.jpg" },
    { id: "shelf",        href: "portfolio-trove-panel.html",          tag: "Aplikacja",                 client: "Trove",            title: "Shelf Sync",                     desc: "Produkt znikał z półki sprzedażowej, zanim magazyn zdążył zareagować. Shelf Sync pilnuje widoczności stanów i alarmuje, gdy oferta wypada z rynku.", img: STILL + "ui-shelf-sync-bw.jpg" },
    { id: "kpi",          href: "portfolio-telforceone-forecast.html", tag: "Analityka",                 client: "TelForceOne S.A.", title: "KPI board",                      desc: "Raporty tygodnia powstawały z kilku Exceli i zajmowały pół dnia. Board pokazuje sprzedaż i operacje na żywo — puls firmy bez budowania tabel od zera.", img: STILL + "ui-kpi-board-bw.jpg" },
    { id: "network",      href: "portfolio-trove-workflow.html",       tag: "Automatyzacja",             client: "",                 title: "Graf workflow",                  desc: "Automatyzacje siedziały w głowie jednej osoby albo w chaotycznych regułach. Graf pokazuje triggery, warunki i akcje — łatwiej utrzymać proces i dokładać kolejne kroki.", img: STILL + "ui-network-bw.jpg" },
  ];

  var CASES_EN = [
    { id: "tfo-crm",      href: "portfolio-telforceone-crm.html",     tag: "CRM / field sales",        client: "TelForceOne S.A.", title: "Sales rep map CRM",              desc: "Sales reps drove around with Excel files and phone notes — no one knew who had visited whom. The map CRM gathers clients, routes and daily reports in one place, so trip planning takes minutes instead of hours.", img: STILL + "ui-crm-map-bw.jpg" },
    { id: "tfo-code39",   href: "portfolio-telforceone-code39.html",   tag: "Tool / identification",    client: "TelForceOne S.A.", title: "Code 39 barcode generator",      desc: "Labels were created in multiple tools and often came back from the scanner as errors. The generator provides a Code 39 preview and batch print — SKU labelling in seconds, no warehouse corrections.", img: STILL + "ui-barcode-bw.jpg" },
    { id: "tfo-forecast", href: "portfolio-telforceone-forecast.html", tag: "Analytics / inventory",    client: "TelForceOne S.A.", title: "Stock levels & forecasting",     desc: "Purchases were made by gut feeling: empty shelves or frozen stock. The dashboard combines levels, turnover and forecast with alerts — see what to reorder before sales stop.", img: STILL + "ui-forecast-bw.jpg" },
    { id: "trove-panel",  href: "portfolio-trove-panel.html",          tag: "Application",              client: "Trove",            title: "Store panel & price monitoring", desc: "Trove manually compared prices on Allegro and its own store using spreadsheets. The panel aggregates stock and channel prices with discount alerts — react to margin drops the same day, not after a week.", img: STILL + "ui-price-monitor-bw.jpg" },
    { id: "crm-leady",    href: "portfolio-crm-leady.html",            tag: "CRM",                      client: "",                 title: "Leads & deals CRM",              desc: "Leads got lost between inbox, chat and sticky notes — follow-ups were late. The CRM guides from first contact to deal: pipeline, notes and reminders in one funnel.", img: STILL + "ui-kanban-bw.jpg" },
    { id: "chatbot",      href: "portfolio-chatbot-ai.html",           tag: "Automation",               client: "",                 title: "AI chatbot for clients",         desc: "After hours Instagram and Messenger were flooded with the same questions, and the team replied in the morning with delays. The bot handles FAQ 24/7, captures leads and hands off conversations to consultants with context.", img: STILL + "ui-chatbot-bw.jpg" },
    { id: "trove-flow",   href: "portfolio-trove-workflow.html",       tag: "Automation",               client: "Trove",            title: "Order \u2192 invoice \u2192 parcel", desc: "Every Trove order required manually stitching together an invoice, status and customer email. The workflow fires the whole chain automatically — less clicking, fewer fulfilment errors.", img: STILL + "ui-invoice-flow-bw.jpg" },
    { id: "ai-agent",     href: "portfolio-chatbot-ai.html",           tag: "Automation",               client: "",                 title: "AI agent & integrations",        desc: "Chat, email and CRM lived separately — handoff was copy-paste. The agent connects channels in one flow: classifies the issue, fills the card and routes it to the right person.", img: STILL + "ui-ai-agent-bw.jpg" },
    { id: "shelf",        href: "portfolio-trove-panel.html",          tag: "Application",              client: "Trove",            title: "Shelf Sync",                     desc: "Products vanished from the sales shelf before the warehouse could react. Shelf Sync monitors stock visibility and alerts when a listing drops off the market.", img: STILL + "ui-shelf-sync-bw.jpg" },
    { id: "kpi",          href: "portfolio-telforceone-forecast.html", tag: "Analytics",                client: "TelForceOne S.A.", title: "KPI board",                      desc: "Weekly reports were built from multiple Excel files and took half a day. The board shows sales and operations live — company pulse without building tables from scratch.", img: STILL + "ui-kpi-board-bw.jpg" },
    { id: "network",      href: "portfolio-trove-workflow.html",       tag: "Automation",               client: "",                 title: "Workflow graph",                 desc: "Automations lived in one person's head or in chaotic rules. The graph shows triggers, conditions and actions — easier to maintain the process and add steps.", img: STILL + "ui-network-bw.jpg" },
  ];

  function getCases() {
    var lang = (window.cosgralI18n && window.cosgralI18n.getLang && window.cosgralI18n.getLang()) || "pl";
    return lang === "en" ? CASES_EN : CASES_PL;
  }

  var CASES = getCases();

  var instances = [];
  var pageCache = {};

  /* Each case as a homepage-style poster tile: one ground, one graphic, one
     loud line of type. */
  var BARS = '<div class="sys-art__bars"><i style="--h:.34"></i><i style="--h:.52"></i><i style="--h:.41"></i><i style="--h:.66"></i><i style="--h:.58"></i><i style="--h:.8"></i><i style="--h:.96"></i></div>';
  var DECOR = {
    map: '<svg class="sys-art__map" viewBox="0 0 400 320" fill="none"><path d="M18 250C70 230 92 160 150 168S226 246 280 206 330 84 384 70" stroke="currentColor" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/><ellipse cx="200" cy="160" rx="176" ry="70" transform="rotate(-24 200 160)" stroke="currentColor" stroke-opacity=".22"/><circle cx="150" cy="168" r="7" fill="#ff482b"/><circle cx="280" cy="206" r="5" stroke="currentColor"/><circle cx="384" cy="70" r="11" stroke="currentColor"/><circle cx="384" cy="70" r="3" fill="currentColor"/></svg>',
    barcode: '<div class="sys-art__barcode"></div>',
    bars: BARS,
    price: '<div class="sys-art__halftone"></div><div class="sys-art__ticket"><span>PLN</span></div>',
    sheets: '<div class="sys-art__sheet"></div><div class="sys-art__sheet"></div><div class="sys-art__sheet"></div>',
    chat: '<div class="sys-art__bubble"></div><div class="sys-art__bubble"></div><div class="sys-art__bubble"></div>',
    focus: '<div class="sys-art__focus"></div>',
    prism: '<div class="sys-art__prism"></div>',
    halftone: '<div class="sys-art__halftone"></div>',
    spark: '<svg class="sys-art__spark" viewBox="0 0 400 200" fill="none"><path d="M0 170L48 150 96 158 144 118 192 128 240 84 288 96 336 46 400 22" stroke="currentColor" stroke-width="3"/><path d="M0 170L48 150 96 158 144 118 192 128 240 84 288 96 336 46 400 22V200H0Z" fill="currentColor" fill-opacity=".08"/><circle cx="400" cy="22" r="8" fill="#ff482b"/></svg>',
    graph: '<svg class="sys-art__graph" viewBox="0 0 400 320" fill="none"><g stroke="currentColor" stroke-opacity=".5"><path d="M70 70L200 150 330 60M200 150L120 260M200 150L320 250M330 60L320 250"/></g><circle cx="70" cy="70" r="16" stroke="currentColor"/><circle cx="330" cy="60" r="12" stroke="currentColor"/><circle cx="200" cy="150" r="26" fill="#ff482b"/><circle cx="120" cy="260" r="12" stroke="currentColor"/><circle cx="320" cy="250" r="18" stroke="currentColor"/></svg>'
  };
  var ART = {
    "tfo-crm": { tone: "carbon", kind: "map", pl: "Mapa.<br>Trasa.<br>Raport.", en: "Map.<br>Route.<br>Report." },
    "tfo-code39": { tone: "paper", kind: "barcode", pl: "*SKU<br>039*", en: "*SKU<br>039*" },
    "tfo-forecast": { tone: "steel", kind: "bars", pl: "Zanim<br><em>zabraknie.</em>", en: "Before<br><em>it runs out.</em>" },
    "trove-panel": { tone: "hot", kind: "price", pl: "Cena<br>pod<br>kontrolą.", en: "Price<br>under<br>control." },
    "crm-leady": { tone: "stone", kind: "sheets", pl: "Lead.<br>Deal.<br>Done.", en: "Lead.<br>Deal.<br>Done." },
    "chatbot": { tone: "carbon", kind: "chat", pl: "24/7.", en: "24/7." },
    "trove-flow": { tone: "hot", kind: "focus", pl: "Zamów.<br>Faktura.<br>Paczka.", en: "Order.<br>Invoice.<br>Parcel." },
    "ai-agent": { tone: "ink", kind: "prism", pl: "AGENT<br>AI.", en: "AGENT<br>AI." },
    "shelf": { tone: "paper", kind: "halftone", pl: "Zawsze<br><em>na półce.</em>", en: "Always<br><em>on shelf.</em>" },
    "kpi": { tone: "stone", kind: "spark", pl: "Puls<br>firmy.", en: "Company<br>pulse." },
    "network": { tone: "carbon", kind: "graph", pl: "IF →<br>THEN.", en: "IF →<br>THEN." }
  };
  function artFor(item) {
    var art = ART[item.id] || { tone: "carbon", kind: "graph", pl: item.title, en: item.title };
    var lang = (document.documentElement.lang || "pl").toLowerCase().indexOf("en") === 0 ? "en" : "pl";
    return { tone: art.tone, kind: art.kind, html: (DECOR[art.kind] || "") + '<strong class="sys-art__type">' + art[lang] + "</strong>" };
  }

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
    var currentCases = getCases();
    var n = currentCases.length;
    var index = typeof opts.index === "number" ? clampIndex(opts.index, currentCases.length) : 0;
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
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__copy" data-sys-fan-copy aria-live="polite"></div>'
        : "") +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__article" data-sys-fan-article hidden></div>'
        : "") +
      '<div class="sys-fan__nav" data-sys-fan-nav>' +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-prev data-i18n-aria-label="portfolio.systems_prev">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M10.2 2.6L5.4 8l4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<div class="sys-fan__dots" data-sys-fan-dots role="tablist" data-i18n-aria-label="portfolio.systems_dots"></div>' +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-next data-i18n-aria-label="portfolio.systems_next">' +
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

    currentCases.forEach(function (item, i) {
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

    currentCases.forEach(function (item, i) {
      var art = artFor(item);
      var fig = document.createElement("figure");
      fig.className = "sys-fan__card sys-fan__card--" + art.tone + " sys-fan__card--" + art.kind;
      fig.setAttribute("data-sys-fan-card", String(i));
      fig.setAttribute("data-case-id", item.id);
      fig.setAttribute("aria-label", item.title);
      var top = document.createElement("div");
      top.className = "sys-tile__top";
      var num = document.createElement("span");
      num.textContent = (i < 9 ? "0" : "") + (i + 1) + " / COSGRAL";
      var tag = document.createElement("span");
      tag.textContent = item.tag;
      top.appendChild(num);
      top.appendChild(tag);
      fig.appendChild(top);
      var artEl = document.createElement("div");
      artEl.className = "sys-art sys-art--" + art.kind;
      artEl.setAttribute("aria-hidden", "true");
      artEl.innerHTML = art.html;
      fig.appendChild(artEl);
      var cap = document.createElement("figcaption");
      cap.className = "sys-fan__cap";
      var title = document.createElement("span");
      title.className = "sys-tile__title";
      title.textContent = item.title;
      var arrow = document.createElement("i");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      cap.appendChild(title);
      cap.appendChild(arrow);
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
      articleEl.innerHTML = '<p class="sys-fan__article-loading">' + ((window.cosgralI18n && window.cosgralI18n.t("portfolio.loading")) || "Loading…") + '</p>';
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
            articleEl.innerHTML = '<p class="sys-fan__article-fallback">' + (function(){ var i = window.cosgralI18n; return (i&&i.t('portfolio.case_fallback')||'Could not load description.') + ' <a href="' + item.href + '">' + (i&&i.t('portfolio.open_case_link')||'Open case study →') + '</a>'; })() + '</p>';
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
          articleEl.innerHTML = '<p class="sys-fan__article-fallback">' + (function(){ var i = window.cosgralI18n; return (i&&i.t('portfolio.case_fallback')||'Could not load description.') + ' <a href="' + item.href + '">' + (i&&i.t('portfolio.open_case_link')||'Open case study →') + '</a>'; })() + '</p>';
          articleOpen = true;
          root.classList.add("is-article-open");
          articleEl.classList.add("is-open");
          articleEl.style.maxHeight = "12rem";
        });
    }

    function applyI18nToNode(rootEl) {
      if (!rootEl) return;
      var i18n = window.cosgralI18n;
      if (!i18n || !i18n.t) return;
      var lang = i18n.getLang ? i18n.getLang() : "pl";
      rootEl.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var val = i18n.t(key);
        if (val == null) return;
        if (el.hasAttribute("data-i18n-html")) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      });
      rootEl.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
        var v = i18n.t(el.getAttribute("data-i18n-aria-label"));
        if (v != null) el.setAttribute("aria-label", v);
      });
      rootEl.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        var v = i18n.t(el.getAttribute("data-i18n-title"));
        if (v != null) el.setAttribute("title", v);
      });
    }

    function enhanceInjectedCase(rootEl) {
      if (!rootEl) return;
      rootEl.querySelectorAll(".case-viz-tile").forEach(function (tile) {
        tile.classList.add("is-entered");
      });
      /* Translate any data-i18n nodes fetched from raw HTML */
      applyI18nToNode(rootEl);
    }

    function layout() {
      if (destroyed) return;
      var nearest = clampIndex(Math.round(index), n);
      /* One straight row in catalog and detail alike; it runs past both edges
         of the screen and opening a case only pulls the camera back. */
      var cardW = cards[0] ? cards[0].offsetWidth || 280 : 280;
      var step = cardW * 1.1;
      var reach = window.innerWidth / 2 + cardW;

      cards.forEach(function (card, i) {
        var raw = i - index;
        if (raw > n / 2) raw -= n;
        if (raw < -n / 2) raw += n;
        var x = raw * step;
        var near = Math.min(1, Math.abs(raw));
        var s = 1 - near * 0.05;
        card.style.transform =
          "translate3d(calc(-50% + " + x.toFixed(2) + "px), -50%, 0) scale(" + s.toFixed(3) + ")";
        card.style.opacity = "1";
        var off = Math.abs(x) > reach;
        card.style.visibility = off ? "hidden" : "visible";
        card.style.pointerEvents = off ? "none" : "auto";
        card.style.zIndex = String(Math.round(50 - Math.abs(raw) * 4));
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
      var currentCases = getCases();
      var item = currentCases[i] || currentCases[0];
      if (!item) return;
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
      more.textContent = (window.cosgralI18n && window.cosgralI18n.t("portfolio.view_more_aria")) || (getCases() === CASES_EN ? "See more" : "Zobacz więcej");
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
      refresh: function () {
        /* Re-paint current card with updated language data */
        var currentCases = getCases();
        n = currentCases.length;
        api.cases = currentCases;
        /* Update i18n aria-labels for prev/next/dots via cosgralI18n.t */
        var t = window.cosgralI18n && window.cosgralI18n.t;
        var prevEl = root.querySelector("[data-sys-fan-prev]");
        if (prevEl && t) prevEl.setAttribute("aria-label", t("portfolio.systems_prev"));
        var nextEl = root.querySelector("[data-sys-fan-next]");
        if (nextEl && t) nextEl.setAttribute("aria-label", t("portfolio.systems_next"));
        var dotsEl = root.querySelector("[data-sys-fan-dots]");
        if (dotsEl) {
          if (t) dotsEl.setAttribute("aria-label", t("portfolio.systems_dots"));
          /* Redraw dots with new aria-labels */
          Array.prototype.forEach.call(dotsEl.querySelectorAll("button"), function (dot, di) {
            dot.setAttribute("aria-label", currentCases[di] ? currentCases[di].title : "");
          });
        }
        /* Repaint current card copy */
        var idx = clampIndex(Math.round(index), n);
        paintCopy(idx);
      },
      destroy: function () {
        destroyed = true;
        stopAuto();
        if (raf) cancelAnimationFrame(raf);
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

  /* Re-render all fans when language changes or i18n becomes ready */
  function refreshAllFans() {
    CASES = getCases();
    window.CosgralSystemsFan.cases = CASES;
    instances.forEach(function (inst) {
      if (inst && inst.refresh) inst.refresh();
    });
  }
  window.addEventListener("cosgral:langchange", refreshAllFans);
  window.addEventListener("cosgral:i18n-ready", refreshAllFans);
})();
