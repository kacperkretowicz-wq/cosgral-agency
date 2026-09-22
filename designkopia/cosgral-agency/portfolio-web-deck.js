/**
 * Portfolio #strony — trackpad coverflow deck + Jim-Carter-style web case panel.
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var OPEN_MS = REDUCED ? 0 : 520;
  var CLOSE_MS = REDUCED ? 0 : 420;
  var CASE_KEY = "cosgral-web-case";

  var CASES = {
    juicy: {
      titleKey: "portfolio.juicy_title",
      descKey: "portfolio.juicy_desc",
      copyKey: "portfolio.juicy_p1",
      video: "portfolio-media/showcase/web/juicy-events.mp4",
      poster: "portfolio-media/showcase/web/juicy-events-poster.jpg",
      visit: "https://juicyevents.pl/",
      preview: "juicy",
    },
    trove: {
      titleKey: "portfolio.trove_title",
      descKey: "portfolio.trove_desc",
      copyKey: "portfolio.trove_p1",
      video: "portfolio-media/showcase/web/trove-archive.mp4",
      poster: "portfolio-media/showcase/web/trove-archive-poster.jpg",
      visit: "https://trovearchive.com/",
      preview: "trove",
    },
    mj: {
      titleKey: "portfolio.mj_title",
      descKey: "portfolio.mj_desc",
      copyKey: "portfolio.mj_p1",
      video: "portfolio-media/showcase/web/mj-social-media.mp4",
      poster: "portfolio-media/showcase/web/mj-social-media-poster.jpg",
      visit: "https://mjsocialmedia.netlify.app/",
      preview: "mj",
    },
  };

  var section = document.getElementById("strony");
  var deck = document.querySelector("[data-web-deck]");
  var track = deck && deck.querySelector("[data-web-deck-track]");
  var cards = track ? Array.prototype.slice.call(track.querySelectorAll("[data-web-case]")) : [];
  var index = 0;
  var velocity = 0;
  var dragging = false;
  var dragStartX = 0;
  var dragStartIndex = 0;
  var dragMoved = false;
  var snapTimer = 0;
  var raf = 0;
  var openPanel = null;
  var openId = null;
  var closing = false;
  var sectionVisible = false;

  function t(key, fallback) {
    var val = window.cosgralI18n && window.cosgralI18n.t(key);
    return val || fallback || key;
  }

  function clampIndex(v) {
    if (!cards.length) return 0;
    return Math.max(0, Math.min(cards.length - 1, v));
  }

  function nearestIndex() {
    return Math.round(clampIndex(index));
  }

  function syncVideos(frontIdx) {
    cards.forEach(function (card, i) {
      var video = card.querySelector("video");
      if (!video) return;
      if (!sectionVisible) {
        if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.pause) {
          window.CosgralPortfolioVideo.pause(video);
        } else {
          video.pause();
        }
        return;
      }
      if (i === frontIdx) {
        if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.play) {
          window.CosgralPortfolioVideo.play(video);
        } else {
          var src = video.getAttribute("data-video-src");
          if (src && !video.getAttribute("src")) {
            video.src = src;
            video.load();
          }
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        }
      } else if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.warmFrame) {
        window.CosgralPortfolioVideo.pause(video);
        window.CosgralPortfolioVideo.warmFrame(video);
      } else {
        video.pause();
      }
    });
  }

  function layout() {
    if (!cards.length) return;
    var n = nearestIndex();
    cards.forEach(function (card, i) {
      var offset = i - index;
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
      if (i === n) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
      card.tabIndex = i === n ? 0 : -1;
    });
    syncVideos(n);
  }

  function requestLayout() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      layout();
    });
  }

  function setIndex(next, immediate) {
    index = clampIndex(next);
    if (immediate) layout();
    else requestLayout();
  }

  function scheduleSnap() {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(function () {
      velocity *= 0.55;
      if (Math.abs(velocity) > 0.02) {
        setIndex(index + velocity);
        velocity *= 0.82;
        scheduleSnap();
        return;
      }
      velocity = 0;
      setIndex(nearestIndex());
    }, REDUCED ? 0 : 48);
  }

  function isSectionOnScreen() {
    if (!section) return true;
    var r = section.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    return r.bottom > 4 && r.top < vh - 4;
  }

  function onWheel(e) {
    if (!deck || openPanel) return;
    if (document.body.classList.contains("is-nav-menu-open")) return;
    if (!sectionVisible && !isSectionOnScreen()) return;
    var dx = e.deltaX;
    var dy = e.deltaY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    /* Tylko wyraźny gest boczny — pion ma iść w scroll strony */
    var horizontal = absX > 1.2 && absX > absY * 1.35;
    var verticalAsSwipe = absY > absX * 1.15 && e.shiftKey;
    if (!horizontal && !verticalAsSwipe) return;
    var dominant = horizontal ? dx : dy;
    if (!dominant) return;
    e.preventDefault();
    e.stopPropagation();
    velocity = dominant * 0.0022;
    setIndex(index + velocity);
    scheduleSnap();
  }

  var pointerId = null;
  var activeCard = null;
  var dragStartY = 0;
  var dragAxis = null; /* null | "x" | "y" */

  function onPointerDown(e) {
    if (!track || openPanel) return;
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragAxis = null;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartIndex = index;
    velocity = 0;
    pointerId = e.pointerId;
    activeCard = e.target.closest ? e.target.closest("[data-web-case]") : null;
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;
    if (!dragAxis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      /* Pionowy gest = scroll strony; nie kradnij toucha */
      if (Math.abs(dy) >= Math.abs(dx) * 1.05) {
        dragAxis = "y";
        dragging = false;
        activeCard = null;
        return;
      }
      dragAxis = "x";
      dragMoved = true;
      track.classList.add("is-dragging");
      try {
        track.setPointerCapture(pointerId);
      } catch (err) {}
    }
    if (dragAxis !== "x") return;
    setIndex(dragStartIndex - dx / Math.max(220, window.innerWidth * 0.28));
  }

  function onPointerUp() {
    if (!dragging && dragAxis !== "x") {
      activeCard = null;
      dragAxis = null;
      return;
    }
    var card = activeCard;
    var moved = dragMoved;
    var wasHorizontal = dragAxis === "x";
    dragging = false;
    dragMoved = false;
    dragAxis = null;
    activeCard = null;
    track.classList.remove("is-dragging");
    try {
      if (pointerId != null) track.releasePointerCapture(pointerId);
    } catch (err) {}
    pointerId = null;
    if (wasHorizontal) scheduleSnap();
    if (!moved && card && !openPanel) {
      onCardActivate(card);
    }
  }

  function lockScroll(on) {
    document.body.classList.toggle("is-web-case-open", !!on);
    document.documentElement.classList.toggle("is-web-case-open", !!on);
  }

  function buildPanel(id) {
    var data = CASES[id];
    if (!data) return null;

    var title = t(data.titleKey);
    var desc = t(data.descKey);
    var copy = t(data.copyKey);
    var visit = t("portfolio.visit_site", "Odwiedź stronę");
    var eyebrow = t("portfolio.case_eyebrow", "Strona internetowa");
    var closeLabel = t("portfolio.lightbox_close", "Zamknij");
    var brand = "COSGRAL";

    var panel = document.createElement("div");
    panel.className = "web-case-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "web-case-title");
    panel.innerHTML =
      '<button type="button" class="web-case-panel__backdrop" data-web-case-close aria-label="' +
      closeLabel +
      '"></button>' +
      '<p class="web-case-panel__frame-label web-case-panel__frame-label--tl" aria-hidden="true">' +
      brand +
      "</p>" +
      '<p class="web-case-panel__frame-label web-case-panel__frame-label--tr" aria-hidden="true">' +
      eyebrow +
      "</p>" +
      '<p class="web-case-panel__frame-label web-case-panel__frame-label--bl" aria-hidden="true">' +
      title +
      "</p>" +
      '<p class="web-case-panel__frame-label web-case-panel__frame-label--br" aria-hidden="true">' +
      desc +
      "</p>" +
      '<div class="web-case-panel__shell">' +
      '<div class="web-case-panel__media" aria-hidden="true">' +
      '<video class="web-case-panel__video" muted loop playsinline autoplay preload="metadata"' +
      (data.poster ? ' poster="' + data.poster + '"' : "") +
      ' src="' +
      data.video +
      '"></video>' +
      '<div class="web-case-panel__dim"></div>' +
      "</div>" +
      '<button type="button" class="web-case-panel__close" data-web-case-close aria-label="' +
      closeLabel +
      '">×</button>' +
      '<div class="web-case-panel__content">' +
      '<div class="web-case-panel__top">' +
      '<div class="web-case-panel__lead">' +
      '<h2 class="web-case-panel__title" id="web-case-title">' +
      title +
      "</h2>" +
      '<p class="web-case-panel__text">' +
      copy +
      "</p>" +
      "</div>" +
      '<div class="web-case-panel__cols">' +
      '<div class="web-case-panel__col">' +
      '<p class="web-case-panel__col-label">' +
      eyebrow +
      "</p>" +
      '<p class="web-case-panel__col-value">' +
      desc +
      "</p>" +
      "</div>" +
      '<div class="web-case-panel__col">' +
      '<p class="web-case-panel__col-label">' +
      visit +
      "</p>" +
      '<a class="web-case-panel__col-link" href="' +
      data.visit +
      '" target="_blank" rel="noopener noreferrer" data-no-transition>' +
      data.visit.replace(/^https?:\/\//, "").replace(/\/$/, "") +
      "</a>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="web-case-panel__bottom">' +
      '<p class="web-case-panel__foot">' +
      brand +
      " · " +
      title +
      "</p>" +
      '<a class="web-case-panel__visit" href="' +
      data.visit +
      '" target="_blank" rel="noopener noreferrer" data-no-transition>' +
      visit +
      " →</a>" +
      "</div>" +
      "</div></div>";

    return panel;
  }

  function closePanel() {
    if (!openPanel || closing) return;
    closing = true;
    var panel = openPanel;
    panel.classList.remove("is-open");
    window.setTimeout(function () {
      var video = panel.querySelector("video");
      if (video) {
        video.pause();
        video.removeAttribute("src");
      }
      if (panel.parentNode) panel.parentNode.removeChild(panel);
      if (openPanel === panel) {
        openPanel = null;
        openId = null;
        lockScroll(false);
        try {
          sessionStorage.removeItem(CASE_KEY);
        } catch (e) {}
      }
      closing = false;
      layout();
    }, CLOSE_MS);
  }

  function disposePanelNow() {
    if (!openPanel) return;
    var panel = openPanel;
    openPanel = null;
    openId = null;
    closing = false;
    var video = panel.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
    }
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    lockScroll(false);
  }

  function openCase(id, fromCard) {
    if (!CASES[id]) return;
    if (openPanel && openId === id && openPanel.classList.contains("is-open")) return;
    disposePanelNow();

    var panel = buildPanel(id);
    if (!panel) return;

    openId = id;
    openPanel = panel;
    closing = false;
    document.body.appendChild(panel);
    lockScroll(true);

    try {
      sessionStorage.setItem(CASE_KEY, id);
    } catch (e) {}

    if (fromCard) {
      var rect = fromCard.getBoundingClientRect();
      var shell = panel.querySelector(".web-case-panel__shell");
      shell.style.setProperty("--origin-x", rect.left + rect.width / 2 + "px");
      shell.style.setProperty("--origin-y", rect.top + rect.height / 2 + "px");
    }

    requestAnimationFrame(function () {
      if (openPanel !== panel) return;
      panel.classList.add("is-open");
      var video = panel.querySelector("video");
      if (video) {
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      }
    });

    var focusBtn = panel.querySelector(".web-case-panel__close");
    if (focusBtn) focusBtn.focus();
  }

  function onCardActivate(card) {
    var id = card.getAttribute("data-web-case");
    var i = cards.indexOf(card);
    if (i >= 0 && i !== nearestIndex()) {
      setIndex(i);
      scheduleSnap();
      return;
    }
    openCase(id, card);
  }

  function bindSectionVisibility() {
    if (!section) {
      sectionVisible = true;
      return;
    }
    sectionVisible = isSectionOnScreen();
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          /* Any on-screen fraction is enough to interact */
          sectionVisible = entry.isIntersecting && entry.intersectionRatio > 0;
          if (sectionVisible) {
            if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.warmFramesIn) {
              window.CosgralPortfolioVideo.warmFramesIn(section);
            }
            layout();
          } else if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.pauseAllIn) {
            window.CosgralPortfolioVideo.pauseAllIn(section);
          }
        });
      },
      { threshold: [0, 0.01, 0.08, 0.2, 0.45] }
    );
    io.observe(section);
  }

  function bindDeck() {
    if (!deck || !track || !cards.length) return;

    /* Wheel na window — działa dopóki sekcja #strony jest na ekranie */
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", onPointerUp);
    track.addEventListener("pointercancel", onPointerUp);

    cards.forEach(function (card) {
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardActivate(card);
        }
      });
    });

    layout();

    if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.scan) {
      window.CosgralPortfolioVideo.scan(deck);
    }
    if (window.CosgralPortfolioVideo && window.CosgralPortfolioVideo.warmFramesIn) {
      window.CosgralPortfolioVideo.warmFramesIn(deck);
    }
  }

  function bindPanelEvents() {
    document.addEventListener("click", function (e) {
      if (!openPanel) return;
      if (e.target.closest("[data-web-case-close]")) {
        e.preventDefault();
        closePanel();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openPanel) {
        e.preventDefault();
        closePanel();
        return;
      }
      if (openPanel || !cards.length || !sectionVisible) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex(nearestIndex() + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex(nearestIndex() - 1);
      }
    });
  }

  function openFromStorageOrQuery() {
    var id = null;
    try {
      id = new URLSearchParams(window.location.search).get("web");
    } catch (e) {}
    if (!id) {
      try {
        id = sessionStorage.getItem(CASE_KEY);
      } catch (e2) {}
    }
    if (!id || !CASES[id]) return;

    var idx = cards.findIndex(function (c) {
      return c.getAttribute("data-web-case") === id;
    });
    if (idx >= 0) setIndex(idx, true);

    window.setTimeout(function () {
      openCase(id, cards[idx] || null);
    }, 420);
  }

  function refreshCopy() {
    if (!openPanel || !openId) return;
    var was = openId;
    var panel = openPanel;
    openPanel = null;
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    openCase(was, null);
  }

  window.addEventListener("cosgral:langchange", refreshCopy);

  window.cosgralWebDeck = {
    open: openCase,
    close: closePanel,
    cases: CASES,
  };

  bindSectionVisibility();
  bindDeck();
  bindPanelEvents();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", openFromStorageOrQuery);
  } else {
    openFromStorageOrQuery();
  }
})();
