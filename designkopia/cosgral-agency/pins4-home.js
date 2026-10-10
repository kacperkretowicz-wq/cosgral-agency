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

  var indexRows = document.querySelectorAll("#realizacje .p4-row");
  bind("realizacje", Math.max(4.2, indexRows.length * 0.42), function (p, section) {
    var rows = section.querySelectorAll(".p4-row");
    var list = section.querySelector(".p4-index__list");
    var n = rows.length;
    if (!n) return;
    var focus = p * n;
    var active = clamp(Math.floor(focus), 0, n - 1);
    for (var i = 0; i < n; i++) {
      var local = clamp(1 - Math.abs(focus - (i + 0.5)), 0, 1);
      var media = rows[i].querySelector(".p4-row__media");
      if (media) media.style.height = (local * 42).toFixed(1) + "vh";
      var vid = rows[i].querySelector("video");
      if (vid) {
        if (i === active && vid.paused) {
          var play = vid.play();
          if (play && play.catch) play.catch(function () {});
        } else if (i !== active && !vid.paused) vid.pause();
      }
    }
    if (list && rows[active]) {
      list.style.transform = "translate3d(0," + (-rows[active].offsetTop).toFixed(1) + "px,0)";
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

  var SHOWREEL = [
    { client: "Wiktoria stylistka", src: "portfolio-media/reels/orlincy/001.mp4", poster: "portfolio-media/reels/orlincy/001-poster.jpg" },
    { client: "Wiktoria stylistka", src: "portfolio-media/reels/orlincy/002.mp4", poster: "portfolio-media/reels/orlincy/002-poster.jpg" },
    { client: "Wiktoria stylistka", src: "portfolio-media/reels/orlincy/003.mp4", poster: "portfolio-media/reels/orlincy/003-poster.jpg" },
    { client: "Wiktoria stylistka", src: "portfolio-media/reels/orlincy/004.mp4", poster: "portfolio-media/reels/orlincy/004-poster.jpg" },
    { client: "Wiktoria stylistka", src: "portfolio-media/reels/orlincy/005.mp4", poster: "portfolio-media/reels/orlincy/005-poster.jpg" },
    { client: "Wiktoria stylistka", src: "portfolio-media/reels/orlincy/006.mp4", poster: "portfolio-media/reels/orlincy/006-poster.jpg" },
    { client: "Trove Archive", src: "portfolio-media/reels/reklamy/001.mp4", poster: "portfolio-media/reels/reklamy/001-poster.jpg" },
    { client: "Trove Archive", src: "portfolio-media/reels/reklamy/002.mp4", poster: "portfolio-media/reels/reklamy/002-poster.jpg" },
    { client: "Trove Archive", src: "portfolio-media/reels/reklamy/003.mp4", poster: "portfolio-media/reels/reklamy/003-poster.jpg" },
    { client: "Trove Archive", src: "portfolio-media/reels/reklamy/004.mp4", poster: "portfolio-media/reels/reklamy/004-poster.jpg" },
    { client: "Trove Archive", src: "portfolio-media/reels/reklamy/005.mp4", poster: "portfolio-media/reels/reklamy/005-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/001.mp4", poster: "portfolio-media/reels/far-east/001-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/002.mp4", poster: "portfolio-media/reels/far-east/002-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/003.mp4", poster: "portfolio-media/reels/far-east/003-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/004.mp4", poster: "portfolio-media/reels/far-east/004-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/005.mp4", poster: "portfolio-media/reels/far-east/005-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/006.mp4", poster: "portfolio-media/reels/far-east/006-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/007.mp4", poster: "portfolio-media/reels/far-east/007-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/008.mp4", poster: "portfolio-media/reels/far-east/008-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/009.mp4", poster: "portfolio-media/reels/far-east/009-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/010.mp4", poster: "portfolio-media/reels/far-east/010-poster.jpg" },
    { client: "Far East", src: "portfolio-media/reels/far-east/011.mp4", poster: "portfolio-media/reels/far-east/011-poster.jpg" },
    { client: "BTS", src: "portfolio-media/reels/bts/001.mp4", poster: "portfolio-media/reels/bts/001-poster.jpg" },
    { client: "BTS", src: "portfolio-media/reels/bts/002.mp4", poster: "portfolio-media/reels/bts/002-poster.jpg" },
    { client: "Anna Jarosik", src: "portfolio-media/reels/anna-jarosik/001.mp4", poster: "portfolio-media/reels/anna-jarosik/001-poster.jpg" },
    { client: "Anna Jarosik", src: "portfolio-media/reels/anna-jarosik/002.mp4", poster: "portfolio-media/reels/anna-jarosik/002-poster.jpg" },
    { client: "Anna Jarosik", src: "portfolio-media/reels/anna-jarosik/003.mp4", poster: "portfolio-media/reels/anna-jarosik/003-poster.jpg" },
    { client: "Anna Jarosik", src: "portfolio-media/reels/anna-jarosik/004.mp4", poster: "portfolio-media/reels/anna-jarosik/004-poster.jpg" },
    { client: "Anna Jarosik", src: "portfolio-media/reels/anna-jarosik/005.mp4", poster: "portfolio-media/reels/anna-jarosik/005-poster.jpg" }
  ];
  var strip = document.querySelector(".p4-mask__strip");
  if (strip) {
    SHOWREEL.forEach(function (item) {
      var img = document.createElement("img");
      img.src = item.poster;
      img.alt = "";
      strip.appendChild(img);
    });
  }
  var reelIdx = -1;
  bind("act-mask", Math.max(2.8, SHOWREEL.length * 0.22), function (p, section) {
    var video = section.querySelector("video");
    var label = section.querySelector(".p4-mask__client");
    var rail = section.querySelector(".p4-mask__strip");
    if (!video) return;
    var e = easeInOut(Math.min(1, p * 1.15));
    var r = 16 + e * 70;
    video.style.clipPath = "circle(" + r.toFixed(1) + "% at 50% 46%)";
    var idx = clamp(Math.floor(p * SHOWREEL.length), 0, SHOWREEL.length - 1);
    if (idx !== reelIdx) {
      reelIdx = idx;
      video.poster = SHOWREEL[idx].poster;
      video.src = SHOWREEL[idx].src;
      if (label) label.textContent = SHOWREEL[idx].client;
    }
    if (video.paused) {
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    }
    if (rail) rail.style.transform = "translate3d(0," + (-(p * Math.max(SHOWREEL.length - 1, 0) * 78)).toFixed(1) + "px,0)";
  });

  var autoCases = document.querySelectorAll("#act-auto .p4-case");
  bind("act-auto", Math.max(3.2, autoCases.length * 0.85), function (p, section) {
    var cases = section.querySelectorAll(".p4-case");
    var list = section.querySelector(".p4-auto__list");
    if (!cases.length) return;
    var idx = clamp(Math.floor(p * cases.length), 0, cases.length - 1);
    for (var i = 0; i < cases.length; i++) cases[i].classList.toggle("is-on", i === idx);
    if (list) list.style.transform = "translate3d(0," + (-cases[idx].offsetTop).toFixed(1) + "px,0)";
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
