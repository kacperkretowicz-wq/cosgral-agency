/* Index gallery for Grafiki, after the AMANA studio index. Every client gets
 * a giant black title running across the screen, with its work below in captioned rows that bleed past both edges.
 * While scrolling, the row nearest the middle is shown largest and rows drift
 * sideways. Choosing a piece slides in a white sheet with it at full size and
 * its description. Opening gathers the pieces floating in the chapter into
 * their places and brings the rest in from every side; closing sends them
 * all back where they came from.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var body = document.body;
  var reduced = root.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  var en = function () { return (root.lang || "pl").toLowerCase().indexOf("en") === 0; };
  var t = function (key, fallback) { var i = window.cosgralI18n; var v = i && i.t && i.t(key); return v && v !== key ? v : fallback; };
  function rnd(i, k) {
    var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }
  function ease(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x) * (1 - x * 0.02); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function createIndexGallery(cfg) {
    var chapter = document.getElementById(cfg.chapter);
    if (!chapter) return;
    var layer = el("section", "pf-gfx " + (cfg.modifier || ""));
    layer.hidden = true;
    layer.setAttribute("aria-label", cfg.label);
    layer.innerHTML =
      '<div class="pf-gfx__bg"></div>' +
      '<div class="pf-gfx__scroll"><div class="pf-gfx__sheet"></div></div>' +
      '<div class="pf-gfx__ghosts" aria-hidden="true"></div>' +
      '<div class="pf-gfx__panel" hidden><button type="button" class="pf-gfx__dim" tabindex="-1" aria-hidden="true"></button>' +
      '<div class="pf-gfx__card" role="dialog" aria-modal="true"><div class="pf-gfx__media"></div><aside class="pf-gfx__info"></aside>' +
      '<button type="button" class="pf-gfx__x" aria-label="Zamknij">×</button></div></div>';
    body.appendChild(layer);
    var scroller = layer.querySelector(".pf-gfx__scroll");
    var sheet = layer.querySelector(".pf-gfx__sheet");
    var ghostsEl = layer.querySelector(".pf-gfx__ghosts");
    var panel = layer.querySelector(".pf-gfx__panel");
    var media = panel.querySelector(".pf-gfx__media");
    var info = panel.querySelector(".pf-gfx__info");
    var closeBtn = el("button", "pf-wall__close pf-gfx__close");
    closeBtn.type = "button";
    closeBtn.hidden = true;
    body.appendChild(closeBtn);

    var groups = [], items = [], cards = [], rows = [];
    var phase = "closed", borrowed = [], anim = 0, fxRaf = 0, current = -1, fx = 0, builtFor = "", panelCloseTimer = 0;

    cfg.load().then(function (list) {
      list.forEach(function (g, gi) {
        var group = { name: g.name, data: g, items: [] };
        g.items.forEach(function (it, k) {
          var item = Object.assign({ index: items.length, group: gi, client: g.name, n: k + 1 }, it);
          items.push(item);
          group.items.push(item);
        });
        groups.push(group);
      });
      build();
    }).catch(function () {});

    function rowHeight() { return window.innerHeight * (window.innerWidth <= 900 ? cfg.rowMobile : cfg.row); }
    function build() {
      builtFor = window.innerWidth + "x" + window.innerHeight;
      sheet.textContent = "";
      cards = [];
      rows = [];
      var rowh = rowHeight(), gap = window.innerWidth <= 900 ? 10 : 16;
      groups.forEach(function (g, gi) {
        var title = el("div", "pf-gfx__title");
        var track = el("div", "pf-gfx__track");
        var label = (g.name + " © ").toUpperCase();
        for (var k = 0; k < 6; k++) {
          var span = el("span", null, label);
          if (k) span.setAttribute("aria-hidden", "true");
          track.appendChild(span);
        }
        track.style.animationDuration = (22 + gi * 4) + "s";
        track.style.animationDirection = gi % 2 ? "reverse" : "normal";
        title.appendChild(track);
        title.appendChild(el("p", "pf-gfx__count", cfg.subtitle(g.data, g.items.length)));
        sheet.appendChild(title);
        var avg = g.items.reduce(function (a, it) { return a + it.ratio; }, 0) / g.items.length;
        var fill = Math.ceil(window.innerWidth / (rowh * avg + gap)) + 1;
        var perRow = cfg.perRow ? cfg.perRow(g.items.length, fill) : fill;
        for (var r = 0; r * perRow < g.items.length; r++) {
          var row = el("div", "pf-gfx__row");
          row.dataset.dir = (rows.length % 2) ? "-1" : "1";
          g.items.slice(r * perRow, (r + 1) * perRow).forEach(function (item) {
            var card = el("button", "pf-gfx__item");
            card.type = "button";
            card.style.setProperty("--ratio", item.ratio.toFixed(3));
            card.setAttribute("aria-label", item.client + " — " + item.n);
            var fig = el("span", "pf-gfx__fig");
            var img = el("img");
            img.loading = "lazy";
            img.src = item.image;
            img.alt = "";
            img.decoding = "async";
            fig.appendChild(img);
            if (item.badge) fig.appendChild(el("span", "pf-gfx__badge", item.badge));
            card.appendChild(fig);
            var cap = el("span", "pf-gfx__cap");
            cap.appendChild(el("b", null, item.caption || item.client));
            cap.appendChild(el("i", null, pad(item.n)));
            card.appendChild(cap);
            card.addEventListener("click", function () { if (phase === "open") show(item.index); });
            row.appendChild(card);
            cards[item.index] = card;
          });
          sheet.appendChild(row);
          rows.push(row);
        }
      });
    }

    /* The row nearest the middle at full size; rows drift sideways */
    function rowFx() {
      fxRaf = 0;
      var H = window.innerHeight, top = scroller.scrollTop;
      var geometry = rows.map(function (row) {
        return { top: row.offsetTop, height: row.offsetHeight, width: row.scrollWidth };
      });
      rows.forEach(function (row, i) {
        var bounds = geometry[i];
        var c = bounds.top + bounds.height / 2 - top - H / 2;
        var d = Math.min(1, Math.abs(c) / H);
        var s = 1 - d * 0.16 * fx;
        var drift = (bounds.top - top) * 0.12 * fx * Number(row.dataset.dir);
        var room = Math.max(0, (bounds.width - window.innerWidth) / 2);
        drift = Math.max(-room - 40, Math.min(room + 40, drift));
        row.style.transform = "translate3d(" + drift.toFixed(1) + "px,0,0) scale(" + s.toFixed(4) + ")";
      });
    }
    scroller.addEventListener("scroll", function () { if (!fxRaf) fxRaf = requestAnimationFrame(rowFx); }, { passive: true });
    function rampFx(to) {
      var from = fx, start = performance.now(), dur = reduced ? 1 : 700;
      (function tick(now) {
        var p = Math.min(1, (now - start) / dur);
        fx = from + (to - from) * (1 - Math.pow(1 - p, 3));
        rowFx();
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    }

    /* ——— Flights between the chapter and the gallery ——— */
    function visible(r) { return r.bottom > -40 && r.top < window.innerHeight + 40 && r.right > -40 && r.left < window.innerWidth + 40; }
    function offscreen(r) {
      var W = window.innerWidth, H = window.innerHeight;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = cx - W / 2, dy = cy - H / 2, len = Math.max(1, Math.hypot(dx, dy));
      var reach = Math.max(W, H) * 0.8 + Math.max(r.width, r.height);
      return { left: r.left + dx / len * reach, top: r.top + dy / len * reach, width: r.width * 0.85, height: r.height * 0.85 };
    }
    function box(r) { return { left: r.left, top: r.top, width: r.width, height: r.height }; }
    function chapterTwins() {
      var twins = [], used = {};
      Array.prototype.forEach.call(chapter.querySelectorAll(cfg.twins), function (node) {
        var img = node.querySelector("img");
        var r = node.getBoundingClientRect();
        if (!img || !img.src || r.width < 4 || !visible(r)) return;
        var path = img.src.replace(location.origin + "/", "").split("?")[0];
        for (var i = 0; i < items.length; i++) {
          if (!used[i] && items[i].image === path) { used[i] = true; twins.push({ i: i, el: node, src: img.getAttribute("src") }); break; }
        }
      });
      return twins;
    }
    function fly(list, done) {
      cancelAnimationFrame(anim);
      ghostsEl.textContent = "";
      list.forEach(function (g) {
        g.el = el("img", "pf-gfx__ghost");
        g.el.src = items[g.i].image;
        g.el.alt = "";
        ghostsEl.appendChild(g.el);
      });
      var start = performance.now(), dur = reduced ? 1 : 1150;
      (function tick(now) {
        var all = true;
        list.forEach(function (g) {
          var p = Math.max(0, Math.min(1, (now - start - g.delay) / dur));
          if (p < 1) all = false;
          var e = ease(p), a = g.from, b = g.to;
          g.el.style.left = (a.left + (b.left - a.left) * e).toFixed(1) + "px";
          g.el.style.top = (a.top + (b.top - a.top) * e).toFixed(1) + "px";
          g.el.style.width = (a.width + (b.width - a.width) * e).toFixed(1) + "px";
          g.el.style.height = (a.height + (b.height - a.height) * e).toFixed(1) + "px";
        });
        if (!all) anim = requestAnimationFrame(tick);
        else { ghostsEl.textContent = ""; if (done) done(); }
      })(start);
    }

    function open() {
      if (phase !== "closed" || !items.length) return;
      if (builtFor !== window.innerWidth + "x" + window.innerHeight) build();
      phase = "opening";
      fx = 0;
      layer.hidden = false;
      layer.classList.add("is-staging");
      scroller.scrollTop = 0;
      rowFx();
      closeBtn.textContent = en() ? "Back" : "Wróć";
      closeBtn.hidden = false;
      body.classList.add("pf-gfx-open");
      window.dispatchEvent(new CustomEvent("pf-wall-open"));
      var twins = chapterTwins(), twinOf = {};
      twins.forEach(function (tw) { twinOf[tw.i] = tw; });
      borrowed = twins;
      var list = [];
      cards.forEach(function (card, i) {
        var r = card.querySelector(".pf-gfx__fig").getBoundingClientRect();
        var tw = twinOf[i];
        if (!tw && !visible(r)) return;
        list.push({ i: i, from: tw ? box(tw.el.getBoundingClientRect()) : offscreen(r), to: box(r), delay: tw ? 0 : 90 + rnd(i, 7) * 520 });
      });
      borrowed.forEach(function (tw) { tw.el.classList.add("pf-gfx-borrowed"); });
      requestAnimationFrame(function () { layer.classList.add("is-in"); });
      fly(list, function () {
        layer.classList.remove("is-staging");
        phase = "open";
        rampFx(1);
      });
    }

    function close() {
      if (phase !== "open") return;
      hideSheet(true);
      phase = "closing";
      closeBtn.hidden = true;
      window.dispatchEvent(new CustomEvent("pf-wall-close"));
      var twinOf = {};
      borrowed.forEach(function (tw) { twinOf[tw.i] = tw; });
      var list = [];
      cards.forEach(function (card, i) {
        var r = card.querySelector(".pf-gfx__fig").getBoundingClientRect();
        var tw = twinOf[i];
        if (!tw && !visible(r)) return;
        list.push({ i: i, from: box(r), to: tw ? box(tw.el.getBoundingClientRect()) : offscreen(r), delay: tw ? 120 : rnd(i, 9) * 260 });
      });
      layer.classList.add("is-staging");
      layer.classList.remove("is-in");
      fly(list, function () {
        layer.hidden = true;
        layer.classList.remove("is-staging");
        body.classList.remove("pf-gfx-open");
        borrowed.forEach(function (tw) {
          var img = tw.el.querySelector("img");
          if (img && img.getAttribute("src") !== tw.src) img.setAttribute("src", tw.src);
          tw.el.classList.remove("pf-gfx-borrowed");
        });
        borrowed = [];
        phase = "closed";
      });
    }

    /* ——— The white sheet ——— */
    function show(i) {
      clearTimeout(panelCloseTimer);
      current = i;
      var item = items[i];
      releaseMedia();
      media.textContent = "";
      var m;
      if (item.video) {
        m = el("video");
        m.src = item.video;
        m.poster = item.poster || item.image;
        m.loop = true;
        m.playsInline = true;
        m.setAttribute("playsinline", "");
        m.muted = !!cfg.muteVideo;
      } else {
        m = el("img");
        m.src = item.full || item.image;
        m.alt = item.client + " — " + item.n;
      }
      media.appendChild(m);
      info.textContent = "";
      cfg.describe(item, groups[item.group].data, info, groups[item.group].items.length);
      var nav = el("div", "pf-gfx__nav");
      var prev = el("button", null, "←"); prev.type = "button"; prev.setAttribute("aria-label", en() ? "Previous" : "Poprzednia");
      var next = el("button", null, "→"); next.type = "button"; next.setAttribute("aria-label", en() ? "Next" : "Następna");
      prev.addEventListener("click", function () { stepSheet(-1); });
      next.addEventListener("click", function () { stepSheet(1); });
      nav.appendChild(prev); nav.appendChild(next);
      info.appendChild(nav);
      if (panel.hidden) {
        panel.hidden = false;
        requestAnimationFrame(function () { panel.classList.add("is-in"); syncPlayback(); });
      }
      syncPlayback();
      panel.querySelector(".pf-gfx__x").focus({ preventScroll: true });
    }
    function releaseMedia() {
      var v = media.querySelector("video");
      if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    }
    function syncPlayback() {
      var v = media.querySelector("video");
      if (!v) return;
      if (document.hidden || panel.hidden || !panel.classList.contains("is-in") || root.classList.contains("is-nav-menu-open")) { v.pause(); return; }
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        if (media.contains(v) && !document.hidden && !panel.hidden && panel.classList.contains("is-in") && !root.classList.contains("is-nav-menu-open")) {
          v.muted = true; v.play().catch(function () {});
        }
      });
    }
    function hideSheet(now) {
      if (panel.hidden) return;
      var v = media.querySelector("video");
      if (v) v.pause();
      panel.classList.remove("is-in");
      clearTimeout(panelCloseTimer);
      var done = function () { panel.hidden = true; releaseMedia(); media.textContent = ""; current = -1; };
      if (now) done(); else panelCloseTimer = setTimeout(done, 650);
    }
    function stepSheet(d) {
      if (current < 0) return;
      var list = cfg.stepAcross ? items : groups[items[current].group].items;
      var k = list.indexOf(items[current]);
      show(list[(k + d + list.length) % list.length].index);
    }
    panel.querySelector(".pf-gfx__x").addEventListener("click", function () { hideSheet(false); });
    panel.querySelector(".pf-gfx__dim").addEventListener("click", function () { hideSheet(false); });

    closeBtn.addEventListener("click", close);
    var sel = "#" + cfg.chapter + " [data-tile-expand-hit], #" + cfg.chapter + " [data-tile-expand]";
    window.addEventListener("click", function (e) {
      var target = e.target.closest && e.target.closest(sel);
      if (!target || e.defaultPrevented || window.__pfCubeDragged) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
    }, true);
    /* While the gallery is up it scrolls on its own; the slider must not move */
    window.addEventListener("wheel", function (e) { if (phase !== "closed") e.stopImmediatePropagation(); }, { capture: true, passive: true });
    window.addEventListener("keydown", function (e) {
      if (phase === "closed" || document.documentElement.classList.contains("is-nav-menu-open")) return;
      if (e.key === "Escape") { if (!panel.hidden) hideSheet(false); else close(); }
      if (!panel.hidden && e.key === "ArrowRight") stepSheet(1);
      if (!panel.hidden && e.key === "ArrowLeft") stepSheet(-1);
      if (e.key !== "Tab" && e.key !== "Enter" && e.key !== " ") e.stopImmediatePropagation();
    }, true);
    window.addEventListener("resize", function () { if (phase === "open") rowFx(); }, { passive: true });
    document.addEventListener("visibilitychange", syncPlayback);
    if (window.MutationObserver) new MutationObserver(syncPlayback).observe(root, { attributes: true, attributeFilter: ["class"] });
  }

  function addRows(info, pairs) {
    var dl = el("dl");
    pairs.forEach(function (pair) { dl.appendChild(el("dt", null, pair[0])); dl.appendChild(el("dd", null, pair[1])); });
    info.appendChild(dl);
  }

  /* ——— Grafiki ——— */
  createIndexGallery({
    chapter: "grafiki",
    label: "Grafiki",
    twins: ".chapter-show__tile",
    row: 0.3,
    rowMobile: 0.22,
    load: function () {
      return fetch("portfolio-media/graphics/manifest.json?v=20261018self1").then(function (r) { return r.json(); }).then(function (m) {
        return (m.groups || []).map(function (g) {
          return {
            name: g.name || g.id,
            self: !!g.self,
            items: (g.items || []).map(function (it) {
              return {
                image: it.type === "video" ? it.poster : it.src,
                full: it.type === "video" ? null : (it.full || it.src),
                video: it.type === "video" ? (it.full || it.src) : null,
                ratio: (it.w && it.h) ? it.w / it.h : 0.8
              };
            })
          };
        });
      });
    },
    subtitle: function (g, n) {
      return n + (en() ? " pieces — posts · stories · key visuals" : " realizacji — posty · stories · key visuale");
    },
    describe: function (item, g, info, total) {
      info.appendChild(el("strong", null, item.client));
      info.appendChild(el("span", "pf-gfx__num", pad(item.n) + " / " + total));
      var fmt = ["Format", item.video ? "Motion / story" : item.ratio < 0.7 ? "Story" : "Post / key visual"];
      addRows(info, g.self ? [fmt] : [
        [en() ? "Client" : "Klient", item.client],
        fmt
      ]);
    }
  });
})();
