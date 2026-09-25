/**
 * Site-wide ambient music (YouTube / optional audio files).
 * Track switcher under Menu; ducks on mega-menu, popups, section changes.
 *
 * Add tracks in COSGRAL_MUSIC_TRACKS (youtube id and/or audio URL).
 */
(function () {
  "use strict";

  var STORAGE_TRACK = "cosgral-music-track";
  var STORAGE_ON = "cosgral-music-on";
  var VOL_NORMAL = 58;
  var VOL_DUCK = 11;
  var SECTION_DUCK_MS = 900;

  /** @type {{id:string,title:string,artist?:string,youtube?:string,audio?:string}[]} */
  var TRACKS = window.COSGRAL_MUSIC_TRACKS || [
    {
      id: "ghost-cities",
      title: "Ghost Cities",
      artist: "BXRDVJA",
      youtube: "asn93p_UtXE",
    },
    // Kolejne utwory — dopisz tutaj (youtube: "VIDEO_ID" lub audio: "assets/music/….mp3")
  ];

  if (!TRACKS.length) return;

  var nav = document.getElementById("site-nav");
  var toggle = document.getElementById("nav-toggle");
  if (!nav || !toggle) return;
  var actions = nav.querySelector(".site-nav__actions");

  var reduce =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var trackIndex = 0;
  try {
    var saved = localStorage.getItem(STORAGE_TRACK);
    if (saved) {
      var found = TRACKS.findIndex(function (t) {
        return t.id === saved || t.youtube === saved;
      });
      if (found >= 0) trackIndex = found;
    }
  } catch (e) {}

  var wantPlay = false;
  try {
    wantPlay = localStorage.getItem(STORAGE_ON) === "1";
  } catch (e2) {}

  var ytReady = false;
  var ytPlayer = null;
  var audioEl = null;
  var duckReasons = Object.create(null);
  var sectionDuckTimer = null;
  var unlocked = false;
  var ui = null;

  function track() {
    return TRACKS[trackIndex] || TRACKS[0];
  }

  function ensureCss() {
    if (document.getElementById("site-music-css")) return;
    var link = document.createElement("link");
    link.id = "site-music-css";
    link.rel = "stylesheet";
    link.href = assetPath("site-music.css?v=20260925music2");
    document.head.appendChild(link);
  }

  function assetPath(file) {
    var path = window.location.pathname || "";
    return path.indexOf("/uslugi/") !== -1 ? "../" + file : file;
  }

  function buildUi() {
    var col = document.createElement("div");
    col.className = "site-nav__menu-col";
    if (actions) {
      toggle.parentNode.insertBefore(col, toggle);
    } else {
      nav.appendChild(col);
    }
    col.appendChild(toggle);

    ui = document.createElement("div");
    ui.className = "site-music";
    ui.id = "site-music";
    ui.innerHTML =
      '<div class="site-music__bar">' +
      '<button type="button" class="site-music__play" data-i18n-aria-label="nav.music_play" aria-label="Włącz muzykę" title="Muzyka">' +
      '<svg class="site-music__icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
      '<svg class="site-music__icon-pause" viewBox="0 0 24 24" aria-hidden="true" hidden><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>' +
      "</button>" +
      '<button type="button" class="site-music__meta" aria-expanded="false" aria-haspopup="listbox">' +
      '<span class="site-music__label" data-i18n="nav.music">Muzyka</span>' +
      '<span class="site-music__title"></span>' +
      "</button>" +
      '<button type="button" class="site-music__next" data-i18n-aria-label="nav.music_next" aria-label="Następny utwór" title="Następny">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6v12l8.5-6L6 6zm9 0h2v12h-2z"/></svg>' +
      "</button>" +
      "</div>" +
      '<ul class="site-music__list" role="listbox" hidden></ul>';

    col.appendChild(ui);

    var list = ui.querySelector(".site-music__list");
    TRACKS.forEach(function (t, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "option");
      btn.dataset.index = String(i);
      btn.innerHTML =
        "<span>" +
        escapeHtml(t.title) +
        "</span>" +
        (t.artist ? "<small>" + escapeHtml(t.artist) + "</small>" : "");
      li.appendChild(btn);
      list.appendChild(li);
    });

    ui.querySelector(".site-music__play").addEventListener("click", function (e) {
      e.stopPropagation();
      togglePlay();
    });
    ui.querySelector(".site-music__next").addEventListener("click", function (e) {
      e.stopPropagation();
      nextTrack(true);
    });
    ui.querySelector(".site-music__meta").addEventListener("click", function (e) {
      e.stopPropagation();
      setListOpen(!ui.classList.contains("is-open"));
    });
    list.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-index]");
      if (!btn) return;
      e.stopPropagation();
      selectTrack(Number(btn.dataset.index), true);
      setListOpen(false);
    });

    document.addEventListener("click", function (e) {
      if (!ui.classList.contains("is-open")) return;
      if (ui.contains(e.target)) return;
      setListOpen(false);
    });

    refreshUi();

    function reapplyI18n() {
      if (window.cosgralI18n && typeof window.cosgralI18n.applyLang === "function") {
        try {
          window.cosgralI18n.applyLang(window.cosgralI18n.getLang());
        } catch (eI18n) {}
      }
    }
    reapplyI18n();
    window.addEventListener("cosgral:i18n-ready", reapplyI18n);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setListOpen(open) {
    if (!ui) return;
    ui.classList.toggle("is-open", open);
    var meta = ui.querySelector(".site-music__meta");
    var list = ui.querySelector(".site-music__list");
    if (meta) meta.setAttribute("aria-expanded", open ? "true" : "false");
    if (list) list.hidden = !open;
  }

  function refreshUi() {
    if (!ui) return;
    var t = track();
    var title = ui.querySelector(".site-music__title");
    if (title) title.textContent = t.title;
    ui.classList.toggle("is-playing", !!wantPlay && unlocked);
    ui.classList.toggle("is-needs-gesture", !!wantPlay && !unlocked);
    var playIcon = ui.querySelector(".site-music__icon-play");
    var pauseIcon = ui.querySelector(".site-music__icon-pause");
    if (playIcon && pauseIcon) {
      var showPause = wantPlay && unlocked;
      playIcon.hidden = showPause;
      pauseIcon.hidden = !showPause;
    }
    ui.querySelectorAll(".site-music__list button").forEach(function (btn, i) {
      btn.setAttribute("aria-current", i === trackIndex ? "true" : "false");
    });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_TRACK, track().id);
      localStorage.setItem(STORAGE_ON, wantPlay ? "1" : "0");
    } catch (e3) {}
  }

  function targetVolume() {
    for (var k in duckReasons) {
      if (duckReasons[k]) return VOL_DUCK;
    }
    return VOL_NORMAL;
  }

  function applyVolume() {
    var v = targetVolume();
    if (ytPlayer && typeof ytPlayer.setVolume === "function") {
      try {
        ytPlayer.setVolume(v);
      } catch (e4) {}
    }
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, v / 100));
    }
  }

  function setDuck(reason, on) {
    if (on) duckReasons[reason] = true;
    else delete duckReasons[reason];
    applyVolume();
  }

  function ensureHost() {
    var host = document.getElementById("site-music-host");
    if (host) return host;
    host = document.createElement("div");
    host.id = "site-music-host";
    host.className = "site-music-host";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    return host;
  }

  function destroyPlayers() {
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
      try {
        ytPlayer.destroy();
      } catch (e5) {}
    }
    ytPlayer = null;
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
      audioEl.remove();
      audioEl = null;
    }
    var mount = document.getElementById("site-music-yt");
    if (mount) mount.remove();
  }

  function loadYoutubeApi(cb) {
    if (window.YT && window.YT.Player) {
      cb();
      return;
    }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") prev();
      cb();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      var s = document.createElement("script");
      s.id = "youtube-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  }

  function mountTrack(thenPlay) {
    var t = track();
    destroyPlayers();
    var host = ensureHost();

    if (t.audio) {
      audioEl = document.createElement("audio");
      audioEl.loop = true;
      audioEl.preload = "auto";
      audioEl.src = assetPath(t.audio);
      host.appendChild(audioEl);
      applyVolume();
      if (thenPlay) playCurrent();
      return;
    }

    if (!t.youtube) return;

    loadYoutubeApi(function () {
      var mount = document.createElement("div");
      mount.id = "site-music-yt";
      host.appendChild(mount);
      ytPlayer = new YT.Player("site-music-yt", {
        height: "1",
        width: "1",
        videoId: t.youtube,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          loop: 1,
          playlist: t.youtube,
        },
        events: {
          onReady: function () {
            ytReady = true;
            applyVolume();
            if (thenPlay || wantPlay) playCurrent();
          },
          onStateChange: function (ev) {
            // 1 = playing
            if (ev.data === 1) {
              unlocked = true;
              if (ui) ui.classList.remove("is-needs-gesture");
              refreshUi();
              applyVolume();
            }
            // 0 = ended — restart for loop fallback
            if (ev.data === 0 && wantPlay) {
              try {
                ytPlayer.seekTo(0, true);
                ytPlayer.playVideo();
              } catch (e6) {}
            }
          },
          onError: function () {
            unlocked = false;
            if (ui) {
              ui.classList.add("is-needs-gesture");
              ui.classList.remove("is-playing");
            }
          },
        },
      });
    });
  }

  function playCurrent() {
    wantPlay = true;
    persist();
    var p;
    if (audioEl) {
      p = audioEl.play();
      if (p && p.then) {
        p.then(function () {
          unlocked = true;
          refreshUi();
          applyVolume();
        }).catch(function () {
          unlocked = false;
          refreshUi();
        });
      } else {
        unlocked = true;
        refreshUi();
      }
      return;
    }
    if (ytPlayer && typeof ytPlayer.playVideo === "function") {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(targetVolume());
        ytPlayer.playVideo();
        unlocked = true;
        refreshUi();
      } catch (e7) {
        unlocked = false;
        refreshUi();
      }
      return;
    }
    mountTrack(true);
  }

  function pauseCurrent() {
    wantPlay = false;
    persist();
    if (audioEl) audioEl.pause();
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
      try {
        ytPlayer.pauseVideo();
      } catch (e8) {}
    }
    refreshUi();
  }

  function togglePlay() {
    if (wantPlay && unlocked) pauseCurrent();
    else {
      if (!ytPlayer && !audioEl) mountTrack(true);
      else playCurrent();
    }
  }

  function selectTrack(index, autoPlay) {
    if (index < 0 || index >= TRACKS.length) return;
    trackIndex = index;
    persist();
    refreshUi();
    mountTrack(!!(autoPlay || wantPlay));
  }

  function nextTrack(autoPlay) {
    selectTrack((trackIndex + 1) % TRACKS.length, autoPlay);
  }

  function syncOverlayDucks() {
    var menuOpen =
      document.body.classList.contains("is-nav-menu-open") ||
      document.documentElement.classList.contains("is-nav-menu-open") ||
      !!(document.querySelector(".nav-overlay.is-open"));
    setDuck("menu", menuOpen);

    var panelOpen =
      document.body.classList.contains("is-service-panel-open") ||
      document.documentElement.classList.contains("is-service-panel-open") ||
      !!(document.querySelector(".service-panel.is-open"));
    setDuck("panel", panelOpen);

    var chatOpen = !!(
      document.querySelector(".cg-chat-panel.is-open") ||
      document.querySelector(".site-chat.is-open") ||
      document.body.classList.contains("is-chat-open")
    );
    setDuck("chat", chatOpen);
  }

  function duckSectionBriefly() {
    setDuck("section", true);
    if (sectionDuckTimer) clearTimeout(sectionDuckTimer);
    sectionDuckTimer = setTimeout(function () {
      setDuck("section", false);
      sectionDuckTimer = null;
    }, reduce ? 200 : SECTION_DUCK_MS);
  }

  function watchDom() {
    var obs = new MutationObserver(function () {
      syncOverlayDucks();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: false,
    });
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: false,
    });
    var overlay = document.getElementById("nav-overlay");
    if (overlay) {
      obs.observe(overlay, { attributes: true, attributeFilter: ["class"] });
    }
    // Chat panel mounts later
    var bodyObs = new MutationObserver(function () {
      syncOverlayDucks();
      var chat = document.querySelector(".cg-chat-panel");
      if (chat && !chat._musicWatched) {
        chat._musicWatched = true;
        obs.observe(chat, { attributes: true, attributeFilter: ["class"] });
      }
      var panel = document.querySelector(".service-panel");
      if (panel && !panel._musicWatched) {
        panel._musicWatched = true;
        obs.observe(panel, { attributes: true, attributeFilter: ["class"] });
      }
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
  }

  ensureCss();
  buildUi();
  watchDom();
  syncOverlayDucks();

  window.addEventListener("cosgral:section-step", function () {
    duckSectionBriefly();
  });

  // Prefetch player; auto-resume only after gesture if previously on
  mountTrack(false);
  if (wantPlay) {
    refreshUi();
    // Try once — browsers often block; play button pulses until unlocked
    var tryOnce = function () {
      document.removeEventListener("pointerdown", tryOnce, true);
      document.removeEventListener("keydown", tryOnce, true);
      if (wantPlay && !unlocked) playCurrent();
    };
    document.addEventListener("pointerdown", tryOnce, true);
    document.addEventListener("keydown", tryOnce, true);
  }

  window.CosgralMusic = {
    tracks: TRACKS,
    play: playCurrent,
    pause: pauseCurrent,
    next: function () {
      nextTrack(true);
    },
    select: function (idOrIndex) {
      if (typeof idOrIndex === "number") selectTrack(idOrIndex, true);
      else {
        var i = TRACKS.findIndex(function (t) {
          return t.id === idOrIndex || t.youtube === idOrIndex;
        });
        if (i >= 0) selectTrack(i, true);
      }
    },
    duck: setDuck,
  };
})();
