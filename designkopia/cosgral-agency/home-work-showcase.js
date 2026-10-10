/**
 * Homepage #realizacje — one static bento, scrolled as a camera.
 * The board (title, intro, four tiles, portfolio link) stays put.
 * Scroll pins the section and applies a single scale+translate so the
 * view zooms from the full overview into each tile, holds, then zooms
 * back out. Reduced motion leaves the authored grid.
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot() {
    if (window.__workShowcaseBooted) return;
    window.__workShowcaseBooted = true;
    if (REDUCED) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    init();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function titleWords(title) {
    if (!title) return "Wybrane realizacje";
    var words = title.querySelectorAll(".reveal-word");
    if (words.length) {
      return Array.prototype.map
        .call(words, function (word) {
          return word.textContent.trim();
        })
        .filter(Boolean)
        .join(" ");
    }
    return title.textContent.replace(/\s+/g, " ").trim() || "Wybrane realizacje";
  }

  function unwrapTilt(panel) {
    var layer = panel.querySelector(":scope > .home-tilt-layer");
    if (!layer) return;
    var face = layer.querySelector(":scope > .home-tilt-face") || layer;
    while (face.firstChild) panel.insertBefore(face.firstChild, layer);
    panel.removeChild(layer);
  }

  /* Overview hold, then each tile, then back out. Equal values are holds. */
  var BEATS = [
    { t: 0, focus: -1 },
    { t: 0.1, focus: -1 },
    { t: 0.24, focus: 0 },
    { t: 0.38, focus: 0 },
    { t: 0.5, focus: 1 },
    { t: 0.6, focus: 1 },
    { t: 0.7, focus: 2 },
    { t: 0.8, focus: 2 },
    { t: 0.88, focus: 3 },
    { t: 0.94, focus: 3 },
    { t: 1, focus: -1 },
  ];

  function init() {
    var section = document.getElementById("realizacje");
    if (!section || section.classList.contains("is-work-showcase")) return;
    var panel = section.querySelector(".home-scene__panel");
    if (!panel) return;

    unwrapTilt(panel);

    var pin = panel.querySelector(".home-work__pin");
    if (!pin) {
      pin = document.createElement("div");
      pin.className = "home-work__pin";
      while (panel.firstChild) pin.appendChild(panel.firstChild);
      panel.appendChild(pin);
    }

    var board = pin.querySelector(".home-work__board");
    if (!board) {
      board = document.createElement("div");
      board.className = "home-work__board";
      while (pin.firstChild) board.appendChild(pin.firstChild);
      pin.appendChild(board);
    }

    var cards = Array.prototype.slice.call(board.querySelectorAll(".home-work__card"));
    if (cards.length < 4) return;

    var title = board.querySelector(".home-work__title");
    var head = board.querySelector(".home-work__head");
    var footer = board.querySelector(".home-work__footer");

    cards.forEach(function (card) {
      card.removeAttribute("data-enter");
    });
    if (footer) footer.removeAttribute("data-enter");
    if (head) head.removeAttribute("data-enter");
    if (title) {
      gsap.killTweensOf(title.querySelectorAll(".reveal-word, .reveal-word > span"));
      gsap.set(title.querySelectorAll(".reveal-word, .reveal-word > span"), { clearProps: "all" });
    }

    var cover = ScrollTrigger.getById("scene-realizacje-cover");
    if (cover) cover.kill();
    gsap.set(panel, { clearProps: "transform,filter,opacity,visibility" });
    gsap.killTweensOf(cards);
    gsap.set(cards, { clearProps: "opacity,visibility,transform,filter,x,y" });
    if (head) {
      gsap.killTweensOf(head);
      gsap.set(head, { clearProps: "opacity,visibility,transform,filter,x,y" });
    }
    if (footer) {
      gsap.killTweensOf(footer);
      gsap.set(footer, { clearProps: "opacity,visibility,transform,filter,x,y" });
    }

    var camTitle = pin.querySelector(".home-work__cam-title");
    if (!camTitle) {
      camTitle = document.createElement("div");
      camTitle.className = "home-work__cam-title";
      camTitle.setAttribute("aria-hidden", "true");
      var camText = document.createElement("span");
      camText.textContent = titleWords(title);
      var camSup = document.createElement("sup");
      camSup.textContent = "(04)";
      camTitle.appendChild(camText);
      camTitle.appendChild(camSup);
      pin.appendChild(camTitle);
    }

    section.classList.add("is-work-showcase");

    var tileRects = [];
    var overviewPose = { s: 1, tx: 0, ty: 0 };
    var tilePoses = [];
    var pinW = 1;
    var pinH = 1;
    var currentP = 0;

    function isMobile() {
      return window.matchMedia("(max-width: 900px)").matches;
    }

    function chrome() {
      var mobile = isMobile();
      return {
        top: mobile ? 64 : 72,
        bottom: mobile ? 52 : 58,
        side: Math.round(pinW * (mobile ? 0.05 : 0.07)),
      };
    }

    function frameOverview() {
      var boardW = board.offsetWidth || pinW;
      var boardH = board.offsetHeight || pinH;
      var s = Math.min(pinW / boardW, pinH / boardH);
      if (s > 1) s = 1;
      return {
        s: s,
        tx: (pinW - boardW * s) / 2,
        ty: (pinH - boardH * s) / 2,
      };
    }

    /* Whole tile stays visible: about 86% of the pin width, centered
       in the safe area, so neighbours remain around it. */
    function frameTile(rect) {
      var ch = chrome();
      var availW = pinW * 0.86;
      var availH = Math.max(40, (pinH - ch.top - ch.bottom) * 0.78);
      var s = Math.min(availW / rect.w, availH / rect.h);
      if (!isFinite(s) || s <= 0) s = 1;
      var cx = rect.x + rect.w / 2;
      var cy = rect.y + rect.h / 2;
      return {
        s: s,
        tx: pinW / 2 - cx * s,
        ty: ch.top + (pinH - ch.top - ch.bottom) / 2 - cy * s,
      };
    }

    function applyPose(pose) {
      gsap.set(board, {
        x: pose.tx,
        y: pose.ty,
        scale: pose.s,
        transformOrigin: "0 0",
        force3D: true,
      });
    }

    /* Read the card back and nudge the translation so its center lands
       in the pin, even if the pin is fixed or the origin was off. */
    function settlePose(focus, pose) {
      applyPose(pose);
      var card = cards[focus];
      if (!card) return pose;
      var pr = pin.getBoundingClientRect();
      var cr = card.getBoundingClientRect();
      var ch = chrome();
      var availH = pinH - ch.top - ch.bottom;
      pose.tx += pr.left + pinW / 2 - (cr.left + cr.width / 2);
      pose.ty += pr.top + ch.top + availH / 2 - (cr.top + cr.height / 2);
      return pose;
    }

    function measure() {
      gsap.set(board, { clearProps: "transform" });
      pinW = pin.clientWidth || window.innerWidth || 1;
      pinH = pin.clientHeight || window.innerHeight || 1;
      var origin = board.getBoundingClientRect();
      tileRects = cards.map(function (card) {
        var r = card.getBoundingClientRect();
        return {
          x: r.left - origin.left,
          y: r.top - origin.top,
          w: Math.max(1, r.width),
          h: Math.max(1, r.height),
        };
      });
      overviewPose = frameOverview();
      tilePoses = tileRects.map(frameTile);
      tilePoses.forEach(function (pose, i) {
        settlePose(i, pose);
      });
      gsap.set(board, { clearProps: "transform" });
      render(currentP);
    }

    function poseFor(focus) {
      if (focus < 0 || !tilePoses[focus]) return overviewPose;
      return tilePoses[focus];
    }

    function segment(p) {
      p = clamp(p, 0, 1);
      var i = 0;
      while (i < BEATS.length - 2 && p > BEATS[i + 1].t) i++;
      var a = BEATS[i];
      var b = BEATS[i + 1];
      var span = b.t - a.t || 1;
      var raw = clamp((p - a.t) / span, 0, 1);
      var held = a.focus === b.focus;
      return { a: a, b: b, e: held ? 0 : easeInOut(raw) };
    }

    function render(p) {
      currentP = clamp(p, 0, 1);
      if (!tilePoses.length) return;
      var seg = segment(currentP);
      var pa = poseFor(seg.a.focus);
      var pb = poseFor(seg.b.focus);
      var e = seg.e;
      var s = lerp(pa.s, pb.s, e);
      var tx = lerp(pa.tx, pb.tx, e);
      var ty = lerp(pa.ty, pb.ty, e);

      applyPose({ s: s, tx: tx, ty: ty });

      var sharp = [0, 0, 0, 0];
      if (seg.a.focus >= 0) sharp[seg.a.focus] += 1 - e;
      if (seg.b.focus >= 0) sharp[seg.b.focus] += e;
      var overview =
        (seg.a.focus < 0 ? 1 - e : 0) + (seg.b.focus < 0 ? e : 0);
      var zoom = 1 - overview;
      var cap = isMobile() ? 5 : 12;
      var localCap = cap / Math.max(s, 1);

      cards.forEach(function (card, i) {
        var sh = clamp(sharp[i], 0, 1);
        var amount = (1 - sh) * zoom;
        if (amount < 0.02) {
          gsap.set(card, { clearProps: "filter" });
        } else {
          var blur = localCap * amount;
          var bright = 1 - amount * 0.42;
          gsap.set(card, {
            filter: "blur(" + blur.toFixed(2) + "px) brightness(" + bright.toFixed(3) + ")",
            force3D: false,
          });
        }
        card.style.pointerEvents = zoom < 0.45 || sh > 0.62 ? "auto" : "none";
      });

      [head, footer].forEach(function (el) {
        if (!el) return;
        var amount = zoom;
        if (amount < 0.02) gsap.set(el, { clearProps: "filter" });
        else {
          gsap.set(el, {
            filter:
              "blur(" +
              (localCap * amount * 0.85).toFixed(2) +
              "px) brightness(" +
              (1 - amount * 0.35).toFixed(3) +
              ")",
          });
        }
      });
      if (footer) footer.style.pointerEvents = zoom < 0.4 ? "auto" : "none";

      if (camTitle) camTitle.style.opacity = String(clamp(zoom, 0, 1));
      section.classList.toggle("is-work-zoomed", zoom > 0.35);
    }

    window.__workShowcaseAt = function (p) {
      window.__workShowcaseHold = p;
      render(p);
    };
    window.__workShowcaseRelease = function () {
      window.__workShowcaseHold = null;
    };

    ScrollTrigger.create({
      id: "work-showcase",
      trigger: pin,
      start: "top top",
      end: function () {
        return "+=" + Math.round((window.innerHeight || 800) * 3.2);
      },
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: isMobile() ? 0.32 : 0.5,
      invalidateOnRefresh: true,
      refreshPriority: 1,
      onRefresh: function (self) {
        measure();
        if (typeof window.__workShowcaseHold === "number") render(window.__workShowcaseHold);
        else if (self) render(self.progress);
      },
      onUpdate: function (self) {
        if (typeof window.__workShowcaseHold === "number") return;
        render(self.progress);
      },
    });

    measure();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measure();
        ScrollTrigger.refresh();
      });
    }
  }

  if (window.ScrollTrigger && ScrollTrigger.getById("scene-realizacje")) boot();
  else window.addEventListener("cosgral:sections-ready", boot, { once: true });
})();
