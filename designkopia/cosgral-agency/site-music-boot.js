/**
 * Early music boot — starts within ~1s of page load (unless user turned music off).
 * HTML5 tracks play immediately; YouTube API is preloaded for Ghost Cities.
 */
(function () {
  "use strict";
  try {
    var storedOn = null;
    try {
      storedOn = localStorage.getItem("cosgral-music-on");
    } catch (eOn) {}
    if (storedOn === "0") return;

    var id = "";
    try {
      id = localStorage.getItem("cosgral-music-track") || "";
    } catch (eId) {}
    if (!id) id = "ghost-cities";

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
      if (storedOn !== "0") localStorage.setItem("cosgral-music-on", "1");
    } catch (eNav) {}

    var src = AUDIO[id];
    var pathPrefix = (location.pathname || "").indexOf("/uslugi/") !== -1 ? "../" : "";

    window.__cosgralMusicShouldAutoplay = true;

    if (!document.getElementById("cosgral-yt-api-boot")) {
      var ytApi = document.createElement("script");
      ytApi.id = "cosgral-yt-api-boot";
      ytApi.src = "https://www.youtube.com/iframe_api";
      ytApi.async = true;
      (document.head || document.documentElement).appendChild(ytApi);
    }

    if (!src) {
      if (YOUTUBE[id]) window.__cosgralMusicYoutube = YOUTUBE[id];
      return;
    }

    var existing = document.getElementById("cosgral-music-early");
    if (existing) {
      window.__cosgralEarlyAudio = existing;
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
            if (n > 12) clearInterval(timer);
          }, 80);
        });
      }
    };
    kick();
    window.setTimeout(kick, 80);
    window.setTimeout(kick, 250);
    window.setTimeout(kick, 600);
    window.setTimeout(kick, 1000);
    document.addEventListener("DOMContentLoaded", kick, { once: true });
    window.addEventListener("pageshow", kick);
  } catch (e) {}
})();
