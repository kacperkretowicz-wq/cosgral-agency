/**
 * Homepage #realizacje — pinned showcase matching the reference depth scroll.
 * Spec progress 0–1 is the dolly (two focal holds, peripheral blast, outro fade).
 * The last stretch of the pin settles back into the bento so the links work.
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

  function easeInOut(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function smoothstep(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function sample(keys, p) {
    if (p <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (p <= keys[i][0]) {
        var t0 = keys[i - 1][0];
        var t1 = keys[i][0];
        var v0 = keys[i - 1][1];
        var v1 = keys[i][1];
        if (v0 === v1 || t1 === t0) return v0;
        return lerp(v0, v1, easeInOut((p - t0) / (t1 - t0)));
      }
    }
    return keys[keys.length - 1][1];
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

    var grid = pin.querySelector(".home-work__grid");
    var cards = Array.prototype.slice.call(pin.querySelectorAll(".home-work__card"));
    if (!grid || cards.length < 4) return;

    var title = pin.querySelector(".home-work__title");
    var lead = pin.querySelector(".home-work__lead");
    var footer = pin.querySelector(".home-work__footer");
    var eyebrow = pin.querySelector(".section-label");

    cards.forEach(function (card) {
      card.removeAttribute("data-enter");
    });
    if (footer) footer.removeAttribute("data-enter");

    var cover = ScrollTrigger.getById("scene-realizacje-cover");
    if (cover) cover.kill();
    gsap.set(panel, { clearProps: "transform,filter,opacity,visibility" });
    gsap.killTweensOf(cards);
    if (footer) gsap.killTweensOf(footer);

    if (title) {
      gsap.killTweensOf(title.querySelectorAll(".reveal-word, .reveal-word > span"));
      gsap.set(title.querySelectorAll(".reveal-word > span"), { clearProps: "all" });
    }

    cards.forEach(function (card) {
      var video = card.querySelector("video");
      if (!video) return;
      if (video.poster) {
        card.style.backgroundImage = "url('" + video.poster + "')";
      }
      video.style.opacity = video.readyState >= 2 ? "1" : "0";
      video.addEventListener("loadeddata", function () {
        video.style.opacity = "1";
      });
    });

    if (title && !title.querySelector(".home-work__count")) {
      var sup = document.createElement("sup");
      sup.className = "home-work__count";
      sup.textContent = "(04)";
      title.appendChild(sup);
    }

    var flight = document.createElement("div");
    flight.className = "home-work__flight";
    pin.appendChild(flight);

    var ctaText = "Zobacz realizacje";
    var ctaNode = cards[0].querySelector(".home-work__card-cta");
    if (ctaNode && ctaNode.textContent) ctaText = ctaNode.textContent.trim();
    var kickerText = (eyebrow && eyebrow.textContent.trim()) || "Realizacje";

    function makeFloat(cls, text) {
      var el = document.createElement("div");
      el.className = "home-work__float " + cls;
      el.textContent = text;
      flight.appendChild(el);
      return el;
    }
    var pillA = makeFloat("home-work__float--pill", ctaText);
    var pillB = makeFloat("home-work__float--pill", ctaText);
    var kicker = makeFloat("home-work__float--kicker", kickerText);

    var order = cards.slice();

    section.classList.add("is-work-showcase", "is-work-flying");

    var ST = {
      center: {
        s: [[0, 1], [0.3, 1.5], [0.4, 1.5], [0.7, 1.6], [0.8, 1.6], [1, 1.7]],
        b: [[0, 0], [0.3, 15], [0.4, 15], [0.7, 25], [0.8, 25], [1, 35]],
        x: [[0, 0], [0.3, 15], [0.4, 15], [0.7, -15], [0.8, -15], [1, -25]],
        y: [[0, 0], [1, 0]],
        o: [[0, 1], [0.8, 1], [1, 0]],
      },
      focalA: {
        s: [[0, 0.6], [0.3, 1.5], [0.4, 1.5], [0.7, 0.6], [1, 0.6]],
        b: [[0, 4], [0.3, 0], [0.4, 0], [0.7, 15], [1, 18]],
        x: [[0, -20], [0.3, -5], [0.4, -5], [0.7, -40], [1, -48]],
        y: [[0, 12], [0.3, 0], [0.4, 0], [0.7, 5], [1, 8]],
        o: [[0, 1], [0.7, 1], [0.86, 0], [1, 0]],
      },
      focalB: {
        s: [[0, 0.6], [0.4, 0.8], [0.7, 1.8], [0.8, 1.8], [1, 0.8]],
        b: [[0, 4], [0.4, 8], [0.7, 0], [0.8, 0], [1, 15]],
        x: [[0, 22], [0.4, 35], [0.7, 5], [0.8, 5], [1, -20]],
        y: [[0, 15], [0.4, 15], [0.7, 0], [0.8, 0], [1, 10]],
        o: [[0, 1], [0.8, 1], [1, 0]],
      },
    };

    function sizeOf(vw, vhRatio) {
      var w = (window.innerWidth || 480) * vw;
      return { w: w, h: w * vhRatio };
    }

    function applyCard(card, spec, p, box, z) {
      var s = sample(spec.s, p);
      var b = sample(spec.b, p);
      var x = sample(spec.x, p);
      var y = sample(spec.y, p);
      var o = sample(spec.o, p);
      gsap.set(card, {
        position: "absolute",
        left: "50%",
        top: "46%",
        xPercent: -50,
        yPercent: -50,
        width: box.w,
        height: box.h,
        x: (x / 100) * (window.innerWidth || box.w),
        y: (y / 100) * (window.innerHeight || box.h),
        scale: s,
        opacity: o,
        filter: "blur(" + b.toFixed(2) + "px)",
        zIndex: z,
        borderRadius: "16px",
        transformOrigin: "50% 50%",
        force3D: true,
      });
    }

    function applyFloat(el, xVw, yVh, blur, opacity, scale) {
      gsap.set(el, {
        position: "absolute",
        left: "50%",
        top: "46%",
        xPercent: -50,
        yPercent: -50,
        x: (xVw / 100) * (window.innerWidth || 1),
        y: (yVh / 100) * (window.innerHeight || 1),
        scale: scale || 1,
        opacity: opacity,
        filter: "blur(" + blur.toFixed(2) + "px)",
        force3D: true,
      });
    }

    function parkInFlight() {
      cards.forEach(function (card) {
        flight.appendChild(card);
      });
    }

    function restoreGrid() {
      order.forEach(function (card) {
        grid.appendChild(card);
      });
      gsap.set(cards, { clearProps: "all" });
      gsap.set([pillA, pillB, kicker], { opacity: 0 });
    }

    var parked = false;

    function render(pinP) {
      var hold = window.__workShowcaseHold;
      var specP;
      var settle;
      if (typeof hold === "number") {
        specP = clamp(hold, 0, 1);
        settle = 0;
      } else {
        pinP = clamp(pinP, 0, 1);
        specP = clamp(pinP / 0.86, 0, 1);
        settle = smoothstep(0.86, 0.97, pinP);
      }

      var flying = settle < 0.98;
      section.classList.toggle("is-work-flying", flying);
      section.classList.toggle("is-work-settled", !flying);
      section.style.setProperty("--work-foot", settle.toFixed(3));
      if (lead) lead.style.opacity = String(1 - Math.min(1, settle > 0 ? settle : specP < 0.08 ? 0 : 1));
      if (eyebrow) eyebrow.style.opacity = lead ? lead.style.opacity : "0";

      if (!flying) {
        if (parked) {
          restoreGrid();
          parked = false;
        }
        return;
      }

      if (!parked) {
        parkInFlight();
        parked = true;
      }

      var vw = window.innerWidth || 480;
      applyCard(cards[0], ST.center, specP, { w: vw * 0.55, h: vw * 0.32 }, 10);
      applyCard(cards[1], ST.focalA, specP, { w: vw * 0.2, h: vw * 0.26 }, 20);
      applyCard(cards[2], ST.focalB, specP, { w: vw * 0.22, h: vw * 0.28 }, 20);

      /* Peripheral: systemy tile + pills. Gone by 20%. */
      var blast = smoothstep(0, 0.2, specP);
      var periOp = 1 - smoothstep(0.12, 0.2, specP);
      var sysBox = { w: vw * 0.12, h: vw * 0.12 };
      gsap.set(cards[3], {
        position: "absolute",
        left: "50%",
        top: "46%",
        xPercent: -50,
        yPercent: -50,
        width: sysBox.w,
        height: sysBox.h,
        x: ((-18 * (1 + blast * 1.5)) / 100) * vw,
        y: ((-15 * (1 + blast * 1.5)) / 100) * (window.innerHeight || 1),
        scale: 1,
        opacity: periOp,
        filter: "blur(" + (2 + blast * 8).toFixed(2) + "px)",
        zIndex: 30,
        borderRadius: "16px",
        force3D: true,
      });
      applyFloat(pillA, 8 * (1 + blast * 1.5), -20 * (1 + blast * 1.5), 2 + blast * 8, periOp, 1);
      applyFloat(pillB, -6 * (1 + blast * 1.5), 22 * (1 + blast * 1.5), 2 + blast * 8, periOp, 1);

      var kickIn = smoothstep(0.62, 0.78, specP) * (1 - smoothstep(0.9, 1, specP));
      applyFloat(kicker, 30, -30, 8, kickIn, 1.4);
    }

    window.__workShowcaseAt = function (specP) {
      window.__workShowcaseHold = specP;
      render(0);
    };
    window.__workShowcaseRelease = function () {
      window.__workShowcaseHold = null;
    };

    ScrollTrigger.create({
      id: "work-showcase",
      trigger: pin,
      start: "top top",
      end: function () {
        var vh = window.innerHeight || 800;
        return "+=" + Math.round(vh * 3);
      },
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: window.matchMedia("(max-width: 900px)").matches ? 0.28 : 0.5,
      invalidateOnRefresh: true,
      refreshPriority: 1,
      onUpdate: function (self) {
        if (typeof window.__workShowcaseHold === "number") return;
        render(self.progress);
      },
    });

    render(0);
    ScrollTrigger.refresh();
  }
})();
