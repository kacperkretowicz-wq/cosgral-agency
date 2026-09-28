/**
 * Realizacje expand — tiles morph into the final layout (no disappear handoff).
 * Click empty chrome (not a tile/card) to reverse. No back button.
 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-tile-expand-stage]");
  var bodyEl = document.querySelector("[data-expand-body]");
  var root = document.querySelector("[data-portfolio-tiles]");
  if (!stage || !bodyEl || !root) return;
  if (stage.parentElement !== document.body) {
    document.body.appendChild(stage);
  }

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var expandedKey = null;
  var deckIndex = 0;
  var deckCards = [];
  var deckRaf = 0;
  var manifests = { reels: null, graphics: null };
  var pageCache = {};
  var closing = false;
  var activeGhosts = [];
  var systemsDetailFan = null;
  var openChapter = null;
  var videoOpenState = null;
  var webDetailOpen = false;
  var catalogRevealTimer = 0;
  var ghostClearTimer = 0;

  function shuffleList(list) {
    var a = Array.prototype.slice.call(list);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function clearInlineReveal(el) {
    if (!el) return;
    el.classList.remove("is-reveal-in", "is-stagger-out");
    el.style.transitionDelay = "";
    el.style.transition = "";
    el.style.opacity = "";
    el.style.transform = "";
    el.style.removeProperty("--reveal-delay");
  }

  /** Spread shuffled indices across a capped time window (keeps order random, not endless). */
  function staggeredDelay(index, count, start, span, jitter) {
    var t =
      count <= 1
        ? start
        : start + (index / (count - 1)) * span + Math.random() * (jitter || 0);
    return Number(t.toFixed(2));
  }

  /** Shuffled fade-out of expand tiles only (close path). Returns ms until mostly gone. */
  function staggerGalleryExit(gallery) {
    if (!gallery || REDUCED) return 0;
    var items = gallery.querySelectorAll(
      ".reels-masonry__item, .graphics-masonry__item"
    );
    var order = shuffleList(items);
    var span = Math.min(1.15, 0.35 + order.length * 0.028);
    order.forEach(function (el, i) {
      var delay = staggeredDelay(i, order.length, 0.02, span, 0.07);
      el.style.transition =
        "opacity 1.05s cubic-bezier(0.22, 1, 0.36, 1) " +
        delay +
        "s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) " +
        delay +
        "s";
      el.classList.add("is-stagger-out");
      el.style.opacity = "0";
      el.style.transform = "translate3d(0, 14px, 0) scale(0.985)";
    });
    return Math.round(Math.min(2000, 700 + span * 1000 + 400));
  }

  /**
   * After reverse morph: catalog TILES bloom back slowly, shuffled.
   * Section copy / center words stay put (no transform — they must not “flee”).
   */
  function beginCatalogReveal(chapter) {
    if (!chapter || REDUCED) return 0;
    if (catalogRevealTimer) window.clearTimeout(catalogRevealTimer);
    root.classList.add("is-catalog-revealing");
    root.classList.remove("is-morphing");

    var sel =
      ".chapter-show__tile, " +
      ".reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card, " +
      ".chapter-lux [data-lux-shot]";
    var nodes = chapter.querySelectorAll(sel);
    var order = shuffleList(nodes);
    var span = Math.min(2.35, 0.7 + order.length * 0.055);
    order.forEach(function (el) {
      el.classList.remove("is-reveal-in");
      el.style.setProperty("--reveal-delay", "0s");
    });
    requestAnimationFrame(function () {
      order.forEach(function (el, i) {
        var delay = staggeredDelay(i, order.length, 0.2, span, 0.12);
        el.style.setProperty("--reveal-delay", delay + "s");
        el.classList.add("is-reveal-in");
      });
    });
    var totalMs = Math.round(Math.min(3600, 1100 + span * 1000 + 700));
    catalogRevealTimer = window.setTimeout(function () {
      root.classList.remove("is-catalog-revealing");
      order.forEach(clearInlineReveal);
      catalogRevealTimer = 0;
    }, totalMs + 450);
    return totalMs;
  }

  var WEB_CASES = [
    {
      id: "juicy",
      href: "portfolio-strona-juicy-events.html",
      title: "Juicy Events",
      lead: "Agencja eventowa",
      video: "portfolio-media/showcase/web/juicy-events.mp4",
      poster: "portfolio-media/showcase/web/juicy-events-poster.jpg",
      match: /juicy/i,
    },
    {
      id: "trove",
      href: "portfolio-strona-trove.html",
      title: "Trove Archive",
      lead: "Ecommerce fashion",
      video: "portfolio-media/showcase/web/trove-archive.mp4",
      poster: "portfolio-media/showcase/web/trove-archive-poster.jpg",
      match: /trove/i,
    },
    {
      id: "mj",
      href: "portfolio-strona-mj.html",
      title: "MJ Social Media",
      lead: "Content creator",
      video: "portfolio-media/showcase/web/mj-social-media.mp4",
      poster: "portfolio-media/showcase/web/mj-social-media-poster.jpg",
      match: /mj/i,
    },
  ];

  var SYSTEM_CASES = [
    {
      href: "portfolio-telforceone-crm.html",
      tag: "CRM / sprzedaż terenowa",
      client: "TelForceOne S.A.",
      title: "CRM z bazą danych i mapą handlowców",
      desc: "Handlowcy jeździli z Excelami i notatkami w telefonie — nikt nie wiedział, kto u kogo był. CRM z mapą zbiera klientów, trasy i raporty dnia w jednym miejscu, więc planowanie wizyt zajmuje minuty zamiast godziny.",
      img: "assets/cases/telforceone-crm.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-crm-map-bw.jpg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-code39.html",
      tag: "Narzędzie / identyfikacja",
      client: "TelForceOne S.A.",
      title: "Generator kodów kreskowych Code 39",
      desc: "Etykiety powstawały w kilku narzędziach i często wracały ze skanera jako błąd. Generator daje podgląd Code 39 i batch do druku — oznaczenie SKU w sekundach, bez poprawek na magazynie.",
      img: "assets/cases/telforceone-code39.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-barcode-bw.jpg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka / zapasy",
      client: "TelForceOne S.A.",
      title: "Kontrola stanów i prognozowanie",
      desc: "Zakupy szły „na wyczucie”: braki na półce albo zamrożony towar. Panel łączy stany, rotację i prognozę z alertami — widać, co dokupić zanim sprzedaż stanie.",
      img: "assets/cases/telforceone-forecast.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-forecast-bw.jpg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Panel sklepu i monitoring cen",
      desc: "Trove ręcznie porównywało ceny na Allegro i własnym sklepie w arkuszach. Panel zbiera stany i ceny kanałów z alertami przecen — reakcja na spadek marży tego samego dnia, nie po tygodniu.",
      img: "assets/cases/shelfsync.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-price-monitor-bw.jpg",
      cls: "portfolio-case-card--app",
    },
    {
      href: "portfolio-crm-leady.html",
      tag: "CRM",
      client: "",
      title: "CRM leadów, dealów i operacji sprzedażowych",
      desc: "Leady ginęły między skrzynką, czatem i karteczkami — follow-upy się spóźniały. CRM prowadzi od pierwszego kontaktu do deala: pipeline, notatki i przypomnienia w jednym lejku.",
      img: "assets/cases/northline-crm.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-kanban-bw.jpg",
      cls: "portfolio-case-card--crm",
    },
    {
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Chatbot AI do wiadomości klientów",
      desc: "Po godzinach Instagram i Messenger zasypywały te same pytania, a zespół odpisywał rano z opóźnieniem. Bot zamyka FAQ 24/7, zbiera lead i oddaje rozmowę konsultantowi z kontekstem.",
      img: "assets/cases/atelier-bloom.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-chatbot-bw.jpg",
      cls: "portfolio-case-card--bot",
    },
    {
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "Trove",
      title: "Zamówienie → faktura → paczka",
      desc: "Każde zamówienie Trove wymagało ręcznego klejenia faktury, statusu i maila do klienta. Workflow odpala cały łańcuch sam — mniej klikania, mniej pomyłek przy fulfillmentcie.",
      img: "assets/cases/parcel-co.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-invoice-flow-bw.jpg",
      cls: "portfolio-case-card--flow",
    },
  ];

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function setOpen(open) {
    document.body.classList.toggle("is-tile-expanded", open);
    root.classList.toggle("is-expanded", open);
    stage.hidden = !open;
    stage.setAttribute("aria-hidden", open ? "false" : "true");
    stage.classList.toggle("is-open", open);
  }

  function clearBody() {
    if (ghostClearTimer) {
      window.clearTimeout(ghostClearTimer);
      ghostClearTimer = 0;
    }
    activeGhosts.forEach(function (g) {
      if (g && g.parentNode) g.parentNode.removeChild(g);
    });
    activeGhosts = [];
    if (systemsDetailFan) {
      try {
        systemsDetailFan.destroy();
      } catch (e) {}
      systemsDetailFan = null;
    }
    root.classList.remove("is-systems-detail");
    bodyEl.innerHTML = "";
    bodyEl.removeAttribute("data-expand-mode");
    deckCards = [];
    deckIndex = 0;
    videoOpenState = null;
    webDetailOpen = false;
  }

  function isInteractiveTarget(el) {
    if (!el || !el.closest) return false;
    /* Detail popup: only Visit stays interactive — anywhere else dismisses to deck */
    if (webDetailOpen) {
      return !!el.closest("a.expand-web-visit, .expand-web-visit");
    }
    return !!el.closest(
      "a, button, video, .expand-deck__card, .expand-web-panel, .portfolio-case-card, .expand-feed__item, .reels-masonry__item, .graphics-masonry__item, .expand-hero-tile, .expand-cam__tile, .expand-fly, .sys-fan__card, .sys-fan__arrow, .sys-fan__dot, .sys-fan__nav, .sys-fan__copy, .sys-fan__more, .sys-fan__article, .sys-fan__stage"
    );
  }

  function webCardSize() {
    /* ~2× previous coverflow card */
    var tw = Math.min(window.innerWidth * 0.78, 44 * 16);
    var th = tw * (10 / 16);
    return { w: tw, h: th };
  }

  /* —— Web coverflow —— */
  function pickHeroShot(chapter) {
    var shots = Array.prototype.slice.call(chapter.querySelectorAll("[data-lux-shot] img"));
    var visible = shots.filter(function (img) {
      var r = img.getBoundingClientRect();
      return r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < window.innerHeight;
    });
    var pool = visible.length ? visible : shots;
    if (!pool.length) return null;
    var img = pool[Math.floor(Math.random() * pool.length)];
    var src = img.currentSrc || img.src || "";
    var caseIdx = 0;
    WEB_CASES.forEach(function (c, i) {
      if (c.match.test(src)) caseIdx = i;
    });
    return { img: img, rect: img.getBoundingClientRect(), caseIdx: caseIdx, src: src };
  }

  function layoutDeck() {
    if (!deckCards.length) return;
    var n = Math.round(Math.max(0, Math.min(deckCards.length - 1, deckIndex)));
    var detail = webDetailOpen;
    deckCards.forEach(function (card, i) {
      var offset = i - deckIndex;
      var abs = Math.abs(offset);
      if (detail && i === n) {
        /* Active site card parks on the left; description sits on the right */
        card.style.transform =
          "translate3d(calc(-50% - min(28vw, 12rem)), -50%, 0) rotateY(0deg) scale(0.92)";
        card.style.opacity = "1";
        card.style.zIndex = "50";
      } else if (detail) {
        card.style.transform =
          "translate3d(calc(-50% + " + offset * 70 + "%), -50%, -220px) rotateY(" + offset * -18 + "deg) scale(0.62)";
        card.style.opacity = "0";
        card.style.zIndex = "1";
      } else {
        card.style.transform =
          "translate3d(calc(-50% + " +
          offset * 62 +
          "%), -50%, " +
          -abs * 160 +
          "px) rotateY(" +
          offset * -16 +
          "deg) scale(" +
          Math.max(0.7, 1 - abs * 0.1) +
          ")";
        card.style.opacity = String(Math.max(0.28, 1 - abs * 0.36));
        card.style.zIndex = String(Math.round(40 - abs * 10));
      }
      card.classList.toggle("is-front", i === n);
      card.classList.toggle("is-detail-hero", detail && i === n);
      var video = card.querySelector("video");
      if (video) {
        if (i === n) {
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          try {
            video.pause();
          } catch (e) {}
        }
      }
    });
    bodyEl.querySelectorAll("[data-expand-deck-dot]").forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === n);
    });
    var prev = bodyEl.querySelector("[data-expand-deck-prev]");
    var next = bodyEl.querySelector("[data-expand-deck-next]");
    if (prev) prev.disabled = n <= 0;
    if (next) next.disabled = n >= deckCards.length - 1;
    var arrows = bodyEl.querySelector(".expand-deck__arrows");
    if (arrows) {
      arrows.style.opacity = detail ? "0.35" : "1";
      arrows.style.pointerEvents = detail ? "none" : "";
    }
  }

  function setDeckIndex(next) {
    deckIndex = Math.max(0, Math.min(deckCards.length - 1, next));
    if (deckRaf) return;
    deckRaf = requestAnimationFrame(function () {
      deckRaf = 0;
      layoutDeck();
    });
  }

  function fetchPageHtml(href) {
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

  function parseWebCasePage(html, fallback) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var titleEl = doc.querySelector(".case-study__title");
    var ledeEl = doc.querySelector(".case-study__lede");
    var visitEl = doc.querySelector(".case-study__visit");
    var copy = [];
    doc.querySelectorAll(".case-study__copy p").forEach(function (p) {
      var t = (p.textContent || "").trim();
      if (t) copy.push(t);
    });
    return {
      title: (titleEl && titleEl.textContent.trim()) || fallback.title,
      lead: (ledeEl && ledeEl.textContent.trim()) || fallback.lead,
      visitHref: (visitEl && visitEl.getAttribute("href")) || "",
      visitLabel: (visitEl && visitEl.textContent.trim()) || "Odwiedź stronę",
      copy: copy,
    };
  }

  function removeWebVisitCta() {
    var visit = bodyEl.querySelector(".expand-web-visit");
    if (!visit) return;
    visit.classList.remove("is-ready");
    window.setTimeout(function () {
      if (visit.parentNode) visit.parentNode.removeChild(visit);
    }, 420);
  }

  function closeWebCaseDetail() {
    var deck = bodyEl.querySelector(".expand-deck");
    var panel = bodyEl.querySelector(".expand-web-panel");
    if (!deck) {
      webDetailOpen = false;
      removeWebVisitCta();
      return;
    }
    deck.classList.remove("is-case-detail");
    deckCards.forEach(function (c) {
      c.classList.remove("is-detail-hero");
    });
    if (panel) {
      panel.classList.remove("is-ready");
      window.setTimeout(function () {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }, 420);
    }
    removeWebVisitCta();
    webDetailOpen = false;
    layoutDeck();
  }

  function openWebCaseDetail(item, card) {
    if (!item || webDetailOpen) return;
    webDetailOpen = true;
    var deck = bodyEl.querySelector(".expand-deck");
    if (deck) deck.classList.add("is-case-detail");
    deckCards.forEach(function (c) {
      c.classList.toggle("is-detail-hero", c === card);
    });
    layoutDeck();

    var panel = document.createElement("aside");
    panel.className = "expand-web-panel";
    panel.innerHTML =
      '<p class="expand-web-panel__loading">Ładowanie opisu…</p>';
    bodyEl.appendChild(panel);
    requestAnimationFrame(function () {
      panel.classList.add("is-ready");
    });

    fetchPageHtml(item.href)
      .then(function (html) {
        if (!webDetailOpen || expandedKey !== "web") return;
        var data = parseWebCasePage(html, item);
        panel.innerHTML = "";
        var eye = document.createElement("p");
        eye.className = "expand-web-panel__eyebrow";
        eye.textContent = "Strona internetowa";
        var h = document.createElement("h3");
        h.className = "expand-web-panel__title";
        h.textContent = data.title;
        var lead = document.createElement("p");
        lead.className = "expand-web-panel__lead";
        lead.textContent = data.lead;
        panel.appendChild(eye);
        panel.appendChild(h);
        panel.appendChild(lead);
        var copyWrap = document.createElement("div");
        copyWrap.className = "expand-web-panel__copy";
        data.copy.forEach(function (t) {
          var p = document.createElement("p");
          p.textContent = t;
          copyWrap.appendChild(p);
        });
        panel.appendChild(copyWrap);
        /* Visit CTA sits under the site tile, not in the copy panel */
        removeWebVisitCta();
        if (data.visitHref) {
          var visit = document.createElement("a");
          visit.className = "glass-btn expand-web-visit";
          visit.href = data.visitHref;
          visit.target = "_blank";
          visit.rel = "noopener noreferrer";
          visit.setAttribute("data-no-transition", "");
          visit.textContent = data.visitLabel || "Odwiedź stronę";
          visit.addEventListener("click", function (e) {
            e.stopPropagation();
          });
          bodyEl.appendChild(visit);
          requestAnimationFrame(function () {
            visit.classList.add("is-ready");
          });
        }
      })
      .catch(function () {
        if (!webDetailOpen) return;
        panel.innerHTML =
          '<p class="expand-web-panel__lead">Nie udało się wczytać opisu.</p>';
      });
  }

  function buildWebDeck(startIdx) {
    bodyEl.setAttribute("data-expand-mode", "web");
    webDetailOpen = false;
    var deck = document.createElement("div");
    deck.className = "expand-deck";
    var track = document.createElement("div");
    track.className = "expand-deck__track";
    WEB_CASES.forEach(function (item) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "expand-deck__card";
      card.setAttribute("data-expand-deck-card", item.id);
      var media = document.createElement("div");
      media.className = "expand-deck__media";
      var video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.poster = item.poster;
      video.src = item.video;
      media.appendChild(video);
      card.appendChild(media);
      var body = document.createElement("div");
      body.className = "expand-deck__body";
      body.innerHTML = '<p class="expand-deck__name"></p><p class="expand-deck__lead"></p>';
      body.querySelector(".expand-deck__name").textContent = item.title;
      body.querySelector(".expand-deck__lead").textContent = item.lead;
      card.appendChild(body);
      card.addEventListener("click", function (e) {
        /* Detail dismiss is handled by the capture click on document/stage */
        if (webDetailOpen) return;
        var i = WEB_CASES.indexOf(item);
        if (Math.round(deckIndex) === i) {
          /* Stop bubble so stage click does not immediately close the new detail */
          e.stopPropagation();
          openWebCaseDetail(item, card);
        } else {
          setDeckIndex(i);
        }
      });
      track.appendChild(card);
      deckCards.push(card);
    });
    var arrows = document.createElement("div");
    arrows.className = "expand-deck__arrows";
    arrows.innerHTML =
      '<button type="button" class="expand-deck__arrow" data-expand-deck-prev aria-label="Poprzedni">' +
      '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M10.2 2.6L5.4 8l4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="expand-deck__dots" data-expand-deck-dots></div>' +
      '<button type="button" class="expand-deck__arrow" data-expand-deck-next aria-label="Następny">' +
      '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M5.8 2.6L10.6 8l-4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    var dots = arrows.querySelector("[data-expand-deck-dots]");
    WEB_CASES.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "expand-deck__dot";
      d.setAttribute("data-expand-deck-dot", "");
      d.addEventListener("click", function () {
        if (webDetailOpen) closeWebCaseDetail();
        setDeckIndex(i);
      });
      dots.appendChild(d);
    });
    arrows.querySelector("[data-expand-deck-prev]").onclick = function () {
      if (webDetailOpen) closeWebCaseDetail();
      setDeckIndex(Math.round(deckIndex) - 1);
    };
    arrows.querySelector("[data-expand-deck-next]").onclick = function () {
      if (webDetailOpen) closeWebCaseDetail();
      setDeckIndex(Math.round(deckIndex) + 1);
    };
    deck.appendChild(track);
    deck.appendChild(arrows);
    bodyEl.appendChild(deck);
    deckIndex = startIdx || 0;
    layoutDeck();
  }

  function openWeb(chapter) {
    var hero = chapter ? pickHeroShot(chapter) : null;
    var size = webCardSize();
    if (!hero || REDUCED) {
      buildWebDeck(hero ? hero.caseIdx : 0);
      return;
    }
    var fly = document.createElement("figure");
    fly.className = "expand-fly";
    fly.style.left = hero.rect.left + "px";
    fly.style.top = hero.rect.top + "px";
    fly.style.width = hero.rect.width + "px";
    fly.style.height = hero.rect.height + "px";
    var img = document.createElement("img");
    img.src = hero.src;
    fly.appendChild(img);
    document.body.appendChild(fly);
    activeGhosts.push(fly);
    requestAnimationFrame(function () {
      fly.style.left = (window.innerWidth - size.w) / 2 + "px";
      fly.style.top = (window.innerHeight - size.h) / 2 - 18 + "px";
      fly.style.width = size.w + "px";
      fly.style.height = size.h + "px";
      fly.style.borderRadius = "1.15rem";
    });
    setTimeout(function () {
      buildWebDeck(hero.caseIdx);
      /* Keep fly until deck front card is painted — seamless handoff */
      requestAnimationFrame(function () {
        fly.style.opacity = "0";
        setTimeout(function () {
          if (fly.parentNode) fly.parentNode.removeChild(fly);
          activeGhosts = activeGhosts.filter(function (g) {
            return g !== fly;
          });
        }, 440);
      });
    }, REDUCED ? 0 : 1360);
  }

  /* —— Shared helpers —— */
  function captureTiles(selector, chapter) {
    var scope = chapter || document;
    return Array.prototype.slice.call(scope.querySelectorAll(selector)).map(function (el) {
      var img = el.querySelector("img, video");
      var src = "";
      var poster = "";
      var videoSrc = "";
      if (img) {
        poster = img.getAttribute("poster") || "";
        videoSrc = img.getAttribute("data-video-src") || img.getAttribute("src") || img.src || "";
        src =
          img.currentSrc ||
          poster ||
          videoSrc ||
          img.src ||
          "";
      }
      return { el: el, rect: el.getBoundingClientRect(), src: src, poster: poster, videoSrc: videoSrc };
    }).filter(function (t) {
      return t.rect.width > 8 && t.rect.height > 8 && t.rect.bottom > 0 && t.rect.top < window.innerHeight;
    });
  }

  function mediaFileBase(path) {
    if (!path) return "";
    var clean = String(path).split("?")[0];
    var parts = clean.split("/");
    return parts[parts.length - 1] || "";
  }

  function reelItemMatchesSeed(item, seed) {
    if (!item || !seed) return false;
    var seedBase = mediaFileBase(seed);
    var seedCore = seedBase.replace(/-poster\.(jpe?g|png|webp)$/i, "").replace(/\.(mp4|webm|mov)$/i, "");
    var candidates = [item.poster, item.src, item.full];
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (!c) continue;
      if (seed.indexOf(c) !== -1 || c.indexOf(seedBase) !== -1) return true;
      var cBase = mediaFileBase(c);
      var cCore = cBase.replace(/-poster\.(jpe?g|png|webp)$/i, "").replace(/\.(mp4|webm|mov)$/i, "");
      if (seedCore && cCore && seedCore === cCore) return true;
    }
    return false;
  }

  function detectReelBrand(heroes, data) {
    var scores = {};
    (data.groups || []).forEach(function (g) {
      scores[g.id] = 0;
    });
    (heroes || []).forEach(function (h) {
      var seeds = [h.src, h.poster, h.videoSrc].filter(Boolean);
      (data.groups || []).forEach(function (g) {
        (g.items || []).forEach(function (item) {
          for (var i = 0; i < seeds.length; i++) {
            if (reelItemMatchesSeed(item, seeds[i])) {
              scores[g.id] = (scores[g.id] || 0) + 1;
              break;
            }
          }
        });
      });
    });
    if ((scores.trove || 0) >= (scores.wiktoria || 0) && (scores.trove || 0) > 0) return "trove";
    if ((scores.wiktoria || 0) > 0) return "wiktoria";
    var best = null;
    var bestN = 0;
    Object.keys(scores).forEach(function (id) {
      if (scores[id] > bestN) {
        bestN = scores[id];
        best = id;
      }
    });
    return best || "trove";
  }

  function orderReelGroups(groups, prioritizeId) {
    var list = (groups || []).slice();
    list.sort(function (a, b) {
      if (a.id === prioritizeId && b.id !== prioritizeId) return -1;
      if (b.id === prioritizeId && a.id !== prioritizeId) return 1;
      return 0;
    });
    return list;
  }

  function bindReelsExpandInteractions(gallery) {
    var items = gallery.querySelectorAll(".reels-masonry__item");
    var active = null;

    function setMuted(video, muted) {
      if (!video) return;
      video.muted = !!muted;
      video.defaultMuted = !!muted;
      if (muted) video.setAttribute("muted", "");
      else {
        video.removeAttribute("muted");
        try {
          video.volume = 1;
        } catch (e) {}
      }
    }

    function sameMediaUrl(a, b) {
      if (!a || !b) return false;
      var strip = function (u) {
        return String(u).split("?")[0].replace(/^\.\//, "");
      };
      return strip(a) === strip(b) || String(a).indexOf(strip(b)) !== -1 || String(b).indexOf(strip(a)) !== -1;
    }

    /* Preview MP4s are silent — full files carry AAC. Swap on click inside the gesture. */
    function ensureFullAudioSource(video, btn) {
      var full = btn.getAttribute("data-reel-full") || "";
      if (!full) return;
      if (video.dataset.usingFull === "1" || sameMediaUrl(video.currentSrc || video.src, full)) {
        video.dataset.usingFull = "1";
        return;
      }
      var t = video.currentTime || 0;
      video.dataset.usingFull = "1";
      video.src = full;
      if (t > 0.05) {
        var onMeta = function () {
          video.removeEventListener("loadedmetadata", onMeta);
          try {
            if (Number.isFinite(t)) video.currentTime = t;
          } catch (e) {}
        };
        video.addEventListener("loadedmetadata", onMeta);
      }
    }

    function playUnmuted(video) {
      setMuted(video, false);
      var p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          setMuted(video, false);
          var p2 = video.play();
          if (p2 && p2.catch) p2.catch(function () {});
        });
      }
    }

    function deactivate(btn) {
      if (!btn) return;
      btn.classList.remove("is-reel-focus");
      var video = btn.querySelector("video");
      if (video) {
        setMuted(video, true);
        if (!btn.classList.contains("is-reel-hover")) {
          try {
            video.pause();
          } catch (e) {}
        }
      }
    }

    items.forEach(function (btn) {
      var video = btn.querySelector("video");
      if (!video) return;

      btn.addEventListener("mouseenter", function () {
        btn.classList.add("is-reel-hover");
        if (active !== btn) setMuted(video, true);
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      });

      btn.addEventListener("mouseleave", function () {
        btn.classList.remove("is-reel-hover");
        if (active === btn) return;
        try {
          video.pause();
        } catch (e) {}
      });

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (active === btn) {
          deactivate(btn);
          active = null;
          return;
        }
        if (active) deactivate(active);
        active = btn;
        btn.classList.add("is-reel-focus");
        ensureFullAudioSource(video, btn);
        playUnmuted(video);
      });
    });
  }

  function placeGhost(tile, extraClass) {
    var g = document.createElement("figure");
    g.className = "expand-cam__tile" + (extraClass ? " " + extraClass : "");
    g.style.left = tile.rect.left + "px";
    g.style.top = tile.rect.top + "px";
    g.style.width = tile.rect.width + "px";
    g.style.height = tile.rect.height + "px";
    if (tile.src) {
      var img = document.createElement("img");
      img.src = tile.src;
      img.alt = "";
      g.appendChild(img);
    }
    document.body.appendChild(g);
    activeGhosts.push(g);
    return g;
  }

  function morphGhostToRect(ghost, rect, opts) {
    opts = opts || {};
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    if (opts.radius != null) ghost.style.borderRadius = opts.radius;
    if (opts.rotate != null) ghost.style.transform = "rotate(" + opts.rotate + ")";
  }

  function removeGhosts(delay) {
    if (ghostClearTimer) window.clearTimeout(ghostClearTimer);
    /* Snapshot — don't wipe ghosts created later (e.g. close fan-return). */
    var snapshot = activeGhosts.slice();
    ghostClearTimer = window.setTimeout(function () {
      snapshot.forEach(function (g) {
        if (g && g.parentNode) g.parentNode.removeChild(g);
        activeGhosts = activeGhosts.filter(function (x) {
          return x !== g;
        });
      });
      ghostClearTimer = 0;
    }, delay || 0);
  }

  /** Prefer still posters for <img> ghosts — video URLs render as broken images. */
  function ghostStillSrc(tile) {
    if (!tile) return "";
    var poster = tile.poster || "";
    var src = tile.src || "";
    var videoSrc = tile.videoSrc || "";
    if (poster) return poster;
    if (src && !/\.(mp4|webm|mov)(\?|$)/i.test(src)) return src;
    if (videoSrc && !/\.(mp4|webm|mov)(\?|$)/i.test(videoSrc)) return videoSrc;
    if (src) {
      var guess = String(src)
        .split("?")[0]
        .replace(/\.(mp4|webm|mov)$/i, "-poster.jpg");
      if (guess !== src.split("?")[0]) return guess;
    }
    return poster || src || videoSrc || "";
  }

  function hideChapterMedia() {
    root.classList.add("is-morphing");
  }

  /* systems open already dims catalog via is-systems-detail — skip full media hide flash */

  /* Systems: catalog fan zooms out → detail fan + description in the hollow */
  function openSystems(chapter) {
    bodyEl.setAttribute("data-expand-mode", "systems");
    var catalog = window.CosgralSystemsFan && window.CosgralSystemsFan.getCatalog();
    var startIdx = catalog ? catalog.getIndex() : 0;
    if (catalog) catalog.pause();

    /* Hide chapter copy; catalog fan fades under detail fan */
    root.classList.add("is-systems-detail");

    var wrap = document.createElement("div");
    wrap.className = "expand-systems";
    bodyEl.appendChild(wrap);

    var mount = document.createElement("div");
    mount.className = "sys-fan sys-fan--detail is-entering";
    wrap.appendChild(mount);

    if (!window.CosgralSystemsFan) return;
    systemsDetailFan = window.CosgralSystemsFan.create(mount, {
      mode: "detail",
      index: startIdx,
      autoplay: false,
    });

    /* Same framing as catalog → gentle pull-back for copy */
    requestAnimationFrame(function () {
      mount.classList.add("is-from-catalog");
      requestAnimationFrame(function () {
        window.setTimeout(function () {
          mount.classList.remove("is-entering", "is-from-catalog");
          mount.classList.add("is-settled");
          wrap.classList.add("is-ready");
          var catRoot = catalog && catalog.root;
          if (catRoot) catRoot.classList.add("is-under-detail");
        }, REDUCED ? 0 : 80);
      });
    });
  }

  /* Montaż: 2 center tiles level + zoom → pin top → brand feed (half tiles) */
  function openVideo(chapter) {
    bodyEl.setAttribute("data-expand-mode", "video");
    hideChapterMedia();
    var all = captureTiles(
      "#reels-tiles .reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card",
      chapter
    );
    if (all.length < 2) all = captureTiles("#reels-tiles .reels-tiles__card", chapter);

    var cx = window.innerWidth * 0.5;
    var cy = window.innerHeight * 0.5;
    var ranked = all
      .map(function (t) {
        var mx = t.rect.left + t.rect.width * 0.5;
        var my = t.rect.top + t.rect.height * 0.5;
        return { tile: t, dist: (mx - cx) * (mx - cx) + (my - cy) * (my - cy) };
      })
      .sort(function (a, b) {
        return a.dist - b.dist;
      });
    var heroes = ranked.slice(0, 2).map(function (r) {
      return r.tile;
    });
    /* Keep left→right order */
    heroes.sort(function (a, b) {
      return a.rect.left - b.rect.left;
    });

    videoOpenState = {
      chapter: chapter,
      heroes: heroes.map(function (h) {
        return {
          rect: {
            left: h.rect.left,
            top: h.rect.top,
            width: h.rect.width,
            height: h.rect.height,
          },
          src: h.src,
          poster: h.poster,
          videoSrc: h.videoSrc,
        };
      }),
      all: all.map(function (t) {
        return {
          rect: {
            left: t.rect.left,
            top: t.rect.top,
            width: t.rect.width,
            height: t.rect.height,
          },
          src: t.src,
          hero: heroes.indexOf(t) !== -1,
        };
      }),
      brand: null,
    };

    var beltLayer = document.createElement("div");
    beltLayer.className = "expand-belt";
    document.body.appendChild(beltLayer);
    activeGhosts.push(beltLayer);

    var beltGhosts = all.map(function (t) {
      var g = document.createElement("figure");
      g.className = "expand-belt__card";
      g.style.left = t.rect.left + "px";
      g.style.top = t.rect.top + "px";
      g.style.width = t.rect.width + "px";
      g.style.height = t.rect.height + "px";
      if (t.src) {
        var img = document.createElement("img");
        img.src = t.src;
        img.alt = "";
        g.appendChild(img);
      }
      var isHero = heroes.indexOf(t) !== -1;
      if (isHero) g.classList.add("is-hero");
      beltLayer.appendChild(g);
      return { el: g, tile: t, hero: isHero };
    });

    var gallery = document.createElement("div");
    gallery.className = "expand-gallery expand-gallery--video";
    gallery.style.opacity = "0";
    bodyEl.appendChild(gallery);

    /* Half of previous ~1120px gallery → ~560px / 2-col */
    var galleryW = Math.min(560, window.innerWidth * 0.92);
    var gap = 28;
    var colW = (galleryW - gap) / 2;
    var total = colW * 2 + gap;
    var startX = (window.innerWidth - total) / 2;
    var topY = Math.max(56, window.innerHeight * 0.07);
    var heroH = colW * (16 / 9);

    /* Phase 1: straighten diagonal, slight zoom, park 2 heroes at top */
    requestAnimationFrame(function () {
      beltLayer.classList.add("is-level");
      beltGhosts.forEach(function (item) {
        var g = item.el;
        if (item.hero) {
          var hi = heroes.indexOf(item.tile);
          g.style.left = startX + hi * (colW + gap) + "px";
          g.style.top = topY + "px";
          g.style.width = colW + "px";
          g.style.height = heroH + "px";
          g.style.borderRadius = "10px";
          g.style.zIndex = "20";
          g.style.opacity = "1";
          g.style.transform = "rotate(0deg) scale(1.08)";
        } else {
          var side = item.tile.rect.left < cx ? -1 : 1;
          g.style.left = item.tile.rect.left + side * 40 + "px";
          g.style.top = item.tile.rect.top + 28 + "px";
          g.style.opacity = "0";
          g.style.transform = "rotate(0deg) scale(0.92)";
        }
      });
    });

    fetchManifest("reels").then(function (data) {
      if (expandedKey !== "video") return;
      var brand = detectReelBrand(heroes, data);
      if (videoOpenState) videoOpenState.brand = brand;
      gallery.setAttribute("data-reel-brand", brand);

      var seedList = [];
      heroes.forEach(function (h) {
        if (h.src) seedList.push(h.src);
        if (h.poster && seedList.indexOf(h.poster) === -1) seedList.push(h.poster);
        if (h.videoSrc && seedList.indexOf(h.videoSrc) === -1) seedList.push(h.videoSrc);
      });

      buildMediaInto(gallery, "reels", data, {
        seedPosters: seedList,
        prioritizeGroup: brand,
      });

      /* Measure first two masonry cells — heroes land there */
      gallery.classList.add("is-measuring", "is-video-anchor");
      gallery.style.opacity = "1";
      var firstItems = gallery.querySelectorAll(".reels-masonry__item");
      var dest = [];
      for (var i = 0; i < 2 && i < firstItems.length; i++) {
        dest.push(firstItems[i].getBoundingClientRect());
      }
      gallery.classList.remove("is-measuring");
      gallery.style.opacity = "0";

      setTimeout(function () {
        /* Phase 2: settle zoom into masonry slots, slide list from under */
        beltGhosts.forEach(function (item) {
          if (!item.hero) return;
          var hi = heroes.indexOf(item.tile);
          var r = dest[hi];
          item.el.style.transform = "rotate(0deg) scale(1)";
          if (r && r.width > 4) {
            morphGhostToRect(item.el, r, { radius: "8px" });
          }
        });
        gallery.style.opacity = "1";
        gallery.classList.add("is-ready", "is-slide-up");
        setTimeout(function () {
          beltLayer.style.opacity = "0";
          removeGhosts(640);
        }, 560);
      }, REDUCED ? 0 : 1400);
    });
  }

  /* Grafiki: fly one tile into first masonry slot, then grid settles around it */
  function openGraphics(chapter) {
    bodyEl.setAttribute("data-expand-mode", "graphics");
    hideChapterMedia();
    var tiles = captureTiles(".chapter-show__tile", chapter);
    var hero = tiles[Math.floor(tiles.length / 2)] || tiles[0];

    var gallery = document.createElement("div");
    gallery.className = "expand-gallery expand-gallery--graphics";
    gallery.style.opacity = "0";
    bodyEl.appendChild(gallery);

    fetchManifest("graphics").then(function (data) {
      if (expandedKey !== "graphics") return;
      buildMediaInto(gallery, "graphics", data, {
        seedPosters: hero && hero.src ? [hero.src] : [],
      });
      gallery.classList.add("is-measuring");
      gallery.style.opacity = "1";
      var first = gallery.querySelector(".graphics-masonry__item");
      var dest = first ? first.getBoundingClientRect() : null;
      gallery.classList.remove("is-measuring");
      gallery.style.opacity = "0";

      var fly = null;
      if (hero) {
        fly = placeGhost(hero, "is-hero");
        requestAnimationFrame(function () {
          if (dest && dest.width > 4) {
            morphGhostToRect(fly, dest, { radius: "8px" });
          } else {
            var size = Math.min(340, window.innerWidth * 0.48);
            morphGhostToRect(
              fly,
              {
                left: (window.innerWidth - size) / 2,
                top: (window.innerHeight - size * 1.25) / 2,
                width: size,
                height: size * 1.25,
              },
              { radius: "8px" }
            );
          }
        });
      }

      setTimeout(function () {
        gallery.style.opacity = "1";
        gallery.classList.add("is-ready");
        /* Hero becomes first cell — fade ghost only after gallery is solid */
        if (fly) fly.style.opacity = "0";
        removeGhosts(520);
      }, REDUCED ? 0 : 1360);
    });
  }

  function fetchManifest(kind) {
    if (manifests[kind]) return Promise.resolve(manifests[kind]);
    var url =
      kind === "reels"
        ? "portfolio-media/reels/manifest.json"
        : "portfolio-media/graphics/manifest.json";
    return fetch(url)
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        manifests[kind] = data;
        return data;
      });
  }

  function buildMediaInto(gallery, kind, data, opts) {
    opts = opts || {};
    gallery.innerHTML = "";
    var seeds = opts.seedPosters || [];
    var groups = data.groups || [];
    if (kind === "reels" && opts.prioritizeGroup) {
      groups = orderReelGroups(groups, opts.prioritizeGroup);
    }
    groups.forEach(function (group, gi) {
      var section = document.createElement("section");
      section.className = "expand-gallery__group";
      if (group.id) section.setAttribute("data-reel-group", group.id);
      var head = document.createElement("header");
      head.className = "expand-gallery__head";
      head.innerHTML = '<h3 class="expand-gallery__heading"></h3><p class="expand-gallery__count"></p>';
      head.querySelector(".expand-gallery__heading").textContent = group.name || group.id;
      var items = (group.items || []).slice();
      /* Prefer seeded posters at the front of the prioritized group for seamless morph */
      if (gi === 0 && seeds.length) {
        items = items.slice().sort(function (a, b) {
          var as = seeds.some(function (s) {
            return reelItemMatchesSeed(a, s);
          })
            ? 0
            : 1;
          var bs = seeds.some(function (s) {
            return reelItemMatchesSeed(b, s);
          })
            ? 0
            : 1;
          return as - bs;
        });
      }
      head.querySelector(".expand-gallery__count").textContent =
        items.length + (kind === "reels" ? " rolek" : " grafik");
      section.appendChild(head);
      var masonry = document.createElement("div");
      masonry.className = kind === "reels" ? "reels-masonry" : "graphics-masonry";
      items.forEach(function (item, ii) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = kind === "reels" ? "reels-masonry__item" : "graphics-masonry__item";
        var isSeed =
          gi === 0 &&
          seeds.some(function (s) {
            return reelItemMatchesSeed(item, s);
          });
        if (isSeed && ii < 2) btn.classList.add("is-anchor");
        if (kind === "reels" || item.type === "video") btn.classList.add("is-video");
        if (item.w && item.h) btn.style.aspectRatio = item.w + " / " + item.h;
        if (kind === "reels" || item.type === "video") {
          var video = document.createElement("video");
          video.muted = true;
          video.defaultMuted = true;
          video.loop = true;
          video.playsInline = true;
          video.setAttribute("playsinline", "");
          video.setAttribute("muted", "");
          video.preload = ii < 4 ? "metadata" : "none";
          if (item.poster) video.poster = item.poster;
          /* Expand uses full files (AAC). Silent previews break click-to-unmute. */
          video.src = (kind === "reels" && item.full) ? item.full : item.src;
          if (kind === "reels") {
            btn.setAttribute("data-reel-preview", item.src || "");
            btn.setAttribute("data-reel-full", item.full || item.src || "");
            if (item.full) video.dataset.usingFull = "1";
          }
          btn.appendChild(video);
          if (kind !== "reels") {
            btn.addEventListener("mouseenter", function () {
              var p = video.play();
              if (p && p.catch) p.catch(function () {});
            });
            btn.addEventListener("mouseleave", function () {
              try {
                video.pause();
              } catch (e) {}
            });
          }
        } else {
          var img = document.createElement("img");
          if (gi === 0 && ii === 0 && seeds[0]) img.src = seeds[0];
          else img.src = item.src;
          img.alt = "";
          img.loading = ii < 4 ? "eager" : "lazy";
          btn.appendChild(img);
        }
        masonry.appendChild(btn);
      });
      section.appendChild(masonry);
      gallery.appendChild(section);
    });
    if (kind === "reels") bindReelsExpandInteractions(gallery);
  }

  function open(key, chapter) {
    if (!key || expandedKey === key || closing) return;
    expandedKey = key;
    openChapter = chapter || null;
    clearBody();
    root.classList.remove("is-morphing", "is-systems-exiting");
    setOpen(true);
    dispatch("portfolio-expand-open", { key: key });
    if (key === "web") openWeb(chapter);
    else if (key === "systems") openSystems(chapter);
    else if (key === "video") openVideo(chapter);
    else if (key === "graphics") openGraphics(chapter);
  }

  function finishClose(prev, resumeIdx, opts) {
    opts = opts || {};
    var chapterForReveal = opts.revealChapter || null;
    expandedKey = null;
    closing = false;
    openChapter = null;
    if (prev === "video") document.body.classList.add("is-montaz-belt-hold");
    setOpen(false);
    stage.classList.remove("is-closing");
    document.body.classList.remove("is-closing-reverse");
    root.classList.remove("is-closing-reverse");
    clearBody();
    if (chapterForReveal && (prev === "video" || prev === "graphics") && !REDUCED) {
      beginCatalogReveal(chapterForReveal);
    } else {
      root.classList.remove("is-morphing", "is-systems-detail", "is-systems-exiting", "is-catalog-revealing");
    }
    root.classList.remove("is-systems-detail", "is-systems-exiting");
    var catalog = window.CosgralSystemsFan && window.CosgralSystemsFan.getCatalog();
    if (catalog) {
      if (catalog.root) catalog.root.classList.remove("is-under-detail");
      if (resumeIdx != null) catalog.setIndex(resumeIdx);
      catalog.resume();
    }
    if (prev === "video") {
      window.setTimeout(function () {
        document.body.classList.remove("is-montaz-belt-hold");
      }, 1100);
    }
    dispatch("portfolio-expand-close", { key: prev });
  }

  /* Reverse of openSystems: settle → catalog framing, copy out, catalog back */
  function closeSystemsReverse(resumeIdx) {
    var mount = systemsDetailFan && systemsDetailFan.root;
    var catalog = window.CosgralSystemsFan && window.CosgralSystemsFan.getCatalog();
    if (systemsDetailFan && systemsDetailFan.collapseArticle) {
      systemsDetailFan.collapseArticle(true);
    }
    if (catalog && catalog.root) catalog.root.classList.remove("is-under-detail");
    root.classList.add("is-systems-exiting");
    if (mount && !REDUCED) {
      mount.classList.remove("is-settled", "is-article-open");
      mount.classList.add("is-exiting");
      void mount.offsetWidth;
      mount.classList.add("is-from-catalog");
      window.setTimeout(function () {
        finishClose("systems", resumeIdx);
      }, 1500);
      return;
    }
    stage.classList.add("is-closing");
    window.setTimeout(function () {
      finishClose("systems", resumeIdx);
    }, REDUCED ? 0 : 640);
  }

  /* Reverse of openWeb: deck → fly back into chapter hero shot */
  function closeWebReverse() {
    if (webDetailOpen) {
      closeWebCaseDetail();
      window.setTimeout(function () {
        if (expandedKey === "web" && closing) closeWebReverse();
      }, REDUCED ? 0 : 480);
      return;
    }
    var chapter = openChapter;
    var front = deckCards[Math.round(deckIndex)];
    var hero = chapter ? pickHeroShot(chapter) : null;
    var deck = bodyEl.querySelector(".expand-deck");
    if (front && hero && !REDUCED) {
      var fr = front.getBoundingClientRect();
      var fly = document.createElement("figure");
      fly.className = "expand-fly";
      fly.style.left = fr.left + "px";
      fly.style.top = fr.top + "px";
      fly.style.width = fr.width + "px";
      fly.style.height = fr.height + "px";
      fly.style.borderRadius = "1.15rem";
      var img = document.createElement("img");
      var media = front.querySelector("video, img");
      img.src = (media && (media.currentSrc || media.poster || media.src)) || hero.src;
      fly.appendChild(img);
      document.body.appendChild(fly);
      activeGhosts.push(fly);
      if (deck) {
        deck.style.transition = "opacity 0.45s ease";
        deck.style.opacity = "0";
      }
      root.classList.remove("is-morphing");
      requestAnimationFrame(function () {
        morphGhostToRect(fly, hero.rect, { radius: getComputedStyle(hero.img).borderRadius || "0.55rem" });
      });
      window.setTimeout(function () {
        fly.style.opacity = "0";
        finishClose("web", null);
      }, 1450);
      return;
    }
    stage.classList.add("is-closing");
    root.classList.remove("is-morphing");
    window.setTimeout(function () {
      finishClose("web", null);
    }, REDUCED ? 0 : 640);
  }

  /** Collect expand-grid reel cells (prefer on-screen, then pad from DOM). */
  function captureExpandReelItems(gallery, need) {
    if (!gallery) return [];
    var nodes = Array.prototype.slice.call(
      gallery.querySelectorAll(".reels-masonry__item")
    );
    function pack(el) {
      var media = el.querySelector("img, video");
      var poster = "";
      var videoSrc = "";
      var src = "";
      if (media) {
        poster = media.getAttribute("poster") || "";
        videoSrc =
          media.getAttribute("data-video-src") ||
          media.getAttribute("src") ||
          media.src ||
          "";
        if (media.tagName === "VIDEO") {
          src = poster || videoSrc;
        } else {
          src = media.currentSrc || media.src || poster || "";
        }
      }
      return {
        el: el,
        rect: el.getBoundingClientRect(),
        src: src,
        poster: poster,
        videoSrc: videoSrc,
      };
    }
    var visible = [];
    var rest = [];
    nodes.forEach(function (el) {
      var item = pack(el);
      if (item.rect.width < 8 || item.rect.height < 8) return;
      var onScreen =
        item.rect.bottom > 40 &&
        item.rect.top < window.innerHeight - 40 &&
        item.rect.right > 0 &&
        item.rect.left < window.innerWidth;
      (onScreen ? visible : rest).push(item);
    });
    var out = visible.slice();
    for (var i = 0; i < rest.length && out.length < need; i++) out.push(rest[i]);
    return out;
  }

  function mediaBasesMatch(a, b) {
    if (!a || !b) return false;
    var ba = mediaFileBase(a);
    var bb = mediaFileBase(b);
    if (!ba || !bb) return false;
    if (ba === bb) return true;
    var ca = ba.replace(/-poster\.(jpe?g|png|webp)$/i, "").replace(/\.(mp4|webm|mov)$/i, "");
    var cb = bb.replace(/-poster\.(jpe?g|png|webp)$/i, "").replace(/\.(mp4|webm|mov)$/i, "");
    return !!(ca && cb && ca === cb);
  }

  /* Reverse of openVideo: grid tiles fly back into the catalog diagonal fan */
  function closeVideoReverse() {
    document.body.classList.add("is-closing-reverse");
    root.classList.add("is-closing-reverse");
    /* Cancel pending open-handoff ghost clears so they don't wipe the fan. */
    if (ghostClearTimer) {
      window.clearTimeout(ghostClearTimer);
      ghostClearTimer = 0;
    }
    var gallery = bodyEl.querySelector(".expand-gallery");
    var chapter = openChapter || document.getElementById("montaz");
    if (gallery) {
      gallery.querySelectorAll("video").forEach(function (v) {
        try {
          v.pause();
          v.muted = true;
        } catch (e) {}
      });
    }

    /* Live fan slots from the paused catalog belt */
    var fanSlots = [];
    if (chapter) {
      fanSlots = captureTiles(
        "#reels-tiles .reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card",
        chapter
      );
      if (fanSlots.length < 2) fanSlots = captureTiles("#reels-tiles .reels-tiles__card", chapter);
    }
    fanSlots.sort(function (a, b) {
      return a.rect.left - b.rect.left;
    });

    var gridItems = captureExpandReelItems(gallery, Math.max(fanSlots.length, 8));

    if (gallery && fanSlots.length >= 2 && gridItems.length >= 2 && !REDUCED) {
      var used = {};
      var pairs = fanSlots.map(function (fan) {
        var idx = -1;
        var i;
        for (i = 0; i < gridItems.length; i++) {
          if (used[i]) continue;
          if (mediaBasesMatch(fan.src, gridItems[i].src)) {
            idx = i;
            break;
          }
        }
        if (idx < 0) {
          for (i = 0; i < gridItems.length; i++) {
            if (!used[i]) {
              idx = i;
              break;
            }
          }
        }
        if (idx >= 0) used[idx] = true;
        return { fan: fan, from: idx >= 0 ? gridItems[idx] : null };
      });

      var beltLayer = document.createElement("div");
      beltLayer.className = "expand-belt is-level is-fan-return";
      document.body.appendChild(beltLayer);
      activeGhosts.push(beltLayer);

      var mid = (pairs.length - 1) / 2;
      var ghosts = pairs.map(function (pair, i) {
        var fan = pair.fan;
        var from = pair.from;
        var g = document.createElement("figure");
        g.className = "expand-belt__card" + (Math.abs(i - mid) < 1 ? " is-hero" : "");
        g.style.borderRadius = "8px";
        g.style.zIndex = String(10 + Math.round(10 - Math.abs(i - mid)));
        var src = ghostStillSrc(from) || ghostStillSrc(fan);
        if (src) {
          var img = document.createElement("img");
          img.src = src;
          img.alt = "";
          g.appendChild(img);
        }
        if (from && from.rect.width > 4) {
          g.style.left = from.rect.left + "px";
          g.style.top = from.rect.top + "px";
          g.style.width = from.rect.width + "px";
          g.style.height = from.rect.height + "px";
          g.style.opacity = "1";
          g.style.transform = "rotate(0deg) scale(1)";
        } else {
          /* No grid source — bloom into the fan slot */
          g.style.left = fan.rect.left + fan.rect.width * 0.15 + "px";
          g.style.top = fan.rect.top + fan.rect.height * 0.12 + "px";
          g.style.width = fan.rect.width * 0.7 + "px";
          g.style.height = fan.rect.height * 0.7 + "px";
          g.style.opacity = "0";
          g.style.transform = "rotate(0deg) scale(0.88)";
        }
        beltLayer.appendChild(g);
        return { el: g, fan: fan, delay: Math.abs(i - mid) * 0.09 + Math.random() * 0.05 };
      });

      /* Grid soft-exits while ghosts peel off into the fan */
      gallery.classList.remove("is-ready", "is-slide-up");
      gallery.style.transition =
        "opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1), transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
      window.setTimeout(function () {
        gallery.style.opacity = "0";
        gallery.style.transform = "translate3d(0, 10%, 0)";
      }, 80);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          ghosts.forEach(function (item) {
            var g = item.el;
            var r = item.fan.rect;
            g.style.transition =
              "left 1.55s cubic-bezier(0.16, 1, 0.3, 1) " +
              item.delay.toFixed(2) +
              "s, top 1.55s cubic-bezier(0.16, 1, 0.3, 1) " +
              item.delay.toFixed(2) +
              "s, width 1.55s cubic-bezier(0.16, 1, 0.3, 1) " +
              item.delay.toFixed(2) +
              "s, height 1.55s cubic-bezier(0.16, 1, 0.3, 1) " +
              item.delay.toFixed(2) +
              "s, opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1) " +
              item.delay.toFixed(2) +
              "s, transform 1.55s cubic-bezier(0.16, 1, 0.3, 1) " +
              item.delay.toFixed(2) +
              "s, border-radius 1.2s ease " +
              item.delay.toFixed(2) +
              "s";
            morphGhostToRect(g, r, { radius: "0.55rem" });
            g.style.opacity = "1";
            g.style.transform = "rotate(0deg) scale(1)";
          });
          /* Settle the whole fan onto the catalog diagonal */
          window.setTimeout(function () {
            beltLayer.classList.add("is-fan-settled");
          }, 420);
        });
      });

      var maxDelay = ghosts.reduce(function (m, item) {
        return Math.max(m, item.delay);
      }, 0);
      var handoff = Math.round(420 + maxDelay * 1000 + 1550);
      window.setTimeout(function () {
        beltLayer.style.opacity = "0";
        window.setTimeout(function () {
          videoOpenState = null;
          finishClose("video", null, { revealChapter: chapter });
        }, 380);
      }, handoff);
      return;
    }

    if (gallery && !REDUCED) {
      var softExit = staggerGalleryExit(gallery);
      gallery.classList.remove("is-ready", "is-slide-up");
      gallery.style.transition =
        "opacity 1.25s cubic-bezier(0.22, 1, 0.36, 1), transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)";
      gallery.style.opacity = "0";
      gallery.style.transform = "translate3d(0, 22%, 0)";
      window.setTimeout(function () {
        videoOpenState = null;
        finishClose("video", null, { revealChapter: chapter });
      }, Math.max(1400, softExit + 400));
      return;
    }
    stage.classList.add("is-closing");
    window.setTimeout(function () {
      videoOpenState = null;
      finishClose("video", null, { revealChapter: chapter });
    }, REDUCED ? 0 : 640);
  }

  /* Reverse of openGraphics: masonry fades staggered, fly back, catalog blooms */
  function closeGraphicsReverse() {
    document.body.classList.add("is-closing-reverse");
    root.classList.add("is-closing-reverse");
    var chapter = openChapter;
    var gallery = bodyEl.querySelector(".expand-gallery");
    var first = gallery && gallery.querySelector(".graphics-masonry__item");
    var tiles = chapter ? captureTiles(".chapter-show__tile", chapter) : [];
    var hero = tiles[Math.floor(tiles.length / 2)] || tiles[0];
    if (first && hero && !REDUCED) {
      var exitMs = staggerGalleryExit(gallery);
      var srcRect = first.getBoundingClientRect();
      var fly = placeGhost(
        {
          rect: srcRect,
          src: (first.querySelector("img") && first.querySelector("img").src) || hero.src,
        },
        "is-hero"
      );
      gallery.style.transition =
        "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1), transform 1.45s cubic-bezier(0.22, 1, 0.36, 1)";
      window.setTimeout(function () {
        gallery.style.opacity = "0";
        gallery.style.transform = "translate3d(0, 12%, 0)";
      }, Math.min(360, exitMs * 0.3));

      window.setTimeout(function () {
        morphGhostToRect(fly, hero.rect, { radius: "0.55rem" });
      }, Math.max(320, exitMs * 0.45));

      /* Other scatter tiles bloom around the returning hero */
      var otherGhosts = [];
      tiles.forEach(function (t) {
        if (t === hero) return;
        var g = placeGhost(t, "");
        g.style.opacity = "0";
        g.style.transform = "scale(0.92)";
        g.style.transition =
          "opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1), transform 1.55s cubic-bezier(0.22, 1, 0.36, 1)";
        otherGhosts.push(g);
      });
      shuffleList(otherGhosts).forEach(function (g, i) {
        var d = staggeredDelay(i, otherGhosts.length, 0.48, Math.min(1.85, 0.45 + otherGhosts.length * 0.055), 0.09);
        window.setTimeout(function () {
          g.style.opacity = "1";
          g.style.transform = "scale(1)";
        }, Math.round(d * 1000));
      });

      var handoff = Math.max(1800, exitMs + 900);
      window.setTimeout(function () {
        if (fly) fly.style.opacity = "0";
        otherGhosts.forEach(function (g) {
          g.style.opacity = "0";
        });
        window.setTimeout(function () {
          finishClose("graphics", null, { revealChapter: chapter });
        }, 380);
      }, handoff);
      return;
    }
    stage.classList.add("is-closing");
    window.setTimeout(function () {
      finishClose("graphics", null, { revealChapter: chapter });
    }, REDUCED ? 0 : 640);
  }

  function close() {
    if (!expandedKey || closing) return;
    /* Web case detail collapses first, then a second dismiss closes the deck */
    if (expandedKey === "web" && webDetailOpen && !closing) {
      closeWebCaseDetail();
      return;
    }
    closing = true;
    var prev = expandedKey;
    var resumeIdx = systemsDetailFan ? systemsDetailFan.getIndex() : null;
    if (prev === "systems") {
      closeSystemsReverse(resumeIdx);
      return;
    }
    if (prev === "web") {
      closeWebReverse();
      return;
    }
    if (prev === "video") {
      closeVideoReverse();
      return;
    }
    if (prev === "graphics") {
      closeGraphicsReverse();
      return;
    }
    stage.classList.add("is-closing");
    root.classList.remove("is-morphing", "is-systems-detail");
    activeGhosts.forEach(function (g) {
      if (g) g.style.opacity = "0";
    });
    window.setTimeout(function () {
      finishClose(prev, resumeIdx);
    }, REDUCED ? 0 : 640);
  }

  stage.addEventListener("click", function (e) {
    if (!expandedKey) return;
    if (webDetailOpen) {
      if (e.target.closest && e.target.closest("a.expand-web-visit, .expand-web-visit")) return;
      /* Ignore the same click that just opened detail (card → stage bubble) */
      if (e.target.closest && e.target.closest(".expand-deck__card")) return;
      closeWebCaseDetail();
      return;
    }
    if (isInteractiveTarget(e.target)) return;
    close();
  });
  document.addEventListener(
    "click",
    function (e) {
      if (!expandedKey || closing) return;
      if (!stage.classList.contains("is-open")) return;
      if (document.body.classList.contains("is-sys-fan-dragging")) return;
      if (e.target.closest && e.target.closest(".site-nav, .nav-overlay")) return;
      /* Detail → lista: klik gdziekolwiek (poza Odwiedź) zamyka popup, nie katalog */
      if (webDetailOpen) {
        if (e.target.closest && e.target.closest("a.expand-web-visit, .expand-web-visit")) return;
        e.preventDefault();
        e.stopPropagation();
        closeWebCaseDetail();
        return;
      }
      if (isInteractiveTarget(e.target)) return;
      close();
    },
    true
  );

  window.addEventListener("keydown", function (e) {
    if (!expandedKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (expandedKey === "web" && !webDetailOpen) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setDeckIndex(Math.round(deckIndex) + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDeckIndex(Math.round(deckIndex) - 1);
      }
    }
  });

  var deckWheelLock = 0;
  window.addEventListener(
    "wheel",
    function (e) {
      if (expandedKey !== "web" || !deckCards.length) return;
      /* Popup z opisem — zablokuj coverflow; panel opisu może scrollować w pionie */
      if (webDetailOpen) {
        var panel = bodyEl.querySelector(".expand-web-panel");
        var overPanel = panel && e.target && panel.contains(e.target);
        if (!overPanel || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
          e.preventDefault();
        }
        return;
      }
      var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;
      e.preventDefault();
      var now = Date.now();
      if (now - deckWheelLock < 840) return;
      deckWheelLock = now;
      setDeckIndex(Math.round(deckIndex) + (delta > 0 ? 1 : -1));
    },
    { passive: false }
  );

  window.__portfolioExpand = {
    open: open,
    close: close,
    isOpen: function () {
      return !!expandedKey;
    },
    key: function () {
      return expandedKey;
    },
  };
})();
