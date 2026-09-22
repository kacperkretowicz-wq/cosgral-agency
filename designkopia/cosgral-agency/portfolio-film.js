/**
 * Portfolio FILM — cinematic scrub timeline (5 acts).
 * Ambient + 3D cube stay visible; no blinking logo seed.
 */
(function () {
  "use strict";

  var host = document.getElementById("portfolio-film");
  if (!host || !document.body.classList.contains("portfolio-page--film")) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var viewport = host.querySelector(".portfolio-film__viewport");
  var acts = {
    open: host.querySelector('[data-film-act="open"]'),
    web: host.querySelector('[data-film-act="web"]'),
    reels: host.querySelector('[data-film-act="reels"]'),
    gfx: host.querySelector('[data-film-act="gfx"]'),
    auto: host.querySelector('[data-film-act="auto"]'),
  };

  var openEyebrow = host.querySelector(".film-open__eyebrow");
  var openTitle = host.querySelector("[data-film-open-title]") || host.querySelector(".film-open__title");
  var openLead = host.querySelector("[data-film-open-lead]") || host.querySelector(".film-open__lead");
  var webCards = Array.prototype.slice.call(host.querySelectorAll("[data-web-card]"));
  var webLabel = acts.web && acts.web.querySelector("[data-film-label]");
  var reelsOverlay = host.querySelector("[data-montaz-overlay]");
  var gfxStage = host.querySelector(".film-gfx-stage");
  var autoTitle = host.querySelector("[data-film-auto-title]");
  var autoBody = host.querySelector("[data-film-auto-body]");
  var autoCards = Array.prototype.slice.call(host.querySelectorAll(".film-auto-grid .portfolio-case-card"));

  var pinST = null;
  var lastAct = "";
  var webVideosOn = false;
  var navigating = false;

  /* Wider bands = slower, more cinematic pacing */
  var BAND = {
    openEnd: 0.14,
    webEnd: 0.38,
    reelsEnd: 0.58,
    gfxEnd: 0.8,
    autoEnd: 1,
  };

  function easeName(fallback) {
    if (window.CustomEase && gsap.parseEase && gsap.parseEase("filmSoft")) return "filmSoft";
    return fallback || "power3.inOut";
  }

  function clamp01(n) {
    return Math.max(0, Math.min(1, n));
  }

  function remap(p, a, b) {
    return clamp01((p - a) / Math.max(0.0001, b - a));
  }

  function smooth(t) {
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }

  function smoother(t) {
    t = clamp01(t);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function expoOut(t) {
    t = clamp01(t);
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function setAct(name, on, opacity) {
    var el = acts[name];
    if (!el) return;
    var op = on ? (opacity != null ? opacity : 1) : 0;
    var show = on && op > 0.015;
    el.classList.toggle("is-active", show);
    el.setAttribute("aria-hidden", show ? "false" : "true");
    gsap.set(el, {
      autoAlpha: op,
      visibility: show ? "visible" : "hidden",
    });
    if (!show && name === "gfx") {
      var ov = el.querySelector(".graphics-stage__overlay");
      if (ov) {
        ov.classList.remove("is-on");
        gsap.set(ov, { autoAlpha: 0, visibility: "hidden" });
      }
      if (gfxStage) gsap.set(gfxStage, { clearProps: "transform" });
    }
  }

  function soloAct(name, opacity) {
    Object.keys(acts).forEach(function (k) {
      if (k === name) setAct(k, true, opacity != null ? opacity : 1);
      else setAct(k, false, 0);
    });
  }

  function crossfade(fromName, toName, t) {
    var e = smoother(t);
    if (t < 0.02) {
      setAct(fromName, true, 1);
      setAct(toName, false, 0);
      return;
    }
    if (t > 0.98) {
      setAct(fromName, false, 0);
      setAct(toName, true, 1);
      return;
    }
    setAct(fromName, true, 1 - e);
    setAct(toName, true, e);
  }

  function syncWorld(p, act) {
    var sand = 1;
    var ambient = 1;
    var cube = 1;
    if (act === "open") {
      sand = 1;
      ambient = 1;
      cube = 1;
    } else if (act === "web") {
      sand = 0.92;
      ambient = 0.88;
      cube = 0.72;
    } else if (act === "reels") {
      sand = 0.55;
      ambient = 0.7;
      cube = 0.35;
    } else if (act === "gfx") {
      sand = 0.4;
      ambient = 0.55;
      cube = 0.55;
    } else if (act === "auto") {
      sand = 0.75;
      ambient = 0.82;
      cube = 0.8;
    }
    document.body.style.setProperty("--film-sand-op", String(sand));
    document.body.style.setProperty("--film-ambient-dim", String(ambient));
    document.body.style.setProperty("--film-cube-op", String(cube));
    if (window.cosgralCube && typeof window.cosgralCube.setFilmProgress === "function") {
      window.cosgralCube.setFilmProgress(p, act);
    }
  }

  function playWebVideos() {
    if (webVideosOn) return;
    webVideosOn = true;
    webCards.forEach(function (card) {
      var video = card.querySelector("video");
      if (!video) return;
      if (window.CosgralPortfolioVideo) {
        window.CosgralPortfolioVideo.register(video);
        window.CosgralPortfolioVideo.play(video);
      } else {
        var playPromise = video.play();
        if (playPromise && playPromise.catch) playPromise.catch(function () {});
      }
    });
  }

  function pauseWebVideos() {
    webVideosOn = false;
    if (window.CosgralPortfolioVideo && acts.web) {
      window.CosgralPortfolioVideo.pauseAllIn(acts.web);
    }
  }

  function poseOpen(local) {
    var e = smoother(local);
    var titleIn = smoother(clamp01(e / 0.42));
    var titleOut = e > 0.72 ? smoother((e - 0.72) / 0.28) : 0;
    var titleOp = titleIn * (1 - titleOut);
    var leadIn = smoother(clamp01((e - 0.22) / 0.35));
    var leadOut = e > 0.78 ? smoother((e - 0.78) / 0.22) : 0;
    var browIn = smoother(clamp01((e - 0.08) / 0.25));

    if (openEyebrow) {
      gsap.set(openEyebrow, {
        autoAlpha: browIn * (1 - titleOut),
        y: (1 - browIn) * 16,
        letterSpacing: (0.42 - browIn * 0.08) + "em",
      });
    }
    if (openTitle) {
      gsap.set(openTitle, {
        autoAlpha: titleOp,
        y: (1 - titleIn) * 48 - titleOut * 30,
        scale: 0.88 + titleIn * 0.12 + titleOut * 0.08,
        filter: "blur(" + ((1 - titleIn) * 10 + titleOut * 6).toFixed(2) + "px)",
        letterSpacing: (-0.04 - titleOut * 0.02) + "em",
      });
    }
    if (openLead) {
      gsap.set(openLead, {
        autoAlpha: leadIn * (1 - leadOut),
        y: (1 - leadIn) * 22,
      });
    }
  }

  function poseWebCards(local) {
    var e = smoother(local);
    /* Hold empty space briefly, then cards arrive one-by-one from deep Z */
    var arrive = smoother(clamp01((e - 0.08) / 0.82));
    webCards.forEach(function (card, i) {
      var stagger = smoother(clamp01((arrive - i * 0.14) / 0.62));
      var inv = 1 - stagger;
      var side = i === 0 ? -1 : i === 1 ? 1 : 0;
      var deep = MOBILE ? 1 : 1.15;
      gsap.set(card, {
        autoAlpha: stagger > 0.02 ? stagger : 0,
        x: side * (MOBILE ? 56 : 140) * inv,
        y: (i === 2 ? 70 : -28) * inv + Math.sin(arrive * Math.PI) * (i === 1 ? -8 : 4),
        z: (MOBILE ? -160 : -520) * inv * deep,
        rotationY: side * (MOBILE ? 18 : 42) * inv,
        rotationX: (MOBILE ? 14 : 34) * inv,
        rotationZ: side * (MOBILE ? 4 : 10) * inv,
        scale: 0.42 + stagger * 0.58,
        transformPerspective: 1400,
        force3D: true,
      });
    });
    if (webLabel) {
      var lab = smoother(clamp01((arrive - 0.55) / 0.4));
      gsap.set(webLabel, { autoAlpha: lab, y: (1 - lab) * 18, letterSpacing: (0.28 - lab * 0.04) + "em" });
    }
    if (arrive > 0.4) playWebVideos();
    else pauseWebVideos();
  }

  function poseReels(local) {
    /* Extra ease so zoom-out feels like a dolly, not a scrub jump */
    var e = expoOut(smoother(local));
    var api = window.cosgralReelsCinema;
    if (api && typeof api.setProgress === "function") {
      api.setProgress(e);
      return;
    }
    if (reelsOverlay) {
      var amt = e > 0.82 ? clamp01((e - 0.82) / 0.18) : 0;
      reelsOverlay.classList.toggle("is-on", amt > 0.05);
      gsap.set(reelsOverlay, { autoAlpha: amt, y: (1 - amt) * 28, scale: 0.92 + amt * 0.08 });
    }
  }

  function poseGfx(local) {
    var e = smoother(local);
    /* Hold dark beat → cinema scrub → endcard linger */
    var cinemaP;
    if (e < 0.12) cinemaP = 0;
    else if (e < 0.78) cinemaP = smoother((e - 0.12) / 0.66);
    else cinemaP = 1;

    var api = window.cosgralGraphicsCinema;
    if (api && typeof api.setProgress === "function") {
      api.setProgress(cinemaP);
    }

    if (gfxStage) {
      var tilt = (1 - cinemaP) * (MOBILE ? 4 : 10);
      var pull = (1 - cinemaP) * (MOBILE ? 40 : 120);
      var orbit = Math.sin(cinemaP * Math.PI) * (MOBILE ? 2 : 5);
      gsap.set(gfxStage, {
        rotationX: tilt,
        rotationY: orbit,
        z: -pull,
        scale: 0.94 + cinemaP * 0.06,
        transformPerspective: 1600,
        force3D: true,
      });
    }
  }

  function poseAuto(local) {
    var e = smoother(local);
    var titlePhase = smoother(clamp01(e / 0.32));
    var titleExit = e > 0.26 ? smoother(clamp01((e - 0.26) / 0.3)) : 0;
    var bodyPhase = smoother(clamp01((e - 0.18) / 0.55));

    if (autoTitle) {
      var tOp = titlePhase * (1 - titleExit * 0.98);
      gsap.set(autoTitle, {
        autoAlpha: tOp,
        scale: 1.45 - titlePhase * 0.45 + titleExit * 0.3,
        z: (1 - titlePhase) * -320 + titleExit * 100,
        filter: "blur(" + (titleExit * 10).toFixed(2) + "px)",
        force3D: true,
      });
    }
    if (autoBody) {
      gsap.set(autoBody, {
        autoAlpha: bodyPhase,
        y: (1 - bodyPhase) * 28,
        z: (1 - bodyPhase) * -60,
      });
    }
    autoCards.forEach(function (card, i) {
      var st = smoother(clamp01((bodyPhase - i * 0.09) / 0.58));
      var inv = 1 - st;
      var side = i % 2 === 0 ? -1 : 1;
      gsap.set(card, {
        autoAlpha: st,
        x: side * (MOBILE ? 28 : 64) * inv,
        y: (70 + i * 10) * inv,
        z: (MOBILE ? -100 : -340) * inv,
        rotationY: side * (MOBILE ? 14 : 30) * inv,
        rotationX: (MOBILE ? 12 : 28) * inv,
        scale: 0.8 + st * 0.2,
        transformPerspective: 1200,
        force3D: true,
      });
    });
  }

  function applyProgress(p) {
    if (!window.gsap) return;

    if (p < BAND.openEnd) {
      var o = remap(p, 0, BAND.openEnd);
      soloAct("open", 1);
      poseOpen(o);
      pauseWebVideos();
      syncWorld(p, "open");
      lastAct = "open";
      return;
    }

    if (p < BAND.webEnd) {
      var w = remap(p, BAND.openEnd, BAND.webEnd);
      if (w < 0.28) {
        crossfade("open", "web", w / 0.28);
        setAct("reels", false);
        setAct("gfx", false);
        setAct("auto", false);
        poseOpen(1);
        poseWebCards(0);
      } else {
        soloAct("web", 1);
        poseWebCards((w - 0.28) / 0.72);
      }
      syncWorld(p, "web");
      lastAct = "web";
      return;
    }

    if (p < BAND.reelsEnd) {
      var r = remap(p, BAND.webEnd, BAND.reelsEnd);
      if (r < 0.26) {
        crossfade("web", "reels", r / 0.26);
        setAct("open", false);
        setAct("gfx", false);
        setAct("auto", false);
        poseWebCards(1);
        poseReels(0);
        if (r > 0.12) pauseWebVideos();
      } else {
        soloAct("reels", 1);
        pauseWebVideos();
        poseReels((r - 0.26) / 0.74);
      }
      syncWorld(p, "reels");
      lastAct = "reels";
      return;
    }

    if (p < BAND.gfxEnd) {
      var g = remap(p, BAND.reelsEnd, BAND.gfxEnd);
      if (g < 0.22) {
        crossfade("reels", "gfx", g / 0.22);
        setAct("open", false);
        setAct("web", false);
        setAct("auto", false);
        poseReels(1);
        poseGfx(0);
      } else {
        soloAct("gfx", 1);
        poseGfx((g - 0.22) / 0.78);
      }
      syncWorld(p, "gfx");
      lastAct = "gfx";
      return;
    }

    var a = remap(p, BAND.gfxEnd, BAND.autoEnd);
    if (a < 0.2) {
      crossfade("gfx", "auto", a / 0.2);
      setAct("open", false);
      setAct("web", false);
      setAct("reels", false);
      poseGfx(1);
      poseAuto(0);
    } else {
      soloAct("auto", 1);
      poseAuto((a - 0.2) / 0.8);
    }
    syncWorld(p, "auto");
    lastAct = "auto";
  }

  function bindWebClickZoom() {
    if (REDUCED || !window.gsap) return;
    webCards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (navigating || lastAct !== "web") return;
        var href = card.getAttribute("href");
        if (!href) return;
        e.preventDefault();
        navigating = true;
        var others = webCards.filter(function (c) {
          return c !== card;
        });
        gsap.to(others, {
          autoAlpha: 0,
          scale: 0.82,
          z: -120,
          filter: "blur(8px)",
          duration: 0.55,
          ease: easeName("power3.in"),
        });
        gsap.to(card, {
          scale: MOBILE ? 1.18 : 1.38,
          z: MOBILE ? 60 : 180,
          duration: 0.65,
          ease: easeName("power4.in"),
          onComplete: function () {
            window.location.href = href;
          },
        });
      });
    });
  }

  function bindWebTilt() {
    if (REDUCED || MOBILE || !FINE || !window.gsap) return;
    webCards.forEach(function (card) {
      card.addEventListener("pointermove", function (ev) {
        if (lastAct !== "web" || navigating) return;
        var rect = card.getBoundingClientRect();
        var nx = (ev.clientX - rect.left) / rect.width - 0.5;
        var ny = (ev.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotationY: nx * 14,
          rotationX: -ny * 11,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
      card.addEventListener("pointerleave", function () {
        gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.7, ease: "power3.out", overwrite: "auto" });
      });
    });
  }

  function deepLinkProgress() {
    var hash = (location.hash || "").replace("#", "");
    var map = {
      strony: BAND.openEnd + 0.16,
      montaz: BAND.webEnd + 0.16,
      grafiki: BAND.reelsEnd + 0.22,
      automatyzacje: BAND.gfxEnd + 0.28,
      "automatyzacje-intro": BAND.gfxEnd + 0.1,
    };
    return map[hash];
  }

  function init() {
    document.body.classList.remove("is-portfolio-intro-pending");
    document.body.classList.add("is-portfolio-film");

    if (REDUCED || !window.gsap || !window.ScrollTrigger) {
      Object.keys(acts).forEach(function (k) {
        setAct(k, true, 1);
      });
      poseOpen(1);
      poseWebCards(1);
      poseReels(1);
      poseGfx(1);
      poseAuto(1);
      document.body.classList.add("is-portfolio-film-reduced");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    Object.keys(acts).forEach(function (k) {
      setAct(k, k === "open", k === "open" ? 1 : 0);
    });
    poseOpen(0);

    bindWebClickZoom();
    bindWebTilt();

    if (window.cosgralCube && typeof window.cosgralCube.enableFilmMode === "function") {
      window.cosgralCube.enableFilmMode();
    }

    var pinEnd = MOBILE ? "+=920%" : "+=1300%";

    pinST = ScrollTrigger.create({
      id: "portfolio-film-pin",
      trigger: host,
      start: "top top",
      end: pinEnd,
      pin: viewport,
      pinSpacing: true,
      scrub: MOBILE ? 1.05 : 1.45,
      anticipatePin: 0.45,
      invalidateOnRefresh: true,
      refreshPriority: 2,
      onUpdate: function (self) {
        applyProgress(self.progress);
        if (window.cosgralFilmRail && window.cosgralFilmRail.sync) {
          window.cosgralFilmRail.sync(self.progress);
        }
      },
      onRefresh: function (self) {
        applyProgress(self.progress || 0);
      },
    });

    window.cosgralPortfolioFilm = {
      getProgress: function () {
        return pinST ? pinST.progress : 0;
      },
      getPin: function () {
        return pinST;
      },
      BAND: BAND,
      scrollToAct: function (actId) {
        if (!pinST) return;
        var targets = {
          open: 0.04,
          web: BAND.openEnd + 0.14,
          reels: BAND.webEnd + 0.18,
          gfx: BAND.reelsEnd + 0.22,
          auto: BAND.gfxEnd + 0.28,
        };
        var t = targets[actId];
        if (t == null) return;
        var y = pinST.start + (pinST.end - pinST.start) * t;
        var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
        if (lenis && lenis.scrollTo) lenis.scrollTo(y, { duration: 1.45 });
        else window.scrollTo({ top: y, behavior: "smooth" });
      },
    };

    var linkP = deepLinkProgress();
    if (linkP != null) {
      requestAnimationFrame(function () {
        ScrollTrigger.refresh();
        var y = pinST.start + (pinST.end - pinST.start) * linkP;
        var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
        if (lenis && lenis.scrollTo) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
        applyProgress(linkP);
      });
    } else {
      applyProgress(0);
      syncWorld(0, "open");
    }

    ScrollTrigger.refresh();
    window.addEventListener("load", function () {
      ScrollTrigger.refresh();
      if (window.cosgralCube && typeof window.cosgralCube.enableFilmMode === "function") {
        window.cosgralCube.enableFilmMode();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
