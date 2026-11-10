/**
 * Ink reveal for display text (headings and every large label, not body copy).
 * Each letter grows out of its tall stems as rounded drops; thin horizontal
 * strokes and joins arrive last. Rendered on a temporary canvas: glyphs are
 * drawn once, an anisotropic distance map is computed once, and every frame is
 * a threshold of that map, so the motion is continuous in every browser.
 * Everything else (smaller text, images, video) fades up as it enters.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  if (root.classList.contains("reduce-motion")) return;
  if (!("IntersectionObserver" in window) || !window.requestAnimationFrame) return;

  var SKIP = [
    "script", "style", "noscript", "template", "svg", "canvas", "select", "textarea", "input", "option",
    "nav", "[role='dialog']", "[hidden]", ".visually-hidden", "[data-no-ink]",
    ".faq-scroll__stage",
    "[class*='site-chat']", "[class*='cookie']"
  ].join(",");
  var narrow = window.matchMedia("(max-width: 700px)").matches;
  // Body copy is 16-22px on desktop and 16-17px on phones; display text sits above that.
  var MIN_PX = narrow ? 20 : 24;
  var MIN_HEADING_PX = narrow ? 18 : 20;
  var DURATION = 1150;
  var CHAPTER_DELAY = 450; // Realizacje: let the chapter slide in before its title is inked
  var MIN_ASPECT = 6;      // drops are at least 6x taller than wide
  var MAX_PIXELS = 900000; // per canvas, keeps the one-off distance pass short on phones
  var HAS_LETTER = /[A-Za-z0-9À-ɏЀ-ӿ]/;

  var managed = [];
  // Home hero: COSGRAL is inked when the flying cube is nearly in place (cosgral:hero-title).
  var heroItems = [], heroFx = [], heroStarted = false;
  var ownChars = typeof WeakSet === "function" ? new WeakSet() : null;
  var running = [];
  var observing = false;
  var rafId = 0;

  /* ---------- discovery ---------- */

  function blockOf(el) {
    while (el && el !== document.body) {
      var d = getComputedStyle(el).display;
      if (d !== "inline" && d !== "contents") return el;
      el = el.parentElement;
    }
    return null;
  }

  function drawable(cs) {
    if (cs.visibility === "hidden") return false;
    var fill = cs.webkitTextFillColor || cs.color;
    if (fill === "transparent" || /rgba\([^)]*,\s*0\)$/.test(fill)) return false;
    if (cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") return false;
    return true;
  }

  function scan(scope) {
    if (!scope || scope.nodeType !== 1) return;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var order = [];
    var byBlock = new Map();
    var n;
    while ((n = walker.nextNode())) {
      if (!HAS_LETTER.test(n.nodeValue)) continue;
      var el = n.parentElement;
      if (!el || el.classList.contains("ink-c") || el.closest(SKIP)) continue;
      var cs = getComputedStyle(el);
      var fs = parseFloat(cs.fontSize) || 0;
      var heading = el.closest("h1, h2, h3");
      if (fs < MIN_PX && !(heading && fs >= MIN_HEADING_PX)) continue;
      if (!drawable(cs)) continue;
      var block = blockOf(el);
      if (!block || block.__ink) continue;
      var list = byBlock.get(block);
      if (!list) { list = []; byBlock.set(block, list); order.push(block); }
      list.push(n);
    }
    order.forEach(function (block) { adopt(block, byBlock.get(block)); });
  }

  function adopt(block, nodes) {
    var item = { el: block, state: "pending", chars: [], chapter: block.closest(".portfolio-chapter"), hero: !!block.closest(".home-hero") };
    block.__ink = item;
    nodes.forEach(function (node) {
      if (!node.parentNode) return;
      var frag = document.createDocumentFragment();
      Array.from(node.nodeValue).forEach(function (ch) {
        if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
        var c = document.createElement("span");
        c.className = "ink-c ink-hide";
        c.textContent = ch;
        if (ownChars) ownChars.add(c);
        frag.appendChild(c);
        item.chars.push(c);
      });
      node.parentNode.replaceChild(frag, node);
    });
    if (!item.chars.length) { item.state = "done"; return; }
    managed.push(item);
    root.classList.add("ink-on");
    if (item.chapter) watchChapter(item);
    else if (item.hero) { heroItems.push(item); if (heroStarted) play(item); }
    else if (observing) io.observe(block);
  }

  /* Realizacje chapters replay their title every time the chapter becomes active. */
  var chapterObserver = null;
  function trackChapter(ch) {
    if (ch.__inkItems) return;
    ch.__inkItems = [];
    ch.__fxUnits = [];
    ch.__inkActive = ch.classList.contains("is-active");
    if (!chapterObserver) {
      chapterObserver = new MutationObserver(function (records) {
        records.forEach(function (r) { chapterChanged(r.target); });
      });
    }
    chapterObserver.observe(ch, { attributes: true, attributeFilter: ["class"] });
  }

  function watchChapter(item) {
    var ch = item.chapter;
    trackChapter(ch);
    ch.__inkItems.push(item);
    if (observing && ch.__inkActive) schedule(item, CHAPTER_DELAY);
  }

  function chapterChanged(ch) {
    var active = ch.classList.contains("is-active");
    if (active === ch.__inkActive) return;
    ch.__inkActive = active;
    ch.__inkItems.forEach(function (item) {
      if (active) { if (observing) schedule(item, CHAPTER_DELAY); }
      else reset(item);
    });
    clearTimeout(ch.__fxTimer);
    if (active) { if (observing) ch.__fxTimer = setTimeout(function () { revealAll(ch.__fxUnits, 60); }, CHAPTER_DELAY); }
    else ch.__fxUnits.forEach(hideUnit);
  }

  function schedule(item, delay) {
    clearTimeout(item.timer);
    item.timer = setTimeout(function () { play(item); }, delay);
  }

  function reset(item) {
    clearTimeout(item.timer);
    if (item.scene && item.scene.canvas.parentNode) item.scene.canvas.parentNode.removeChild(item.scene.canvas);
    if (item.restorePosition != null) { item.el.style.position = item.restorePosition; item.restorePosition = null; }
    item.scene = null;
    item.state = "pending";
    item.chars.forEach(function (c) { c.classList.add("ink-hide"); });
  }

  /* ---------- rendering ---------- */

  function transformCase(ch, cs, span) {
    var tt = cs.textTransform;
    if (tt === "uppercase") return ch.toUpperCase();
    if (tt === "lowercase") return ch.toLowerCase();
    if (tt === "capitalize") {
      var prev = span.previousSibling;
      if (!prev || (prev.nodeType === 3 && /\s$/.test(prev.nodeValue))) return ch.toUpperCase();
    }
    return ch;
  }

  // Felzenszwalb 1-D squared distance transform; `w2` scales the axis (anisotropy).
  function dt1d(f, n, w2, d, v, z) {
    var k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (var q = 1; q < n; q++) {
      var p = v[k];
      var s = ((f[q] + w2 * q * q) - (f[p] + w2 * p * p)) / (2 * w2 * (q - p));
      while (s <= z[k]) {
        k--;
        p = v[k];
        s = ((f[q] + w2 * q * q) - (f[p] + w2 * p * p)) / (2 * w2 * (q - p));
      }
      k++;
      v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (var x = 0; x < n; x++) {
      while (z[k + 1] < x) k++;
      var dx = x - v[k];
      d[x] = w2 * dx * dx + f[v[k]];
    }
  }

  // Median horizontal run of ink = stroke width in canvas pixels.
  function strokeWidth(alpha, W, H) {
    var runs = [];
    for (var y = 0; y < H; y += 2) {
      var run = 0;
      for (var x = 0; x < W; x++) {
        if (alpha[y * W + x] >= 110) run++;
        else if (run) { runs.push(run); run = 0; }
      }
      if (run) runs.push(run);
    }
    if (!runs.length) return 1;
    runs.sort(function (a, b) { return a - b; });
    return runs[runs.length >> 1];
  }

  function distanceMap(alpha, W, H, aspect) {
    var INF = 1e12;
    var grid = new Float32Array(W * H);
    for (var i = 0; i < W * H; i++) grid[i] = alpha[i] >= 110 ? INF : 0;
    var len = Math.max(W, H);
    var f = new Float64Array(len), d = new Float64Array(len);
    var v = new Int32Array(len), z = new Float64Array(len + 1);
    var x, y;
    for (x = 0; x < W; x++) {
      for (y = 0; y < H; y++) f[y] = grid[y * W + x];
      dt1d(f, H, 1, d, v, z);
      for (y = 0; y < H; y++) grid[y * W + x] = d[y];
    }
    var w2 = aspect * aspect;
    for (y = 0; y < H; y++) {
      var row = y * W;
      for (x = 0; x < W; x++) f[x] = grid[row + x];
      dt1d(f, W, w2, d, v, z);
      for (x = 0; x < W; x++) grid[row + x] = Math.sqrt(d[x]);
    }
    return grid;
  }

  function hasAbsoluteChild(el) {
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) {
      var p = getComputedStyle(kids[i]).position;
      if (p === "absolute" || p === "fixed") return true;
    }
    return false;
  }

  function prepare(item) {
    var el = item.el;
    var boxes = [];
    item.chars.forEach(function (c) {
      if (!c.isConnected) return;
      var r = c.getClientRects()[0];
      if (r && r.width) boxes.push({ c: c, r: r });
    });
    if (!boxes.length) return null;
    if (getComputedStyle(el).position === "static" && hasAbsoluteChild(el)) return null;

    var rect = el.getBoundingClientRect();
    var scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
    if (!(scale > 0.05)) scale = 1;

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxFs = 0;
    boxes.forEach(function (b) {
      minX = Math.min(minX, b.r.left); minY = Math.min(minY, b.r.top);
      maxX = Math.max(maxX, b.r.right); maxY = Math.max(maxY, b.r.bottom);
      b.cs = getComputedStyle(b.c);
      b.fs = parseFloat(b.cs.fontSize) || 16;
      maxFs = Math.max(maxFs, b.fs);
    });
    var pad = maxFs * 0.35 * scale;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;

    var cssW = (maxX - minX) / scale, cssH = (maxY - minY) / scale;
    var res = Math.min(2, window.devicePixelRatio || 1);
    if (cssW * cssH * res * res > MAX_PIXELS) res = Math.sqrt(MAX_PIXELS / (cssW * cssH));
    var W = Math.max(1, Math.ceil(cssW * res)), H = Math.max(1, Math.ceil(cssH * res));

    var canvas = document.createElement("canvas");
    canvas.className = "ink-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.textBaseline = "alphabetic";

    var cells = [];
    boxes.forEach(function (b, i) {
      var cs = b.cs;
      ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + b.fs + "px " + cs.fontFamily;
      ctx.fillStyle = cs.color;
      var ch = transformCase(b.c.textContent, cs, b.c);
      var m = ctx.measureText(ch);
      var ascent = m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : b.fs * 0.8;
      var x = (b.r.left - minX) / scale, top = (b.r.top - minY) / scale;
      ctx.fillText(ch, x, top + ascent);
      var w = b.r.width / scale, h = b.r.height / scale;
      cells.push({
        i: i,
        x0: Math.floor((x - b.fs * 0.08) * res), x1: Math.ceil((x + w + b.fs * 0.08) * res),
        y0: Math.floor((top - b.fs * 0.25) * res), y1: Math.ceil((top + h + b.fs * 0.25) * res)
      });
    });

    var img;
    try { img = ctx.getImageData(0, 0, W, H); } catch (e) { return null; }
    var data = img.data;
    var size = W * H;
    var alpha = new Uint8Array(size);
    var k;
    for (k = 0; k < size; k++) alpha[k] = data[k * 4 + 3];

    // Which letter owns each ink pixel, for the left-to-right stagger.
    var owner = new Int16Array(size).fill(-1);
    cells.forEach(function (c) {
      for (var y = Math.max(0, c.y0); y < Math.min(H, c.y1); y++) {
        for (var x = Math.max(0, c.x0); x < Math.min(W, c.x1); x++) {
          var p = y * W + x;
          if (alpha[p] && owner[p] < 0) owner[p] = c.i;
        }
      }
    });

    // Thin faces need taller drops, otherwise stems appear full-length at once.
    var capHeight = maxFs * 0.7 * res;
    var aspect = Math.max(MIN_ASPECT, 1.3 * capHeight / Math.max(1, strokeWidth(alpha, W, H)));
    var dist = distanceMap(alpha, W, H, aspect);
    var count = 0;
    for (k = 0; k < size; k++) if (alpha[k]) count++;
    var inkIdx = new Int32Array(count), inkOwner = new Int16Array(count);
    var inkDist = new Float32Array(count), inkAlpha = new Uint8Array(count);
    var letterMax = new Float32Array(boxes.length), j = 0;
    for (var y = 0; y < H; y++) {
      var last = 0;
      for (var x = 0; x < W; x++) {
        var p = y * W + x;
        if (!alpha[p]) continue;
        if (owner[p] < 0) owner[p] = last;
        last = owner[p];
        inkIdx[j] = p; inkOwner[j] = owner[p]; inkDist[j] = dist[p]; inkAlpha[j] = alpha[p];
        if (dist[p] > letterMax[owner[p]]) letterMax[owner[p]] = dist[p];
        j++;
      }
    }
    for (k = 0; k < size; k++) data[k * 4 + 3] = 0;

    canvas.style.cssText =
      "position:absolute;pointer-events:none;margin:0;padding:0;border:0;max-width:none;" +
      "left:" + ((minX - rect.left) / scale - el.clientLeft) + "px;" +
      "top:" + ((minY - rect.top) / scale - el.clientTop) + "px;" +
      "width:" + cssW + "px;height:" + cssH + "px;";

    return {
      canvas: canvas, ctx: ctx, img: img, data: data, count: boxes.length,
      inkIdx: inkIdx, inkOwner: inkOwner, inkDist: inkDist, inkAlpha: inkAlpha,
      letterMax: letterMax, // each letter starts from its own thickest stem, so order stays left to right
      radius: new Float32Array(boxes.length), fade: new Float32Array(boxes.length)
    };
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function smooth(a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }

  function drawFrame(item, now) {
    var s = item.scene;
    var t = now - item.start;
    var radius = s.radius, fade = s.fade;
    for (var i = 0; i < s.count; i++) {
      var raw = (t - i * item.stagger) / DURATION;
      var p = Math.max(0, Math.min(1, raw));
      // Not started yet: fully hidden. Then the thickest stems surface as drops within a few frames.
      radius[i] = raw <= 0 ? s.letterMax[i] + 1 : s.letterMax[i] * (1 - easeOut(p));
      fade[i] = smooth(0.7, 1, p);
    }
    var data = s.data, idx = s.inkIdx, own = s.inkOwner, dist = s.inkDist, al = s.inkAlpha;
    for (var k = 0; k < idx.length; k++) {
      var o = own[k];
      var vis = dist[k] - radius[o] + 0.5;
      vis = vis <= 0 ? 0 : vis >= 1 ? 1 : vis;
      if (fade[o] > vis) vis = fade[o];
      data[idx[k] * 4 + 3] = al[k] * vis;
    }
    s.ctx.putImageData(s.img, 0, 0);
    return t >= item.total;
  }

  function loop() {
    rafId = 0;
    var now = performance.now();
    for (var i = running.length - 1; i >= 0; i--) {
      var item = running[i];
      if (item.state !== "running") { running.splice(i, 1); continue; }
      // Another script rewrote the text (counters, language switch): show the live text.
      if (!item.chars[0].isConnected || !item.chars[item.chars.length - 1].isConnected) {
        finish(item); running.splice(i, 1); continue;
      }
      if (drawFrame(item, now)) { finish(item); running.splice(i, 1); }
    }
    if (running.length) rafId = requestAnimationFrame(loop);
  }

  function finish(item) {
    item.state = "done";
    item.chars.forEach(function (c) { c.classList.remove("ink-hide"); });
    if (item.scene && item.scene.canvas.parentNode) item.scene.canvas.parentNode.removeChild(item.scene.canvas);
    if (item.restorePosition != null) { item.el.style.position = item.restorePosition; item.restorePosition = null; }
    item.scene = null;
  }

  function play(item) {
    if (item.state !== "pending") return;
    var scene = null;
    try { scene = prepare(item); } catch (e) { scene = null; }
    if (!scene || !scene.inkIdx.length) { finish(item); return; }
    var el = item.el;
    if (getComputedStyle(el).position === "static") {
      item.restorePosition = el.style.position;
      el.style.position = "relative";
    }
    el.appendChild(scene.canvas);
    item.scene = scene;
    item.state = "running";
    item.stagger = Math.min(75, 850 / scene.count);
    item.total = DURATION + item.stagger * (scene.count - 1);
    item.start = performance.now();
    drawFrame(item, item.start);
    running.push(item);
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  /* ---------- triggering ---------- */

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var tall = entry.boundingClientRect.height > window.innerHeight * 0.6;
      // Text inside clipped tiles may never reach 35% visible; a large enough visible piece counts too.
      var seen = entry.intersectionRect.width * entry.intersectionRect.height;
      var big = seen >= window.innerWidth * window.innerHeight * 0.015;
      if (entry.intersectionRatio < 0.35 && !tall && !big) return;
      var item = entry.target.__ink;
      if (!item) return;
      io.unobserve(entry.target);
      play(item);
    });
  }, { threshold: [0, 0.1, 0.2, 0.35, 0.7] });

  // A language switch rewrites text: unrevealed blocks are rebuilt, the rest stay as plain text.
  function afterTextChange() {
    managed = managed.filter(function (item) {
      var intact = item.chars.every(function (c) { return c.isConnected; });
      if (intact) return true;
      if (item.state === "running") finish(item);
      if (item.state === "pending") {
        io.unobserve(item.el); clearTimeout(item.timer); item.el.__ink = null;
        if (item.chapter && item.chapter.__inkItems) {
          item.chapter.__inkItems = item.chapter.__inkItems.filter(function (x) { return x !== item; });
        }
        return false;
      }
      return true;
    });
    scan(document.body);
  }

  function whenPageVisible(cb) {
    var busy = function () {
      return root.classList.contains("is-page-transitioning") || root.classList.contains("is-page-enter");
    };
    if (!busy()) { cb(); return; }
    var done = false;
    var mo;
    var go = function () { if (done) return; done = true; mo.disconnect(); setTimeout(cb, 80); };
    mo = new MutationObserver(function () { if (!busy()) go(); });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    setTimeout(go, 2500);
  }

  /* ---------- fade for everything else ---------- */

  // Only things that are not visible page text, plus the two chapter blocks that already fade with CSS.
  var FADE_SKIP = [
    "script", "style", "noscript", "template", "svg", "canvas", "select", "textarea", "input", "option",
    ".visually-hidden", "[data-no-ink]", "[class*='site-chat']", "[class*='cookie']", ".faq-scroll__stage",
    ".portfolio-chapter__lead", ".portfolio-chapter__more", ".home-cube-poster"
  ].join(",");
  var fades = [];
  var menuUnits = [];
  var fadeQueue = [];
  var fadeQueued = false;

  // Another script already drives this element's own opacity (GSAP leaves it inline).
  function scriptAnimated(el) {
    return !!(el.style && (el.style.opacity || el.style.visibility));
  }

  function fadeScan(scope) {
    if (!scope || scope.nodeType !== 1) return;
    var found = [];
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (!HAS_LETTER.test(n.nodeValue)) continue;
      var el = n.parentElement;
      if (!el || el.closest(".ink-c")) continue;
      if (el.classList.contains("fx-in")) { if (found.indexOf(el) < 0) found.push(el); continue; }
      var block = blockOf(el);
      if (!block) continue;
      // Small text inside an inked block (e.g. "01" next to a big name) fades on its own.
      if (block.__ink) {
        if (el.closest(FADE_SKIP)) continue;
        var wrap = document.createElement("span");
        wrap.className = "fx-in";
        n.parentNode.insertBefore(wrap, n);
        wrap.appendChild(n);
        found.push(wrap);
        continue;
      }
      if (found.indexOf(block) < 0) found.push(block);
    }
    Array.prototype.forEach.call(scope.querySelectorAll("img, video"), function (m) {
      var host = m.parentElement && m.parentElement.tagName === "PICTURE" ? m.parentElement : m;
      if (found.indexOf(host) < 0) found.push(host);
    });
    if (scope.matches && scope.matches("img, video") && found.indexOf(scope) < 0) found.push(scope);

    var units = found.filter(function (el) {
      if (el.__fx || el.__ink || el.closest(FADE_SKIP)) return false;
      if (el.querySelector(".ink-c, h1, h2, h3")) return false;
      // Hidden-at-load content (accordions, panels, menu) is adopted too and fades when it appears.
      var r = el.getBoundingClientRect();
      if ((el.tagName === "IMG" || el.tagName === "VIDEO") && r.width && r.width < 40 && r.height < 40) return false;
      return !scriptAnimated(el);
    });
    // Only the innermost unit fades, so nothing is faded twice. A container dropped for that
    // reason may still hold loose text of its own (e.g. "01" beside a <b> name): wrap it.
    var loose = [];
    units = units.filter(function (el) {
      var inner = units.some(function (other) { return other !== el && el.contains(other); });
      if (inner) looseText(el, units).forEach(function (w) { loose.push(w); });
      return !inner;
    });
    units = units.concat(loose);
    units.forEach(function (el) {
      el.__fx = true;
      el.classList.add("fx-wait");
      var chapter = el.closest(".portfolio-chapter");
      if (el.closest(".nav-overlay")) { menuUnits.push(el); return; }
      if (el.closest(".home-hero")) { heroFx.push(el); if (heroStarted) reveal(el, 600); return; }
      if (chapter) {
        trackChapter(chapter);
        chapter.__fxUnits.push(el);
        if (observing && chapter.__inkActive) {
          clearTimeout(chapter.__fxTimer);
          chapter.__fxTimer = setTimeout(function () { revealAll(chapter.__fxUnits, 60); }, CHAPTER_DELAY);
        }
        return;
      }
      fades.push(el);
      if (observing) fadeIO.observe(el);
    });
    if (units.length) root.classList.add("fx-on");
  }

  function looseText(container, units) {
    var out = [];
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!HAS_LETTER.test(n.nodeValue)) continue;
      var el = n.parentElement;
      if (!el || el.closest(".ink-c, .fx-in")) continue;
      if (blockOf(el) !== container) continue;
      if (units.some(function (u) { return u !== container && u.contains(n); })) continue;
      nodes.push(n);
    }
    nodes.forEach(function (node) {
      var wrap = document.createElement("span");
      wrap.className = "fx-in";
      node.parentNode.insertBefore(wrap, node);
      wrap.appendChild(node);
      out.push(wrap);
    });
    return out;
  }

  function reveal(el, delay) {
    if (el.__fxAnim) el.__fxAnim.cancel();
    el.classList.remove("fx-wait");
    if (!el.animate) return;
    el.__fxAnim = el.animate(
      [{ opacity: 0, translate: "0 18px" }, { opacity: 1, translate: "0 0" }],
      { duration: 700, delay: delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }
    );
  }

  function hideUnit(el) {
    if (el.__fxAnim) { el.__fxAnim.cancel(); el.__fxAnim = null; }
    el.classList.add("fx-wait");
  }

  function revealAll(list, step) {
    list.filter(function (el) { return el.isConnected; }).forEach(function (el, i) {
      reveal(el, Math.min(i * step, 500));
    });
  }

  // The menu is not scrolled into view: its items fade in on every open.
  window.addEventListener("cosgral:menu-state", function (e) {
    if (!e.detail || !e.detail.open || !menuUnits.length) return;
    menuUnits.forEach(hideUnit);
    setTimeout(function () { revealAll(menuUnits, 50); }, 120);
  });

  var fadeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var seen = entry.intersectionRect.width * entry.intersectionRect.height;
      if (entry.intersectionRatio < 0.2 && seen < window.innerWidth * window.innerHeight * 0.02) return;
      fadeIO.unobserve(entry.target);
      fadeQueue.push(entry.target);
    });
    if (fadeQueue.length && !fadeQueued) {
      fadeQueued = true;
      requestAnimationFrame(function () {
        var batch = fadeQueue; fadeQueue = []; fadeQueued = false;
        batch.sort(function (a, b) {
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        batch.forEach(function (el, i) { reveal(el, Math.min(i * 60, 420)); });
      });
    }
  }, { threshold: [0, 0.2, 0.5] });

  // Galleries clone their items: copies of hidden letters or blocks are not tracked, so show them.
  function releaseClones(node) {
    var list = Array.prototype.slice.call(node.querySelectorAll(".fx-wait, .ink-hide"));
    if (node.matches(".fx-wait, .ink-hide")) list.push(node);
    list.forEach(function (el) {
      if (el.classList.contains("fx-wait") && !el.__fx) el.classList.remove("fx-wait");
      if (el.classList.contains("ink-hide") && ownChars && !ownChars.has(el)) el.classList.remove("ink-hide");
    });
  }

  function heroGo() {
    if (heroStarted) return;
    heroStarted = true;
    heroItems.forEach(function (item) { if (item.state === "pending") play(item); });
    setTimeout(function () { revealAll(heroFx, 120); }, 600);
  }

  function startHero() {
    var waitForCube = root.classList.contains("cube-fly") && document.getElementById("hero-3d") && !window.cosgralHeroTitle;
    if (!waitForCube) { heroGo(); return; }
    window.addEventListener("cosgral:hero-title", heroGo, { once: true });
    setTimeout(heroGo, 5000);
  }

  function init() {
    scan(document.body);
    fadeScan(document.body);

    // Galleries and expanded panels build their titles after load.
    var queue = [], queued = false;
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (node) {
          if (node.nodeType === 1 && (node.classList.contains("ink-c") || node.classList.contains("ink-canvas") || node.classList.contains("fx-in"))) return;
          if (node.nodeType === 1) releaseClones(node);
          if (node.nodeType === 3 && node.parentElement && node.parentElement.classList.contains("ink-c")) return;
          var target = node.nodeType === 3 ? node.parentElement : node;
          if (target && target.nodeType === 1) queue.push(target);
        });
      });
      if (queue.length && !queued) {
        queued = true;
        requestAnimationFrame(function () {
          var list = queue; queue = []; queued = false;
          list.forEach(function (node) { if (node.isConnected) { scan(node); fadeScan(node); } });
        });
      }
    }).observe(document.body, { childList: true, subtree: true });

    var start = function () {
      observing = true;
      managed.forEach(function (item) {
        if (item.state !== "pending") return;
        if (item.chapter) { if (item.chapter.__inkActive) schedule(item, CHAPTER_DELAY); }
        else io.observe(item.el);
      });
      fades.forEach(function (el) { fadeIO.observe(el); });
      startHero();
      document.querySelectorAll(".portfolio-chapter").forEach(function (ch) {
        if (ch.__fxUnits && ch.__inkActive) revealAll(ch.__fxUnits, 60);
      });
      // Closed menu items stay revealed when not open, so nothing is left hidden if the event never fires.
      if (!root.classList.contains("is-nav-menu-open")) menuUnits.forEach(function (el) { el.classList.remove("fx-wait"); });
    };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { whenPageVisible(start); });
  }

  window.addEventListener("cosgral:langchange", afterTextChange);
  window.addEventListener("cosgral:i18n-ready", afterTextChange);

  // Loaded at the end of <body>: split before first paint so nothing flashes.
  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
