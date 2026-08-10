/**
 * Animacja nurkowania w kafelek usługi + ripple wody.
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DIVE_KEY = "cosgral-service-dive";
  var SESSION_KEY = "cosgral-page-transition";
  var diving = false;

  function themeFromHref(href) {
    return window.cosgralServiceThemes?.fromHref?.(href) || null;
  }

  function themeData(id) {
    return window.cosgralServiceThemes?.themes?.[id] || null;
  }

  function drawRipple(canvas, color, progress) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = canvas.width;
    var h = canvas.height;
    var cx = w * 0.5;
    var cy = h * 0.5;
    ctx.clearRect(0, 0, w, h);

    var rings = 5;
    for (var i = 0; i < rings; i++) {
      var t = progress + i * 0.14;
      var r = (t % 1.2) * Math.max(w, h) * 0.55;
      var alpha = Math.max(0, 0.42 - (t % 1.2) * 0.38);
      if (alpha <= 0) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = color.replace(/[\d.]+\)$/, alpha + ")");
      if (color.indexOf("rgba") === -1) {
        ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
      }
      ctx.lineWidth = Math.max(1, 3 - i * 0.4);
      ctx.stroke();
    }

    var splash = Math.min(1, progress * 2.5);
    if (splash > 0) {
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.35 * splash);
      grad.addColorStop(0, "rgba(255,255,255," + (0.18 * (1 - splash)) + ")");
      grad.addColorStop(0.4, "rgba(255,255,255,0.04)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function runRipple(canvas, color, duration, onDone) {
    var start = performance.now();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
    resize();
    function frame(now) {
      var p = Math.min(1, (now - start) / duration);
      drawRipple(canvas, color, p);
      if (p < 1) requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
  }

  function playDive(card, href) {
    if (diving || REDUCED) {
      window.location.href = href;
      return;
    }

    var themeId = themeFromHref(href);
    var theme = themeData(themeId);
    if (!theme) {
      if (window.cosgralPageTransition?.navigate) {
        window.cosgralPageTransition.navigate(href);
      } else {
        window.location.href = href;
      }
      return;
    }

    diving = true;
    var rect = card.getBoundingClientRect();

    var overlay = document.createElement("div");
    overlay.className = "service-dive";
    overlay.style.setProperty("--dive-bg", theme.bg);

    var portal = document.createElement("div");
    portal.className = "service-dive__portal";
    portal.style.left = rect.left + "px";
    portal.style.top = rect.top + "px";
    portal.style.width = rect.width + "px";
    portal.style.height = rect.height + "px";

    var media = card.querySelector(".services-fan__card-media");
    if (media) {
      var clone = media.cloneNode(true);
      var video = clone.querySelector("video");
      if (video) {
        video.muted = true;
        video.play().catch(function () {});
      }
      portal.appendChild(clone);
    }

    var fill = document.createElement("div");
    fill.className = "service-dive__fill";

    var ripple = document.createElement("canvas");
    ripple.className = "service-dive__ripple";

    overlay.appendChild(fill);
    overlay.appendChild(ripple);
    overlay.appendChild(portal);
    document.body.appendChild(overlay);

    sessionStorage.setItem(DIVE_KEY, themeId);
    sessionStorage.removeItem(SESSION_KEY);

    requestAnimationFrame(function () {
      overlay.classList.add("is-expanding");
      runRipple(ripple, theme.ripple, 640);
    });

    window.setTimeout(function () {
      overlay.classList.add("is-sinking");
    }, 480);

    window.setTimeout(function () {
      window.location.href = href;
    }, 640);
  }

  function revealPage() {
    document.documentElement.classList.remove("is-service-dive-enter");
    document.documentElement.classList.add("service-dive-ready");
  }

  function playEnter() {
    var themeId = sessionStorage.getItem(DIVE_KEY);
    if (!themeId) return false;
    sessionStorage.removeItem(DIVE_KEY);
    revealPage();

    if (REDUCED) return true;

    var theme = themeData(themeId);
    if (!theme) return true;

    window.cosgralServiceThemes?.apply?.(themeId);

    var overlay = document.createElement("div");
    overlay.className = "service-dive-enter";
    overlay.style.setProperty("--service-bg", theme.bg);

    var ripple = document.createElement("canvas");
    ripple.className = "service-dive-enter__ripple";
    overlay.appendChild(ripple);
    document.body.appendChild(overlay);

    document.documentElement.classList.remove("is-page-enter");
    runRipple(ripple, theme.ripple, 520, function () {
      overlay.classList.add("is-revealing");
      window.setTimeout(function () {
        overlay.remove();
      }, 560);
    });

    return true;
  }

  function bootEnter() {
    if (!document.body || !document.body.classList.contains("service-page")) return;
    if (!playEnter()) revealPage();
  }

  function bindHomeCards() {
    if (!document.body.classList.contains("home-page")) return;

    document.addEventListener(
      "click",
      function (e) {
        if (diving || REDUCED) return;
        var card = e.target.closest(".services-fan__card.is-active");
        if (!card) return;
        var href = card.getAttribute("href");
        if (!href || href.indexOf("uslugi/") === -1) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        playDive(card, href);
      },
      true
    );
  }

  window.cosgralServiceDive = {
    playEnter: playEnter,
    playDive: playDive,
  };

  if (document.body) {
    bindHomeCards();
    bootEnter();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      bindHomeCards();
      bootEnter();
    });
  }
})();
