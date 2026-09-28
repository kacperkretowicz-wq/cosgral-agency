/**
 * Realizacje — full-viewport horizontal chapters (pin-matched BGs) + dots + expand rail.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-portfolio-tiles]");
  if (!root) return;

  var scroller = root.querySelector("[data-chapters-scroller]");
  var chapters = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile]"));
  var dots = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-chapter-dot]"));
  var prevBtn = root.querySelector("[data-portfolio-chapter-prev]");
  var nextBtn = root.querySelector("[data-portfolio-chapter-next]");
  var expandStage = root.querySelector("[data-tile-expand-stage]");
  var expandSource = root.querySelector("[data-tile-expand-source]");
  var expandSourceMedia = root.querySelector("[data-tile-expand-source-media]");
  var expandSourceTitle = root.querySelector("[data-tile-expand-source-title]");
  var expandTrack = root.querySelector("[data-tile-expand-track]");
  if (!scroller || !chapters.length) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var activeIndex = -1;
  var vizShowTimer = null;
  var luxTimer = null;
  var osTimer = null;
  var showTimer = null;
  var pendingTheme = null;
  var expandedKey = null;
  var caseVideoTimer = null;
  var wheelLock = 0;
  var scrollRaf = 0;

  var STILL = "portfolio-media/showcase/chapter-stills/";
  var ACC = STILL + "accents/";
  var GFX = "portfolio-media/graphics/juicy-events/";
  var REEL = "portfolio-media/reels/";

  var CASE_SETS = {
    web: [
      {
        href: "portfolio-strona-juicy-events.html",
        title: "Juicy Events",
        lead: "Agencja eventowa",
        video: "portfolio-media/showcase/web/juicy-events.mp4",
        poster: "portfolio-media/showcase/web/juicy-events-poster.jpg",
      },
      {
        href: "portfolio-strona-trove.html",
        title: "Trove Archive",
        lead: "Ecommerce fashion",
        video: "portfolio-media/showcase/web/trove-archive.mp4",
        poster: "portfolio-media/showcase/web/trove-archive-poster.jpg",
      },
      {
        href: "portfolio-strona-mj.html",
        title: "MJ Social Media",
        lead: "Content creator",
        video: "portfolio-media/showcase/web/mj-social-media.mp4",
        poster: "portfolio-media/showcase/web/mj-social-media-poster.jpg",
      },
    ],
    systems: [
      {
        href: "portfolio-telforceone-crm.html",
        title: "CRM z mapą handlowców",
        lead: "TelForceOne S.A.",
        img: "assets/cases/telforceone-crm.svg",
      },
      {
        href: "portfolio-telforceone-code39.html",
        title: "Generator Code 39",
        lead: "TelForceOne S.A.",
        img: "assets/cases/telforceone-code39.svg",
      },
      {
        href: "portfolio-telforceone-forecast.html",
        title: "Stany i prognozowanie",
        lead: "TelForceOne S.A.",
        img: "assets/cases/telforceone-forecast.svg",
      },
      {
        href: "portfolio-trove-panel.html",
        title: "Panel sklepu i monitoring cen",
        lead: "Trove",
        img: "assets/cases/shelfsync.svg",
      },
      {
        href: "portfolio-crm-leady.html",
        title: "CRM leadów i dealów",
        lead: "Sprzedaż",
        img: "assets/cases/northline-crm.svg",
      },
      {
        href: "portfolio-chatbot-ai.html",
        title: "Chatbot AI",
        lead: "Automatyzacja",
        img: "assets/cases/atelier-bloom.svg",
      },
      {
        href: "portfolio-trove-workflow.html",
        title: "Zamówienie → faktura → paczka",
        lead: "Trove",
        img: "assets/cases/parcel-co.svg",
      },
    ],
  };

  var LUX_SETS = [
    {
      lines: [
        { pl: "New", en: "New" },
        { pl: "Sites", en: "Sites" },
      ],
      shots: [
        STILL + "web/trove-0-5.jpg",
        STILL + "web/juicy-1-5.jpg",
        STILL + "web/mj-2-5.jpg",
        STILL + "web/trove-3-5.jpg",
        STILL + "web/juicy-4-5.jpg",
      ],
    },
    {
      lines: [
        { pl: "New", en: "New" },
        { pl: "Craft", en: "Craft" },
      ],
      shots: [
        STILL + "web/juicy-0-5.jpg",
        STILL + "web/mj-1-5.jpg",
        STILL + "web/trove-2-5.jpg",
        STILL + "web/juicy-3-5.jpg",
        STILL + "web/mj-4-5.jpg",
      ],
    },
    {
      lines: [
        { pl: "New", en: "New" },
        { pl: "Values", en: "Values" },
      ],
      shots: [
        STILL + "web/mj-0-5.jpg",
        STILL + "web/trove-1-5.jpg",
        STILL + "web/juicy-2-5.jpg",
        STILL + "web/mj-3-5.jpg",
        STILL + "web/trove-4-5.jpg",
      ],
    },
  ];

  /* Systemy — only systems / automation chapter stills + system case art */
  var OS_MEDIA = [
    STILL + "systems/crm-0-5.jpg",
    STILL + "systems/crm-1-5.jpg",
    STILL + "systems/crm-2-5.jpg",
    STILL + "systems/crm-3-5.jpg",
    STILL + "systems/auto-0-5.jpg",
    STILL + "systems/auto-1-5.jpg",
    STILL + "systems/auto-2-5.jpg",
    STILL + "systems/auto-3-5.jpg",
    STILL + "systems/app-0-5.jpg",
    STILL + "systems/app-1-5.jpg",
    STILL + "systems/app-2-5.jpg",
    STILL + "systems/app-3-5.jpg",
    "assets/cases/telforceone-crm.svg",
    "assets/cases/telforceone-code39.svg",
    "assets/cases/telforceone-forecast.svg",
    "assets/cases/shelfsync.svg",
    "assets/cases/northline-crm.svg",
    "assets/cases/parcel-co.svg",
  ];

  var SHOW_WORDS = [
    { pl: "Grafiki", en: "Visuals" },
    { pl: "Showcase", en: "Showcase" },
    { pl: "Cosgral", en: "Cosgral" },
  ];

  var SHOW_POOL = [
    GFX + "001.jpg",
    GFX + "003.jpg",
    GFX + "005.jpg",
    GFX + "008.jpg",
    GFX + "010.jpg",
    GFX + "012.jpg",
    GFX + "015.jpg",
    GFX + "018.jpg",
    GFX + "021.jpg",
    GFX + "024.jpg",
    ACC + "accent-yellow.svg",
    ACC + "accent-green.svg",
    ACC + "accent-blue.svg",
    ACC + "accent-red.svg",
    ACC + "accent-grad.svg",
    ACC + "accent-type.svg",
  ];

  var SHOW_LAYOUTS = [
    [
      { x: "-28vw", y: "-26vh", w: "min(12vw, 6.5rem)", r: "-4deg", z: 2 },
      { x: "26vw", y: "-22vh", w: "min(16vw, 8.5rem)", r: "3deg", z: 3, wide: true },
      { x: "-32vw", y: "4vh", w: "min(14vw, 7.5rem)", r: "0deg", z: 4 },
      { x: "0vw", y: "-2vh", w: "min(13vw, 7rem)", r: "0deg", z: 6, portrait: true },
      { x: "30vw", y: "8vh", w: "min(15vw, 8rem)", r: "2deg", z: 3 },
      { x: "-22vw", y: "26vh", w: "min(13vw, 7rem)", r: "-2deg", z: 2 },
      { x: "8vw", y: "28vh", w: "min(12vw, 6.5rem)", r: "0deg", z: 5 },
      { x: "28vw", y: "30vh", w: "min(14vw, 7.5rem)", r: "4deg", z: 2 },
    ],
    [
      { x: "-30vw", y: "-20vh", w: "min(14vw, 7.5rem)", r: "0deg", z: 3, portrait: true },
      { x: "4vw", y: "-28vh", w: "min(11vw, 6rem)", r: "0deg", z: 2 },
      { x: "28vw", y: "-18vh", w: "min(13vw, 7rem)", r: "0deg", z: 4 },
      { x: "-26vw", y: "10vh", w: "min(15vw, 8rem)", r: "-3deg", z: 5 },
      { x: "24vw", y: "6vh", w: "min(12vw, 6.5rem)", r: "0deg", z: 3 },
      { x: "-8vw", y: "26vh", w: "min(13vw, 7rem)", r: "0deg", z: 4 },
      { x: "18vw", y: "28vh", w: "min(14vw, 7.5rem)", r: "2deg", z: 2 },
      { x: "32vw", y: "22vh", w: "min(12vw, 6.5rem)", r: "0deg", z: 3 },
    ],
    [
      { x: "-24vw", y: "-28vh", w: "min(13vw, 7rem)", r: "0deg", z: 3 },
      { x: "22vw", y: "-26vh", w: "min(12vw, 6.5rem)", r: "0deg", z: 2 },
      { x: "-32vw", y: "0vh", w: "min(12vw, 6.5rem)", r: "0deg", z: 4, portrait: true },
      { x: "0vw", y: "2vh", w: "min(15vw, 8rem)", r: "0deg", z: 5 },
      { x: "30vw", y: "2vh", w: "min(14vw, 7.5rem)", r: "0deg", z: 3 },
      { x: "-20vw", y: "28vh", w: "min(13vw, 7rem)", r: "-2deg", z: 2 },
      { x: "10vw", y: "26vh", w: "min(12vw, 6.5rem)", r: "0deg", z: 4 },
      { x: "28vw", y: "28vh", w: "min(13vw, 7rem)", r: "3deg", z: 2, wide: true },
    ],
  ];

  var OS_STACK = [
    { x: "-4%", y: "-6%", s: 1.12, z: 12 },
    { x: "14%", y: "0%", s: 0.98, z: 11 },
    { x: "-18%", y: "8%", s: 0.94, z: 10 },
    { x: "20%", y: "12%", s: 0.9, z: 9 },
    { x: "-2%", y: "18%", s: 0.86, z: 8 },
    { x: "10%", y: "-20%", s: 0.8, z: 7 },
    { x: "-22%", y: "-16%", s: 0.76, z: 6 },
    { x: "24%", y: "-14%", s: 0.74, z: 6 },
    { x: "-14%", y: "24%", s: 0.7, z: 5 },
    { x: "16%", y: "22%", s: 0.68, z: 5 },
    { x: "2%", y: "-26%", s: 0.64, z: 4 },
    { x: "-28%", y: "2%", s: 0.62, z: 4 },
    { x: "30%", y: "4%", s: 0.6, z: 3 },
    { x: "-10%", y: "-30%", s: 0.56, z: 3 },
    { x: "8%", y: "30%", s: 0.54, z: 2 },
    { x: "22%", y: "-28%", s: 0.52, z: 2 },
    { x: "-32%", y: "14%", s: 0.48, z: 1 },
    { x: "34%", y: "16%", s: 0.46, z: 1 },
    { x: "-6%", y: "32%", s: 0.44, z: 1 },
    { x: "12%", y: "-32%", s: 0.42, z: 1 },
  ];

  function osFieldPos(i, n) {
    var cols = 6;
    var row = Math.floor(i / cols);
    var col = i % cols;
    var x = (col - (cols - 1) / 2) * 15 + ((row % 2) * 5 - 2.5);
    var y = (row - 1.2) * 20 + ((col % 2) * 4 - 2);
    return { x: x + "vw", y: y + "vh", s: 1, z: 1 + (n - i) };
  }

  function lang() {
    return (document.documentElement.lang || "pl").toLowerCase().indexOf("en") === 0 ? "en" : "pl";
  }

  function applyTheme(theme) {
    theme = theme || "web";
    pendingTheme = theme;
    document.body.setAttribute("data-tile-theme", theme);
    /* Homepage dark WebGL is the shared ground under all chapters */
    document.body.classList.remove("is-tile-bg-light");
    if (window.__portfolioTileBg && window.__portfolioTileBg.setTheme) {
      window.__portfolioTileBg.setTheme(theme);
    }
    if (window.__portfolioThemeLayers && window.__portfolioThemeLayers.setActiveTheme) {
      window.__portfolioThemeLayers.setActiveTheme(theme);
    }
    window.dispatchEvent(
      new CustomEvent("portfolio-tile-theme", { detail: { theme: theme } })
    );
  }

  function syncCardVideos() {
    /* Chapter BGs are now CSS/JS compositions — no full-bleed card videos. */
  }

  /* —— Montaż viz fan (former Grafiki) —— */
  function startVizShowLoop() {
    if (vizShowTimer || REDUCED) return;
    var chapter = chapters.find(function (t) {
      return !!t.querySelector("[data-tile-viz-show]");
    });
    if (!chapter) return;
    var rootViz = chapter.querySelector("[data-tile-viz-show]");
    var cards = Array.prototype.slice.call(rootViz.querySelectorAll("[data-viz-card]"));
    if (cards.length < 3) return;
    var n = cards.length;
    var cursor = 0;

    function apply() {
      cards.forEach(function (card, i) {
        var rel = (i - cursor + n) % n;
        if (rel <= 4) card.setAttribute("data-viz-slot", String(rel));
        else card.setAttribute("data-viz-slot", "out");
      });
    }

    apply();
    vizShowTimer = window.setInterval(function () {
      cursor = (cursor + 1) % n;
      apply();
    }, 1100);
  }

  /* —— Strony New Luxury: tiles exit L / enter R, word rotateY flat —— */
  function initLux() {
    var lux = root.querySelector("[data-chapter-lux]");
    if (!lux) return;
    var wordEl = lux.querySelector("[data-lux-word]");
    var shots = Array.prototype.slice.call(lux.querySelectorAll("[data-lux-shot]"));
    var idx = 0;
    var busy = false;

    function clearPhases() {
      lux.classList.remove(
        "is-stretch",
        "is-flip-out",
        "is-flip-in",
        "is-flip-settle",
        "is-exit-left",
        "is-enter-right",
        "is-enter-settle"
      );
    }

    function paint(set) {
      if (wordEl && set.lines) {
        var loc = lang();
        wordEl.innerHTML = set.lines
          .map(function (line) {
            var t = line[loc] || line.pl;
            return '<span class="chapter-lux__word-line">' + t + "</span>";
          })
          .join("");
      }
      shots.forEach(function (fig, i) {
        var img = fig.querySelector("img");
        if (!img || !set.shots[i]) return;
        img.src = set.shots[i];
      });
    }

    paint(LUX_SETS[0]);
    if (REDUCED) return;

    function cycle() {
      if (busy) return;
      busy = true;
      clearPhases();
      /* 1) tiles whip left + word turns edge-on (flat from the side) */
      lux.classList.add("is-exit-left", "is-flip-out");
      window.setTimeout(function () {
        /* 2) swap while off-screen / edge-on */
        idx = (idx + 1) % LUX_SETS.length;
        paint(LUX_SETS[idx]);
        clearPhases();
        lux.classList.add("is-enter-right", "is-flip-in");
        void lux.offsetWidth;
        window.requestAnimationFrame(function () {
          clearPhases();
          lux.classList.add("is-enter-settle", "is-flip-settle");
          window.setTimeout(function () {
            clearPhases();
            busy = false;
          }, 760);
        });
      }, 380);
    }

    luxTimer = window.setInterval(cycle, 2800);
  }

  /* —— Systemy OS stack↔field —— */
  function initOs() {
    var stage = root.querySelector("[data-os-stage]");
    if (!stage) return;
    var cards = [];
    OS_MEDIA.forEach(function (src, i) {
      var fig = document.createElement("figure");
      fig.className = "chapter-os__card";
      var img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.decoding = "async";
      img.loading = i < 6 ? "eager" : "lazy";
      fig.appendChild(img);
      stage.appendChild(fig);
      cards.push(fig);
    });

    function applyMode(mode) {
      stage.classList.toggle("is-stack", mode === "stack");
      stage.classList.toggle("is-field", mode === "field");
      cards.forEach(function (card, i) {
        var pos = mode === "stack" ? OS_STACK[i] || OS_STACK[OS_STACK.length - 1] : osFieldPos(i, cards.length);
        card.style.setProperty("--os-x", pos.x);
        card.style.setProperty("--os-y", pos.y);
        card.style.setProperty("--os-s", String(pos.s));
        card.style.setProperty("--os-z", String(pos.z));
        card.style.setProperty("--os-o", mode === "field" && i > 13 ? "0.65" : "1");
      });
    }

    applyMode("stack");
    if (REDUCED) return;
    var mode = "stack";
    osTimer = window.setInterval(function () {
      mode = mode === "stack" ? "field" : "stack";
      applyMode(mode);
    }, 2200);
  }

  /* —— Grafiki Showcase 14 —— */
  function initShow() {
    var show = root.querySelector("[data-chapter-show]");
    if (!show) return;
    var stage = show.querySelector("[data-show-stage]");
    var wordEl = show.querySelector("[data-show-word]");
    if (!stage) return;
    var tiles = [];
    for (var i = 0; i < 8; i++) {
      var fig = document.createElement("figure");
      fig.className = "chapter-show__tile";
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.loading = i < 4 ? "eager" : "lazy";
      fig.appendChild(img);
      stage.appendChild(fig);
      tiles.push(fig);
    }

    var layoutIdx = 0;
    var wordIdx = 0;
    var poolCursor = 0;

    function paint() {
      var layout = SHOW_LAYOUTS[layoutIdx];
      if (wordEl) {
        var w = SHOW_WORDS[wordIdx];
        wordEl.textContent = w[lang()] || w.pl;
      }
      tiles.forEach(function (tile, i) {
        var L = layout[i] || layout[0];
        var src = SHOW_POOL[(poolCursor + i) % SHOW_POOL.length];
        var img = tile.querySelector("img");
        if (img) img.src = src;
        tile.classList.toggle("is-portrait", !!L.portrait);
        tile.classList.toggle("is-wide", !!L.wide);
        tile.style.setProperty("--sh-x", L.x);
        tile.style.setProperty("--sh-y", L.y);
        tile.style.setProperty("--sh-w", L.w);
        tile.style.setProperty("--sh-r", L.r);
        tile.style.setProperty("--sh-z", String(L.z));
      });
    }

    paint();
    if (REDUCED) return;

    showTimer = window.setInterval(function () {
      show.classList.add("is-swap");
      window.setTimeout(function () {
        layoutIdx = (layoutIdx + 1) % SHOW_LAYOUTS.length;
        wordIdx = (wordIdx + 1) % SHOW_WORDS.length;
        poolCursor = (poolCursor + 3) % SHOW_POOL.length;
        paint();
        show.classList.remove("is-swap");
      }, 280);
    }, 2400);
  }

  function nearestIndex() {
    var mid = scroller.scrollLeft + scroller.clientWidth * 0.5;
    var best = 0;
    var bestDist = Infinity;
    chapters.forEach(function (ch, i) {
      var left = ch.offsetLeft + ch.offsetWidth * 0.5;
      var d = Math.abs(left - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function setActive(index, opts) {
    opts = opts || {};
    index = Math.max(0, Math.min(chapters.length - 1, index));
    if (index === activeIndex && !opts.force) return;
    activeIndex = index;
    chapters.forEach(function (chapter, i) {
      chapter.classList.toggle("is-active", i === index);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-current", i === index ? "true" : "false");
    });
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= chapters.length - 1;
    var chapter = chapters[index];
    applyTheme(chapter.getAttribute("data-theme") || "web");
  }

  function scrollToIndex(index, behavior) {
    index = Math.max(0, Math.min(chapters.length - 1, index));
    var chapter = chapters[index];
    if (!chapter) return;
    var left = chapter.offsetLeft;
    scroller.scrollTo({
      left: left,
      behavior: behavior || (REDUCED ? "auto" : "smooth"),
    });
    setActive(index, { force: true });
  }

  function stopCaseVideos() {
    if (caseVideoTimer) {
      window.clearInterval(caseVideoTimer);
      caseVideoTimer = null;
    }
    if (!expandTrack) return;
    expandTrack.querySelectorAll("video").forEach(function (video) {
      try {
        video.pause();
      } catch (e) {}
    });
  }

  function playVisibleCaseVideos() {
    if (!expandTrack) return;
    stopCaseVideos();
    var cards = Array.prototype.slice.call(expandTrack.querySelectorAll("[data-case-card]"));
    if (!cards.length) return;
    function sync() {
      var mid = expandTrack.getBoundingClientRect();
      var center = mid.left + mid.width * 0.35;
      var best = null;
      var bestDist = Infinity;
      cards.forEach(function (card) {
        var r = card.getBoundingClientRect();
        var c = r.left + r.width * 0.5;
        var d = Math.abs(c - center);
        if (d < bestDist) {
          bestDist = d;
          best = card;
        }
      });
      cards.forEach(function (card) {
        var video = card.querySelector("video");
        if (!video) return;
        if (card === best) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          try {
            video.pause();
          } catch (e) {}
        }
      });
    }
    sync();
    caseVideoTimer = window.setInterval(sync, 900);
  }

  function buildCaseCards(key) {
    if (!expandTrack) return;
    var items = CASE_SETS[key] || [];
    expandTrack.innerHTML = "";
    items.forEach(function (item) {
      var a = document.createElement("a");
      a.className = "portfolio-case-tile";
      a.href = item.href;
      a.setAttribute("data-case-card", "");
      a.setAttribute("aria-label", item.title);

      var media = document.createElement("div");
      media.className = "portfolio-case-tile__media";
      if (item.video) {
        var video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        if (item.poster) video.poster = item.poster;
        video.src = item.video;
        media.appendChild(video);
      } else if (item.img) {
        var img = document.createElement("img");
        img.src = item.img;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        media.appendChild(img);
      }
      a.appendChild(media);

      var body = document.createElement("div");
      body.className = "portfolio-case-tile__body";
      var title = document.createElement("h3");
      title.className = "portfolio-case-tile__title";
      title.textContent = item.title;
      var lead = document.createElement("p");
      lead.className = "portfolio-case-tile__lead";
      lead.textContent = item.lead;
      body.appendChild(title);
      body.appendChild(lead);
      a.appendChild(body);
      expandTrack.appendChild(a);
    });
  }

  function fillSourceFromChapter(chapter) {
    if (!expandSourceMedia || !expandSourceTitle) return;
    expandSourceMedia.innerHTML = "";
    var media = chapter.querySelector(".portfolio-tile__media");
    if (media) {
      var clone = media.cloneNode(true);
      clone.querySelectorAll("video").forEach(function (v) {
        v.removeAttribute("data-card-video");
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
      expandSourceMedia.appendChild(clone);
    }
    var titleEl = chapter.querySelector(".portfolio-chapter__title");
    expandSourceTitle.textContent = titleEl ? titleEl.textContent : "";
  }

  function openExpand(chapter) {
    if (!expandStage || !expandTrack) return;
    var more = chapter.querySelector("[data-tile-expand]");
    var key = more && more.getAttribute("data-tile-expand");
    if (!key || !CASE_SETS[key] || expandedKey === key) return;

    expandedKey = key;
    applyTheme(chapter.getAttribute("data-theme") || key);
    fillSourceFromChapter(chapter);
    buildCaseCards(key);

    document.body.classList.add("is-tile-expanded");
    root.classList.add("is-expanded");
    expandStage.hidden = false;
    expandStage.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(function () {
      expandStage.classList.add("is-open");
      playVisibleCaseVideos();
    });
  }

  function closeExpand() {
    if (!expandedKey || !expandStage) return;
    expandedKey = null;
    stopCaseVideos();
    expandStage.classList.remove("is-open");
    document.body.classList.remove("is-tile-expanded");
    root.classList.remove("is-expanded");

    window.setTimeout(
      function () {
        if (expandedKey) return;
        expandStage.hidden = true;
        expandStage.setAttribute("aria-hidden", "true");
        if (expandTrack) expandTrack.innerHTML = "";
        if (expandSourceMedia) expandSourceMedia.innerHTML = "";
      },
      REDUCED ? 0 : 420
    );
  }

  scroller.addEventListener(
    "scroll",
    function () {
      if (expandedKey) return;
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(function () {
        scrollRaf = 0;
        setActive(nearestIndex());
      });
    },
    { passive: true }
  );

  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      scrollToIndex(i);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      scrollToIndex(activeIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      scrollToIndex(activeIndex + 1);
    });
  }

  root.querySelectorAll("[data-tile-expand]").forEach(function (link) {
    link.addEventListener(
      "click",
      function (e) {
        var key = link.getAttribute("data-tile-expand");
        if (!key || !CASE_SETS[key]) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
        e.preventDefault();
        e.stopPropagation();
        var chapter = link.closest("[data-portfolio-tile]");
        if (chapter) openExpand(chapter);
      },
      true
    );
  });

  if (expandSource) {
    expandSource.addEventListener("click", function () {
      closeExpand();
    });
  }

  if (expandTrack) {
    expandTrack.addEventListener(
      "scroll",
      function () {
        if (!expandedKey) return;
        playVisibleCaseVideos();
      },
      { passive: true }
    );
  }

  window.addEventListener("keydown", function (e) {
    if (expandedKey) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeExpand();
      }
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      scrollToIndex(activeIndex + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      scrollToIndex(activeIndex - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      scrollToIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      scrollToIndex(chapters.length - 1);
    }
  });

  window.addEventListener(
    "wheel",
    function (e) {
      if (expandedKey) {
        if (!expandTrack) return;
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        if (Math.abs(e.deltaY) < 1.2) return;
        e.preventDefault();
        expandTrack.scrollBy({ left: e.deltaY, behavior: "auto" });
        return;
      }
      if (Math.abs(e.deltaY) < 1.2 && Math.abs(e.deltaX) < 1.2) return;
      var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;
      e.preventDefault();
      var now = Date.now();
      if (now - wheelLock < 480) return;
      wheelLock = now;
      scrollToIndex(activeIndex + (delta > 0 ? 1 : -1));
    },
    { passive: false }
  );

  window.addEventListener("resize", function () {
    scrollToIndex(activeIndex < 0 ? 0 : activeIndex, "auto");
  });

  window.addEventListener("portfolio-tile-bg-ready", function () {
    if (pendingTheme) applyTheme(pendingTheme);
  });

  document.body.classList.add("portfolio-page--tiles");
  initLux();
  initOs();
  initShow();
  startVizShowLoop();
  scrollToIndex(0, "auto");
  window.setTimeout(function () {
    scrollToIndex(0, "auto");
    if (pendingTheme) applyTheme(pendingTheme);
  }, 80);
})();
