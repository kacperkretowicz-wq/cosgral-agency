/**
 * Realizacje — in-place expand after „Zobacz więcej”
 * Modes: web (coverflow), systems (2-col interactive cards),
 * video (reels masonry), graphics (graphics masonry).
 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-tile-expand-stage]");
  var bodyEl = document.querySelector("[data-expand-body]");
  var closeBtn = document.querySelector("[data-tile-expand-close]");
  var titleEl = document.querySelector("[data-expand-title]");
  var root = document.querySelector("[data-portfolio-tiles]");
  if (!stage || !bodyEl || !root) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var expandedKey = null;
  var deckIndex = 0;
  var deckCards = [];
  var deckRaf = 0;
  var flyEl = null;
  var manifests = { reels: null, graphics: null };

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
      desc: "Jedno miejsce na dane klientów, planowanie wizyt i pracę przedstawicieli w terenie. Mapa pomaga zobaczyć zasięg i kolejność spotkań.",
      img: "assets/cases/telforceone-crm.svg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-code39.html",
      tag: "Narzędzie / identyfikacja",
      client: "TelForceOne S.A.",
      title: "Generator kodów kreskowych Code 39",
      desc: "Aplikacja dla TelForceOne S.A. do generowania kodów kreskowych w standardzie Code 39.",
      img: "assets/cases/telforceone-code39.svg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka / zapasy",
      client: "TelForceOne S.A.",
      title: "Kontrola stanów i prognozowanie",
      desc: "Widok zapasów i prognoz popytu wspiera planowanie zakupów oraz szybsze wychwytywanie ryzyka braków.",
      img: "assets/cases/telforceone-forecast.svg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Panel sklepu i monitoring cen",
      desc: "Stany magazynowe, porównanie cen z marketplace’ami i alerty przecen. Mniej ręcznej kontroli — szybsza reakcja na zmiany cen.",
      img: "assets/cases/shelfsync.svg",
      cls: "portfolio-case-card--app",
    },
    {
      href: "portfolio-crm-leady.html",
      tag: "CRM",
      client: "",
      title: "CRM leadów, dealów i operacji sprzedażowych",
      desc: "Narzędzie do prowadzenia sprzedaży: leady → deale → pipeline, notatki, statusy i przypomnienia w jednym miejscu.",
      img: "assets/cases/northline-crm.svg",
      cls: "portfolio-case-card--crm",
    },
    {
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Chatbot AI do wiadomości klientów",
      desc: "Asystent AI odpowiadający na wiadomości z Instagram, Facebook i WWW — FAQ, godziny otwarcia, wstępne wyceny oraz przekazanie rozmowy do konsultanta.",
      img: "assets/cases/atelier-bloom.svg",
      cls: "portfolio-case-card--bot",
    },
    {
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "Trove",
      title: "Zamówienie → faktura → status paczki",
      desc: "Workflow e-commerce: nowe zamówienie uruchamia eksport pod fakturę, aktualizację statusu paczki i powiadomienie klienta.",
      img: "assets/cases/parcel-co.svg",
      cls: "portfolio-case-card--flow",
    },
  ];

  var TITLES = {
    web: "Strony internetowe",
    systems: "Systemy i automatyzacje",
    video: "Montaż wideo",
    graphics: "Grafiki",
  };

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function setOpen(open) {
    document.body.classList.toggle("is-tile-expanded", open);
    root.classList.toggle("is-expanded", open);
    stage.hidden = !open;
    stage.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) stage.classList.add("is-open");
    else stage.classList.remove("is-open");
  }

  function clearBody() {
    bodyEl.innerHTML = "";
    bodyEl.removeAttribute("data-expand-mode");
    deckCards = [];
    deckIndex = 0;
    if (flyEl && flyEl.parentNode) flyEl.parentNode.removeChild(flyEl);
    flyEl = null;
  }

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
    deckCards.forEach(function (card, i) {
      var offset = i - deckIndex;
      var abs = Math.abs(offset);
      var x = offset * 58;
      var z = -abs * 140;
      var rot = offset * -18;
      var scale = Math.max(0.72, 1 - abs * 0.12);
      var opacity = Math.max(0.28, 1 - abs * 0.38);
      card.style.transform =
        "translate3d(calc(-50% + " +
        x +
        "%), -50%, " +
        z +
        "px) rotateY(" +
        rot +
        "deg) scale(" +
        scale +
        ")";
      card.style.opacity = String(opacity);
      card.style.zIndex = String(Math.round(40 - abs * 10));
      card.classList.toggle("is-front", i === n);
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
    var dots = bodyEl.querySelectorAll("[data-expand-deck-dot]");
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === n);
    });
    var prev = bodyEl.querySelector("[data-expand-deck-prev]");
    var next = bodyEl.querySelector("[data-expand-deck-next]");
    if (prev) prev.disabled = n <= 0;
    if (next) next.disabled = n >= deckCards.length - 1;
  }

  function requestDeckLayout() {
    if (deckRaf) return;
    deckRaf = window.requestAnimationFrame(function () {
      deckRaf = 0;
      layoutDeck();
    });
  }

  function setDeckIndex(next) {
    deckIndex = Math.max(0, Math.min(deckCards.length - 1, next));
    requestDeckLayout();
  }

  function buildWebDeck(startIdx) {
    bodyEl.setAttribute("data-expand-mode", "web");
    var deck = document.createElement("div");
    deck.className = "expand-deck";
    var track = document.createElement("div");
    track.className = "expand-deck__track";
    track.setAttribute("data-expand-deck-track", "");

    WEB_CASES.forEach(function (item) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "expand-deck__card";
      card.setAttribute("data-expand-deck-card", item.id);
      card.setAttribute("aria-label", item.title);

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
      body.innerHTML =
        '<p class="expand-deck__name"></p><p class="expand-deck__lead"></p>';
      body.querySelector(".expand-deck__name").textContent = item.title;
      body.querySelector(".expand-deck__lead").textContent = item.lead;
      card.appendChild(body);

      card.addEventListener("click", function () {
        var i = WEB_CASES.indexOf(item);
        if (Math.round(deckIndex) === i) {
          window.location.href = item.href;
          return;
        }
        setDeckIndex(i);
      });

      track.appendChild(card);
      deckCards.push(card);
    });

    var arrows = document.createElement("div");
    arrows.className = "expand-deck__arrows";
    arrows.innerHTML =
      '<button type="button" class="expand-deck__arrow" data-expand-deck-prev aria-label="Poprzedni projekt">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10.2 2.6L5.4 8l4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<div class="expand-deck__dots" data-expand-deck-dots></div>' +
      '<button type="button" class="expand-deck__arrow" data-expand-deck-next aria-label="Następny projekt">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5.8 2.6L10.6 8l-4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>";
    var dotsWrap = arrows.querySelector("[data-expand-deck-dots]");
    WEB_CASES.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "expand-deck__dot";
      d.setAttribute("data-expand-deck-dot", "");
      d.setAttribute("aria-label", "Projekt " + (i + 1));
      d.addEventListener("click", function () {
        setDeckIndex(i);
      });
      dotsWrap.appendChild(d);
    });
    arrows.querySelector("[data-expand-deck-prev]").addEventListener("click", function () {
      setDeckIndex(Math.round(deckIndex) - 1);
    });
    arrows.querySelector("[data-expand-deck-next]").addEventListener("click", function () {
      setDeckIndex(Math.round(deckIndex) + 1);
    });

    deck.appendChild(track);
    deck.appendChild(arrows);
    bodyEl.appendChild(deck);

    deckIndex = startIdx || 0;
    layoutDeck();

    /* pointer drag */
    var dragging = false;
    var startX = 0;
    var startIndex = 0;
    track.addEventListener("pointerdown", function (e) {
      dragging = true;
      startX = e.clientX;
      startIndex = deckIndex;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      deckIndex = Math.max(0, Math.min(deckCards.length - 1, startIndex - dx / 220));
      requestDeckLayout();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      setDeckIndex(Math.round(deckIndex));
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
  }

  function flyThenDeck(hero) {
    if (!hero || REDUCED) {
      buildWebDeck(hero ? hero.caseIdx : 0);
      return;
    }
    flyEl = document.createElement("figure");
    flyEl.className = "expand-fly";
    flyEl.style.left = hero.rect.left + "px";
    flyEl.style.top = hero.rect.top + "px";
    flyEl.style.width = hero.rect.width + "px";
    flyEl.style.height = hero.rect.height + "px";
    var img = document.createElement("img");
    img.src = hero.src;
    img.alt = "";
    flyEl.appendChild(img);
    document.body.appendChild(flyEl);

    var targetW = Math.min(window.innerWidth * 0.42, 352);
    var targetH = targetW * (10 / 16);
    var targetL = (window.innerWidth - targetW) / 2;
    var targetT = (window.innerHeight - targetH) / 2 - 12;

    window.requestAnimationFrame(function () {
      flyEl.style.left = targetL + "px";
      flyEl.style.top = targetT + "px";
      flyEl.style.width = targetW + "px";
      flyEl.style.height = targetH + "px";
      flyEl.style.borderRadius = "1rem";
    });

    window.setTimeout(function () {
      buildWebDeck(hero.caseIdx);
      if (flyEl) {
        flyEl.style.opacity = "0";
        window.setTimeout(function () {
          if (flyEl && flyEl.parentNode) flyEl.parentNode.removeChild(flyEl);
          flyEl = null;
        }, 280);
      }
    }, REDUCED ? 0 : 620);
  }

  function buildSystemsGallery() {
    bodyEl.setAttribute("data-expand-mode", "systems");
    var gallery = document.createElement("div");
    gallery.className = "expand-gallery";
    var grid = document.createElement("div");
    grid.className = "expand-gallery__grid portfolio-case-grid";

    SYSTEM_CASES.forEach(function (item) {
      var article = document.createElement("article");
      article.className = "portfolio-case-card portfolio-case-card--linked " + (item.cls || "");
      var link = document.createElement("a");
      link.className = "portfolio-case-card__link";
      link.href = item.href;
      link.setAttribute("aria-label", item.title);

      var preview = document.createElement("div");
      preview.className = "portfolio-case-card__preview portfolio-case-card__preview--animated";
      var img = document.createElement("img");
      img.className = "portfolio-case-card__visual";
      img.src = item.img;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 640;
      img.height = 360;
      preview.appendChild(img);

      var body = document.createElement("div");
      body.className = "portfolio-case-card__body";
      var html =
        '<p class="portfolio-case-card__tag"></p>' +
        (item.client ? '<p class="portfolio-case-card__client"></p>' : "") +
        '<h3 class="portfolio-case-card__title"></h3>' +
        '<p class="portfolio-case-card__desc"></p>' +
        '<span class="portfolio-case-card__more">Zobacz realizację →</span>';
      body.innerHTML = html;
      body.querySelector(".portfolio-case-card__tag").textContent = item.tag;
      if (item.client) body.querySelector(".portfolio-case-card__client").textContent = item.client;
      body.querySelector(".portfolio-case-card__title").textContent = item.title;
      body.querySelector(".portfolio-case-card__desc").textContent = item.desc;

      link.appendChild(preview);
      link.appendChild(body);
      article.appendChild(link);
      grid.appendChild(article);
    });

    gallery.appendChild(grid);
    bodyEl.appendChild(gallery);
    window.requestAnimationFrame(function () {
      gallery.classList.add("is-ready");
      if (window.CosgralEnhanceCasePreviews) {
        window.CosgralEnhanceCasePreviews(gallery);
      }
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

  function buildMediaGallery(kind, data) {
    bodyEl.setAttribute("data-expand-mode", kind === "reels" ? "video" : "graphics");
    var gallery = document.createElement("div");
    gallery.className = "expand-gallery";

    (data.groups || []).forEach(function (group) {
      var section = document.createElement("section");
      section.className = "expand-gallery__group";
      var head = document.createElement("header");
      head.className = "expand-gallery__head";
      head.innerHTML =
        '<h3 class="expand-gallery__heading"></h3><p class="expand-gallery__count"></p>';
      head.querySelector(".expand-gallery__heading").textContent = group.name || group.id;
      var items = group.items || [];
      head.querySelector(".expand-gallery__count").textContent =
        items.length + (kind === "reels" ? " rolek" : " grafik");
      section.appendChild(head);

      var masonry = document.createElement("div");
      masonry.className = kind === "reels" ? "reels-masonry" : "graphics-masonry";

      items.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = kind === "reels" ? "reels-masonry__item" : "graphics-masonry__item";
        if (item.type === "video" || kind === "reels") btn.classList.add("is-video");
        var ar = item.h && item.w ? item.h / item.w : kind === "reels" ? 16 / 9 : 1.25;
        btn.style.setProperty("--ar", String(ar));
        btn.style.aspectRatio = item.w && item.h ? item.w + " / " + item.h : "auto";

        if (kind === "reels" || item.type === "video") {
          var video = document.createElement("video");
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "none";
          if (item.poster) video.poster = item.poster;
          video.setAttribute("data-video-src", item.src);
          video.src = item.src;
          btn.appendChild(video);
          btn.addEventListener("mouseenter", function () {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          });
          btn.addEventListener("mouseleave", function () {
            try {
              video.pause();
            } catch (e) {}
          });
        } else {
          var img = document.createElement("img");
          img.src = item.src;
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          btn.appendChild(img);
        }
        masonry.appendChild(btn);
      });

      section.appendChild(masonry);
      gallery.appendChild(section);
    });

    bodyEl.appendChild(gallery);
    window.requestAnimationFrame(function () {
      gallery.classList.add("is-ready");
    });
  }

  function open(key, chapter) {
    if (!key || expandedKey === key) return;
    expandedKey = key;
    clearBody();
    if (titleEl) titleEl.textContent = TITLES[key] || "";
    setOpen(true);
    dispatch("portfolio-expand-open", { key: key });

    if (key === "web") {
      var hero = chapter ? pickHeroShot(chapter) : null;
      flyThenDeck(hero);
      return;
    }
    if (key === "systems") {
      buildSystemsGallery();
      return;
    }
    if (key === "video") {
      fetchManifest("reels")
        .then(function (data) {
          if (expandedKey !== "video") return;
          buildMediaGallery("reels", data);
        })
        .catch(function () {
          bodyEl.innerHTML = "<p style='padding:2rem;color:#fff'>Nie udało się wczytać galerii montażu.</p>";
        });
      return;
    }
    if (key === "graphics") {
      fetchManifest("graphics")
        .then(function (data) {
          if (expandedKey !== "graphics") return;
          buildMediaGallery("graphics", data);
        })
        .catch(function () {
          bodyEl.innerHTML = "<p style='padding:2rem;color:#111'>Nie udało się wczytać galerii grafik.</p>";
        });
    }
  }

  function close() {
    if (!expandedKey) return;
    var prev = expandedKey;
    expandedKey = null;
    setOpen(false);
    dispatch("portfolio-expand-close", { key: prev });
    window.setTimeout(
      function () {
        if (expandedKey) return;
        clearBody();
      },
      REDUCED ? 0 : 380
    );
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  window.addEventListener("keydown", function (e) {
    if (!expandedKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (expandedKey === "web") {
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
      var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;
      e.preventDefault();
      var now = Date.now();
      if (now - deckWheelLock < 420) return;
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
