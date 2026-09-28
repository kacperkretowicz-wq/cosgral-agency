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
  var closing = false;
  var activeGhosts = [];
  var systemsDetailFan = null;

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
      desc: "Jedno miejsce na dane klientów, planowanie wizyt i pracę przedstawicieli w terenie. Mapa tras, etykiety i raporty w jednym panelu — bez Exceli i telefonów.",
      img: "assets/cases/telforceone-crm.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-crm-map-bw.jpg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-code39.html",
      tag: "Narzędzie / identyfikacja",
      client: "TelForceOne S.A.",
      title: "Generator kodów kreskowych Code 39",
      desc: "Aplikacja do szybkiego generowania i podglądu etykiet Code 39 — gotowych do druku i skanowania w magazynie.",
      img: "assets/cases/telforceone-code39.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-barcode-bw.jpg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-telforceone-forecast.html",
      tag: "Analityka / zapasy",
      client: "TelForceOne S.A.",
      title: "Kontrola stanów i prognozowanie",
      desc: "Widok zapasów, rotacji i prognoz popytu wspiera planowanie zakupów zanim braknie towaru na półce.",
      img: "assets/cases/telforceone-forecast.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-forecast-bw.jpg",
      cls: "portfolio-case-card--telforce",
    },
    {
      href: "portfolio-trove-panel.html",
      tag: "Aplikacja",
      client: "Trove",
      title: "Panel sklepu i monitoring cen",
      desc: "Stany magazynowe, porównanie cen z marketplace’ami i alerty przecen — wszystko w jednym panelu operacyjnym.",
      img: "assets/cases/shelfsync.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-price-monitor-bw.jpg",
      cls: "portfolio-case-card--app",
    },
    {
      href: "portfolio-crm-leady.html",
      tag: "CRM",
      client: "",
      title: "CRM leadów, dealów i operacji sprzedażowych",
      desc: "Leady → deale → pipeline, notatki, statusy i przypomnienia. Zespół widzi cały lejek bez przełączania narzędzi.",
      img: "assets/cases/northline-crm.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-kanban-bw.jpg",
      cls: "portfolio-case-card--crm",
    },
    {
      href: "portfolio-chatbot-ai.html",
      tag: "Automatyzacja",
      client: "",
      title: "Chatbot AI do wiadomości klientów",
      desc: "Asystent AI na Instagram, Facebook i WWW — odpowiada na FAQ, zbiera leady i przekazuje rozmowę do konsultanta.",
      img: "assets/cases/atelier-bloom.svg",
      still: "portfolio-media/showcase/chapter-stills/systems/bw/ui-chatbot-bw.jpg",
      cls: "portfolio-case-card--bot",
    },
    {
      href: "portfolio-trove-workflow.html",
      tag: "Automatyzacja",
      client: "Trove",
      title: "Zamówienie → faktura → status paczki",
      desc: "Workflow e-commerce: zamówienie → faktura → paczka → powiadomienie klienta. Mniej ręcznej roboty, mniej błędów.",
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
  }

  function isInteractiveTarget(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      "a, button, video, .expand-deck__card, .portfolio-case-card, .expand-feed__item, .reels-masonry__item, .graphics-masonry__item, .expand-hero-tile, .expand-cam__tile, .expand-fly, .sys-fan__card, .sys-fan__arrow, .sys-fan__copy, .sys-fan__more"
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
    deckCards.forEach(function (card, i) {
      var offset = i - deckIndex;
      var abs = Math.abs(offset);
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
        }, 220);
      });
    }, REDUCED ? 0 : 680);
  }

  /* —— Shared helpers —— */
  function captureTiles(selector, chapter) {
    var scope = chapter || document;
    return Array.prototype.slice.call(scope.querySelectorAll(selector)).map(function (el) {
      var img = el.querySelector("img, video");
      var src = "";
      if (img) {
        src =
          img.currentSrc ||
          img.src ||
          img.getAttribute("poster") ||
          img.getAttribute("data-video-src") ||
          "";
      }
      return { el: el, rect: el.getBoundingClientRect(), src: src };
    }).filter(function (t) {
      return t.rect.width > 8 && t.rect.height > 8 && t.rect.bottom > 0 && t.rect.top < window.innerHeight;
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
    setTimeout(function () {
      activeGhosts.forEach(function (g) {
        if (g && g.parentNode) g.parentNode.removeChild(g);
      });
      activeGhosts = [];
    }, delay || 0);
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

    /* Start visually matching the large catalog fan, then pull back for copy */
    requestAnimationFrame(function () {
      mount.classList.add("is-from-catalog");
      requestAnimationFrame(function () {
        mount.classList.remove("is-entering", "is-from-catalog");
        mount.classList.add("is-settled");
        wrap.classList.add("is-ready");
      });
    });
  }

  /* Montaż: straighten diagonal → pin 2 center tiles → list slides from under */
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

    var colW = Math.min(300, window.innerWidth * 0.4);
    var gap = 18;
    var total = colW * 2 + gap;
    var startX = (window.innerWidth - total) / 2;
    var topY = Math.max(64, window.innerHeight * 0.08);
    var heroH = colW * (16 / 9);

    /* Phase 1: straighten diagonal (+ derotate belt) and park 2 heroes as columns */
    requestAnimationFrame(function () {
      beltLayer.classList.add("is-level");
      beltGhosts.forEach(function (item, i) {
        var g = item.el;
        if (item.hero) {
          var hi = heroes.indexOf(item.tile);
          g.style.left = startX + hi * (colW + gap) + "px";
          g.style.top = topY + "px";
          g.style.width = colW + "px";
          g.style.height = heroH + "px";
          g.style.borderRadius = "12px";
          g.style.zIndex = "20";
          g.style.opacity = "1";
          g.style.transform = "rotate(0deg)";
        } else {
          /* Side tiles level out and fade while heroes hold the frame */
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
      buildMediaInto(gallery, "reels", data, {
        seedPosters: heroes.map(function (h) {
          return h.src;
        }),
      });
      /* Measure first two masonry cells — heroes should land there */
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
        /* Phase 2: snap heroes onto first masonry slots, slide list from under */
        beltGhosts.forEach(function (item) {
          if (!item.hero) return;
          var hi = heroes.indexOf(item.tile);
          var r = dest[hi];
          if (r && r.width > 4) {
            morphGhostToRect(item.el, r, { radius: "10px" });
          }
        });
        gallery.style.opacity = "1";
        gallery.classList.add("is-ready", "is-slide-up");
        setTimeout(function () {
          beltLayer.style.opacity = "0";
          removeGhosts(320);
        }, 280);
      }, REDUCED ? 0 : 700);
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
        removeGhosts(260);
      }, REDUCED ? 0 : 680);
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
    (data.groups || []).forEach(function (group, gi) {
      var section = document.createElement("section");
      section.className = "expand-gallery__group";
      var head = document.createElement("header");
      head.className = "expand-gallery__head";
      head.innerHTML = '<h3 class="expand-gallery__heading"></h3><p class="expand-gallery__count"></p>';
      head.querySelector(".expand-gallery__heading").textContent = group.name || group.id;
      var items = (group.items || []).slice();
      /* Prefer seeded posters at the front of the first group for seamless morph */
      if (gi === 0 && seeds.length) {
        items = items.slice().sort(function (a, b) {
          var as = seeds.some(function (s) {
            return s && ((a.poster && a.poster.indexOf(s.split("/").pop()) !== -1) || (a.src && s.indexOf(a.src.split("/").pop()) !== -1));
          })
            ? 0
            : 1;
          var bs = seeds.some(function (s) {
            return s && ((b.poster && b.poster.indexOf(s.split("/").pop()) !== -1) || (b.src && s.indexOf(b.src.split("/").pop()) !== -1));
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
        if (gi === 0 && ii < seeds.length) btn.classList.add("is-anchor");
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
          /* Prefer seeded hero image for the first cell */
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
  }

  function open(key, chapter) {
    if (!key || expandedKey === key || closing) return;
    expandedKey = key;
    clearBody();
    root.classList.remove("is-morphing");
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
    var resumeIdx = systemsDetailFan ? systemsDetailFan.getIndex() : null;
    stage.classList.add("is-closing");
    root.classList.remove("is-morphing", "is-systems-detail");
    activeGhosts.forEach(function (g) {
      if (g) g.style.opacity = "0";
    });
    setTimeout(function () {
      expandedKey = null;
      closing = false;
      setOpen(false);
      stage.classList.remove("is-closing");
      clearBody();
      var catalog = window.CosgralSystemsFan && window.CosgralSystemsFan.getCatalog();
      if (catalog && resumeIdx != null) {
        catalog.setIndex(resumeIdx);
        catalog.resume();
      }
      dispatch("portfolio-expand-close", { key: prev });
    }, REDUCED ? 0 : 320);
  }

  stage.addEventListener("click", function (e) {
    if (!expandedKey) return;
    if (isInteractiveTarget(e.target)) return;
    close();
  });
  document.addEventListener(
    "click",
    function (e) {
      if (!expandedKey || closing) return;
      if (!stage.classList.contains("is-open")) return;
      if (document.body.classList.contains("is-sys-fan-dragging")) return;
      if (isInteractiveTarget(e.target)) return;
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
