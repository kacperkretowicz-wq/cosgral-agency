/**
 * Site-wide ambient music (YouTube / optional audio files).
 * Track switcher under Menu. Smooth duck on mega-menu + popups only.
 * Continues across subpages via persisted state + auto-resume.
 *
 * Add tracks: youtube id and/or audio URL in COSGRAL_MUSIC_TRACKS.
 */
(function () {
  "use strict";

  if (window.__cosgralMusicInit) return;
  window.__cosgralMusicInit = true;

  var STORAGE_TRACK = "cosgral-music-track";
  var STORAGE_ON = "cosgral-music-on";
  var STORAGE_TIME = "cosgral-music-time";
  var STORAGE_NAV = "cosgral-music-nav";
  var STORAGE_AUTOPLAY = "cosgral-music-autoplay";
  var VOL_NORMAL = 58;
  var VOL_DUCK = 10;
  var VOL_FADE_MS = 1400;

  /** @type {{id:string,title:string,artist?:string,youtube?:string,audio?:string}[]} */
  var TRACKS = window.COSGRAL_MUSIC_TRACKS || [
    {
      id: "ghost-cities",
      title: "Ghost Cities",
      artist: "BXRDVJA",
      youtube: "asn93p_UtXE",
    },
    {
      id: "session-01",
      title: "Session 01",
      artist: "COSGRAL",
      audio: "assets/music/session-01.mp3",
    },
    {
      id: "session-02",
      title: "Session 02",
      artist: "COSGRAL",
      audio: "assets/music/session-02.mp3",
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

  var wantPlay = true;
  try {
    wantPlay = localStorage.getItem(STORAGE_ON) !== "0";
  } catch (e2) {}

  var savedTime = 0;
  try {
    savedTime = parseFloat(sessionStorage.getItem(STORAGE_TIME) || "0") || 0;
  } catch (eTime) {}

  var fromNav = false;
  var forceAutoplay = false;
  try {
    var navAt = parseInt(sessionStorage.getItem(STORAGE_NAV) || "0", 10) || 0;
    fromNav = !!(navAt && Date.now() - navAt < 60000);
    forceAutoplay = wantPlay;
    if (fromNav) sessionStorage.removeItem(STORAGE_NAV);
    if (forceAutoplay) {
      wantPlay = true;
      try {
        localStorage.setItem(STORAGE_ON, "1");
        sessionStorage.setItem(STORAGE_AUTOPLAY, "1");
      } catch (eForce) {}
    }
  } catch (eNav) {}

  var ytReady = false;
  var ytPlayer = null;
  var audioEl = null;
  var duckReasons = Object.create(null);
  var unlocked = false;
  var ui = null;
  var currentVol = VOL_NORMAL;
  var volRaf = 0;
  var volTarget = VOL_NORMAL;
  var timeTimer = 0;

  function track() {
    return TRACKS[trackIndex] || TRACKS[0];
  }

  function ensureCss() {
    if (document.getElementById("site-music-css")) return;
    var link = document.createElement("link");
    link.id = "site-music-css";
    link.rel = "stylesheet";
    link.href = assetPath("site-music.css?v=20260925fix20");
    document.head.appendChild(link);
  }

  function assetPath(file) {
    var path = window.location.pathname || "";
    return path.indexOf("/uslugi/") !== -1 ? "../" + file : file;
  }

  function buildUi() {
    if (document.getElementById("site-music")) {
      ui = document.getElementById("site-music");
      return;
    }

    var col = document.querySelector(".site-nav__menu-col");
    if (!col) {
      col = document.createElement("div");
      col.className = "site-nav__menu-col";
      if (actions) toggle.parentNode.insertBefore(col, toggle);
      else nav.appendChild(col);
      col.appendChild(toggle);
    } else if (toggle.parentNode !== col) {
      col.appendChild(toggle);
    }

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
    // Optimistic: if user wants music on, show pause (playing) state
    ui.classList.toggle("is-playing", !!wantPlay);
    ui.classList.toggle("is-needs-gesture", !!wantPlay && !unlocked);
    var playIcon = ui.querySelector(".site-music__icon-play");
    var pauseIcon = ui.querySelector(".site-music__icon-pause");
    if (playIcon && pauseIcon) {
      playIcon.hidden = !!wantPlay;
      pauseIcon.hidden = !wantPlay;
    }
    ui.querySelectorAll(".site-music__list button").forEach(function (btn, i) {
      btn.setAttribute("aria-current", i === trackIndex ? "true" : "false");
    });
  }

  function persistTrackOnly() {
    try {
      localStorage.setItem(STORAGE_TRACK, track().id);
      localStorage.setItem(STORAGE_ON, wantPlay ? "1" : "0");
    } catch (e3b) {}
  }

  function persist() {
    persistTrackOnly();
    persistTime();
  }

  function persistTime() {
    var t = getCurrentTime();
    if (t > 0.5) {
      try {
        sessionStorage.setItem(STORAGE_TIME, String(t));
      } catch (e4) {}
      savedTime = t;
    }
  }

  function clearSavedTime() {
    savedTime = 0;
    try {
      sessionStorage.removeItem(STORAGE_TIME);
    } catch (eClr) {}
  }

  function seekToStart() {
    clearSavedTime();
    try {
      if (audioEl) audioEl.currentTime = 0;
      if (ytPlayer && typeof ytPlayer.seekTo === "function") {
        ytPlayer.seekTo(0, true);
      }
    } catch (eSeek0) {}
  }

  function getCurrentTime() {
    try {
      if (audioEl && !isNaN(audioEl.currentTime)) return audioEl.currentTime;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === "function") {
        return ytPlayer.getCurrentTime() || 0;
      }
    } catch (e5) {}
    return savedTime || 0;
  }

  function seekToSaved() {
    if (!(savedTime > 1)) return;
    try {
      if (audioEl) audioEl.currentTime = savedTime;
      if (ytPlayer && typeof ytPlayer.seekTo === "function") {
        ytPlayer.seekTo(savedTime, true);
      }
    } catch (e6) {}
  }

  function markNavigatingAway() {
    persistTime();
    try {
      sessionStorage.setItem(STORAGE_NAV, String(Date.now()));
      sessionStorage.setItem(STORAGE_AUTOPLAY, "1");
      sessionStorage.setItem("cosgral-music-engaged", "1");
      // Don't clobber ON=1 if memory state lagged behind storage / engagement
      var stayOn =
        wantPlay ||
        localStorage.getItem(STORAGE_ON) === "1" ||
        wasMediaEngaged() ||
        unlocked ||
        !!(window.__cosgralEarlyPlaying);
      if (stayOn) wantPlay = true;
      localStorage.setItem(STORAGE_ON, stayOn ? "1" : "0");
      if (track()) localStorage.setItem(STORAGE_TRACK, track().id);
    } catch (e7) {}
  }

  function targetVolume() {
    for (var k in duckReasons) {
      if (duckReasons[k]) return VOL_DUCK;
    }
    return VOL_NORMAL;
  }

  function setPlayerVolume(v) {
    currentVol = v;
    if (ytPlayer && typeof ytPlayer.setVolume === "function") {
      try {
        ytPlayer.setVolume(Math.round(v));
      } catch (e8) {}
    }
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, v / 100));
    }
  }

  function animateVolumeTo(target) {
    volTarget = target;
    if (reduce) {
      if (volRaf) cancelAnimationFrame(volRaf);
      volRaf = 0;
      setPlayerVolume(target);
      return;
    }
    if (volRaf) return;
    var start = currentVol;
    var from = start;
    var to = target;
    var t0 = performance.now();
    var dur = VOL_FADE_MS;

    function step(now) {
      // If target changed mid-fade, retarget smoothly from current
      if (volTarget !== to) {
        from = currentVol;
        to = volTarget;
        t0 = now;
      }
      var p = Math.min(1, (now - t0) / dur);
      // ease in-out
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setPlayerVolume(from + (to - from) * e);
      if (p < 1 || volTarget !== to) {
        volRaf = requestAnimationFrame(step);
      } else {
        volRaf = 0;
        setPlayerVolume(volTarget);
      }
    }
    volRaf = requestAnimationFrame(step);
  }

  function applyVolume() {
    animateVolumeTo(targetVolume());
  }

  function setDuck(reason, on) {
    var before = targetVolume();
    if (on) duckReasons[reason] = true;
    else delete duckReasons[reason];
    var after = targetVolume();
    if (before !== after) applyVolume();
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
    stopTimeHeartbeat();
    // Park early-boot audio outside the host so clearing host doesn't kill it
    var early = document.getElementById("cosgral-music-early");
    if (early) {
      try {
        if (early.parentNode) early.parentNode.removeChild(early);
        document.documentElement.appendChild(early);
      } catch (ePark) {}
      window.__cosgralEarlyAudio = early;
    }
    if (audioEl && audioEl.id === "cosgral-music-early") {
      audioEl = null;
    } else if (audioEl) {
      try {
        audioEl.pause();
        audioEl.removeAttribute("src");
        audioEl.load();
        if (audioEl.parentNode) audioEl.parentNode.removeChild(audioEl);
      } catch (eD1) {}
      audioEl = null;
    }
    if (ytPlayer) {
      try {
        if (typeof ytPlayer.destroy === "function") ytPlayer.destroy();
      } catch (eD2) {}
      ytPlayer = null;
      ytReady = false;
    }
    var mount = document.getElementById("site-music-yt");
    if (mount) {
      try {
        mount.remove();
      } catch (eM) {}
    }
    var host = document.getElementById("site-music-host");
    if (host) host.innerHTML = "";
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

  function startTimeHeartbeat() {
    stopTimeHeartbeat();
    timeTimer = window.setInterval(persistTime, 2500);
  }

  function stopTimeHeartbeat() {
    if (timeTimer) {
      clearInterval(timeTimer);
      timeTimer = 0;
    }
  }

  function adoptEarlyAudio(t) {
    var early = window.__cosgralEarlyAudio || document.getElementById("cosgral-music-early");
    if (!early || !t || !t.audio) return null;
    if (early.dataset.trackId && early.dataset.trackId !== t.id) return null;
    return early;
  }

  function mountTrack(thenPlay, opts) {
    opts = opts || {};
    var fromStart = !!opts.fromStart;
    if (fromStart) clearSavedTime();

    var t = track();
    var shouldAuto = !!(thenPlay || wantPlay);
    var host = ensureHost();

    if (t.audio) {
      var early = !fromStart ? adoptEarlyAudio(t) : null;
      if (fromStart) {
        // Manual skip — discard early element so we truly restart at 0:00
        var stale = window.__cosgralEarlyAudio || document.getElementById("cosgral-music-early");
        if (stale) {
          try {
            stale.pause();
            if (stale.parentNode) stale.parentNode.removeChild(stale);
          } catch (eStale) {}
          window.__cosgralEarlyAudio = null;
          window.__cosgralEarlyPlaying = false;
        }
      }
      if (early) {
        // Reuse already-playing element — seamless across subpages
        audioEl = early;
        if (audioEl.parentNode !== host) host.appendChild(audioEl);
        window.__cosgralEarlyAudio = audioEl;
        setPlayerVolume(targetVolume());
        if (!audioEl.paused && !audioEl.ended) {
          unlocked = true;
          gestureArmed = false;
          markMediaEngaged();
          startTimeHeartbeat();
          refreshUi();
          applyVolume();
          return;
        }
        if (shouldAuto) playCurrent({ fromStart: fromStart });
        return;
      }

      destroyPlayers();
      host = ensureHost();
      audioEl = document.createElement("audio");
      audioEl.loop = true;
      audioEl.preload = "auto";
      audioEl.autoplay = !!shouldAuto;
      audioEl.setAttribute("playsinline", "");
      audioEl.setAttribute("webkit-playsinline", "");
      audioEl.dataset.trackId = t.id;
      audioEl.src = assetPath(t.audio);
      host.appendChild(audioEl);
      setPlayerVolume(targetVolume());
      if (!fromStart && savedTime > 1) {
        audioEl.addEventListener(
          "loadedmetadata",
          function () {
            seekToSaved();
          },
          { once: true }
        );
      } else {
        audioEl.addEventListener(
          "loadedmetadata",
          function () {
            try {
              audioEl.currentTime = 0;
            } catch (e0) {}
          },
          { once: true }
        );
      }
      if (shouldAuto) playCurrent({ fromStart: fromStart });
      return;
    }

    // YouTube path — tear down early HTML5 if switching away
    destroyPlayers();
    if (window.__cosgralEarlyAudio) {
      try {
        window.__cosgralEarlyAudio.pause();
        if (window.__cosgralEarlyAudio.parentNode) {
          window.__cosgralEarlyAudio.parentNode.removeChild(window.__cosgralEarlyAudio);
        }
      } catch (eEarly) {}
      window.__cosgralEarlyAudio = null;
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
          autoplay: shouldAuto ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          loop: 1,
          playlist: t.youtube,
          start: !fromStart && savedTime > 1 ? Math.floor(savedTime) : 0,
        },
        events: {
          onReady: function () {
            ytReady = true;
            setPlayerVolume(targetVolume());
            if (fromStart) seekToStart();
            else seekToSaved();
            if (shouldAuto) playCurrent({ fromStart: fromStart });
          },
          onStateChange: function (ev) {
            if (ev.data === 1) {
              unlocked = true;
              gestureArmed = false;
              markMediaEngaged();
              startTimeHeartbeat();
              refreshUi();
              applyVolume();
            }
            if (ev.data === 2) {
              persistTime();
            }
            if (ev.data === 0 && wantPlay) {
              try {
                ytPlayer.seekTo(0, true);
                ytPlayer.playVideo();
              } catch (e10) {}
            }
          },
          onError: function () {
            unlocked = false;
            refreshUi();
          },
        },
      });
    });
  }

  function playCurrent(opts) {
    opts = opts || {};
    wantPlay = true;
    persistTrackOnly();
    if (!opts.fromStart) persistTime();
    refreshUi();

    if (audioEl) {
      if (opts.fromStart) seekToStart();
      else seekToSaved();
      var p = audioEl.play();
      if (p && p.then) {
        p.then(function () {
          unlocked = true;
          gestureArmed = false;
          markMediaEngaged();
          startTimeHeartbeat();
          refreshUi();
          applyVolume();
        }).catch(function () {
          unlocked = false;
          refreshUi();
          armGestureResume();
        });
      } else {
        unlocked = true;
        gestureArmed = false;
        markMediaEngaged();
        startTimeHeartbeat();
        refreshUi();
      }
      return;
    }

    if (ytPlayer && typeof ytPlayer.playVideo === "function") {
      try {
        if (forceAutoplay || fromNav) {
          // Sticky activation after in-site nav: start muted then unmute
          try {
            ytPlayer.mute();
          } catch (eMute) {}
        }
        ytPlayer.setVolume(Math.round(currentVol));
        if (opts.fromStart) seekToStart();
        else seekToSaved();
        ytPlayer.playVideo();
        window.setTimeout(function () {
          try {
            if (forceAutoplay || fromNav) {
              try {
                ytPlayer.unMute();
                ytPlayer.setVolume(Math.round(targetVolume()));
              } catch (eUnmute) {}
            } else {
              ytPlayer.unMute();
            }
            if (ytPlayer.getPlayerState && ytPlayer.getPlayerState() === 1) {
              unlocked = true;
              gestureArmed = false;
              markMediaEngaged();
              startTimeHeartbeat();
              refreshUi();
            } else if (wantPlay && !unlocked) {
              armGestureResume();
              refreshUi();
            }
          } catch (e11) {
            armGestureResume();
          }
        }, forceAutoplay || fromNav ? 180 : 600);
      } catch (e12) {
        unlocked = false;
        refreshUi();
        armGestureResume();
      }
      return;
    }

    mountTrack(true, opts);
  }

  function pauseCurrent() {
    wantPlay = false;
    persistTime();
    persist();
    stopTimeHeartbeat();
    if (audioEl) audioEl.pause();
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
      try {
        ytPlayer.pauseVideo();
      } catch (e13) {}
    }
    unlocked = false;
    refreshUi();
  }

  function togglePlay() {
    if (wantPlay && unlocked) pauseCurrent();
    else if (wantPlay && !unlocked) playCurrent();
    else {
      if (!ytPlayer && !audioEl) mountTrack(true);
      else playCurrent();
    }
  }

  function selectTrack(index, autoPlay) {
    if (index < 0 || index >= TRACKS.length) return;
    trackIndex = index;
    // Manual skip / pick must start from 0 — clear BEFORE persist (old player still has time)
    clearSavedTime();
    persistTrackOnly();
    refreshUi();
    mountTrack(!!(autoPlay || wantPlay), { fromStart: true });
  }

  function nextTrack(autoPlay) {
    selectTrack((trackIndex + 1) % TRACKS.length, autoPlay);
  }

  function syncOverlayDucks() {
    // Only mega menu + popups (service panel / chat) — NOT section changes
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
    if (overlay) obs.observe(overlay, { attributes: true, attributeFilter: ["class"] });

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

  function markMediaEngaged() {
    try {
      sessionStorage.setItem("cosgral-music-engaged", "1");
    } catch (eEng) {}
  }

  function wasMediaEngaged() {
    try {
      return sessionStorage.getItem("cosgral-music-engaged") === "1";
    } catch (eEng2) {
      return false;
    }
  }

  var gestureArmed = false;
  var resumeRetryTimer = 0;

  function tryResumePlayback() {
    if (!wantPlay || unlocked) return false;
    playCurrent();
    return true;
  }

  function armGestureResume() {
    if (gestureArmed || !wantPlay) return;
    gestureArmed = true;

    var resume = function () {
      if (!wantPlay || unlocked) return;
      tryResumePlayback();
    };

    // Lenis hijacks wheel/scroll — native scroll often never fires. Use pointer + Lenis.
    ["pointerdown", "pointerup", "touchstart", "keydown", "mousemove", "wheel"].forEach(function (ev) {
      document.addEventListener(ev, resume, { capture: true, passive: true });
    });
    window.addEventListener("scroll", resume, { capture: true, passive: true });
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") resume();
    });

    if (window.cosgralSmoothScroll?.lenis?.on) {
      try {
        window.cosgralSmoothScroll.lenis.on("scroll", resume);
      } catch (eLenis) {}
    } else {
      // Lenis may boot after music — hook when ready
      window.addEventListener(
        "cosgral:smooth-ready",
        function () {
          try {
            window.cosgralSmoothScroll?.lenis?.on?.("scroll", resume);
          } catch (eLenis2) {}
        },
        { once: true }
      );
    }

    // Retry burst after SPA-like full navigations (MEI window)
    if (resumeRetryTimer) clearInterval(resumeRetryTimer);
    var tries = 0;
    resumeRetryTimer = window.setInterval(function () {
      tries += 1;
      if (unlocked || !wantPlay || tries > 24) {
        clearInterval(resumeRetryTimer);
        resumeRetryTimer = 0;
        return;
      }
      tryResumePlayback();
    }, fromNav || wasMediaEngaged() ? 120 : 280);
  }

  ensureCss();
  buildUi();
  watchDom();
  syncOverlayDucks();

  // Save position before leaving
  window.addEventListener("pagehide", markNavigatingAway);
  window.addEventListener("beforeunload", markNavigatingAway);
  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a || !wantPlay) return;
      markNavigatingAway();
      // Warm MEI inside the user gesture before page transition
      tryResumePlayback();
    },
    true
  );

  // Auto-resume across subpages when music was on — play immediately, no click needed
  mountTrack(wantPlay || forceAutoplay);
  if (wantPlay || forceAutoplay) {
    wantPlay = true;
    refreshUi();
    var kickPlay = function () {
      if (!wantPlay || unlocked) return;
      playCurrent();
    };
    kickPlay();
    window.setTimeout(kickPlay, 40);
    window.setTimeout(kickPlay, 120);
    window.setTimeout(kickPlay, 280);
    window.setTimeout(kickPlay, 500);
    window.setTimeout(kickPlay, 800);
    window.setTimeout(kickPlay, 1000);
    armGestureResume();
    // Keep trying after subpage entry until playback actually starts (~1s burst)
    if (resumeRetryTimer) clearInterval(resumeRetryTimer);
    var autoTries = 0;
    resumeRetryTimer = window.setInterval(function () {
      autoTries += 1;
      if (unlocked || !wantPlay || autoTries > 12) {
        clearInterval(resumeRetryTimer);
        resumeRetryTimer = 0;
        return;
      }
      playCurrent();
    }, 80);
    window.addEventListener("pageshow", function (ev) {
      if (!wantPlay) return;
      if (ev && ev.persisted) unlocked = false;
      playCurrent();
    });
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
    persistNow: markNavigatingAway,
    isActive: function () {
      return !!wantPlay;
    },
    volume: function () {
      return currentVol;
    },
    isDucked: function () {
      for (var k in duckReasons) if (duckReasons[k]) return true;
      return false;
    }
  };

})();
