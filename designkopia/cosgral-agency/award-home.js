/**
 * Homepage chapters as sticky stages. ScrollTrigger reads progress only
 * (no pin). Lenis already calls ScrollTrigger.update.
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot() {
    if (window.__awardHomeBooted) return;
    window.__awardHomeBooted = true;
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;
    if (ScrollTrigger.config) ScrollTrigger.config({ ignoreMobileResize: true });
    ["scene-uslugi-cover", "scene-realizacje-cover", "scene-faq-cover", "scene-proces-cover"].forEach(function (id) {
      var st = ScrollTrigger.getById(id);
      if (st) st.kill();
    });
    ["uslugi", "realizacje", "faq", "proces"].forEach(function (id) {
      var section = document.getElementById(id);
      if (!section) return;
      var panel = section.querySelector(".home-scene__panel");
      if (!panel) return;
      var face = panel.querySelector(":scope > .home-tilt-layer > .home-tilt-face, :scope > .home-tilt-face");
      var layer = panel.querySelector(":scope > .home-tilt-layer");
      if (face) {
        while (face.firstChild) panel.insertBefore(face.firstChild, layer || face);
        if (layer) layer.remove();
        else face.remove();
      }
      gsap.set(panel, { clearProps: "transform,filter,opacity,visibility,scale,x,y,xPercent,yPercent" });
      panel.style.transform = "none";
      panel.style.filter = "none";
    });
    wireCards();
    wireArc(document.getElementById("arc-to-work"), 0.15, 2.55);
    wireArc(document.getElementById("arc-to-process"), 0.15, 2.55);
    wireWork();
  }

  function vh() {
    return Math.round(window.innerHeight || document.documentElement.clientHeight || 800);
  }

  function lockHeight(section, screens) {
    section.style.setProperty("height", Math.round(vh() * screens) + "px", "important");
  }

  function yNow() {
    var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
    var y = window.scrollY || 0;
    if (lenis && typeof lenis.scroll === "number") y = Math.max(y, lenis.scroll);
    return y;
  }

  function wireCards() {
    var section = document.getElementById("uslugi");
    var pin = section && section.querySelector(".award-cards__pin");
    if (!section || !pin) return;
    var cards = Array.prototype.slice.call(pin.querySelectorAll(".award-card"));
    var dots = Array.prototype.slice.call(pin.querySelectorAll(".award-dock i"));
    if (cards.length < 2) return;
    var widthLocked = window.innerWidth || 0;

    function applyRunway() {
      lockHeight(section, 1 + cards.length * 0.85);
    }

    function render(p) {
      var n = cards.length;
      var x = Math.max(0, Math.min(0.9999, p)) * (n - 1);
      var i = Math.floor(x);
      var f = x - i;
      var ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      cards.forEach(function (card, idx) {
        card.style.visibility = idx === i || idx === i + 1 ? "visible" : "hidden";
        card.style.zIndex = idx === i + 1 ? "3" : "2";
        if (idx === i + 1) {
          var inset = ((1 - ease) * 50).toFixed(2);
          card.style.clipPath = "inset(" + inset + "% 0 " + inset + "% 0)";
        } else {
          card.style.clipPath = "none";
        }
      });
      var light = cards[Math.min(n - 1, ease > 0.45 ? i + 1 : i)].classList.contains("is-light");
      pin.classList.toggle("is-light-card", light);
      dots.forEach(function (dot, idx) {
        dot.classList.toggle("is-on", idx < i || (idx === i && ease < 0.08));
        dot.classList.toggle("is-fill", idx === i + 1 || (idx === i && ease >= 0.08));
        if (idx === i) dot.style.setProperty("--fill", Math.round((1 - ease) * 100) + "%");
        else if (idx === i + 1) dot.style.setProperty("--fill", Math.round(ease * 100) + "%");
        else dot.style.setProperty("--fill", idx < i ? "100%" : "0%");
      });
    }

    applyRunway();
    ScrollTrigger.create({
      id: "award-cards",
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      pin: false,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: function (self) { render(self.progress); },
      onRefresh: function (self) { render(self.progress); },
    });
    render(0);

    var startX = 0;
    var startY = 0;
    var axis = null;
    pin.addEventListener("touchstart", function (e) {
      if (!e.touches || !e.touches[0]) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      axis = null;
    }, { passive: true });
    pin.addEventListener("touchmove", function (e) {
      if (!e.touches || !e.touches[0] || axis === "y") return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (!axis && Math.abs(dx) + Math.abs(dy) > 12) axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }, { passive: true });
    pin.addEventListener("touchend", function (e) {
      if (axis !== "x") return;
      var dx = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : startX) - startX;
      if (Math.abs(dx) < 36) return;
      var st = ScrollTrigger.getById("award-cards");
      if (!st) return;
      var span = (st.end - st.start) / (cards.length - 1);
      var dir = dx < 0 ? 1 : -1;
      var next = Math.max(st.start, Math.min(st.end, yNow() + dir * span));
      var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
      if (lenis) lenis.scrollTo(next, { duration: 0.85 });
    }, { passive: true });

    window.addEventListener("resize", function () {
      var w = window.innerWidth || 0;
      if (Math.abs(w - widthLocked) < 48) return;
      widthLocked = w;
      if (yNow() > 80) return;
      applyRunway();
      ScrollTrigger.refresh();
    });
  }

  function wireArc(section, from, to) {
    if (!section) return;
    var disc = section.querySelector(".award-arc__disc");
    if (!disc) return;
    var widthLocked = window.innerWidth || 0;
    function applyRunway() {
      lockHeight(section, 1.7);
    }
    function render(p) {
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var s = from + (to - from) * e;
      disc.style.transform = "translateX(-50%) scale(" + s.toFixed(4) + ")";
    }
    applyRunway();
    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      pin: false,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: function (self) { render(self.progress); },
      onRefresh: function (self) { render(self.progress); },
    });
    render(0);
    window.addEventListener("resize", function () {
      var w = window.innerWidth || 0;
      if (Math.abs(w - widthLocked) < 48) return;
      widthLocked = w;
      if (yNow() > 80) return;
      applyRunway();
    });
  }

  function wireWork() {
    var section = document.getElementById("realizacje");
    var pin = section && section.querySelector(".award-work__pin");
    var board = section && section.querySelector(".award-work__board");
    if (!section || !pin || !board) return;
    var tiles = Array.prototype.slice.call(board.querySelectorAll(".award-tile"));
    var poses = [];
    var current = 0;
    var mobile = window.matchMedia("(max-width: 900px)").matches;
    var widthLocked = window.innerWidth || 0;
    var beats = [0, 0.12, 0.28, 0.4, 0.52, 0.64, 0.76, 0.88, 1];
    var focus = [-1, -1, 0, 0, 1, 1, 2, 3, -1];

    function applyRunway() {
      lockHeight(section, 4.2);
    }

    function measure() {
      gsap.set(board, { clearProps: "transform" });
      var pw = pin.clientWidth || window.innerWidth || 1;
      var ph = pin.clientHeight || window.innerHeight || 1;
      var origin = board.getBoundingClientRect();
      poses = tiles.map(function (tile) {
        var r = tile.getBoundingClientRect();
        var w = Math.max(1, r.width);
        var h = Math.max(1, r.height);
        var s = Math.min((pw * 0.84) / w, (ph * 0.62) / h);
        var cx = r.left - origin.left + w / 2;
        var cy = r.top - origin.top + h / 2;
        return { s: s, tx: pw / 2 - cx * s, ty: ph * 0.46 - cy * s };
      });
      poses.overview = { s: 1, tx: 0, ty: 0 };
      gsap.set(board, { clearProps: "transform" });
      render(current);
    }

    function poseAt(f) {
      return f < 0 ? poses.overview : poses[f] || poses.overview;
    }

    function render(p) {
      current = p;
      if (!poses.overview) return;
      var i = 0;
      while (i < beats.length - 2 && p > beats[i + 1]) i++;
      var a = focus[i];
      var b = focus[i + 1];
      var span = beats[i + 1] - beats[i] || 1;
      var raw = Math.max(0, Math.min(1, (p - beats[i]) / span));
      var held = a === b;
      var e = held ? 0 : (raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2);
      var pa = poseAt(a);
      var pb = poseAt(b);
      var s = pa.s + (pb.s - pa.s) * e;
      var tx = pa.tx + (pb.tx - pa.tx) * e;
      var ty = pa.ty + (pb.ty - pa.ty) * e;
      gsap.set(board, { x: tx, y: ty, scale: s, transformOrigin: "0 0", force3D: true });
      var sharp = [];
      tiles.forEach(function (_, idx) { sharp[idx] = 0; });
      if (a >= 0) sharp[a] += 1 - e;
      if (b >= 0) sharp[b] += e;
      var overview = (a < 0 ? 1 - e : 0) + (b < 0 ? e : 0);
      var zoom = 1 - overview;
      var cap = (mobile ? 4 : 10) / Math.max(s, 1);
      tiles.forEach(function (tile, idx) {
        var amount = (1 - Math.max(0, Math.min(1, sharp[idx]))) * zoom;
        if (amount < 0.04) tile.style.filter = "";
        else tile.style.filter = "blur(" + (cap * amount).toFixed(2) + "px) brightness(" + (1 - amount * 0.28).toFixed(3) + ")";
      });
    }

    applyRunway();
    ScrollTrigger.create({
      id: "award-work",
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      pin: false,
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: function (self) {
        measure();
        render(self.progress);
      },
      onUpdate: function (self) { render(self.progress); },
    });
    measure();
    window.addEventListener("resize", function () {
      var w = window.innerWidth || 0;
      if (Math.abs(w - widthLocked) < 48) return;
      widthLocked = w;
      mobile = window.matchMedia("(max-width: 900px)").matches;
      if (yNow() > 80) return;
      applyRunway();
      ScrollTrigger.refresh();
    });
  }

  if (window.ScrollTrigger && ScrollTrigger.getById("scene-uslugi")) boot();
  else window.addEventListener("cosgral:sections-ready", boot, { once: true });
  window.addEventListener("load", function () {
    if (yNow() > 80) return;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, { once: true });
})();
