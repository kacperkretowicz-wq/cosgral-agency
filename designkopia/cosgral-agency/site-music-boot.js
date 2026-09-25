/**
 * Early sync music boot — starts HTML5 tracks before deferred scripts.
 * Survives subpage navigations via MEI + immediate play(); site-music.js adopts the element.
 */
(function () {
  "use strict";
  try {
    if (localStorage.getItem("cosgral-music-on") !== "1") return;

    var id = localStorage.getItem("cosgral-music-track") || "";
    var AUDIO = {
      "session-01": "assets/music/session-01.mp3",
      "session-02": "assets/music/session-02.mp3",
    };
    var src = AUDIO[id];
    // Keep nav flag warm for YouTube / deferred player
    try {
      sessionStorage.setItem("cosgral-music-nav", String(Date.now()));
    } catch (eNav) {}

    if (!src) return;

    var path = (location.pathname || "").indexOf("/uslugi/") !== -1 ? "../" + src : src;
    var existing = document.getElementById("cosgral-music-early");
    if (existing) {
      window.__cosgralEarlyAudio = existing;
      return;
    }

    var a = document.createElement("audio");
    a.id = "cosgral-music-early";
    a.dataset.trackId = id;
    a.loop = true;
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    a.autoplay = true;
    a.src = path;
    a.volume = 0.58;

    var saved = parseFloat(sessionStorage.getItem("cosgral-music-time") || "0") || 0;
    if (saved > 1) {
      a.addEventListener(
        "loadedmetadata",
        function () {
          try {
            if (a.currentTime < 0.5) a.currentTime = saved;
          } catch (eT) {}
        },
        { once: true }
      );
    }

    (document.documentElement || document.head).appendChild(a);
    window.__cosgralEarlyAudio = a;

    var p = a.play();
    if (p && p.then) {
      p.then(function () {
        window.__cosgralEarlyPlaying = true;
        try {
          sessionStorage.setItem("cosgral-music-engaged", "1");
        } catch (eE) {}
      }).catch(function () {
        window.__cosgralEarlyPlaying = false;
      });
    }
  } catch (e) {}
})();
