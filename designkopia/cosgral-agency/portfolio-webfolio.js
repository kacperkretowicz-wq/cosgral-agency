/* Strony internetowe — after the Marcel Eberharter site. The projects stand
 * in a vertical carousel on white: the chosen one large in the middle, its
 * neighbours peeking in from above and below, the name set thin across the
 * picture. Scrolling steps through them; choosing one blows its picture up
 * to the whole screen and turns into the project page — the recording of the
 * site first, then its sections laid out like a magazine spread between the
 * paragraphs of the description. Opening gathers the screenshots floating in
 * the chapter into the carousel; closing sends them back where they were.
 */
(function () {
  "use strict";
  var chapter = document.getElementById("strony");
  if (!chapter) return;
  var root = document.documentElement;
  var body = document.body;
  var reduced = root.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  function en() { return (root.lang || "pl").toLowerCase().indexOf("en") === 0; }
  function t(key, fallback) { var i = window.cosgralI18n; var v = i && i.t && i.t(key); return v && v !== key ? v : fallback; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function expo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x) * (1 - x * 0.02); }
  function inOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  var V = "portfolio-media/showcase/web/";
  var SEC = V + "sections/";
  var PROJECTS = [
    { id: "aleksandra", name: "Aleksandra Szczepanek", lead: ["Makijażystka i szkolenia", "Makeup artist & courses"], site: "" /* adres strony – uzupełnić, wtedy pojawi się „Odwiedź stronę ↗” */, video: "aleksandra-szczepanek", ratio: 1280 / 722, tags: ["Strona usługowa", "Sklep ze szkoleniami", "Rezerwacje"], tagsEn: ["Service website", "Course shop", "Enquiries"] },
    { id: "juicy", name: "Juicy Events", lead: ["Agencja eventowa", "Event agency"], site: "https://juicyevents.pl/", video: "juicy-events", mediaV: "20261018j2", ratio: 1280 / 722, tags: ["Strona firmowa", "Lead generation", "Mobile first"], tagsEn: ["Company website", "Lead generation", "Mobile first"] },
    { id: "trove", name: "Trove Archive", lead: ["Ecommerce fashion", "Ecommerce fashion"], site: "https://trovearchive.com/", video: "trove-archive", ratio: 1280 / 696, tags: ["E-commerce", "Lookbook", "Checkout"], tagsEn: ["E-commerce", "Lookbook", "Checkout"] },
    { id: "mj", name: "MJ Social Media", lead: ["Content creator", "Content creator"], site: "https://mjsocialmedia.netlify.app/", video: "mj-social-media", ratio: 1280 / 718, tags: ["Marka osobista", "Landing page", "Social → lead"], tagsEn: ["Personal brand", "Landing page", "Social → lead"] }
  ];
  PROJECTS.forEach(function (p) {
    var q = p.mediaV ? "?v=" + p.mediaV : "";
    p.poster = V + p.video + "-poster.jpg" + q;
    p.clip = V + p.video + ".mp4" + q;
    p.shots = [1, 2, 3, 4].map(function (k) { return SEC + p.id + "-" + k + ".jpg"; });
  });
  var N = PROJECTS.length;

  var layer = el("section", "pf-web");
  layer.hidden = true;
  layer.setAttribute("aria-label", "Strony internetowe");
  layer.innerHTML =
    '<div class="pf-web__bg"></div>' +
    '<div class="pf-web__stage">' +
    '<div class="pf-web__slides"></div>' +
    '<div class="pf-web__titles" aria-live="polite"></div>' +
    '<nav class="pf-web__index"></nav>' +
    '<p class="pf-web__count"><b>01</b><span></span></p>' +
    '<button type="button" class="pf-web__open"><span></span></button>' +
    '<span class="pf-web__cursor" aria-hidden="true"></span>' +
    "</div>" +
    '<div class="pf-web__ghosts" aria-hidden="true"></div>' +
    '<div class="pf-web__detail" tabindex="-1" hidden></div>';
  body.appendChild(layer);
  var stage = layer.querySelector(".pf-web__stage");
  var slidesEl = layer.querySelector(".pf-web__slides");
  var titlesEl = layer.querySelector(".pf-web__titles");
  var indexEl = layer.querySelector(".pf-web__index");
  var countEl = layer.querySelector(".pf-web__count");
  var openBtn = layer.querySelector(".pf-web__open");
  var cursor = layer.querySelector(".pf-web__cursor");
  var ghostsEl = layer.querySelector(".pf-web__ghosts");
  var detail = layer.querySelector(".pf-web__detail");
  var closeBtn = el("button", "pf-wall__close pf-gfx__close");
  closeBtn.type = "button";
  closeBtn.hidden = true;
  body.appendChild(closeBtn);

  var slides = [], titles = [], marks = [];
  var active = 0, phase = "closed", detailOpen = false, borrowed = [], anim = 0, lockUntil = 0, wheelAcc = 0, wheelIdle = 0;

  /* Titles rise letter by letter out of a mask, one mask per word */
  function lettered(host, text) {
    var ci = 0;
    text.split(" ").forEach(function (word, wi) {
      if (wi) host.appendChild(document.createTextNode(" "));
      var w = el("span", "pf-web__word");
      word.split("").forEach(function (ch) {
        var c = el("span", "pf-web__char", ch);
        c.style.setProperty("--ci", ci++);
        w.appendChild(c);
      });
      host.appendChild(w);
    });
    host.setAttribute("aria-label", text);
  }

  PROJECTS.forEach(function (p, i) {
    var slide = el("button", "pf-web__slide");
    slide.type = "button";
    slide.setAttribute("aria-label", p.name);
    var img = el("img");
    img.src = p.poster;
    img.alt = "";
    img.decoding = "async";
    slide.appendChild(img);
    var video = el("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "none";
    video.poster = p.poster;
    slide.appendChild(video);
    slide.addEventListener("click", function () {
      if (phase !== "open" || detailOpen) return;
      if (i === active) openDetail(); else go(i);
    });
    slidesEl.appendChild(slide);
    slides.push(slide);

    var title = el("h2", "pf-web__title");
    lettered(title, p.name);
    titlesEl.appendChild(title);
    titles.push(title);

    var mark = el("button", null);
    mark.type = "button";
    mark.appendChild(el("i", null, pad(i + 1)));
    mark.appendChild(el("span", null, p.name));
    mark.addEventListener("click", function () { if (phase === "open" && !detailOpen) go(i); });
    indexEl.appendChild(mark);
    marks.push(mark);
  });
  countEl.querySelector("span").textContent = "/ " + pad(N);
  openBtn.addEventListener("click", function () { if (phase === "open" && !detailOpen) openDetail(); });

  /* ——— Carousel geometry ——— */
  function geo() {
    var W = window.innerWidth, H = window.innerHeight, m = W <= 900;
    var aw = m ? W * 0.86 : Math.min(W * 0.44, H * 0.52 * 1.78, 900);
    return { W: W, H: H, m: m, aw: aw, cx: m ? W / 2 : W * 0.56, cy: m ? H * 0.5 : H * 0.5, gap: m ? 18 : 30 };
  }
  function offset(i, at) {
    var d = ((i - at) % N + N) % N;
    return d > N / 2 ? d - N : d;
  }
  var SCALE = [1, 0.58, 0.4];
  function rectFor(i, at) {
    var g = geo(), p = PROJECTS[i], d = offset(i, at), ad = Math.min(2, Math.abs(d)), sign = d > 0 ? 1 : -1;
    var w = g.aw * SCALE[ad], h = w / p.ratio, y = g.cy;
    var ah = g.aw / PROJECTS[at].ratio;
    if (ad === 1) y = g.cy + sign * (ah / 2 + g.gap + h / 2);
    if (ad === 2) {
      var mid = PROJECTS[(at + sign + N) % N];
      y = g.cy + sign * (ah / 2 + g.gap + g.aw * SCALE[1] / mid.ratio + g.gap + h / 2);
    }
    return { left: g.cx - w / 2, top: y - h / 2, width: w, height: h, d: d };
  }
  function place() {
    var g = geo();
    slides.forEach(function (slide, i) {
      var p = PROJECTS[i], r = rectFor(i, active), h = g.aw / p.ratio;
      var s = r.width / g.aw;
      slide.style.left = (g.cx - g.aw / 2).toFixed(1) + "px";
      slide.style.top = (g.cy - h / 2).toFixed(1) + "px";
      slide.style.width = g.aw.toFixed(1) + "px";
      slide.style.height = h.toFixed(1) + "px";
      slide.style.transform = "translate3d(0," + (r.top + r.height / 2 - g.cy).toFixed(1) + "px,0) scale(" + s.toFixed(4) + ")";
      slide.classList.toggle("is-active", r.d === 0);
      slide.classList.toggle("is-far", Math.abs(r.d) > 1);
      slide.tabIndex = Math.abs(r.d) > 1 ? -1 : 0;
    });
    var ah = g.aw / PROJECTS[active].ratio;
    layer.style.setProperty("--pf-cx", g.cx.toFixed(1) + "px");
    layer.style.setProperty("--pf-cy", g.cy.toFixed(1) + "px");
    layer.style.setProperty("--pf-aw", g.aw.toFixed(1) + "px");
    layer.style.setProperty("--pf-ah", ah.toFixed(1) + "px");
    marks.forEach(function (m, i) { m.classList.toggle("is-on", i === active); });
    countEl.querySelector("b").textContent = pad(active + 1);
  }
  function snap() {
    layer.classList.add("is-snap");
    place();
    void layer.offsetWidth;
    layer.classList.remove("is-snap");
  }

  function titleIn(i, dir) {
    var title = titles[i];
    title.className = "pf-web__title " + (dir < 0 ? "from-above" : "from-below");
    void title.offsetWidth;
    title.className = "pf-web__title is-on";
  }
  function titleOut(i, dir) {
    titles[i].className = "pf-web__title" + (dir > 0 ? " to-above" : "");
  }

  function playActive() {
    slides.forEach(function (slide, i) {
      var v = slide.querySelector("video");
      if (i !== active || detailOpen || phase === "closed") { if (!v.paused) v.pause(); slide.classList.remove("is-playing"); return; }
      if (!v.getAttribute("src")) v.src = PROJECTS[i].clip;
      var p = v.play();
      if (p && p.then) p.then(function () { slide.classList.add("is-playing"); }).catch(function () {});
    });
  }

  function go(i, dir) {
    i = (i + N) % N;
    if (i === active || phase !== "open" || detailOpen) return;
    var now = performance.now();
    if (now < lockUntil) return;
    lockUntil = now + (reduced ? 200 : 1000);
    dir = dir || (offset(i, active) > 0 ? 1 : -1);
    titleOut(active, dir);
    active = i;
    place();
    titleIn(active, dir);
    playActive();
  }

  /* ——— Flights between the chapter, the carousel and the project page ——— */
  function visible(r) { return r.bottom > -40 && r.top < window.innerHeight + 40 && r.right > -40 && r.left < window.innerWidth + 40; }
  function box(r) { return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  function chapterTwins() {
    var out = [];
    Array.prototype.forEach.call(chapter.querySelectorAll(".chapter-lux__shot"), function (node) {
      var img = node.querySelector("img");
      if (!img || !img.src) return;
      var r = node.getBoundingClientRect();
      if (r.width < 4 || !visible(r)) return;
      var m = img.src.match(/sections\/([a-z]+)-\d/);
      if (!m) return;
      for (var i = 0; i < N; i++) if (PROJECTS[i].id === m[1]) { out.push({ el: node, src: img.src, p: i, area: r.width * r.height }); return; }
    });
    return out;
  }
  function fly(list, dur, done) {
    cancelAnimationFrame(anim);
    flight++;
    ghostsEl.textContent = "";
    list.forEach(function (g) {
      g.node = el("div", "pf-web__ghost");
      g.a = el("img"); g.a.src = g.fromSrc; g.a.alt = "";
      g.b = el("img"); g.b.src = g.toSrc; g.b.alt = "";
      g.b.style.opacity = "0";
      g.node.appendChild(g.a);
      g.node.appendChild(g.b);
      ghostsEl.appendChild(g.node);
    });
    var start = performance.now();
    if (reduced) dur = 1;
    (function tick(now) {
      var all = true;
      list.forEach(function (g) {
        var p = clamp01((now - start - (g.delay || 0)) / dur);
        if (p < 1) all = false;
        var e = (g.ease || expo)(p), a = g.from, b = g.to;
        var s = g.node.style;
        s.left = (a.left + (b.left - a.left) * e).toFixed(1) + "px";
        s.top = (a.top + (b.top - a.top) * e).toFixed(1) + "px";
        s.width = (a.width + (b.width - a.width) * e).toFixed(1) + "px";
        s.height = (a.height + (b.height - a.height) * e).toFixed(1) + "px";
        s.opacity = ((g.o0 == null ? 1 : g.o0) + ((g.o1 == null ? 1 : g.o1) - (g.o0 == null ? 1 : g.o0)) * e).toFixed(3);
        g.b.style.opacity = clamp01((p - 0.12) / 0.55).toFixed(3);
      });
      if (!all) anim = requestAnimationFrame(tick);
      else if (done) done();
    })(start);
  }
  /* Ghosts linger a moment over the real pictures fading in beneath them */
  var flight = 0;
  function clearGhosts(after) {
    var mine = flight;
    setTimeout(function () { if (mine === flight) ghostsEl.textContent = ""; }, after || 0);
  }

  function open() {
    if (phase !== "closed") return;
    var twins = chapterTwins();
    var score = PROJECTS.map(function () { return 0; });
    twins.forEach(function (tw) { score[tw.p] += tw.area; });
    var best = score.indexOf(Math.max.apply(null, score));
    active = twins.length ? best : 0;
    phase = "opening";
    detailOpen = false;
    detail.hidden = true;
    layer.classList.remove("is-detail");
    layer.hidden = false;
    layer.classList.add("is-staging");
    titles.forEach(function (tt) { tt.className = "pf-web__title"; });
    snap();
    slides.forEach(function (slide) { slide.classList.remove("is-twin"); });
    closeBtn.textContent = en() ? "Back" : "Wróć";
    closeBtn.hidden = false;
    openBtn.querySelector("span").textContent = en() ? "View" : "Zobacz";
    cursor.textContent = en() ? "View" : "Zobacz";
    body.classList.add("pf-gfx-open");
    window.dispatchEvent(new CustomEvent("pf-wall-open"));
    borrowed = twins;
    var list = twins.map(function (tw, k) {
      var to = rectFor(tw.p, active);
      slides[tw.p].classList.add("is-twin");
      return { from: box(tw.el.getBoundingClientRect()), to: to, fromSrc: tw.src, toSrc: PROJECTS[tw.p].poster, delay: k * 70, o1: Math.abs(to.d) > 1 ? 0 : 1 };
    });
    twins.forEach(function (tw) { tw.el.classList.add("pf-gfx-borrowed"); });
    requestAnimationFrame(function () { layer.classList.add("is-in"); });
    setTimeout(function () { if (phase === "opening") titleIn(active, 1); }, reduced ? 0 : 520);
    fly(list, 1250, function () {
      layer.classList.remove("is-staging");
      phase = "open";
      playActive();
      clearGhosts(420);
    });
  }

  function close() {
    if (phase !== "open") return;
    if (detailOpen) { closeDetail(); return; }
    phase = "closing";
    closeBtn.hidden = true;
    slides.forEach(function (slide) { slide.querySelector("video").pause(); });
    titleOut(active, -1);
    window.dispatchEvent(new CustomEvent("pf-wall-close"));
    var list = borrowed.map(function (tw, k) {
      var from = rectFor(tw.p, active);
      return { from: from, to: box(tw.el.getBoundingClientRect()), fromSrc: PROJECTS[tw.p].poster, toSrc: tw.src, delay: 80 + k * 50, o0: Math.abs(from.d) > 1 ? 0 : 1, o1: 1 };
    });
    layer.classList.add("is-staging");
    layer.classList.remove("is-in");
    fly(list, 1100, function () {
      layer.hidden = true;
      layer.classList.remove("is-staging");
      ghostsEl.textContent = "";
      body.classList.remove("pf-gfx-open");
      borrowed.forEach(function (tw) { tw.el.classList.remove("pf-gfx-borrowed"); });
      borrowed = [];
      phase = "closed";
    });
  }

  /* ——— The project page ——— */
  function figure(src, cls, k, p) {
    var f = el("figure", "pfd-fig " + cls);
    f.setAttribute("data-rv", "");
    var img = el("img");
    img.src = src;
    img.alt = p.name + " — " + (en() ? "section " : "sekcja ") + k;
    img.decoding = "async";
    img.loading = "lazy";
    f.appendChild(img);
    var cap = el("figcaption");
    cap.appendChild(el("span", null, pad(k + 1) + " — " + (en() ? "Section" : "Sekcja")));
    cap.appendChild(el("span", null, p.name));
    f.appendChild(cap);
    return f;
  }
  function para(k, p, cls) {
    var text = t("portfolio." + p.id + "_p" + k, "");
    var e = el("p", cls || "pfd-text", text);
    e.setAttribute("data-rv", "");
    return e;
  }
  function link(text, href, ext) {
    var a = el("a", "pfd-link", text);
    a.href = href;
    if (ext) { a.target = "_blank"; a.rel = "noopener noreferrer"; a.setAttribute("data-no-transition", ""); }
    return a;
  }

  var observer = null;
  function buildDetail(p) {
    detail.textContent = "";
    var i = PROJECTS.indexOf(p);

    var hero = el("header", "pfd-hero");
    var hi = el("img");
    hi.src = p.poster;
    hi.alt = "";
    hero.appendChild(hi);
    var hc = el("div", "pfd-hero__copy");
    hc.appendChild(el("span", "pfd-label", (en() ? "Website" : "Strona internetowa") + " — " + pad(i + 1) + " / " + pad(N)));
    var ht = el("h2", "pf-web__title pfd-hero__title");
    lettered(ht, p.name);
    hc.appendChild(ht);
    hc.appendChild(el("p", "pfd-hero__lead", en() ? p.lead[1] : p.lead[0]));
    hero.appendChild(hc);
    hero.appendChild(el("span", "pfd-hero__scroll", en() ? "Scroll" : "Przewiń"));
    detail.appendChild(hero);

    var intro = el("section", "pfd-intro");
    var meta = el("div", "pfd-meta");
    meta.setAttribute("data-rv", "");
    meta.appendChild(el("span", "pfd-label", en() ? "About the project" : "O projekcie"));
    var dl = el("dl");
    [[en() ? "Client" : "Klient", p.name], [en() ? "Field" : "Branża", en() ? p.lead[1] : p.lead[0]], [en() ? "Scope" : "Zakres", (en() ? p.tagsEn : p.tags).join(" · ")]].forEach(function (row) {
      dl.appendChild(el("dt", null, row[0]));
      dl.appendChild(el("dd", null, row[1]));
    });
    meta.appendChild(dl);
    intro.appendChild(meta);
    intro.appendChild(para(1, p, "pfd-lede"));
    detail.appendChild(intro);

    /* The recording of the live site comes first, as on the case page */
    var vf = el("figure", "pfd-video");
    vf.setAttribute("data-rv", "");
    var v = el("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "metadata";
    v.poster = p.poster;
    v.src = p.clip;
    vf.appendChild(v);
    var vc = el("figcaption");
    vc.appendChild(el("span", null, "01 — " + (en() ? "Site recording" : "Nagranie strony")));
    vc.appendChild(el("span", null, p.name));
    vf.appendChild(vc);
    detail.appendChild(vf);

    var top = el("section", "pfd-row pfd-row--top");
    top.appendChild(figure(p.shots[0], "pfd-fig--narrow", 1, p));
    detail.appendChild(top);

    var pair = el("section", "pfd-row pfd-row--pair");
    var big = figure(p.shots[1], "pfd-fig--big", 2, p);
    big.setAttribute("data-par", "0.05");
    pair.appendChild(big);
    var side = el("div", "pfd-side");
    var small = figure(p.shots[2], "pfd-fig--small", 3, p);
    small.setAttribute("data-par", "-0.07");
    side.appendChild(small);
    side.appendChild(para(2, p));
    pair.appendChild(side);
    detail.appendChild(pair);

    var over = el("section", "pfd-over");
    var oh = el("h3", null, en() ? "Project overview" : "Projekt — przegląd");
    oh.setAttribute("data-rv", "");
    over.appendChild(oh);
    over.appendChild(para(3, p));
    detail.appendChild(over);

    var end = el("section", "pfd-row pfd-row--end");
    end.appendChild(para(4, p));
    end.appendChild(figure(p.shots[3], "pfd-fig--wide", 4, p));
    detail.appendChild(end);

    var foot = el("footer", "pfd-foot");
    /* Only a link to the live site, and only once its address is known */
    if (p.site) {
      var links = el("div", "pfd-links");
      links.setAttribute("data-rv", "");
      links.appendChild(link((en() ? "Visit site" : "Odwiedź stronę") + " ↗", p.site, true));
      foot.appendChild(links);
    }
    var nextP = PROJECTS[(i + 1) % N];
    var next = el("button", "pfd-next");
    next.type = "button";
    next.setAttribute("data-rv", "");
    var nt = el("span", "pfd-next__copy");
    nt.appendChild(el("span", "pfd-label", en() ? "Next project" : "Następny projekt"));
    nt.appendChild(el("strong", null, nextP.name));
    next.appendChild(nt);
    var ni = el("img");
    ni.src = nextP.poster;
    ni.alt = "";
    ni.loading = "lazy";
    next.appendChild(ni);
    next.addEventListener("click", function () { swapDetail((i + 1) % N); });
    foot.appendChild(next);
    detail.appendChild(foot);

    if (observer) observer.disconnect();
    if ("IntersectionObserver" in window && !reduced) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-seen"); observer.unobserve(e.target); }
        });
      }, { root: detail, threshold: 0.12 });
      Array.prototype.forEach.call(detail.querySelectorAll("[data-rv]"), function (n) { observer.observe(n); });
    } else {
      Array.prototype.forEach.call(detail.querySelectorAll("[data-rv]"), function (n) { n.classList.add("is-seen"); });
    }
    return ht;
  }

  /* Pictures drift a touch against the scroll; the recording plays in view */
  var parRaf = 0;
  function parallax() {
    parRaf = 0;
    var H = window.innerHeight;
    Array.prototype.forEach.call(detail.querySelectorAll("[data-par]"), function (n) {
      var r = n.getBoundingClientRect();
      var c = r.top + r.height / 2 - H / 2;
      n.style.translate = "0 " + (c * Number(n.getAttribute("data-par"))).toFixed(1) + "px";
    });
    var v = detail.querySelector(".pfd-video video");
    if (v) {
      var vr = v.getBoundingClientRect();
      var seen = vr.bottom > 0 && vr.top < H;
      if (seen && v.paused) v.play().catch(function () {});
      if (!seen && !v.paused) v.pause();
    }
    detail.classList.toggle("is-scrolled", detail.scrollTop > H * 0.35);
  }
  detail.addEventListener("scroll", function () { if (!parRaf && !reduced) parRaf = requestAnimationFrame(parallax); }, { passive: true });

  function openDetail() {
    if (phase !== "open" || detailOpen) return;
    phase = "detail";
    detailOpen = true;
    var p = PROJECTS[active];
    var heroTitle = buildDetail(p);
    var from = box(slides[active].getBoundingClientRect());
    slides[active].querySelector("video").pause();
    layer.classList.add("is-detail");
    cursor.classList.remove("is-on");
    titleOut(active, 1);
    fly([{ from: from, to: { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, fromSrc: p.poster, toSrc: p.poster, ease: inOut }], 1050, function () {
      detail.hidden = false;
      detail.scrollTop = 0;
      detail.classList.remove("is-out");
      void detail.offsetWidth;
      detail.classList.add("is-in");
      detail.focus({ preventScroll: true });
      clearGhosts(60);
      setTimeout(function () { heroTitle.classList.add("is-on"); }, reduced ? 0 : 120);
      parallax();
      phase = "open";
    });
  }

  function closeDetail() {
    if (!detailOpen || phase !== "open") return;
    phase = "detail";
    var p = PROJECTS[active];
    Array.prototype.forEach.call(detail.querySelectorAll("video"), function (v) { v.pause(); });
    var hero = detail.querySelector(".pfd-hero");
    var hr = hero ? hero.getBoundingClientRect() : null;
    var finish = function () {
      detail.hidden = true;
      detail.classList.remove("is-in", "is-out");
      detail.textContent = "";
      detailOpen = false;
      layer.classList.remove("is-detail");
      titleIn(active, -1);
      phase = "open";
      playActive();
    };
    if (hr && hr.bottom > window.innerHeight * 0.4) {
      detail.hidden = true;
      fly([{ from: box(hr), to: rectFor(active, active), fromSrc: p.poster, toSrc: p.poster, ease: inOut }], 1000, function () {
        finish();
        clearGhosts(380);
      });
    } else {
      detail.classList.add("is-out");
      setTimeout(finish, reduced ? 0 : 520);
    }
  }

  function swapDetail(i) {
    if (!detailOpen || phase !== "open") return;
    phase = "detail";
    detail.classList.add("is-out");
    Array.prototype.forEach.call(detail.querySelectorAll("video"), function (v) { v.pause(); });
    setTimeout(function () {
      titles[active].className = "pf-web__title";
      active = i;
      snap();
      var heroTitle = buildDetail(PROJECTS[active]);
      detail.scrollTop = 0;
      detail.classList.remove("is-out");
      setTimeout(function () { heroTitle.classList.add("is-on"); }, reduced ? 0 : 160);
      parallax();
      phase = "open";
    }, reduced ? 0 : 520);
  }

  /* ——— Input ——— */
  stage.addEventListener("mousemove", function (e) {
    var on = phase === "open" && !detailOpen && e.target.closest && e.target.closest(".pf-web__slide.is-active");
    cursor.classList.toggle("is-on", !!on);
    if (on) cursor.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
  });
  stage.addEventListener("mouseleave", function () { cursor.classList.remove("is-on"); });
  var touchY = null;
  stage.addEventListener("touchstart", function (e) { touchY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (touchY == null) return;
    var dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) > 40) go(active + (dy > 0 ? 1 : -1), dy > 0 ? 1 : -1);
  }, { passive: true });

  closeBtn.addEventListener("click", close);
  var sel = "#strony [data-tile-expand-hit], #strony [data-tile-expand]";
  window.addEventListener("click", function (e) {
    var target = e.target.closest && e.target.closest(sel);
    if (!target || e.defaultPrevented || window.__pfCubeDragged) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open();
  }, true);
  /* While the gallery is up it scrolls on its own; the slider must not move */
  window.addEventListener("wheel", function (e) {
    if (phase === "closed") return;
    e.stopImmediatePropagation();
    if (detailOpen || phase !== "open") return;
    var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    wheelAcc += d;
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(function () { wheelAcc = 0; }, 180);
    if (Math.abs(wheelAcc) > 36 && performance.now() >= lockUntil) {
      var dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      go(active + dir, dir);
    }
  }, { capture: true, passive: true });
  window.addEventListener("keydown", function (e) {
    if (phase === "closed") return;
    if (e.key === "Escape") { close(); e.stopImmediatePropagation(); return; }
    if (!detailOpen && phase === "open") {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go(active + 1, 1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(active - 1, -1);
      if (e.key === "Enter" && (document.activeElement === body || document.activeElement === document.documentElement)) openDetail();
    }
    if (e.key !== "Tab" && e.key !== "Enter" && e.key !== " ") e.stopImmediatePropagation();
  }, true);
  window.addEventListener("resize", function () { if (phase === "open") snap(); }, { passive: true });
})();
