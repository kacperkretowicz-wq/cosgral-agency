(function () {
  "use strict";
  if (!document.body.classList.contains("pins4")) return;
  document.querySelectorAll(".p4-act > .home-tilt-layer").forEach(function (layer) {
    var host = layer.parentElement;
    var face = layer.querySelector(":scope > .home-tilt-face");
    var box = face || layer;
    while (box.firstChild) host.insertBefore(box.firstChild, layer);
    host.removeChild(layer);
  });
  var reduce = document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileQuery = window.matchMedia("(max-width: 800px)");

  function vh() { return window.innerHeight || 800; }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setHeight(section, screens) {
    if (reduce) return;
    if (mobileQuery.matches && section.hasAttribute("data-p4-swipe")) {
      section.style.setProperty("height", "auto", "important");
      return;
    }
    section.style.setProperty("height", Math.round(vh() * screens) + "px", "important");
  }

  function bind(id, screens, onProgress) {
    var section = document.getElementById(id);
    if (!section || !window.ScrollTrigger) return;
    setHeight(section, screens);
    if (reduce || (mobileQuery.matches && section.hasAttribute("data-p4-swipe"))) return;
    ScrollTrigger.create({
      id: "p4-" + id,
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      pin: false,
      onUpdate: function (self) { onProgress(self.progress, section); },
    });
  }

  if (window.gsap && window.SplitText) {
    gsap.registerPlugin(SplitText);
    var line = document.querySelector(".home-hero__tagline");
    if (line && !reduce) {
      var split = new SplitText(line, { type: "chars" });
      gsap.from(split.chars, { yPercent: 110, opacity: 0, stagger: 0.03, duration: 0.7, ease: "power3.out", delay: 0.35 });
    }
  }

  bind("act-zoom", 2.4, function (p, section) {
    var frame = section.querySelector(".p4-zoom__frame");
    var img = section.querySelector("img");
    var e = easeOut(p);
    if (frame) frame.style.transform = "scale(" + (0.62 + e * 0.62).toFixed(3) + ")";
    if (img) img.style.filter = "contrast(1.06) saturate(0.9) blur(" + ((1 - e) * 10).toFixed(2) + "px)";
  });

  var kinds = ["phone", "cart", "gear", "prism", "magnifier", "lens", "gear2", "chart", "card", "clapper", "chat", "ring", "bubble", "gamepad"];
  var lastKind = -1;
  bind("uslugi", 4.6, function (p, section) {
    var track = section.querySelector(".p4-rail__track");
    if (!track) return;
    var max = track.scrollWidth - track.parentElement.clientWidth;
    var x = easeInOut(p) * Math.max(max, 0);
    track.style.transform = "translate3d(" + (-x).toFixed(1) + "px,0,0)";
    var idx = clamp(Math.round(p * (kinds.length - 1)), 0, kinds.length - 1);
    if (idx !== lastKind && window.cosgralP4Rail) {
      lastKind = idx;
      window.cosgralP4Rail.setKind(kinds[idx]);
      if (window.cosgralP4Blip) window.cosgralP4Blip();
    }
  });

  bind("act-beam", 1.6, function (p, section) {
    var slit = section.querySelector(".p4-beam__slit");
    if (!slit) return;
    var e = easeInOut(p);
    slit.style.transform = "scaleX(" + (0.04 + e * 1.35).toFixed(3) + ") scaleY(" + (0.08 + e * 0.92).toFixed(3) + ")";
  });

  bind("realizacje", 4.2, function (p, section) {
    var rows = section.querySelectorAll(".p4-row");
    var n = rows.length;
    var focus = p * n;
    for (var i = 0; i < n; i++) {
      var local = clamp(1 - Math.abs(focus - (i + 0.5)), 0, 1);
      var media = rows[i].querySelector(".p4-row__media");
      if (media) media.style.height = (local * 46).toFixed(1) + "vh";
    }
  });

  bind("act-depth", 3.1, function (p, section) {
    var board = section.querySelector(".p4-depth__board");
    var tiles = section.querySelectorAll(".p4-depth__tile");
    var e = easeOut(p);
    var scale = 1 + e * 0.42;
    if (board) board.style.transform = "scale(" + scale.toFixed(3) + ")";
    var focus = Math.min(tiles.length - 1, Math.floor(p * tiles.length));
    for (var i = 0; i < tiles.length; i++) {
      var blur = i === focus ? 0 : (4 + e * 8) / scale;
      tiles[i].style.filter = "blur(" + blur.toFixed(2) + "px)";
    }
  });

  bind("act-mask", 2.2, function (p, section) {
    var video = section.querySelector("video");
    if (!video) return;
    var e = easeInOut(p);
    var r = 16 + e * 70;
    video.style.clipPath = "circle(" + r.toFixed(1) + "% at 50% 46%)";
    if (e > 0.15 && video.paused) {
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    }
  });

  bind("proces", 2.6, function (p, section) {
    var bar = section.querySelector(".p4-highlight");
    var steps = section.querySelectorAll(".p4-step");
    if (!bar || !steps.length) return;
    var idx = clamp(Math.floor(p * steps.length), 0, steps.length - 1);
    var step = steps[idx];
    bar.style.transform = "translate3d(0," + step.offsetTop + "px,0)";
  });

  function pastHero() {
    var hero = document.getElementById("top");
    if (!hero) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.toggle("is-past-hero", y > hero.offsetHeight * 0.82);
  }
  window.addEventListener("scroll", pastHero, { passive: true });
  pastHero();

  if (mobileQuery.matches) {
    var track = document.querySelector("#uslugi .p4-rail__track");
    if (track) {
      track.addEventListener("scroll", function () {
        var max = track.scrollWidth - track.clientWidth;
        var p = max > 0 ? track.scrollLeft / max : 0;
        var idx = clamp(Math.round(p * (kinds.length - 1)), 0, kinds.length - 1);
        if (idx !== lastKind && window.cosgralP4Rail) {
          lastKind = idx;
          window.cosgralP4Rail.setKind(kinds[idx]);
        }
      }, { passive: true });
    }
  }

  window.addEventListener("load", function () {
    if (window.ScrollTrigger && (window.scrollY || 0) < 80) ScrollTrigger.refresh();
  });
})();
