/**
 * Ink reveal for H1/H2: each letter grows out of its thickest strokes
 * (SVG erode → soft blur → alpha threshold), thin joins arrive last.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  if (root.classList.contains("reduce-motion")) return;
  if (!("IntersectionObserver" in window) || !window.requestAnimationFrame) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var SKIP = [
    "[data-no-ink]", ".visually-hidden", ".home-hero__title", ".case-viz-tile__title",
    "nav", "[role='dialog']", "[aria-hidden='true']", "[hidden]", ".faq-scroll__stage",
    "[class*='site-chat']", "[class*='cookie']"
  ].join(",");
  var coarse = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
  var DURATION = coarse ? 1300 : 1500;
  // Vertical-only erosion: stems survive as short segments that grow from their centres,
  // horizontal strokes (arches, bars, joins) only return at the end. Works for light and heavy faces.
  var ERODE_Y_EM = 0.42;
  var ERODE_X_STEM = 0.28;
  var BLUR_STEM = 0.22;
  var stemCache = {};

  function metrics(h) {
    var cs = getComputedStyle(h);
    var size = parseFloat(cs.fontSize) || 32;
    var font = cs.fontStyle + " " + cs.fontWeight + " " + size + "px " + cs.fontFamily;
    if (!stemCache[font]) stemCache[font] = { size: size, stem: measureStem(font, size) };
    return stemCache[font];
  }

  function measureStem(font, size) {
    var fallback = size * 0.12;
    try {
      var c = document.createElement("canvas");
      var w = Math.ceil(size * 2), hh = Math.ceil(size * 2);
      c.width = w; c.height = hh;
      var ctx = c.getContext("2d");
      ctx.font = font;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("l", size * 0.5, size * 1.5);
      var row = Math.round(size * 1.5 - size * 0.35);
      var data = ctx.getImageData(0, row, w, 1).data;
      var run = 0, best = 0;
      for (var x = 0; x < w; x++) {
        if (data[x * 4 + 3] > 127) { run++; if (run > best) best = run; } else run = 0;
      }
      return best > 0 ? best : fallback;
    } catch (e) {
      return fallback;
    }
  }

  var defs = null;
  var filterId = 0;
  var managed = [];

  function svgDefs() {
    if (defs) return defs;
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    defs = document.createElementNS(SVG_NS, "defs");
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function makeFilter() {
    var id = "ink-f" + (++filterId);
    var f = el("filter", {
      id: id, x: "-30%", y: "-40%", width: "160%", height: "180%",
      "color-interpolation-filters": "sRGB"
    });
    var erode = el("feMorphology", { operator: "erode", radius: "0" });
    var blur = el("feGaussianBlur", { stdDeviation: "0" });
    var alpha = el("feColorMatrix", { type: "matrix", values: "" });
    f.appendChild(erode);
    f.appendChild(blur);
    f.appendChild(alpha);
    svgDefs().appendChild(f);
    return { id: id, node: f, erode: erode, blur: blur, alpha: alpha };
  }

  function eligible(h) {
    if (h.closest(SKIP)) return false;
    // Portfolio chapter titles already run their own "poured liquid" reveal (portfolio-motion.js).
    if (h.querySelector(".pf-liq, .pf-w")) return false;
    if (!h.textContent.trim()) return false;
    return true;
  }

  function wrapText(h, perWord) {
    var walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var word = document.createElement("span");
        word.className = "ink-w";
        if (perWord) {
          word.classList.add("ink-u");
          word.textContent = part;
        } else {
          Array.from(part).forEach(function (ch) {
            var c = document.createElement("span");
            c.className = "ink-c ink-u";
            c.textContent = ch;
            word.appendChild(c);
          });
        }
        frag.appendChild(word);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function split(item) {
    item.h.classList.add("ink-pending");
    wrapText(item.h, coarse);
    item.text = item.h.textContent;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 1.7);
  }

  function setFrame(f, m, p) {
    var e = easeOut(p);
    var ry = m.size * ERODE_Y_EM * (1 - e);
    var rx = m.stem * ERODE_X_STEM * (1 - e);
    var b = m.stem * BLUR_STEM * (1 - e);
    var gain = 1 + 11 * (1 - e);
    var bias = -5 * (1 - e);
    f.erode.setAttribute("radius", rx.toFixed(2) + " " + ry.toFixed(2));
    f.blur.setAttribute("stdDeviation", b.toFixed(2));
    f.alpha.setAttribute("values",
      "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 " + gain.toFixed(3) + " " + bias.toFixed(3));
  }

  function finish(item) {
    item.state = "done";
    item.h.classList.remove("ink-pending", "ink-running");
    item.h.classList.add("ink-done");
    item.units.forEach(function (u) { u.style.filter = ""; });
    item.filters.forEach(function (f) { if (f.node.parentNode) f.node.parentNode.removeChild(f.node); });
    item.filters = [];
  }

  function play(item) {
    if (item.state !== "pending") return;
    item.state = "running";
    var units = Array.from(item.h.querySelectorAll(".ink-u"));
    if (!units.length) { finish(item); return; }
    var m = metrics(item.h);
    var stagger = Math.min(110, 1200 / units.length);
    item.units = units;
    item.filters = units.map(function (u) {
      var f = makeFilter();
      setFrame(f, m, 0);
      u.style.filter = "url(#" + f.id + ")";
      return f;
    });
    item.h.classList.add("ink-running");
    item.h.classList.remove("ink-pending");
    var start = performance.now();
    var total = DURATION + stagger * (units.length - 1);

    function tick(now) {
      if (item.state !== "running") return;
      var t = now - start;
      for (var i = 0; i < units.length; i++) {
        var p = Math.max(0, Math.min(1, (t - i * stagger) / DURATION));
        setFrame(item.filters[i], m, p);
      }
      if (t >= total) finish(item);
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var tall = entry.boundingClientRect.height > window.innerHeight * 0.6;
      if (entry.intersectionRatio < 0.35 && !tall) return;
      var item = entry.target.__ink;
      if (!item) return;
      io.unobserve(entry.target);
      play(item);
    });
  }, { threshold: [0, 0.35, 0.7], rootMargin: "0px 0px -10% 0px" });

  function resplitAfterTextChange() {
    managed.forEach(function (item) {
      if (item.h.textContent === item.text && item.h.querySelector(".ink-u")) return;
      if (item.state === "running") {
        item.state = "done";
        item.filters.forEach(function (f) { if (f.node.parentNode) f.node.parentNode.removeChild(f.node); });
        item.filters = [];
        item.h.classList.remove("ink-running");
        item.h.classList.add("ink-done");
      }
      if (item.state === "pending") split(item);
      else item.text = item.h.textContent;
    });
  }

  function whenPageVisible(cb) {
    var busy = function () {
      return root.classList.contains("is-page-transitioning") || root.classList.contains("is-page-enter");
    };
    if (!busy()) { cb(); return; }
    var done = false;
    var go = function () { if (done) return; done = true; mo.disconnect(); setTimeout(cb, 80); };
    var mo = new MutationObserver(function () { if (!busy()) go(); });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    setTimeout(go, 2500);
  }

  var observing = false;

  function adopt(h) {
    if (h.__ink || !eligible(h)) return;
    var item = { h: h, state: "pending", units: [], filters: [], text: "" };
    h.__ink = item;
    split(item);
    managed.push(item);
    root.classList.add("ink-on");
    if (observing) io.observe(h);
  }

  function adoptWithin(node) {
    if (node.nodeType !== 1) return;
    if (node.matches("h1, h2")) adopt(node);
    Array.from(node.querySelectorAll("h1, h2")).forEach(adopt);
  }

  function init() {
    var scope = document.body;
    adoptWithin(scope);
    // Galleries and expanded panels build their section titles after load.
    new MutationObserver(function (records) {
      records.forEach(function (r) { Array.from(r.addedNodes).forEach(adoptWithin); });
    }).observe(scope, { childList: true, subtree: true });
    var start = function () {
      observing = true;
      managed.forEach(function (item) { if (item.state === "pending") io.observe(item.h); });
    };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { whenPageVisible(start); });
  }

  window.addEventListener("cosgral:langchange", resplitAfterTextChange);
  window.addEventListener("cosgral:i18n-ready", resplitAfterTextChange);

  // Loaded at the end of <body>: split before first paint so headings never flash.
  if (document.readyState === "loading" && !document.querySelector("main")) {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
