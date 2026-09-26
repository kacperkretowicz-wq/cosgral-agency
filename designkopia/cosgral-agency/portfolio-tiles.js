/**
 * Realizacje — morphing Collaboration shell.
 * Wheel/dots advance section → bento geometry morphs + media swap + page bg.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-portfolio-tiles]");
  if (!root) return;

  var arena = root.querySelector("[data-portfolio-bento]");
  var footTitle = root.querySelector("[data-portfolio-foot-title]");
  var footLead = root.querySelector("[data-portfolio-foot-lead]");
  var footCta = root.querySelector("[data-portfolio-foot-cta]");
  var footCount = root.querySelector("[data-portfolio-foot-count]");
  var dots = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile-dot]"));
  if (!arena) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var activeIndex = -1;
  var wheelLock = 0;
  var cells = [];
  var MAX_CELLS = 5;

  /* rects: x,y,w,h in % of arena; raise = elevated card */
  var SECTIONS = [
    {
      id: "web",
      theme: "web",
      href: "portfolio-strony.html",
      title: "Strony internetowe",
      lead: "Od landing page po serwisy firmowe i sklepy.",
      titleKey: "portfolio.web_title",
      leadKey: "portfolio.web_lead",
      cells: [
        {
          x: 0, y: 4, w: 31.5, h: 92, raise: false,
          html: '<div class="bento-cell__media"><video muted loop playsinline preload="metadata" poster="portfolio-media/showcase/web/juicy-events-poster.jpg" src="portfolio-media/showcase/web/juicy-events.mp4" data-bento-video></video></div>',
        },
        {
          x: 34.25, y: 0, w: 31.5, h: 100, raise: true,
          html: '<div class="bento-cell__media"><video muted loop playsinline preload="metadata" poster="portfolio-media/showcase/web/trove-archive-poster.jpg" src="portfolio-media/showcase/web/trove-archive.mp4" data-bento-video></video></div>',
        },
        {
          x: 68.5, y: 4, w: 31.5, h: 92, raise: false,
          html: '<div class="bento-cell__media"><video muted loop playsinline preload="metadata" poster="portfolio-media/showcase/web/mj-social-media-poster.jpg" src="portfolio-media/showcase/web/mj-social-media.mp4" data-bento-video></video></div>',
        },
      ],
    },
    {
      id: "systems",
      theme: "systems",
      href: "portfolio-systemy.html",
      title: "Systemy i automatyzacje",
      lead: "CRM, aplikacje i workflow, które odciążają zespół.",
      titleKey: "portfolio.automation_title",
      leadKey: "portfolio.automation_tile_lead",
      cells: [
        {
          x: 0, y: 0, w: 30, h: 47, raise: false,
          html: '<div class="bento-cell__systems"><div class="bento-cell__systems-cube"></div></div>',
        },
        {
          x: 0, y: 51, w: 30, h: 49, raise: false,
          html: '<div class="bento-cell__accent"><p class="bento-cell__accent-title">Workflow,<br/>który oddycha</p><p class="bento-cell__accent-meta">CRM · Apps</p></div>',
        },
        {
          x: 32.5, y: 0, w: 35, h: 100, raise: true,
          html: '<div class="bento-cell__systems"><div class="bento-cell__systems-cube" style="width:min(52%,9rem)"></div></div>',
        },
        {
          x: 70, y: 0, w: 30, h: 47, raise: false,
          html: '<div class="bento-cell__media"><img src="portfolio-media/showcase/graphics/g3.jpg" alt="" loading="lazy" decoding="async" /></div>',
        },
        {
          x: 70, y: 51, w: 30, h: 49, raise: false,
          html: '<div class="bento-cell__media"><img src="portfolio-media/showcase/graphics/g8.jpg" alt="" loading="lazy" decoding="async" /></div>',
        },
      ],
    },
    {
      id: "video",
      theme: "video",
      href: "portfolio-montaz.html",
      title: "Montaż wideo",
      lead: "Reels i materiały reklamowe",
      titleKey: "portfolio.montaz_title",
      leadKey: "portfolio.montaz_lead",
      cells: [
        {
          x: 0, y: 0, w: 100, h: 47, raise: false,
          html: '<div class="bento-cell__media"><video muted loop playsinline preload="metadata" poster="portfolio-media/reels/orlincy/006-poster.jpg" src="portfolio-media/reels/orlincy/006-full.mp4" data-bento-video></video></div>',
        },
        {
          x: 0, y: 51, w: 100, h: 49, raise: true,
          html: '<div class="bento-cell__media"><video muted loop playsinline preload="metadata" poster="portfolio-media/reels/reklamy/001-poster.jpg" src="portfolio-media/reels/reklamy/001-full.mp4" data-bento-video></video></div>',
        },
      ],
    },
    {
      id: "graphics",
      theme: "graphics",
      href: "portfolio-grafiki.html",
      title: "Grafiki",
      lead: "Posty, stories i key visuale w rytmie pokazu slajdów.",
      titleKey: "portfolio.grafiki_title",
      leadKey: "portfolio.grafiki_tile_lead",
      cells: [
        {
          x: 0, y: 0, w: 100, h: 42, raise: false,
          html: '<div class="bento-cell__media"><img src="portfolio-media/graphics/juicy-events/014.jpg" alt="" loading="eager" decoding="async" /></div>',
        },
        {
          x: 0, y: 46, w: 31.5, h: 54, raise: false,
          html: '<div class="bento-cell__media"><img src="portfolio-media/graphics/juicy-events/001.jpg" alt="" loading="lazy" decoding="async" /></div>',
        },
        {
          x: 34.25, y: 46, w: 31.5, h: 54, raise: true,
          html: '<div class="bento-cell__accent"><p class="bento-cell__accent-title">JUICY<br/>Events</p><p class="bento-cell__accent-meta">Social · KV</p></div>',
        },
        {
          x: 68.5, y: 46, w: 31.5, h: 54, raise: false,
          html: '<div class="bento-cell__media"><img src="portfolio-media/graphics/juicy-events/008.jpg" alt="" loading="lazy" decoding="async" /></div>',
        },
      ],
    },
  ];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function i18nText(key, fallback) {
    try {
      if (window.CosgralI18n && typeof window.CosgralI18n.t === "function") {
        var v = window.CosgralI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback;
  }

  function ensureCells() {
    if (cells.length) return;
    for (var i = 0; i < MAX_CELLS; i++) {
      var el = document.createElement("div");
      el.className = "bento-cell is-off";
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "link");
      arena.appendChild(el);
      cells.push(el);
    }
  }

  function applyRect(el, rect) {
    el.style.left = rect.x + "%";
    el.style.top = rect.y + "%";
    el.style.width = rect.w + "%";
    el.style.height = rect.h + "%";
  }

  function syncVideos() {
    arena.querySelectorAll("[data-bento-video]").forEach(function (video) {
      var cell = video.closest(".bento-cell");
      if (cell && !cell.classList.contains("is-off")) {
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      } else {
        try {
          video.pause();
        } catch (e) {}
      }
    });
  }

  function syncFoot(section, index) {
    if (footTitle) {
      footTitle.style.opacity = "0";
      window.setTimeout(function () {
        footTitle.textContent = i18nText(section.titleKey, section.title);
        footTitle.style.opacity = "1";
      }, 160);
    }
    if (footLead) {
      footLead.style.opacity = "0";
      window.setTimeout(function () {
        footLead.textContent = i18nText(section.leadKey, section.lead);
        footLead.style.opacity = "1";
      }, 160);
    }
    if (footCta) footCta.setAttribute("href", section.href);
    if (footCount) footCount.textContent = pad2(index + 1);
  }

  function goSection(index, opts) {
    opts = opts || {};
    index = Math.max(0, Math.min(SECTIONS.length - 1, index));
    if (index === activeIndex && !opts.force) return;
    activeIndex = index;
    var section = SECTIONS[index];

    ensureCells();
    document.body.setAttribute("data-tile-theme", section.theme);
    root.setAttribute("data-section", section.id);

    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-current", i === index ? "true" : "false");
    });

    syncFoot(section, index);

    cells.forEach(function (el, i) {
      var conf = section.cells[i];
      if (!conf) {
        el.classList.add("is-off");
        el.classList.remove("is-raise");
        el.removeAttribute("data-href");
        return;
      }

      var needsContent = el.getAttribute("data-sec") !== section.id || el.getAttribute("data-slot") !== String(i);
      if (needsContent) {
        el.innerHTML = conf.html;
        el.setAttribute("data-sec", section.id);
        el.setAttribute("data-slot", String(i));
      }
      el.setAttribute("data-href", section.href);
      el.setAttribute("aria-label", section.title);
      applyRect(el, conf);
      el.classList.toggle("is-raise", !!conf.raise);
      el.classList.remove("is-off");
    });

    window.setTimeout(syncVideos, REDUCED ? 0 : 120);
  }

  ensureCells();

  cells.forEach(function (el) {
    el.addEventListener("click", function () {
      var href = el.getAttribute("data-href");
      if (href) window.location.href = href;
    });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var href = el.getAttribute("data-href");
        if (href) window.location.href = href;
      }
    });
  });

  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      goSection(i);
    });
  });

  window.addEventListener(
    "wheel",
    function (e) {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaY) < 1.2) return;
      e.preventDefault();
      var now = performance.now();
      if (now - wheelLock < 520) return;
      wheelLock = now;
      var next = activeIndex + (e.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= SECTIONS.length) return;
      goSection(next);
    },
    { passive: false }
  );

  var touchX = null;
  arena.addEventListener(
    "touchstart",
    function (e) {
      touchX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  arena.addEventListener(
    "touchend",
    function (e) {
      if (touchX == null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      goSection(activeIndex + (dx < 0 ? 1 : -1));
    },
    { passive: true }
  );

  document.body.classList.add("portfolio-page--tiles");
  goSection(0, { force: true });

  document.addEventListener("cosgral:langchange", function () {
    if (activeIndex >= 0) syncFoot(SECTIONS[activeIndex], activeIndex);
  });
})();
