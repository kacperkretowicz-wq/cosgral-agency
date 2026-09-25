/**
 * Early music boot — resumes playback as soon as the next subpage starts.
 * HTML5 tracks play immediately; YouTube is marked for deferred site-music.js.
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
    var YOUTUBE = {
      "ghost-cities": "asn93p_UtXE",
    };

    try {
      sessionStorage.setItem("cosgral-music-nav", String(Date.now()));
      sessionStorage.setItem("cosgral-music-engaged", "1");
      sessionStorage.setItem("cosgral-music-autoplay", "1");
    } catch (eNav) {}

    var src = AUDIO[id];
    var pathPrefix = (location.pathname || "").indexOf("/uslugi/") !== -1 ? "../" : "";

    if (!src) {
      // YouTube / unknown — site-music.js autoplays from the nav flag
      window.__cosgralMusicShouldAutoplay = true;
      if (YOUTUBE[id]) window.__cosgralMusicYoutube = YOUTUBE[id];
      return;
    }

    var existing = document.getElementById("cosgral-music-early");
    if (existing) {
      window.__cosgralEarlyAudio = existing;
      window.__cosgralMusicShouldAutoplay = true;
      try {
        var pExist = existing.play();
        if (pExist && pExist.then) {
          pExist
            .then(function () {
              window.__cosgralEarlyPlaying = true;
            })
            .catch(function () {
              window.__cosgralEarlyPlaying = false;
            });
        }
      } catch (ePlayExist) {}
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
    a.src = pathPrefix + src;
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
    window.__cosgralMusicShouldAutoplay = true;

    var kick = function () {
      var p = a.play();
      if (p && p.then) {
        p.then(function () {
          window.__cosgralEarlyPlaying = true;
          try {
            sessionStorage.setItem("cosgral-music-engaged", "1");
          } catch (eE) {}
        }).catch(function () {
          window.__cosgralEarlyPlaying = false;
          // Retry a few times — sticky activation after in-site navigation
          var n = 0;
          var timer = window.setInterval(function () {
            n += 1;
            var again = a.play();
            if (again && again.then) {
              again
                .then(function () {
                  window.__cosgralEarlyPlaying = true;
                  clearInterval(timer);
                })
                .catch(function () {});
            }
            if (n > 20) clearInterval(timer);
          }, 100);
        });
      }
    };
    kick();
    document.addEventListener("DOMContentLoaded", kick, { once: true });
    window.addEventListener("pageshow", kick);
  } catch (e) {}
})();
