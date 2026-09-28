/**
 * Realizacje — full-viewport horizontal chapters + dots + in-place expand.
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
  if (!scroller || !chapters.length) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var activeIndex = -1;
  var vizShowTimer = null;
  var luxTimer = null;
  var osTimer = null;
  var showTimer = null;
  var pendingTheme = null;
  var expandedKey = null;
  var wheelLock = 0;
  var scrollRaf = 0;
  var loopsPaused = false;
  var restartLux = null;
  var restartOs = null;
  var restartShow = null;

  var STILL = "portfolio-media/showcase/chapter-stills/";
  var ACC = STILL + "accents/";
  var GFX = "portfolio-media/graphics/juicy-events/";
  var REEL = "portfolio-media/reels/";

  var EXPAND_KEYS = { web: 1, systems: 1, video: 1, graphics: 1 };

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

  /* Systemy — unique B&W tiles only (no repeats, no color / SVG case dupes) */
  var OS_MEDIA = [
    STILL + "systems/bw/ui-ai-agent-bw.jpg",
    STILL + "systems/bw/ui-forecast-bw.jpg",
    STILL + "systems/bw/ui-invoice-flow-bw.jpg",
    STILL + "systems/bw/ui-code-keyboard-bw.jpg",
    STILL + "systems/bw/ui-crm-map-bw.jpg",
    STILL + "systems/bw/ui-barcode-bw.jpg",
    STILL + "systems/bw/ui-chatbot-bw.jpg",
    STILL + "systems/bw/ui-price-monitor-bw.jpg",
    STILL + "systems/bw/still-crm0-bw.jpg",
    STILL + "systems/bw/still-crm1-bw.jpg",
    STILL + "systems/bw/still-crm2-bw.jpg",
    STILL + "systems/bw/still-crm3-bw.jpg",
    STILL + "systems/bw/still-auto0-bw.jpg",
    STILL + "systems/bw/still-auto1-bw.jpg",
    STILL + "systems/bw/still-auto2-bw.jpg",
    STILL + "systems/bw/still-auto3-bw.jpg",
    STILL + "systems/bw/still-app0-bw.jpg",
    STILL + "systems/bw/still-app1-bw.jpg",
    STILL + "systems/bw/still-app2-bw.jpg",
    STILL + "systems/bw/still-app3-bw.jpg",
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
    var cols = 5;
    var row = Math.floor(i / cols);
    var col = i % cols;
    var x = (col - (cols - 1) / 2) * 16 + ((row % 2) * 4 - 2);
    var y = (row - 1.4) * 18 + ((col % 3) * 3 - 3);
    return { x: x + "vw", y: y + "vh", s: 1, z: 1 + (n - i) };
  }

  function lang() {
    return (document.documentElement.lang || "pl").toLowerCase().indexOf("en") === 0 ? "en" : "pl";
  }

  function applyTheme(theme) {
    theme = theme || "web";
    pendingTheme = theme;
    /* Keep chapter key for copy/logic, but force homepage dark ground always */
    document.body.setAttribute("data-tile-theme", theme);
    document.body.setAttribute("data-tile-ground", "home");
    document.body.classList.remove("is-tile-bg-light", "is-home-ambient-light");
    document.documentElement.classList.remove("is-home-ambient-light");
    if (window.__portfolioTileBg && window.__portfolioTileBg.setTheme) {
      window.__portfolioTileBg.setTheme("web");
    }
    if (window.__portfolioThemeLayers && window.__portfolioThemeLayers.setActiveTheme) {
      window.__portfolioThemeLayers.setActiveTheme("web");
    }
    window.dispatchEvent(
      new CustomEvent("portfolio-tile-theme", { detail: { theme: "web" } })
    );
  }

  function syncCardVideos() {
    /* Chapter BGs are now CSS/JS compositions — no full-bleed card videos. */
  }

  /* Montaż diagonal belt is driven by portfolio-montaz.js (#reels-tiles) */
  function startVizShowLoop() {
    /* no-op — reels belt scrolls continuously */
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

    restartLux = function () {
      if (luxTimer || REDUCED || loopsPaused) return;
      luxTimer = window.setInterval(cycle, 2800);
    };
    restartLux();
  }

  /* —— Systemy: unique B&W scattered field (no stack toggle / no repeats) —— */
  function initOs() {
    var stage = root.querySelector("[data-os-stage]");
    if (!stage) return;
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".chapter-os__card"));
    if (!cards.length) {
      OS_MEDIA.forEach(function (src, i) {
        var fig = document.createElement("figure");
        fig.className = "chapter-os__card";
        fig.setAttribute("data-os-card", String(i));
        var img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.decoding = "async";
        img.loading = i < 8 ? "eager" : "lazy";
        fig.appendChild(img);
        stage.appendChild(fig);
        cards.push(fig);
      });
    }

    function applyField() {
      stage.classList.add("is-field");
      stage.classList.remove("is-stack");
      cards.forEach(function (card, i) {
        var pos = osFieldPos(i, cards.length);
        card.style.setProperty("--os-x", pos.x);
        card.style.setProperty("--os-y", pos.y);
        card.style.setProperty("--os-s", String(0.92 + (i % 3) * 0.04));
        card.style.setProperty("--os-z", String(pos.z));
        card.style.setProperty("--os-o", "1");
        card.style.setProperty("--os-r", ((i % 5) - 2) * 2 + "deg");
      });
    }

    applyField();
    if (REDUCED) return;
    /* gentle float — positions stay unique, no mode swap that feels like repeats */
    restartOs = function () {
      if (osTimer || REDUCED || loopsPaused) return;
      var t = 0;
      osTimer = window.setInterval(function () {
        t += 1;
        cards.forEach(function (card, i) {
          var base = osFieldPos(i, cards.length);
          var ox = parseFloat(base.x) || 0;
          var oy = parseFloat(base.y) || 0;
          var wobbleX = Math.sin(t * 0.35 + i * 0.7) * 1.1;
          var wobbleY = Math.cos(t * 0.28 + i * 0.55) * 1.2;
          card.style.setProperty("--os-x", ox + wobbleX + "vw");
          card.style.setProperty("--os-y", oy + wobbleY + "vh");
        });
      }, 900);
    };
    restartOs();
  }

  /* —— Grafiki Showcase 14 —— */
  function initShow() {
    var show = root.querySelector("[data-chapter-show]");
    if (!show) return;
    var stage = show.querySelector("[data-show-stage]");
    var wordEl = show.querySelector("[data-show-word]");
    if (!stage) return;
    var tiles = Array.prototype.slice.call(stage.querySelectorAll(".chapter-show__tile"));
    if (!tiles.length) {
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

    restartShow = function () {
      if (showTimer || REDUCED || loopsPaused) return;
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
    };
    restartShow();
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
    /* Montaż belt must scroll while the chapter is active (IO can miss horizontal slides) */
    if (chapter && chapter.id === "montaz") {
      var belt = chapter.querySelector("#reels-tiles");
      if (belt) belt.classList.add("is-ready");
    }
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

  function pauseChapterLoops() {
    if (loopsPaused) return;
    loopsPaused = true;
    if (luxTimer) {
      window.clearInterval(luxTimer);
      luxTimer = null;
    }
    if (osTimer) {
      window.clearInterval(osTimer);
      osTimer = null;
    }
    if (showTimer) {
      window.clearInterval(showTimer);
      showTimer = null;
    }
    if (vizShowTimer) {
      window.clearInterval(vizShowTimer);
      vizShowTimer = null;
    }
  }

  function resumeChapterLoops() {
    if (!loopsPaused) return;
    loopsPaused = false;
    if (REDUCED) return;
    if (restartLux) restartLux();
    if (restartOs) restartOs();
    if (restartShow) restartShow();
    startVizShowLoop();
  }

  function openExpand(chapter) {
    var more = chapter.querySelector("[data-tile-expand]");
    var key = more && more.getAttribute("data-tile-expand");
    if (!key || !EXPAND_KEYS[key]) return;
    if (!window.__portfolioExpand) return;
    expandedKey = key;
    applyTheme(chapter.getAttribute("data-theme") || key);
    pauseChapterLoops();
    window.__portfolioExpand.open(key, chapter);
  }

  function closeExpand() {
    if (window.__portfolioExpand) window.__portfolioExpand.close();
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
        if (!key || !EXPAND_KEYS[key]) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
        e.preventDefault();
        e.stopPropagation();
        var chapter = link.closest("[data-portfolio-tile]");
        if (chapter) openExpand(chapter);
      },
      true
    );
  });

  window.addEventListener("portfolio-expand-open", function (e) {
    expandedKey = (e.detail && e.detail.key) || expandedKey;
    pauseChapterLoops();
  });
  window.addEventListener("portfolio-expand-close", function () {
    expandedKey = null;
    resumeChapterLoops();
  });

  window.addEventListener("keydown", function (e) {
    if (expandedKey || (window.__portfolioExpand && window.__portfolioExpand.isOpen())) {
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
      if (expandedKey || (window.__portfolioExpand && window.__portfolioExpand.isOpen())) {
        /* gallery / deck handle their own scroll */
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
