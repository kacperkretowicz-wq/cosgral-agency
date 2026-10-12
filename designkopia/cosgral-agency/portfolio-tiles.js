/**
 * Realizacje — full-viewport horizontal chapters + dots + in-place expand.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-portfolio-tiles]");
  if (!root) return;
  /* Homepage embed: same chapters, no page lock, no vertical-scroll hijack. */
  var HOME = root.hasAttribute("data-home-chapters");

  var scroller = root.querySelector("[data-chapters-scroller]");
  var track = root.querySelector("[data-chapters-track]");
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
  var scrollAnim = 0;
  var loopsPaused = false;
  var pinCache = null;
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

  /* Systemy — unique B&W tiles only (no repeats) */
  var OS_MEDIA = [
    STILL + "systems/bw/ui-ai-agent-bw.jpg",
    STILL + "systems/bw/ui-forecast-bw.jpg",
    STILL + "systems/bw/ui-invoice-flow-bw.jpg",
    STILL + "systems/bw/ui-code-keyboard-bw.jpg",
    STILL + "systems/bw/ui-crm-map-bw.jpg",
    STILL + "systems/bw/ui-barcode-bw.jpg",
    STILL + "systems/bw/ui-chatbot-bw.jpg",
    STILL + "systems/bw/ui-price-monitor-bw.jpg",
    STILL + "systems/bw/ui-kanban-bw.jpg",
    STILL + "systems/bw/ui-calendar-bw.jpg",
    STILL + "systems/bw/ui-network-bw.jpg",
    STILL + "systems/bw/ui-kpi-board-bw.jpg",
    STILL + "systems/bw/ui-form-builder-bw.jpg",
    STILL + "systems/bw/ui-shelf-sync-bw.jpg",
    STILL + "systems/bw/ui-logs-bw.jpg",
    STILL + "systems/bw/ui-segments-bw.jpg",
    STILL + "systems/bw/still-auto0-bw.jpg",
    STILL + "systems/bw/still-auto2-bw.jpg",
    STILL + "systems/bw/still-app1-bw.jpg",
    STILL + "systems/bw/still-app3-bw.jpg",
  ];

  var SHOW_WORDS = HOME
    ? [
        { pl: "Grafiki", en: "Graphics" },
        { pl: "Stories", en: "Stories" },
        { pl: "Karuzele", en: "Carousels" },
      ]
    : [
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
    if (window.cosgralI18n && window.cosgralI18n.getLang) {
      var stored = window.cosgralI18n.getLang();
      if (stored) return stored === "en" ? "en" : "pl";
    }
    return (document.documentElement.lang || "pl").toLowerCase().indexOf("en") === 0 ? "en" : "pl";
  }

  function homeLuxLines() {
    if (lang() === "en") return [{ pl: "Websites", en: "Websites" }];
    return [
      { pl: "Strony", en: "Strony" },
      { pl: "internetowe", en: "internetowe" },
    ];
  }

  function applyTheme(theme) {
    theme = theme || "web";
    pendingTheme = theme;
    if (HOME) {
      root.setAttribute("data-tile-theme", theme);
      return;
    }
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
      var lines = HOME ? homeLuxLines() : set.lines;
      if (wordEl && lines) {
        var loc = lang();
        wordEl.innerHTML = lines
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
          }, 1500);
        });
      }, 760);
    }

    restartLux = function () {
      if (luxTimer || REDUCED || loopsPaused) return;
      luxTimer = window.setInterval(cycle, 5600);
    };
    restartLux();
    window.addEventListener("cosgral:langchange", function () {
      paint(LUX_SETS[idx]);
    });
  }

  /* —— Systemy: shared fan (wachlarz) — catalog auto-rotates —— */
  var systemsFan = null;
  function initOs() {
    var mount = root.querySelector("[data-systems-fan-catalog]");
    if (!mount || !window.CosgralSystemsFan) return;
    systemsFan = window.CosgralSystemsFan.create(mount, {
      mode: "catalog",
      autoplay: HOME ? false : !REDUCED,
      /* Homepage: circle carousel. Vertical wheel stays with the five-board pin.
         Horizontal wheel, swipe, and the circle arrows step the eleven systems. */
      drag: true,
      dragAxis: HOME ? "x" : "free",
      wheel: true,
      circle: HOME,
    });
    restartOs = function () {
      if (systemsFan && !loopsPaused) systemsFan.resume();
    };
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
        }, 560);
      }, 4800);
    };
    restartShow();
    window.addEventListener("cosgral:langchange", function () {
      paint();
    });
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

  var pinY = null;
  var pinTimer = 0;
  var pinLock = false;
  function holdPage() {
    if (pinY == null || pinLock) return;
    var now = window.scrollY || window.pageYOffset || 0;
    if (Math.abs(now - pinY) < 2) return;
    pinLock = true;
    var lenis = (window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis) || window.lenis;
    if (lenis && lenis.scrollTo) lenis.scrollTo(pinY, { immediate: true });
    else window.scrollTo(0, pinY);
    window.requestAnimationFrame(function () {
      pinLock = false;
    });
  }
  function beginPin() {
    if (!HOME) return;
    if (pinTimer) {
      window.clearTimeout(pinTimer);
      pinTimer = 0;
    }
    if (pinY == null) pinY = window.scrollY || window.pageYOffset || 0;
  }
  function endPinSoon() {
    if (!HOME) return;
    if (pinTimer) window.clearTimeout(pinTimer);
    pinTimer = window.setTimeout(function () {
      pinTimer = 0;
      holdPage();
      pinY = null;
    }, 120);
  }
  if (HOME) {
    window.addEventListener("scroll", holdPage, true);
  }

  function measurePin(force) {
    if (!HOME || (pinCache && !force)) return;
    var pin = document.getElementById("realizacje");
    if (!pin) return;
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || 1;
    pinCache = {
      top: pin.getBoundingClientRect().top + y,
      travel: Math.max(1, pin.offsetHeight - vh),
      width: scroller.clientWidth || window.innerWidth || 1,
    };
  }
  if (HOME) {
    window.addEventListener("resize", function () {
      pinCache = null;
      measurePin();
    });
  }

  /* Same ease and duration as the portfolio chapter slide (easeOutQuart, ~1.1s).
     Scroll progress picks the slide; the track eases one slide at a time. */
  var CINE_MS = 1100;
  var cine = { visual: 0, from: 0, to: 0, t0: 0, running: false, raf: 0 };

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function desiredIndex() {
    measurePin();
    if (!pinCache) return 0;
    var y = window.scrollY || window.pageYOffset || 0;
    var p = (y - pinCache.top) / pinCache.travel;
    if (p < 0) p = 0;
    else if (p > 1) p = 1;
    var max = Math.max(1, chapters.length - 1);
    return Math.round(p * max);
  }

  function paintCine() {
    measurePin();
    if (!pinCache || !track) return;
    var x = cine.visual * pinCache.width;
    track.style.transform = "translate3d(" + (-x).toFixed(2) + "px,0,0)";
    setActive(Math.max(0, Math.min(chapters.length - 1, Math.round(cine.visual))));
  }

  function toward(desired) {
    var max = Math.max(0, chapters.length - 1);
    if (Math.abs(desired - cine.visual) < 0.02) return desired;
    var dir = desired > cine.visual ? 1 : -1;
    var next = dir > 0 ? Math.ceil(cine.visual - 1e-4) : Math.floor(cine.visual + 1e-4);
    if (Math.abs(next - cine.visual) < 0.02) next = cine.visual + dir;
    if (next < 0) next = 0;
    if (next > max) next = max;
    return next;
  }

  function cineStep() {
    var desired = desiredIndex();
    var max = Math.max(0, chapters.length - 1);
    if (REDUCED) {
      cine.visual = desired;
      cine.running = false;
      paintCine();
      cine.raf = 0;
      return;
    }
    if (!cine.running) {
      if (Math.abs(cine.visual - desired) < 0.02) {
        cine.visual = desired;
        paintCine();
        cine.raf = 0;
        return;
      }
      cine.from = cine.visual;
      cine.to = toward(desired);
      cine.t0 = performance.now();
      cine.running = true;
    } else if ((desired - cine.to) * (cine.to - cine.from) < -0.001) {
      cine.from = cine.visual;
      cine.to = toward(desired);
      cine.t0 = performance.now();
    }
    var t = Math.min(1, (performance.now() - cine.t0) / CINE_MS);
    cine.visual = cine.from + (cine.to - cine.from) * easeOutQuart(t);
    if (t >= 1) {
      cine.visual = cine.to;
      cine.running = false;
      if (cine.visual < 0) cine.visual = 0;
      if (cine.visual > max) cine.visual = max;
    }
    paintCine();
    if (cine.running || Math.abs(cine.visual - desiredIndex()) > 0.02) {
      cine.raf = requestAnimationFrame(cineStep);
    } else {
      cine.raf = 0;
    }
  }

  function applyFromScroll() {
    if (!HOME || !track) return;
    if (!cine.raf) cine.raf = requestAnimationFrame(cineStep);
  }

  function pageToIndex(index) {
    index = Math.max(0, Math.min(chapters.length - 1, index));
    measurePin();
    if (!pinCache) return;
    var max = Math.max(1, chapters.length - 1);
    var y = pinCache.top + (index / max) * pinCache.travel;
    var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
    var from = activeIndex < 0 ? 0 : activeIndex;
    var steps = Math.max(1, Math.abs(index - from));
    if (lenis && lenis.scrollTo) {
      lenis.scrollTo(y, { duration: Math.max(1.05, Math.min(4.6, steps * 1.1)), force: true });
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  function scrollToIndex(index, behavior) {
    if (HOME) {
      pageToIndex(index);
      return;
    }
    index = Math.max(0, Math.min(chapters.length - 1, index));
    var chapter = chapters[index];
    if (!chapter) return;
    var left = chapter.offsetLeft;
    if (scrollAnim) {
      cancelAnimationFrame(scrollAnim);
      scrollAnim = 0;
    }
    setActive(index, { force: true });
    var from = scroller.scrollLeft;
    var dist = left - from;
    if (Math.abs(dist) < 2) return;
    beginPin();
    if (behavior === "auto" || REDUCED) {
      scroller.scrollLeft = left;
      holdPage();
      endPinSoon();
      return;
    }
    var prevBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";
    var t0 = performance.now();
    var dur = 1100;
    function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 4);
      scroller.scrollLeft = from + dist * e;
      holdPage();
      if (p < 1) {
        scrollAnim = requestAnimationFrame(tick);
      } else {
        scrollAnim = 0;
        scroller.style.scrollBehavior = prevBehavior;
        endPinSoon();
      }
    }
    scrollAnim = requestAnimationFrame(tick);
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
    if (systemsFan) systemsFan.pause();
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
    if (systemsFan) systemsFan.resume();
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
      if (HOME || expandedKey) return;
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

  function expandFromChapter(chapter) {
    if (!chapter || !chapter.classList.contains("is-active")) return;
    if (expandedKey || (window.__portfolioExpand && window.__portfolioExpand.isOpen())) return;
    openExpand(chapter);
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
        expandFromChapter(chapter);
      },
      true
    );
  });

  /* Dedicated center hit area → same as „Zobacz więcej” */
  root.querySelectorAll("[data-tile-expand-hit]").forEach(function (hit) {
    hit.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        expandFromChapter(hit.closest("[data-portfolio-tile]"));
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

  function indexForHash(hash) {
    var raw = String(hash || "").replace(/^#/, "").split("&")[0].split("?")[0];
    if (raw === "systemy") raw = "automatyzacje";
    if (!raw) return -1;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].id === raw) return i;
    }
    return -1;
  }

  if (!HOME) {
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
          /* gallery / deck / fan handle their own scroll */
          return;
        }
        if (e.target && e.target.closest && e.target.closest(".sys-fan")) return;
        if (Math.abs(e.deltaY) < 1.2 && Math.abs(e.deltaX) < 1.2) return;
        var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (Math.abs(delta) < 8) return;
        e.preventDefault();
        var now = Date.now();
        if (now - wheelLock < 960) return;
        wheelLock = now;
        scrollToIndex(activeIndex + (delta > 0 ? 1 : -1));
      },
      { passive: false }
    );
  } else {
    /* Horizontal gesture changes slides. Vertical movement stays with the page. */
    var gesture = null;
    var wheelSnap = 0;
    function releaseAxis() {
      scroller.classList.remove("is-axis-x");
    }
    scroller.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        var fromFan = e.target && e.target.closest && e.target.closest(".sys-fan__card, .sys-fan__nav, .sys-fan__arrow, .sys-fan__dot");
        if (fromFan) {
          gesture = null;
          return;
        }
        gesture = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          lastX: e.touches[0].clientX,
          axis: "",
          left: scroller.scrollLeft,
        };
      },
      { passive: true }
    );
    scroller.addEventListener(
      "touchmove",
      function (e) {
        if (!gesture || !e.touches || e.touches.length !== 1) return;
        var dx = e.touches[0].clientX - gesture.x;
        var dy = e.touches[0].clientY - gesture.y;
        if (!gesture.axis) {
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
          gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (gesture.axis === "x") {
            scroller.classList.add("is-axis-x");
          }
        }
        gesture.lastX = e.touches[0].clientX;
        if (gesture.axis !== "x") return;
        if (e.cancelable) e.preventDefault();
      },
      { passive: false }
    );
    function endGesture() {
      if (gesture && gesture.axis === "x") {
        var dx = (gesture.lastX == null ? gesture.x : gesture.lastX) - gesture.x;
        var dir = dx < -36 ? 1 : dx > 36 ? -1 : 0;
        if (dir) pageToIndex((activeIndex < 0 ? 0 : activeIndex) + dir);
        window.setTimeout(releaseAxis, 400);
      }
      gesture = null;
    }
    scroller.addEventListener("touchend", endGesture, { passive: true });
    scroller.addEventListener("touchcancel", endGesture, { passive: true });
    scroller.addEventListener(
      "wheel",
      function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        if (e.target && e.target.closest && e.target.closest(".sys-fan")) return;
        e.preventDefault();
        e.stopPropagation();
        if (wheelSnap) return;
        wheelSnap = window.setTimeout(function () {
          wheelSnap = 0;
        }, 700);
        pageToIndex((activeIndex < 0 ? 0 : activeIndex) + (e.deltaX > 0 ? 1 : -1));
        window.setTimeout(releaseAxis, 400);
      },
      { passive: false, capture: true }
    );
  }

  window.addEventListener("resize", function () {
    if (HOME) {
      measurePin();
      applyFromScroll();
      return;
    }
    scrollToIndex(activeIndex < 0 ? 0 : activeIndex, "auto");
  });

  window.addEventListener("portfolio-tile-bg-ready", function () {
    if (pendingTheme) applyTheme(pendingTheme);
  });

  if (!HOME) document.body.classList.add("portfolio-page--tiles");
  initLux();
  initOs();
  initShow();
  startVizShowLoop();
  var startAt = HOME ? 0 : indexForHash(location.hash);
  if (startAt < 0) startAt = 0;
  if (HOME) {
    measurePin();
    applyFromScroll();
    window.addEventListener("scroll", applyFromScroll, { passive: true });
    var lenisBound = false;
    var bindLenis = function (lenis) {
      if (lenisBound || !lenis || !lenis.on) return;
      lenisBound = true;
      lenis.on("scroll", applyFromScroll);
    };
    bindLenis(window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis);
    if (window.cosgralSmoothScroll && window.cosgralSmoothScroll.ready) {
      window.cosgralSmoothScroll.ready.then(bindLenis);
    }
    window.addEventListener("load", function () {
      measurePin(true);
      applyFromScroll();
    });
    window.setTimeout(function () {
      measurePin(true);
      applyFromScroll();
    }, 400);
  } else {
    scrollToIndex(startAt, "auto");
    window.setTimeout(function () {
      scrollToIndex(activeIndex < 0 ? startAt : activeIndex, "auto");
      if (pendingTheme) applyTheme(pendingTheme);
    }, 80);
  }
  if (!HOME) {
    window.addEventListener("hashchange", function () {
      var next = indexForHash(location.hash);
      if (next >= 0) scrollToIndex(next);
    });
  } else {
    window.addEventListener("hashchange", function () {
      var next = indexForHash(location.hash);
      if (next >= 0) pageToIndex(next);
    });
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest && e.target.closest("a[href]");
        if (!a || a.hasAttribute("data-tile-expand")) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
        var href = a.getAttribute("href") || "";
        var hashAt = href.indexOf("#");
        if (hashAt < 0) return;
        var idx = indexForHash(href.slice(hashAt));
        if (idx < 0) return;
        var path = href.slice(0, hashAt);
        if (path && path !== location.pathname && !/(^|\/)index\.html$/.test(path)) return;
        e.preventDefault();
        e.stopPropagation();
        pageToIndex(idx);
      },
      true
    );
  }
})();
