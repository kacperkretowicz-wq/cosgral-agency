/**
 * Realizacje expand — camera-zoom morphs from chapter layouts.
 * Click empty backdrop (not a tile/card) to reverse. No back button.
 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-tile-expand-stage]");
  var bodyEl = document.querySelector("[data-expand-body]");
  var root = document.querySelector("[data-portfolio-tiles]");
  if (!stage || !bodyEl || !root) return;
  /* Keep overlay above site nav / chapter layers */
  if (stage.parentElement !== document.body) {
    document.body.appendChild(stage);
  }

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var expandedKey = null;
  var deckIndex = 0;
  var deckCards = [];
  var deckRaf = 0;
  var manifests = { reels: null, graphics: null };
  var closing = false;

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
      desc: "Jedno miejsce na dane klientów, planowanie wizyt i pracę przedstawicieli w terenie.",
      img: "assets/cases/telforceone-crm.svg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-code39.html",
      tag: "Narzędzie / identyfikacja",
      client: "TelForceOne S.A.",
      title: "Generator kodów kreskowych Code 39",
      desc: "Aplikacja do generowania kodów kreskowych w standardzie Code 39.",
      img: "assets/cases/telforceone-code39.svg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka / zapasy",
      client: "TelForceOne S.A.",
      title: "Kontrola stanów i prognozowanie",
      desc: "Widok zapasów i prognoz popytu wspiera planowanie zakupów.",
      img: "assets/cases/telforceone-forecast.svg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Panel sklepu i monitoring cen",
      desc: "Stany magazynowe, porównanie cen z marketplace’ami i alerty przecen.",
      img: "assets/cases/shelfsync.svg",
      cls: "portfolio-case-card--app",
    },
    {
      href: "portfolio-crm-leady.html",
      tag: "CRM",
      client: "",
      title: "CRM leadów, dealów i operacji sprzedażowych",
      desc: "Leady → deale → pipeline, notatki, statusy i przypomnienia w jednym miejscu.",
      img: "assets/cases/northline-crm.svg",
      cls: "portfolio-case-card--crm",
    },
    {
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Chatbot AI do wiadomości klientów",
      desc: "Asystent AI na Instagram, Facebook i WWW — FAQ i przekazanie do konsultanta.",
      img: "assets/cases/atelier-bloom.svg",
      cls: "portfolio-case-card--bot",
    },
    {
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "Trove",
      title: "Zamówienie → faktura → status paczki",
      desc: "Workflow e-commerce: zamówienie → faktura → paczka → powiadomienie.",
      img: "assets/cases/parcel-co.svg",
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
    bodyEl.innerHTML = "";
    bodyEl.removeAttribute("data-expand-mode");
    deckCards = [];
    deckIndex = 0;
  }

  function isInteractiveTarget(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      "a, button, video, .expand-deck__card, .portfolio-case-card, .reels-masonry__item, .graphics-masonry__item, .expand-hero-tile, .expand-cam__tile"
    );
  }

  /* —— Web coverflow (kept) —— */
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
      card.style.transform =
        "translate3d(calc(-50% + " +
        offset * 58 +
        "%), -50%, " +
        -abs * 140 +
        "px) rotateY(" +
        offset * -18 +
        "deg) scale(" +
        Math.max(0.72, 1 - abs * 0.12) +
        ")";
      card.style.opacity = String(Math.max(0.28, 1 - abs * 0.38));
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
    bodyEl.querySelectorAll("[data-expand-deck-dot]").forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === n);
    });
    var prev = bodyEl.querySelector("[data-expand-deck-prev]");
    var next = bodyEl.querySelector("[data-expand-deck-next]");
    if (prev) prev.disabled = n <= 0;
    if (next) next.disabled = n >= deckCards.length - 1;
  }

  function setDeckIndex(next) {
    deckIndex = Math.max(0, Math.min(deckCards.length - 1, next));
    if (deckRaf) return;
    deckRaf = requestAnimationFrame(function () {
      deckRaf = 0;
      layoutDeck();
    });
  }

  function buildWebDeck(startIdx) {
    bodyEl.setAttribute("data-expand-mode", "web");
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
      card.addEventListener("click", function () {
        var i = WEB_CASES.indexOf(item);
        if (Math.round(deckIndex) === i) window.location.href = item.href;
        else setDeckIndex(i);
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
        setDeckIndex(i);
      });
      dots.appendChild(d);
    });
    arrows.querySelector("[data-expand-deck-prev]").onclick = function () {
      setDeckIndex(Math.round(deckIndex) - 1);
    };
    arrows.querySelector("[data-expand-deck-next]").onclick = function () {
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
    var tw = Math.min(window.innerWidth * 0.42, 352);
    var th = tw * (10 / 16);
    requestAnimationFrame(function () {
      fly.style.left = (window.innerWidth - tw) / 2 + "px";
      fly.style.top = (window.innerHeight - th) / 2 - 12 + "px";
      fly.style.width = tw + "px";
      fly.style.height = th + "px";
      fly.style.borderRadius = "1rem";
    });
    setTimeout(function () {
      buildWebDeck(hero.caseIdx);
      fly.style.opacity = "0";
      setTimeout(function () {
        if (fly.parentNode) fly.parentNode.removeChild(fly);
      }, 280);
    }, 620);
  }

  /* —— Camera morph helpers —— */
  function captureTiles(selector, chapter) {
    var scope = chapter || document;
    return Array.prototype.slice.call(scope.querySelectorAll(selector)).map(function (el) {
      var img = el.querySelector("img, video");
      var src = "";
      if (img) {
        src = img.currentSrc || img.src || img.getAttribute("poster") || img.getAttribute("data-video-src") || "";
      }
      return { el: el, rect: el.getBoundingClientRect(), src: src };
    }).filter(function (t) {
      return t.rect.width > 8 && t.rect.height > 8 && t.rect.bottom > 0 && t.rect.top < window.innerHeight;
    });
  }

  function makeCamLayer() {
    var cam = document.createElement("div");
    cam.className = "expand-cam";
    cam.setAttribute("data-expand-cam", "");
    return cam;
  }

  function placeGhost(cam, tile) {
    var g = document.createElement("figure");
    g.className = "expand-cam__tile";
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
    cam.appendChild(g);
    return g;
  }

  /* Systems: scatter → camera zoom into visible 2-col scroll */
  function openSystems(chapter) {
    bodyEl.setAttribute("data-expand-mode", "systems");
    var tiles = captureTiles(".chapter-os__card", chapter);
    if (tiles.length < 4) {
      tiles = captureTiles(".chapter-os__card");
    }
    var cam = makeCamLayer();
    bodyEl.appendChild(cam);
    var ghosts = tiles.map(function (t) {
      return placeGhost(cam, t);
    });

    var gallery = document.createElement("div");
    gallery.className = "expand-gallery expand-gallery--systems";
    var grid = document.createElement("div");
    grid.className = "expand-gallery__grid portfolio-case-grid";
    SYSTEM_CASES.forEach(function (item) {
      var article = document.createElement("article");
      article.className = "portfolio-case-card portfolio-case-card--linked " + (item.cls || "");
      var link = document.createElement("a");
      link.className = "portfolio-case-card__link";
      link.href = item.href;
      var preview = document.createElement("div");
      preview.className = "portfolio-case-card__preview portfolio-case-card__preview--animated";
      var img = document.createElement("img");
      img.className = "portfolio-case-card__visual";
      img.src = item.img;
      img.alt = "";
      preview.appendChild(img);
      var body = document.createElement("div");
      body.className = "portfolio-case-card__body";
      body.innerHTML =
        '<p class="portfolio-case-card__tag"></p>' +
        (item.client ? '<p class="portfolio-case-card__client"></p>' : "") +
        '<h3 class="portfolio-case-card__title"></h3>' +
        '<p class="portfolio-case-card__desc"></p>' +
        '<span class="portfolio-case-card__more">Zobacz realizację →</span>';
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
    gallery.style.opacity = "0";
    bodyEl.appendChild(gallery);

    requestAnimationFrame(function () {
      cam.classList.add("is-zooming");
      /* Camera push-in: pack ghosts into two columns filling the viewport */
      var colW = Math.min(400, (window.innerWidth - 48) * 0.46);
      var gap = 16;
      var startX = (window.innerWidth - colW * 2 - gap) / 2;
      var startY = Math.max(72, window.innerHeight * 0.08);
      var rowH = Math.min(colW * 0.72, 210);
      ghosts.forEach(function (g, i) {
        var col = i % 2;
        var row = Math.floor(i / 2);
        g.style.left = startX + col * (colW + gap) + "px";
        g.style.top = startY + row * (rowH + gap) + "px";
        g.style.width = colW + "px";
        g.style.height = rowH + "px";
        g.style.borderRadius = "12px";
        /* keep first ~rows visible; extras fade as gallery takes over */
        g.style.opacity = i < 8 ? "1" : "0.35";
      });
    });

    setTimeout(function () {
      gallery.style.opacity = "1";
      gallery.classList.add("is-ready");
      cam.classList.add("is-fade");
      if (window.CosgralEnhanceCasePreviews) window.CosgralEnhanceCasePreviews(gallery);
      setTimeout(function () {
        if (cam.parentNode) cam.parentNode.removeChild(cam);
      }, 420);
    }, REDUCED ? 0 : 780);
  }

  /* Montaż: zoom 2 tiles → columns, list slides from under */
  function openVideo(chapter) {
    bodyEl.setAttribute("data-expand-mode", "video");
    var tiles = captureTiles("#reels-tiles .reels-tiles__track:not(.reels-tiles__track--clone) .reels-tiles__card", chapter);
    if (tiles.length < 2) tiles = captureTiles("#reels-tiles .reels-tiles__card", chapter);
    tiles = tiles.slice(0, 2);
    var cam = makeCamLayer();
    bodyEl.appendChild(cam);
    var ghosts = tiles.map(function (t) {
      return placeGhost(cam, t);
    });

    var gallery = document.createElement("div");
    gallery.className = "expand-gallery expand-gallery--video";
    gallery.style.opacity = "0";
    bodyEl.appendChild(gallery);

    requestAnimationFrame(function () {
      cam.classList.add("is-zooming");
      var colW = Math.min(280, window.innerWidth * 0.38);
      var gap = 20;
      var total = colW * 2 + gap;
      var startX = (window.innerWidth - total) / 2;
      var top = window.innerHeight * 0.1;
      ghosts.forEach(function (g, i) {
        g.style.left = startX + i * (colW + gap) + "px";
        g.style.top = top + "px";
        g.style.width = colW + "px";
        g.style.height = colW * (16 / 9) + "px";
        g.style.borderRadius = "10px";
        g.style.zIndex = String(10 - i);
      });
    });

    fetchManifest("reels").then(function (data) {
      if (expandedKey !== "video") return;
      buildMediaInto(gallery, "reels", data);
      setTimeout(function () {
        gallery.style.opacity = "1";
        gallery.classList.add("is-ready", "is-slide-up");
        cam.classList.add("is-fade");
        setTimeout(function () {
          if (cam.parentNode) cam.parentNode.removeChild(cam);
        }, 400);
      }, REDUCED ? 0 : 650);
    });
  }

  /* Grafiki: zoom one tile to center, then grid appears */
  function openGraphics(chapter) {
    bodyEl.setAttribute("data-expand-mode", "graphics");
    var tiles = captureTiles(".chapter-show__tile", chapter);
    var hero = tiles[Math.floor(tiles.length / 2)] || tiles[0];
    var cam = makeCamLayer();
    bodyEl.appendChild(cam);
    var ghost = hero ? placeGhost(cam, hero) : null;

    var gallery = document.createElement("div");
    gallery.className = "expand-gallery expand-gallery--graphics";
    gallery.style.opacity = "0";
    bodyEl.appendChild(gallery);

    if (ghost) {
      requestAnimationFrame(function () {
        cam.classList.add("is-zooming");
        var size = Math.min(320, window.innerWidth * 0.46);
        ghost.style.left = (window.innerWidth - size) / 2 + "px";
        ghost.style.top = (window.innerHeight - size * 1.25) / 2 + "px";
        ghost.style.width = size + "px";
        ghost.style.height = size * 1.25 + "px";
        ghost.style.borderRadius = "8px";
        ghost.classList.add("is-hero");
      });
    }

    fetchManifest("graphics").then(function (data) {
      if (expandedKey !== "graphics") return;
      buildMediaInto(gallery, "graphics", data);
      setTimeout(function () {
        gallery.style.opacity = "1";
        gallery.classList.add("is-ready");
        if (ghost) ghost.style.opacity = "0";
        cam.classList.add("is-fade");
        setTimeout(function () {
          if (cam.parentNode) cam.parentNode.removeChild(cam);
        }, 400);
      }, REDUCED ? 0 : 700);
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

  function buildMediaInto(gallery, kind, data) {
    gallery.innerHTML = "";
    (data.groups || []).forEach(function (group) {
      var section = document.createElement("section");
      section.className = "expand-gallery__group";
      var head = document.createElement("header");
      head.className = "expand-gallery__head";
      head.innerHTML = '<h3 class="expand-gallery__heading"></h3><p class="expand-gallery__count"></p>';
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
        if (kind === "reels" || item.type === "video") btn.classList.add("is-video");
        if (item.w && item.h) btn.style.aspectRatio = item.w + " / " + item.h;
        if (kind === "reels" || item.type === "video") {
          var video = document.createElement("video");
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "none";
          if (item.poster) video.poster = item.poster;
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
          btn.appendChild(img);
        }
        masonry.appendChild(btn);
      });
      section.appendChild(masonry);
      gallery.appendChild(section);
    });
  }

  function open(key, chapter) {
    if (!key || expandedKey === key || closing) return;
    expandedKey = key;
    clearBody();
    setOpen(true);
    dispatch("portfolio-expand-open", { key: key });
    if (key === "web") openWeb(chapter);
    else if (key === "systems") openSystems(chapter);
    else if (key === "video") openVideo(chapter);
    else if (key === "graphics") openGraphics(chapter);
  }

  function close() {
    if (!expandedKey || closing) return;
    closing = true;
    var prev = expandedKey;
    stage.classList.add("is-closing");
    setTimeout(function () {
      expandedKey = null;
      closing = false;
      setOpen(false);
      stage.classList.remove("is-closing");
      clearBody();
      dispatch("portfolio-expand-close", { key: prev });
    }, REDUCED ? 0 : 320);
  }

  stage.addEventListener("click", function (e) {
    if (!expandedKey) return;
    /* Anywhere that is not a tile/card/link closes back to the chapter */
    if (isInteractiveTarget(e.target)) return;
    close();
  });
  /* Also allow clicking the dimmed page chrome / empty gallery chrome */
  document.addEventListener(
    "click",
    function (e) {
      if (!expandedKey || closing) return;
      if (!stage.classList.contains("is-open")) return;
      if (isInteractiveTarget(e.target)) return;
      /* Ignore nav menu toggles */
      if (e.target.closest && e.target.closest(".site-nav, .nav-overlay")) return;
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
