/**
 * Realizacje — L→R category tabs + expand-to-case-rail for Strony / Systemy.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-portfolio-tiles]");
  if (!root) return;

  var scroller = root.querySelector("[data-portfolio-tiles-scroller]");
  var tiles = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile]"));
  var dots = Array.prototype.slice.call(root.querySelectorAll("[data-portfolio-tile-dot]"));
  var expandStage = root.querySelector("[data-tile-expand-stage]");
  var expandSource = root.querySelector("[data-tile-expand-source]");
  var expandSourceMedia = root.querySelector("[data-tile-expand-source-media]");
  var expandSourceTitle = root.querySelector("[data-tile-expand-source-title]");
  var expandTrack = root.querySelector("[data-tile-expand-track]");
  if (!scroller || !tiles.length) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var activeIndex = -1;
  var slideTimers = [];
  var reelCompTimer = null;
  var wheelLock = 0;
  var pendingTheme = null;
  var depthRaf = 0;
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

  function clamp(i) {
    return Math.max(0, Math.min(tiles.length - 1, i));
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return r.left + r.width * 0.5;
  }

  function nearestIndex() {
    var mid = window.innerWidth * 0.5;
    var best = 0;
    var bestDist = Infinity;
    tiles.forEach(function (tile, i) {
      var d = Math.abs(centerOf(tile) - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function updateTileDepth() {
    if (REDUCED || expandedKey) return;
    var mid = window.innerWidth * 0.5;
    var span = Math.max(220, window.innerWidth * 0.42);
    tiles.forEach(function (tile, i) {
      var dist = (centerOf(tile) - mid) / span;
      var abs = Math.min(1.35, Math.abs(dist));
      var focus = 1 - Math.min(1, abs);
      var scale = 0.9 + focus * 0.16;
      var rot = Math.max(-11, Math.min(11, -dist * 10));
      var ty = -focus * 8;
      if (i === activeIndex) {
        scale = Math.max(scale, 1.06);
        rot *= 0.35;
        ty = Math.min(ty, -6);
      }
      tile.style.setProperty("--tile-scale", scale.toFixed(3));
      tile.style.setProperty("--tile-rotz", rot.toFixed(2) + "deg");
      tile.style.setProperty("--tile-ty", ty.toFixed(1) + "px");
    });
  }

  function clearSlides() {
    slideTimers.forEach(function (id) {
      window.clearInterval(id);
    });
    slideTimers = [];
    if (reelCompTimer) {
      window.clearInterval(reelCompTimer);
      reelCompTimer = null;
    }
  }

  function playTileSlides(tile) {
    var slides = Array.prototype.slice.call(tile.querySelectorAll("[data-tile-slide]"));
    if (!slides.length) return;
    var fast = tile.getAttribute("data-theme") === "graphics";
    var interval = fast ? 700 : 2600;
    if (slides.length < 2 || REDUCED) {
      slides.forEach(function (s, i) {
        s.classList.toggle("is-on", i === 0);
      });
      return;
    }
    var n = 0;
    slides.forEach(function (s, i) {
      s.classList.toggle("is-on", i === 0);
    });
    slideTimers.push(
      window.setInterval(function () {
        n = (n + 1) % slides.length;
        slides.forEach(function (s, i) {
          s.classList.toggle("is-on", i === n);
        });
      }, interval)
    );
  }

  function syncCardVideos(activeTile) {
    tiles.forEach(function (tile) {
      var isReelComp = !!tile.querySelector("[data-tile-reel-comp]");
      tile.querySelectorAll("[data-card-video]").forEach(function (video) {
        if (tile === activeTile && !isReelComp && !expandedKey) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          try {
            video.pause();
          } catch (e) {}
        }
      });
    });
  }

  function playReelCompilation(tile) {
    var cells = Array.prototype.slice.call(tile.querySelectorAll("[data-reel-cell]"));
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

  function setActive(index, opts) {
    opts = opts || {};
    index = clamp(index);
    if (index === activeIndex && !opts.force) return;
    if (expandedKey) return;
    activeIndex = index;
    clearSlides();
    tiles.forEach(function (tile, i) {
      tile.classList.toggle("is-active", i === index);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-current", i === index ? "true" : "false");
    });
    var tile = tiles[index];
    applyTheme(tile.getAttribute("data-theme") || "web");
    syncCardVideos(tile);
    if (tile.querySelector("[data-tile-reel-comp]")) {
      playReelCompilation(tile);
    } else {
      playTileSlides(tile);
    }
    updateTileDepth();
  }

  function scrollToIndex(index, behavior) {
    if (expandedKey) return;
    index = clamp(index);
    var tile = tiles[index];
    if (!tile) return;
    var left = scroller.scrollLeft + (centerOf(tile) - window.innerWidth * 0.5);
    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: behavior || "smooth",
    });
    setActive(index, { force: true });
  }

  function syncFromScroll() {
    if (expandedKey) return;
    setActive(nearestIndex());
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

  function fillSourceFromTile(tile) {
    if (!expandSourceMedia || !expandSourceTitle) return;
    expandSourceMedia.innerHTML = "";
    var media = tile.querySelector(".portfolio-tile__media");
    if (media) {
      var clone = media.cloneNode(true);
      clone.querySelectorAll("video").forEach(function (v) {
        v.removeAttribute("data-card-video");
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.autoplay = true;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
      expandSourceMedia.appendChild(clone);
    }
    var titleEl = tile.querySelector(".portfolio-tile__title");
    expandSourceTitle.textContent = titleEl ? titleEl.textContent : "";
  }

  function openExpand(tile) {
    if (!expandStage || !expandTrack) return;
    var key = tile.getAttribute("data-tile-expand");
    if (!key || !CASE_SETS[key] || expandedKey === key) return;

    expandedKey = key;
    clearSlides();
    syncCardVideos(null);
    applyTheme(tile.getAttribute("data-theme") || key);
    fillSourceFromTile(tile);
    buildCaseCards(key);

    document.body.classList.add("is-tile-expanded");
    root.classList.add("is-expanded");
    expandStage.hidden = false;
    expandStage.setAttribute("aria-hidden", "false");
    expandStage.setAttribute("data-expand-theme", key);

    window.requestAnimationFrame(function () {
      expandStage.classList.add("is-open");
      playVisibleCaseVideos();
    });

    try {
      history.replaceState(null, "", "#" + (key === "web" ? "strony" : "automatyzacje") + "-cases");
    } catch (e) {}
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
        expandStage.removeAttribute("data-expand-theme");
        if (expandTrack) expandTrack.innerHTML = "";
        if (expandSourceMedia) expandSourceMedia.innerHTML = "";
        setActive(activeIndex < 0 ? 0 : activeIndex, { force: true });
      },
      REDUCED ? 0 : 420
    );

    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (e) {}
  }

  scroller.addEventListener(
    "scroll",
    function () {
      if (depthRaf || expandedKey) return;
      depthRaf = window.requestAnimationFrame(function () {
        depthRaf = 0;
        syncFromScroll();
        updateTileDepth();
      });
    },
    { passive: true }
  );

  window.addEventListener(
    "resize",
    function () {
      if (expandedKey) return;
      scrollToIndex(activeIndex < 0 ? 0 : activeIndex, "auto");
    },
    { passive: true }
  );

  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      if (expandedKey) closeExpand();
      scrollToIndex(i);
    });
  });

  tiles.forEach(function (tile, i) {
    tile.addEventListener("click", function (e) {
      var expandKey = tile.getAttribute("data-tile-expand");
      if (!expandKey) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
      e.preventDefault();
      if (i !== activeIndex) {
        scrollToIndex(i);
        window.setTimeout(function () {
          openExpand(tile);
        }, REDUCED ? 0 : 280);
      } else {
        openExpand(tile);
      }
    });
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
      if (expandedKey) {
        if (!expandTrack) return;
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        if (Math.abs(e.deltaY) < 1.2) return;
        e.preventDefault();
        expandTrack.scrollBy({ left: e.deltaY, behavior: "auto" });
        return;
      }
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaY) < 1.2) return;
      e.preventDefault();
      var now = performance.now();
      if (now - wheelLock < 420) return;
      wheelLock = now;
      var next = activeIndex + (e.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= tiles.length) return;
      scrollToIndex(next);
    },
    { passive: false }
  );

  window.addEventListener("portfolio-tile-bg-ready", function () {
    if (pendingTheme) applyTheme(pendingTheme);
  });

  document.body.classList.add("portfolio-page--tiles");
  scrollToIndex(0, "auto");
  window.setTimeout(function () {
    scrollToIndex(0, "auto");
    if (pendingTheme) applyTheme(pendingTheme);
  }, 80);
  window.setTimeout(function () {
    if (pendingTheme) applyTheme(pendingTheme);
    var hash = (window.location.hash || "").replace("#", "");
    if (hash === "strony-cases") {
      var webTile = tiles.find(function (t) {
        return t.getAttribute("data-tile-expand") === "web";
      });
      if (webTile) {
        scrollToIndex(tiles.indexOf(webTile), "auto");
        openExpand(webTile);
      }
    } else if (hash === "automatyzacje-cases") {
      var sysTile = tiles.find(function (t) {
        return t.getAttribute("data-tile-expand") === "systems";
      });
      if (sysTile) {
        scrollToIndex(tiles.indexOf(sysTile), "auto");
        openExpand(sysTile);
      }
    }
  }, 400);
})();
