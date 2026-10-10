/**
 * Homepage #realizacje — pinned, scroll-scrubbed showcase.
 * Existing cards fly in from depth (blur → sharp, parallax), one fills
 * the frame, labels drift, the section title stays. The pin then releases
 * into the settled bento so the links work. Reduced motion keeps the grid.
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

  if (window.ScrollTrigger && ScrollTrigger.getById("scene-realizacje")) boot();
  else window.addEventListener("cosgral:sections-ready", boot, { once: true });

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function smoothstep(e0, e1, x) {
    return smooth((x - e0) / (e1 - e0));
  }

  function unwrapTilt(panel) {
    var layer = panel.querySelector(":scope > .home-tilt-layer");
    if (!layer) return;
    var face = layer.querySelector(":scope > .home-tilt-face") || layer;
    while (face.firstChild) panel.insertBefore(face.firstChild, layer);
    panel.removeChild(layer);
  }

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

    var cards = Array.prototype.slice.call(pin.querySelectorAll(".home-work__card"));
    if (cards.length < 2) return;

    var title = pin.querySelector(".home-work__title");
    var lead = pin.querySelector(".home-work__lead");
    var footer = pin.querySelector(".home-work__footer");

    /* Enter tweens write x/y/filter on these nodes and would fight the scrub. */
    cards.forEach(function (card) {
      card.removeAttribute("data-enter");
    });
    if (footer) footer.removeAttribute("data-enter");

    var cover = ScrollTrigger.getById("scene-realizacje-cover");
    if (cover) cover.kill();
    gsap.set(panel, { clearProps: "transform,filter,opacity,visibility" });
    gsap.killTweensOf(cards);
    if (footer) gsap.killTweensOf(footer);

    section.classList.add("is-work-showcase", "is-work-flying");

    var mobileQuery = window.matchMedia("(max-width: 900px)");
    var homes = [];
    var pinW = 1;
    var pinH = 1;

    /* Focus beats spread across the flight. Settle starts after the last fill. */
    /* First beat starts late enough that progress 0 is still a depth field. */
    var FOCUS = [0.28, 0.44, 0.58, 0.72];
    var SPAN = 0.2;
    var SCATTER = [
      { x: 0.22, y: 0.62 },
      { x: 0.78, y: 0.72 },
      { x: 0.7, y: 0.48 },
      { x: 0.32, y: 0.8 },
    ];
    var AFTER = [
      { x: -0.02, y: 0.26 },
      { x: 1.02, y: 0.3 },
      { x: 0.08, y: 0.86 },
      { x: 0.96, y: 0.66 },
    ];
    var DEPTH = [0.42, 0.86, 0.58, 0.24];

    function isMobile() {
      return mobileQuery.matches;
    }

    function measure() {
      gsap.set(cards, { clearProps: "transform,filter,opacity,zIndex" });
      cards.forEach(function (card) {
        var body = card.querySelector(".home-work__card-body");
        var cta = card.querySelector(".home-work__card-cta");
        var tag = card.querySelector(".home-work__card-tag");
        if (body) gsap.set(body, { clearProps: "transform" });
        if (cta) gsap.set(cta, { clearProps: "transform" });
        if (tag) gsap.set(tag, { clearProps: "transform" });
      });
      if (title) gsap.set(title, { clearProps: "transform" });
      if (lead) gsap.set(lead, { clearProps: "transform" });

      var pinRect = pin.getBoundingClientRect();
      pinW = pin.clientWidth || window.innerWidth || 1;
      pinH = pin.clientHeight || window.innerHeight || 1;
      homes = cards.map(function (card) {
        var r = card.getBoundingClientRect();
        return {
          cx: r.left + r.width / 2 - pinRect.left,
          cy: r.top + r.height / 2 - pinRect.top,
          w: Math.max(1, r.width),
          h: Math.max(1, r.height),
        };
      });
    }

    function poseFor(i, p) {
      var home = homes[i];
      var mobile = isMobile();
      var maxBlur = mobile ? 6 : 15;
      var depth = DEPTH[i] || 0.5;
      var t = (p - FOCUS[Math.min(i, FOCUS.length - 1)]) / SPAN;
      var focusW = Math.exp(-Math.pow(Math.max(0, Math.abs(t) - 0.12) / 0.72, 2));
      var farScale = 0.22 + depth * 0.2;
      var fillByBox = Math.max(
        (pinW * (mobile ? 1.02 : 0.8)) / home.w,
        (pinH * (mobile ? 0.58 : 0.72)) / home.h
      );
      var fillCap = Math.min(
        mobile ? 3.3 : 2.35,
        (pinW * (mobile ? 1.8 : 1.55)) / home.w
      );
      var fill = Math.min(Math.max(fillByBox, farScale + 0.45), fillCap);
      var focus = { x: mobile ? 0.5 : 0.56, y: mobile ? 0.6 : 0.55 };
      var scatter = SCATTER[i] || SCATTER[0];
      var after = AFTER[i] || AFTER[0];
      var par = 0.72 + depth * 0.5;
      var px;
      var py;
      var scale;
      if (t < 0) {
        var u = Math.pow(smooth(clamp((t + 1.35) / 1.35, 0, 1)), 1 / par);
        px = lerp(scatter.x * pinW, focus.x * pinW, u);
        py = lerp(scatter.y * pinH, focus.y * pinH, u);
        py += (1 - u) * pinH * (0.06 + (1 - depth) * 0.14);
        px += (1 - u) * pinW * (i % 2 === 0 ? -0.05 : 0.07) * (1.15 - depth);
        scale = lerp(farScale, fill, u);
      } else {
        var u2 = Math.pow(smooth(clamp(t / 1.25, 0, 1)), par);
        px = lerp(focus.x * pinW, after.x * pinW, u2);
        py = lerp(focus.y * pinH, after.y * pinH, u2);
        scale = lerp(fill, 0.5 + depth * 0.22, u2);
      }
      var blur = maxBlur * (1 - focusW);
      if (blur < 0.4) blur = 0;
      var rot = (i % 2 === 0 ? -1 : 1) * (2.4 + i * 0.45) * (1 - focusW);
      var opacity = clamp(0.42 + 0.58 * Math.max(focusW, t < -0.35 ? 0.72 : 0.5), 0, 1);
      return {
        x: px - home.cx,
        y: py - home.cy,
        scale: scale,
        blur: blur,
        rot: rot,
        opacity: opacity,
        z: Math.round(8 + focusW * 28 + depth * 2),
      };
    }

    function render(p) {
      if (!homes.length || !homes[0] || homes[0].w < 2) return;
      p = clamp(p, 0, 1);
      var settle = smoothstep(0.78, 0.92, p);
      var flightP = Math.min(p, 0.78);
      var flying = p < 0.9;
      section.classList.toggle("is-work-flying", flying);
      section.classList.toggle("is-work-settled", !flying);
      section.style.setProperty("--work-foot", settle.toFixed(3));

      if (title) {
        var ts = 1 + (isMobile() ? 0.16 : 0.22) * (1 - settle);
        gsap.set(title, { scale: ts, transformOrigin: "0% 0%", force3D: true });
      }
      if (lead) {
        gsap.set(lead, {
          x: (1 - settle) * (isMobile() ? 8 : 18),
          force3D: true,
        });
      }

      if (!flying && settle > 0.999) {
        gsap.set(cards, { clearProps: "transform,filter,opacity,zIndex" });
        cards.forEach(function (card) {
          var body = card.querySelector(".home-work__card-body");
          var cta = card.querySelector(".home-work__card-cta");
          var tag = card.querySelector(".home-work__card-tag");
          if (body) gsap.set(body, { clearProps: "transform" });
          if (cta) gsap.set(cta, { clearProps: "transform" });
          if (tag) gsap.set(tag, { clearProps: "transform" });
        });
        if (title) gsap.set(title, { scale: 1, transformOrigin: "0% 0%" });
        if (lead) gsap.set(lead, { clearProps: "transform" });
        return;
      }

      var mobile = isMobile();
      cards.forEach(function (card, i) {
        var pose = poseFor(i, flightP);
        var k = 1 - settle;
        gsap.set(card, {
          x: pose.x * k,
          y: pose.y * k,
          scale: lerp(pose.scale, 1, settle),
          rotation: pose.rot * k,
          filter: "blur(" + (pose.blur * k).toFixed(2) + "px)",
          opacity: lerp(pose.opacity, 1, settle),
          zIndex: pose.z,
          force3D: true,
          transformOrigin: "50% 50%",
        });
        var drift = k * (mobile ? 12 : 28) * Math.sin(flightP * Math.PI * 2 + i * 1.15);
        var body = card.querySelector(".home-work__card-body");
        var cta = card.querySelector(".home-work__card-cta");
        var tag = card.querySelector(".home-work__card-tag");
        if (body) gsap.set(body, { x: drift * 0.35, y: drift * -0.12, force3D: true });
        if (tag) gsap.set(tag, { x: drift * 0.55, force3D: true });
        if (cta) gsap.set(cta, { x: drift * -0.7, y: drift * 0.08, force3D: true });
      });
    }

    ScrollTrigger.create({
      id: "work-showcase",
      trigger: pin,
      start: "top top",
      end: function () {
        var vh = window.innerHeight || 800;
        return "+=" + Math.round(vh * (isMobile() ? 3.05 : 3.4));
      },
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: isMobile() ? 0.28 : 0.5,
      invalidateOnRefresh: true,
      refreshPriority: 1,
      onRefresh: function (self) {
        measure();
        render(self ? self.progress : 0);
      },
      onUpdate: function (self) {
        render(self.progress);
      },
    });

    measure();
    render(0);
    ScrollTrigger.refresh();
  }
})();
