/* Montaż — the reel wall. Tapping the cube sends a shockwave out of it that
 * uncovers every reel at once: small reels scattered over white around a
 * centred title, ordered by client on a loose, balanced grid. A reel under
 * the pointer grows; a chosen reel grows much larger, plays with sound, and
 * nudges its neighbours just far enough that none of them is hidden.
 * Every tile eases toward its target on a spring, so nothing ever jumps.
 */
(function () {
  "use strict";
  var chapter = document.getElementById("montaz");
  if (!chapter) return;
  var root = document.documentElement;
  var body = document.body;
  var reduced = root.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = function () { return (root.lang || "pl").toLowerCase().indexOf("en") === 0 ? "en" : "pl"; };

  function rnd(i, k) {
    var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }
  /* Shared with the wall drawn under the black water (portfolio-horizon.js) */
  window.__pfWallFrame = function (W, H) {
    var mobile = W <= 900;
    return { mobile: mobile, cols: mobile ? 5 : 10, top: mobile ? 118 : 124, side: mobile ? 16 : Math.max(28, Math.round(W * 0.05)), bottom: mobile ? 28 : 56 };
  };
  window.__pfWallLayout = function (W, H, n) {
    var f = window.__pfWallFrame(W, H);
    var rows = Math.ceil(n / f.cols);
    var aw = W - 2 * f.side, ah = H - f.top - f.bottom;
    var cw = aw / f.cols, ch = ah / rows;
    var rects = [];
    for (var i = 0; i < n; i++) {
      var c = i % f.cols, r = Math.floor(i / f.cols);
      var inRow = Math.min(f.cols, n - r * f.cols);
      var shift = (f.cols - inRow) * cw / 2;
      var th = ch * (0.6 + rnd(i, 1) * 0.2);
      var tw = th * 9 / 16;
      if (tw > cw * 0.78) { tw = cw * 0.78; th = tw * 16 / 9; }
      /* Never smaller than a comfortable target */
      if (tw < 46) { tw = Math.min(46, cw * 0.86); th = Math.min(tw * 16 / 9, ch * 0.9); }
      var cx = f.side + shift + cw * (c + 0.5) + (rnd(i, 2) - 0.5) * (cw - tw) * 0.7;
      var cy = f.top + ch * (r + 0.5) + (rnd(i, 3) - 0.5) * (ch - th) * 0.7;
      rects.push({ x: cx - tw / 2, y: cy - th / 2, w: tw, h: th, depth: 0.35 + rnd(i, 4) * 0.65 });
    }
    return rects;
  };

  var wall = document.createElement("section");
  wall.className = "pf-wall";
  wall.hidden = true;
  wall.setAttribute("aria-label", "Montaż wideo");
  wall.innerHTML = '<div class="pf-wall__title" aria-hidden="true"><strong></strong><span></span></div><div class="pf-wall__field" role="list"></div>';
  body.appendChild(wall);
  var field = wall.querySelector(".pf-wall__field");
  var titleEl = wall.querySelector(".pf-wall__title");
  /* Above the navigation bar, so it can always be pressed */
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "pf-wall__close";
  closeBtn.hidden = true;
  body.appendChild(closeBtn);
  /* Outside the clipped wall, so the front glows on both sides of its edge */
  var waveCanvas = document.createElement("canvas");
  waveCanvas.className = "pf-wall__wave";
  waveCanvas.setAttribute("aria-hidden", "true");
  body.appendChild(waveCanvas);
  var wctx = waveCanvas.getContext("2d");

  var items = [];
  var tiles = [];
  var base = [];
  var cur = [];
  var active = -1;
  var hover = -1;
  var phase = "closed";
  var anim = 0;
  var loop = 0;
  var px = 0, py = 0, sx = 0, sy = 0;
  var lastT = 0;

  fetch("portfolio-media/reels/manifest.json?v=20261018self1").then(function (r) { return r.json(); }).then(function (m) {
    var clients = [];
    (m.groups || []).forEach(function (g) {
      clients.push(g.name || g.id);
      (g.items || []).forEach(function (item, k) {
        items.push({ client: g.name || g.id, n: k + 1, first: k === 0, poster: item.poster, src: item.full || item.src });
      });
    });
    titleEl.querySelector("strong").textContent = lang() === "en" ? "Video editing" : "Montaż wideo";
    titleEl.querySelector("span").textContent = items.length + " — " + clients.join(" · ");
    build();
  }).catch(function () {});

  function build() {
    field.textContent = "";
    tiles = items.map(function (item, i) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "pf-wall__tile" + (item.first ? " is-first" : "");
      tile.setAttribute("role", "listitem");
      tile.setAttribute("aria-label", item.client + " — " + item.n);
      var img = document.createElement("img");
      img.loading = "lazy";
      img.src = item.poster;
      img.alt = "";
      img.decoding = "async";
      tile.appendChild(img);
      var cap = document.createElement("span");
      cap.className = "pf-wall__cap";
      var b = document.createElement("b");
      b.textContent = item.client;
      cap.appendChild(b);
      cap.appendChild(document.createTextNode((item.n < 10 ? " 0" : " ") + item.n));
      tile.appendChild(cap);
      tile.addEventListener("click", function () { toggle(i); });
      tile.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hover = i; wake(); } });
      tile.addEventListener("pointerleave", function () { if (hover === i) { hover = -1; wake(); } });
      tile.addEventListener("focus", function () { hover = i; wake(); });
      tile.addEventListener("blur", function () { if (hover === i) { hover = -1; wake(); } });
      field.appendChild(tile);
      return tile;
    });
    measure(true);
  }

  function measure(snap) {
    base = window.__pfWallLayout(window.innerWidth, window.innerHeight, items.length);
    if (snap || cur.length !== base.length) cur = base.map(function (b) { return { x: b.x, y: b.y, w: b.w, h: b.h }; });
  }

  function clampBox(cx, cy, w, h, f, W, H) {
    var minX = f.side + w / 2, maxX = W - f.side - w / 2;
    var minY = f.top + h / 2, maxY = H - f.bottom - h / 2;
    return [minX > maxX ? W / 2 : Math.min(maxX, Math.max(minX, cx)), minY > maxY ? (f.top + H - f.bottom) / 2 : Math.min(maxY, Math.max(minY, cy))];
  }

  /* Where each tile wants to be this frame */
  function targets() {
    var W = window.innerWidth, H = window.innerHeight, f = window.__pfWallFrame(W, H);
    var out = base.map(function (b) { return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, w: b.w, h: b.h }; });
    var A = null;
    if (active >= 0) {
      var a = out[active];
      var ah = Math.min((H - f.top - f.bottom) * 0.94, H * (f.mobile ? 0.5 : 0.62));
      var aw = ah * 9 / 16;
      var c = clampBox(a.cx, a.cy, aw, ah, f, W, H);
      A = { cx: c[0], cy: c[1], w: aw, h: ah };
      out[active] = A;
    }
    out.forEach(function (t, i) {
      if (i === active) return;
      if (i === hover) {
        var hc = clampBox(t.cx, t.cy, t.w * 2, t.h * 2, f, W, H);
        t.cx = hc[0]; t.cy = hc[1]; t.w *= 2; t.h *= 2;
      }
      if (!A) return;
      /* Step aside just enough to stay in view */
      var m = 14;
      var ox = (A.w / 2 + t.w / 2 + m) - Math.abs(t.cx - A.cx);
      var oy = (A.h / 2 + t.h / 2 + m) - Math.abs(t.cy - A.cy);
      if (ox > 0 && oy > 0) {
        if (ox < oy) t.cx += (t.cx >= A.cx ? 1 : -1) * ox;
        else t.cy += (t.cy >= A.cy ? 1 : -1) * oy;
        var cc = clampBox(t.cx, t.cy, t.w, t.h, f, W, H);
        t.cx = cc[0]; t.cy = cc[1];
      }
    });
    return out;
  }

  function step(now) {
    loop = 0;
    if (phase === "closed" || document.hidden || root.classList.contains("is-nav-menu-open")) { lastT = 0; return; }
    var dt = Math.min(0.05, Math.max(0.001, (now - (lastT || now - 16)) / 1000));
    lastT = now;
    var k = reduced ? 1 : 1 - Math.exp(-dt * 9);
    sx += (px - sx) * (1 - Math.exp(-dt * 3));
    sy += (py - sy) * (1 - Math.exp(-dt * 3));
    var moving = Math.abs(px - sx) + Math.abs(py - sy) > .00005;
    var tg = targets();
    tiles.forEach(function (tile, i) {
      var t = tg[i], c = cur[i];
      c.x += (t.cx - t.w / 2 - c.x) * k;
      c.y += (t.cy - t.h / 2 - c.y) * k;
      c.w += (t.w - c.w) * k;
      c.h += (t.h - c.h) * k;
      if (Math.abs(t.cx - t.w / 2 - c.x) + Math.abs(t.cy - t.h / 2 - c.y) +
          Math.abs(t.w - c.w) + Math.abs(t.h - c.h) > .001) moving = true;
      var still = i === active || i === hover;
      var d = still ? 0 : base[i].depth * 16;
      tile.style.left = c.x.toFixed(1) + "px";
      tile.style.top = c.y.toFixed(1) + "px";
      tile.style.width = c.w.toFixed(1) + "px";
      tile.style.height = c.h.toFixed(1) + "px";
      tile.style.transform = "translate3d(" + (-sx * d).toFixed(2) + "px," + (-sy * d).toFixed(2) + "px,0)";
      tile.classList.toggle("is-hover", i === hover && i !== active);
    });
    if (moving) wake(); else lastT = 0;
  }
  function wake() {
    if (!loop && phase !== "closed" && !document.hidden && !root.classList.contains("is-nav-menu-open")) loop = requestAnimationFrame(step);
  }
  window.addEventListener("pointermove", function (e) {
    px = e.clientX / window.innerWidth - 0.5;
    py = e.clientY / window.innerHeight - 0.5;
    wake();
  }, { passive: true });

  function stop(i) {
    var tile = tiles[i];
    if (!tile) return;
    tile.classList.remove("is-active");
    var video = tile.querySelector("video");
    if (video) {
      video.pause();
      setTimeout(function () {
        if (!tile.classList.contains("is-active")) { video.removeAttribute("src"); video.load(); video.remove(); }
      }, 700);
    }
  }
  function toggle(i) {
    if (phase !== "open") return;
    var prev = active;
    if (prev >= 0) stop(prev);
    if (prev === i) { active = -1; wake(); return; }
    active = i;
    wake();
    var tile = tiles[i];
    tile.classList.add("is-active");
    var video = tile.querySelector("video");
    if (!video) {
      video = document.createElement("video");
      video.src = items[i].src;
      video.poster = items[i].poster;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      tile.insertBefore(video, tile.querySelector(".pf-wall__cap"));
    }
    video.muted = false;
    var p = video.play();
    if (p && p.catch) p.catch(function () {
      if (phase === "open" && active === i && !document.hidden && !root.classList.contains("is-nav-menu-open") && tile.classList.contains("is-active")) {
        video.muted = true; video.play().catch(function () {});
      }
    });
  }

  /* ——— The shockwave: an irregular front grown from the cube ——— */
  function centre() {
    var attr = window.innerWidth <= 900 ? "data-cube-at-m" : "data-cube-at";
    var v = (chapter.getAttribute(attr) || "0.5 0.5").split(" ").map(Number);
    return [v[0] * window.innerWidth, v[1] * window.innerHeight];
  }
  function noise(a, t) {
    return 0.55 * Math.sin(3 * a + t * 1.3) + 0.35 * Math.sin(5 * a - t * 1.9) + 0.22 * Math.sin(9 * a + t * 2.6) + 0.12 * Math.sin(15 * a - t * 3.4);
  }
  function outline(cx, cy, r, t, scale) {
    var pts = [];
    for (var k = 0; k < 96; k++) {
      var a = k / 96 * Math.PI * 2;
      var rr = Math.max(0, r * scale * (1 + 0.12 * noise(a, t)));
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
  }
  function drawFront(pts, alpha, width) {
    wctx.beginPath();
    pts.forEach(function (p, k) { if (k) wctx.lineTo(p[0], p[1]); else wctx.moveTo(p[0], p[1]); });
    wctx.closePath();
    wctx.strokeStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
    wctx.lineWidth = width;
    wctx.stroke();
  }
  function run(opening, done) {
    cancelAnimationFrame(anim);
    var W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; waveCanvas.height = H;
    var c = centre();
    var far = Math.max(Math.hypot(c[0], c[1]), Math.hypot(W - c[0], c[1]), Math.hypot(c[0], H - c[1]), Math.hypot(W - c[0], H - c[1])) * 1.2;
    var start = performance.now(), delay = opening ? 260 : 0, dur = reduced ? 1 : opening ? 1500 : 1000;
    (function frame(now) {
      var p = Math.min(1, Math.max(0, (now - start - delay) / dur));
      var e = opening ? 1 - Math.pow(1 - p, 3) : 1 - p * p * (3 - 2 * p);
      var t = now / 1000;
      var r = e * far;
      var pts = outline(c[0], c[1], r, t, 1);
      wall.style.clipPath = "polygon(" + pts.map(function (q) { return q[0].toFixed(1) + "px " + q[1].toFixed(1) + "px"; }).join(",") + ")";
      wctx.clearRect(0, 0, W, H);
      var fade = opening ? 1 - p : p;
      if (r > 1) {
        wctx.shadowColor = "rgba(255,255,255,0.9)";
        wctx.shadowBlur = 22;
        drawFront(pts, 0.85 * Math.min(1, fade * 1.4 + 0.15), 2.4);
        wctx.shadowBlur = 0;
        drawFront(outline(c[0], c[1], r, t + 0.6, 0.74), 0.32 * fade, 1.4);
        drawFront(outline(c[0], c[1], r, t + 1.2, 0.5), 0.2 * fade, 1.2);
      }
      if (p < 1) anim = requestAnimationFrame(frame);
      else {
        wctx.clearRect(0, 0, W, H);
        if (done) done();
      }
    })(start);
  }

  function open() {
    if (phase !== "closed" || !items.length) return;
    phase = "opening";
    measure(true);
    wall.hidden = false;
    wall.style.clipPath = "polygon(0 0,0 0,0 0)";
    closeBtn.textContent = lang() === "en" ? "Back" : "Wróć";
    closeBtn.hidden = false;
    body.classList.add("pf-wall-open");
    window.dispatchEvent(new CustomEvent("pf-wall-open"));
    lastT = 0;
    cancelAnimationFrame(loop);
    loop = 0; wake();
    run(true, function () {
      wall.style.clipPath = "";
      phase = "open";
    });
  }
  function close() {
    if (phase !== "open") return;
    phase = "closing";
    if (active >= 0) { stop(active); active = -1; }
    hover = -1;
    closeBtn.hidden = true;
    window.dispatchEvent(new CustomEvent("pf-wall-close"));
    run(false, function () {
      wall.hidden = true;
      wall.style.clipPath = "";
      body.classList.remove("pf-wall-open");
      phase = "closed";
      cancelAnimationFrame(loop); loop = 0; lastT = 0;
    });
  }

  closeBtn.addEventListener("click", close);
  /* The cube and "see more" in Montaż open the wall instead of the old gallery */
  window.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("#montaz [data-tile-expand-hit], #montaz [data-tile-expand]");
    if (!t || e.defaultPrevented || window.__pfCubeDragged) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open();
  }, true);
  /* While the wall is up, the slider underneath must not move */
  window.addEventListener("wheel", function (e) { if (phase !== "closed") e.stopImmediatePropagation(); }, { capture: true, passive: true });
  window.addEventListener("keydown", function (e) {
    if (phase === "closed" || document.documentElement.classList.contains("is-nav-menu-open")) return;
    if (e.key === "Escape") close();
    if (e.key !== "Tab" && e.key !== "Enter" && e.key !== " ") e.stopImmediatePropagation();
  }, true);
  window.addEventListener("resize", function () { measure(false); wake(); }, { passive: true });
  function syncActivity() {
    if (document.hidden || root.classList.contains("is-nav-menu-open")) {
      cancelAnimationFrame(loop); loop = 0; lastT = 0;
      tiles.forEach(function (tile) { var video = tile.querySelector("video"); if (video) video.pause(); });
    } else {
      wake();
      var video = active >= 0 && tiles[active].querySelector("video");
      if (video && phase === "open") video.play().catch(function () {});
    }
  }
  document.addEventListener("visibilitychange", syncActivity);
  if (window.MutationObserver) new MutationObserver(syncActivity).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
