/**
 * Realizacje — vertical chapters (media as page BG) + expand case rail for Strony/Systemy.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-portfolio-tiles]");
  if (!root) return;

  var chapters = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile]"));
  var expandStage = root.querySelector("[data-tile-expand-stage]");
  var expandSource = root.querySelector("[data-tile-expand-source]");
  var expandSourceMedia = root.querySelector("[data-tile-expand-source-media]");
  var expandSourceTitle = root.querySelector("[data-tile-expand-source-title]");
  var expandTrack = root.querySelector("[data-tile-expand-track]");
  if (!chapters.length) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var activeIndex = -1;
  var reelCompTimer = null;
  var vizShowTimer = null;
  var pendingTheme = null;
  var expandedKey = null;
  var caseVideoTimer = null;

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

  function applyTheme(theme) {
    theme = theme || "web";
    pendingTheme = theme;
    document.body.setAttribute("data-tile-theme", theme);
    var light = theme === "systems" || theme === "graphics";
    document.body.classList.toggle("is-tile-bg-light", light);
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

  function clearReel() {
    if (reelCompTimer) {
      window.clearInterval(reelCompTimer);
      reelCompTimer = null;
    }
  }

  function syncCardVideos(activeChapter) {
    chapters.forEach(function (chapter) {
      var isReel = !!chapter.querySelector("[data-tile-reel-comp]");
      chapter.querySelectorAll("[data-card-video]").forEach(function (video) {
        if (chapter === activeChapter && !isReel && !expandedKey) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else if (!isReel) {
          try {
            video.pause();
          } catch (e) {}
        }
      });
    });
  }

  function playReelCompilation(chapter) {
    clearReel();
    var cells = Array.prototype.slice.call(chapter.querySelectorAll("[data-reel-cell]"));
    if (!cells.length) return;
    cells.forEach(function (cell) {
      cell.classList.remove("is-playing");
      var v = cell.querySelector("video");
      if (v) {
        try {
          v.pause();
        } catch (e) {}
      }
    });
    if (REDUCED) {
      cells.slice(0, 3).forEach(function (cell) {
        cell.classList.add("is-playing");
      });
      return;
    }
    var n = 0;
    function activate(index) {
      cells.forEach(function (cell, i) {
        var on = i === index || i === (index + 3) % cells.length || i === (index + 7) % cells.length;
        cell.classList.toggle("is-playing", on);
        var video = cell.querySelector("video");
        if (!video) return;
        if (on) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          try {
            video.pause();
          } catch (e) {}
        }
      });
    }
    activate(0);
    reelCompTimer = window.setInterval(function () {
      n = (n + 1) % cells.length;
      activate(n);
    }, 1600);
  }

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

  function setActive(index) {
    index = Math.max(0, Math.min(chapters.length - 1, index));
    if (index === activeIndex) return;
    activeIndex = index;
    clearReel();
    chapters.forEach(function (chapter, i) {
      chapter.classList.toggle("is-active", i === index);
    });
    var chapter = chapters[index];
    applyTheme(chapter.getAttribute("data-theme") || "web");
    syncCardVideos(chapter);
    if (chapter.querySelector("[data-tile-reel-comp]")) {
      playReelCompilation(chapter);
    }
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
        if (activeIndex >= 0) syncCardVideos(chapters[activeIndex]);
      },
      REDUCED ? 0 : 420
    );
  }

  /* IntersectionObserver — theme + media follow scroll */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (expandedKey) return;
        var best = null;
        var bestRatio = 0;
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = entry.target;
          }
        });
        if (!best) {
          /* pick nearest to viewport center */
          var mid = window.innerHeight * 0.45;
          var nearest = 0;
          var nearestDist = Infinity;
          chapters.forEach(function (ch, i) {
            var r = ch.getBoundingClientRect();
            var c = r.top + r.height * 0.35;
            var d = Math.abs(c - mid);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = i;
            }
          });
          setActive(nearest);
          return;
        }
        setActive(chapters.indexOf(best));
      },
      { root: null, threshold: [0.25, 0.45, 0.65], rootMargin: "-10% 0px -25% 0px" }
    );
    chapters.forEach(function (ch) {
      io.observe(ch);
    });
  }

  window.addEventListener(
    "scroll",
    function () {
      if (expandedKey) return;
      var mid = window.innerHeight * 0.42;
      var nearest = 0;
      var nearestDist = Infinity;
      chapters.forEach(function (ch, i) {
        var r = ch.getBoundingClientRect();
        var c = r.top + r.height * 0.35;
        var d = Math.abs(c - mid);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      });
      setActive(nearest);
    },
    { passive: true }
  );

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
    if (e.key === "Escape" && expandedKey) {
      e.preventDefault();
      closeExpand();
    }
  });

  window.addEventListener(
    "wheel",
    function (e) {
      if (!expandedKey || !expandTrack) return;
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaY) < 1.2) return;
      e.preventDefault();
      expandTrack.scrollBy({ left: e.deltaY, behavior: "auto" });
    },
    { passive: false }
  );

  window.addEventListener("portfolio-tile-bg-ready", function () {
    if (pendingTheme) applyTheme(pendingTheme);
  });

  document.body.classList.add("portfolio-page--tiles");
  startVizShowLoop();
  setActive(0);
  window.setTimeout(function () {
    if (pendingTheme) applyTheme(pendingTheme);
  }, 80);
})();
