/**
 * COSGRAL section motion.
 * Circle-expand reveals, depth fly-ins, and collage reshuffles.
 * Resting layout, type, and color are unchanged — motion styles are removed at rest.
 * Respects html.reduce-motion and prefers-reduced-motion.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (root.classList.contains("reduce-motion") || reduceQuery.matches) return;

  var mobileQuery = window.matchMedia("(max-width: 900px)");
  function mobile() {
    return mobileQuery.matches;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function ease(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  var jobs = [];
  var scheduled = false;
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  function margins(el) {
    var cs = window.getComputedStyle(el);
    return (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }

  function docTop(el) {
    var parent = el.parentElement;
    if (!parent) return el.offsetTop || 0;
    var y = 0;
    var child = parent.firstElementChild;
    while (child && child !== el) {
      y += (child.offsetHeight || 0) + margins(child);
      child = child.nextElementSibling;
    }
    y += parseFloat(window.getComputedStyle(el).marginTop) || 0;
    var node = parent;
    while (node && node !== document.body) {
      y += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return y;
  }

  function addJob(el, startPct, endPct, fn) {
    if (!el) return null;
    var job = {
      el: el,
      startPct: startPct,
      endPct: endPct,
      fn: fn,
      docTop: 0,
      booted: false,
      hold: false,
    };
    jobs.push(job);
    return job;
  }

  function release(el) {
    if (!el || el.dataset.smOn !== "1") return;
    el.style.transform = "";
    el.style.filter = "";
    el.style.clipPath = "";
    el.style.webkitClipPath = "";
    el.style.backgroundColor = "";
    el.style.zIndex = "";
    el.style.opacity = "";
    el.style.pointerEvents = "";
    if (el.dataset.smPos === "1") {
      el.style.position = "";
      delete el.dataset.smPos;
    }
    el.classList.remove("sm-live");
    delete el.dataset.smOn;
  }

  function live(el) {
    el.dataset.smOn = "1";
    el.classList.add("sm-live");
  }

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight || 1;
    jobs.forEach(function (job) {
      job.docTop = docTop(job.el);
    });
  }

  function progress(job, scrollY) {
    var top = job.docTop - scrollY;
    var startTop = vh * (job.startPct / 100);
    var endTop = vh * (job.endPct / 100);
    var span = startTop - endTop || 1;
    return clamp((startTop - top) / span, 0, 1);
  }

  function frame() {
    scheduled = false;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    jobs.forEach(function (job) {
      var p = progress(job, scrollY);
      if (!job.booted) {
        job.booted = true;
        job.hold = p > 0.14;
      }
      if (job.hold) {
        if (p < 0.04) job.hold = false;
        else {
          job.fn(1, job, true);
          return;
        }
      }
      job.fn(p, job, false);
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(frame);
  }

  function maxRadius() {
    return Math.hypot(vw, vh) * 0.74;
  }

  /**
   * Circle wipe on a stacked / entering section.
   * p=0 and p=1 leave the element untouched.
   */
  function paintIris(el, p, opts) {
    opts = opts || {};
    if (!el) return;
    if (p <= 0.015 || p >= 0.985) {
      release(el);
      return;
    }
    var e = ease(p);
    var startFrac = opts.startFrac != null ? opts.startFrac : mobile() ? 0.28 : 0.07;
    var r = mix(maxRadius() * startFrac, maxRadius(), e);
    var top = vh * mix(opts.startPct || 100, opts.endPct || 10, p) / 100;
    var y = vh * 0.46 - top;
    var x = vw * 0.5;
    var path = "circle(" + r.toFixed(1) + "px at " + x.toFixed(1) + "px " + y.toFixed(1) + "px)";
    live(el);
    el.style.clipPath = path;
    el.style.webkitClipPath = path;
    if (opts.fill !== false) el.style.backgroundColor = "var(--bg, #030303)";
  }

  function iris(el, startPct, endPct, opts) {
    opts = opts || {};
    opts.startPct = startPct;
    opts.endPct = endPct;
    addJob(el, startPct, endPct, function (p, job, held) {
      if (held) {
        release(el);
        return;
      }
      paintIris(el, p, opts);
    });
  }

  function clearHost(host) {
    if (host) host.classList.remove("is-sm-collage");
  }

  /**
   * FLIP-style reshuffle that starts and ends on the real grid.
   * Mid-scroll cards swap scale and position, then settle.
   */
  function collage(nodes, trigger, opts) {
    if (!nodes || nodes.length < 2 || !trigger) return;
    opts = opts || {};
    var list = Array.prototype.slice.call(nodes);
    var host = opts.host || trigger;
    addJob(trigger, opts.start || 92, opts.end || (mobile() ? 46 : 22), function (p, job, held) {
      if (held || p <= 0.02 || p >= 0.985) {
        list.forEach(release);
        clearHost(host);
        return;
      }
      host.classList.add("is-sm-collage");
      var ampX = mobile() ? 14 : Math.min(vw * 0.06, 78);
      var ampY = mobile() ? 18 : Math.min(vh * 0.1, 96);
      list.forEach(function (el, i) {
        var delay = (i % 5) * 0.045;
        var lp = clamp((p - delay) / (1 - delay * 0.8), 0, 1);
        var wave = Math.sin(lp * Math.PI);
        var dir = i % 2 === 0 ? -1 : 1;
        var col = (i % 3) - 1;
        var swap = lp < 0.45 ? 0 : ease((lp - 0.45) / 0.55);
        var x = mix(col * ampX, ((i + 2) % 3 - 1) * ampX, swap) * wave;
        var y = mix(dir * ampY, -dir * ampY * 0.55, swap) * wave;
        var s0 = mobile() ? 0.94 : i % 2 === 0 ? 0.8 : 1.06;
        var s = mix(1, s0, wave);
        var rot = mobile() ? 0 : col * 2.2 * wave;
        var blur = mobile() ? 0 : 8 * wave;
        live(el);
        el.style.transform =
          "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + s.toFixed(4) + ")" +
          (rot ? " rotate(" + rot.toFixed(2) + "deg)" : "");
        el.style.filter = blur > 0.3 ? "blur(" + blur.toFixed(2) + "px)" : "";
        if (!mobile() && wave > 0.08 && wave < 0.92) {
          el.style.clipPath = "circle(" + (28 + (1 - wave) * 80).toFixed(1) + "% at 50% 46%)";
        } else {
          el.style.clipPath = "";
        }
        if (!el.style.position) {
          el.style.position = "relative";
          el.dataset.smPos = "1";
        }
        el.style.zIndex = i % 2 === 0 ? "6" : "2";
      });
    });
  }

  function titleHold(title, trigger, opts) {
    if (!title || !trigger) return;
    opts = opts || {};
    addJob(trigger, opts.start || 88, opts.end || (mobile() ? 42 : 20), function (p, job, held) {
      if (held || p <= 0.03 || p >= 0.97) {
        release(title);
        return;
      }
      var e = Math.sin(clamp(p, 0, 1) * Math.PI);
      var amp = mobile() ? 22 : opts.amp || Math.min(vh * 0.28, 220);
      live(title);
      if (!title.style.position) {
        title.style.position = "relative";
        title.dataset.smPos = "1";
      }
      title.style.zIndex = "4";
      title.style.pointerEvents = "none";
      title.style.transform =
        "translate3d(" + ((opts.slide || 0) * (1 - ease(p))).toFixed(1) + "px," +
        (e * amp).toFixed(1) + "px,0) scale(" + (1 + e * (mobile() ? 0.015 : 0.045)).toFixed(4) + ")";
    });
  }

  function depthNodes(nodes, trigger, opts) {
    if (!nodes || !nodes.length || !trigger) return;
    opts = opts || {};
    var list = Array.prototype.slice.call(nodes);
    addJob(trigger, opts.start || 90, opts.end || (mobile() ? 50 : 30), function (p, job, held) {
      if (held || p <= 0.02 || p >= 0.985) {
        list.forEach(release);
        return;
      }
      list.forEach(function (el, i) {
        var delay = (i % 6) * (mobile() ? 0.03 : 0.06);
        var lp = clamp((p - delay) / Math.max(0.001, 1 - delay), 0, 1);
        var inv = 1 - ease(lp);
        if (inv < 0.012) {
          release(el);
          return;
        }
        var y = (mobile() ? 22 : opts.y || 68) * inv;
        var x = (mobile() ? 0 : (i % 2 === 0 ? -1 : 1) * (opts.x || 22)) * inv;
        var s = mix(mobile() ? 0.94 : opts.scale || 0.76, 1, ease(lp));
        var blur = mobile() ? 0 : (opts.blur || 14) * inv;
        live(el);
        el.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + s.toFixed(4) + ")";
        el.style.filter = blur > 0.25 ? "blur(" + blur.toFixed(2) + "px)" : "";
        if (opts.circle && !mobile()) {
          var rad = 18 + ease(lp) * 90;
          el.style.clipPath = rad > 100 ? "" : "circle(" + rad.toFixed(1) + "% at 50% 46%)";
        }
      });
    });
  }

  function earlySettle(el, trigger) {
    if (!el || !trigger) return;
    addJob(trigger, 96, mobile() ? 58 : 36, function (p, job, held) {
      if (held || p <= 0.02 || p >= 0.42) {
        release(el);
        return;
      }
      var e = ease(p / 0.42);
      var y = (1 - e) * (mobile() ? 14 : 36);
      live(el);
      el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
      if (!mobile()) el.style.filter = "blur(" + ((1 - e) * 8).toFixed(2) + "px)";
    });
  }

  function wireHome() {
    if (!document.body.classList.contains("home-page")) return;
    var services = document.getElementById("uslugi");
    var work = document.getElementById("realizacje");
    var faq = document.getElementById("faq");
    var process = document.getElementById("proces");
    var contact = document.getElementById("kontakt");

    iris(services, 100, mobile() ? 36 : 8);
    iris(work, 100, mobile() ? 36 : 8);
    iris(faq, 100, mobile() ? 40 : 12, { startFrac: mobile() ? 0.34 : 0.12 });
    iris(process, 100, mobile() ? 40 : 12, { startFrac: mobile() ? 0.34 : 0.12 });
    iris(contact, 100, mobile() ? 42 : 14, { startFrac: mobile() ? 0.36 : 0.14 });

    if (services) {
      earlySettle(services.querySelector(".services-fan__head") || services.querySelector(".services-fan__title"), services);
      depthNodes(services.querySelectorAll(".services-fan__card-media"), services, {
        y: 86,
        scale: 0.7,
        blur: 16,
        circle: true,
        end: mobile() ? 48 : 24,
      });
    }

    if (work) {
      earlySettle(work.querySelector(".home-work__title"), work);
      depthNodes(work.querySelectorAll(".home-work__card-media"), work, {
        y: 74,
        x: 16,
        scale: 0.74,
        blur: 12,
        circle: true,
        end: mobile() ? 50 : 26,
      });
      depthNodes(work.querySelectorAll(".home-work__card-tag"), work, {
        y: 10,
        x: 36,
        scale: 1,
        blur: 0,
        end: mobile() ? 55 : 34,
      });
    }
  }

  function wireAbout() {
    var team = document.getElementById("about-team");
    if (!team) return;
    iris(team, 100, mobile() ? 40 : 14, { startFrac: mobile() ? 0.3 : 0.08 });
    var photos = team.querySelectorAll(".about-team__photo");
    addJob(team, 92, mobile() ? 52 : 34, function (p, job, held) {
      if (held || p <= 0.02 || p >= 0.985) {
        photos.forEach(release);
        return;
      }
      photos.forEach(function (photo, i) {
        var e = ease(p);
        var inv = 1 - e;
        var dir = i === 0 ? -1 : 1;
        var x = dir * (mobile() ? 28 : 92) * inv;
        var s = mix(mobile() ? 0.72 : 0.34, 1, e);
        live(photo);
        photo.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0) scale(" + s.toFixed(4) + ")";
        if (!mobile()) photo.style.filter = "blur(" + (10 * inv).toFixed(2) + "px)";
      });
    });
    depthNodes(team.querySelectorAll(".about-team__bio, .about-team__name, .about-team__role"), team, {
      y: 28,
      x: 0,
      scale: 1,
      blur: 6,
      end: mobile() ? 58 : 40,
    });
  }

  function wirePortfolioChapters() {
    var scroller = document.querySelector("[data-chapters-scroller]");
    var chapters = document.querySelectorAll("[data-portfolio-tile]");
    if (!scroller || chapters.length < 2) return;

    function paintChapters() {
      var view = scroller.clientWidth || vw || 1;
      var left = scroller.scrollLeft;
      Array.prototype.forEach.call(chapters, function (ch) {
        var dist = Math.abs(ch.offsetLeft - left) / view;
        var p = 1 - clamp(dist, 0, 1);
        var title = ch.querySelector(".portfolio-chapter__title");
        if (p >= 0.97 || p <= 0.03) {
          release(ch);
          if (title) release(title);
          return;
        }
        var e = ease(p);
        var r = mix(maxRadius() * (mobile() ? 0.32 : 0.1), maxRadius(), e);
        var path = "circle(" + r.toFixed(1) + "px at 50% 46%)";
        live(ch);
        ch.style.clipPath = path;
        ch.style.webkitClipPath = path;
        ch.style.backgroundColor = "var(--bg, #030303)";
        if (title) {
          var inv = 1 - e;
          live(title);
          title.style.transform =
            "translate3d(" + ((mobile() ? 12 : 36) * inv).toFixed(1) + "px," +
            ((mobile() ? 10 : 22) * inv).toFixed(1) + "px,0) scale(" + mix(mobile() ? 1.02 : 1.06, 1, e).toFixed(4) + ")";
          if (!mobile()) title.style.filter = "blur(" + (6 * inv).toFixed(2) + "px)";
        }
      });
    }

    var chapRaf = 0;
    function queue() {
      if (chapRaf) return;
      chapRaf = window.requestAnimationFrame(function () {
        chapRaf = 0;
        paintChapters();
      });
    }
    scroller.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    queue();

    spreadLux();
  }

  function spreadLux() {
    var shots = document.querySelectorAll("[data-lux-shot]");
    if (shots.length < 2) return;
    Array.prototype.forEach.call(shots, function (shot) {
      shot.style.setProperty("--lux-x", "0px");
      shot.style.setProperty("--lux-y", "0px");
      shot.style.clipPath = "circle(38% at 50% 50%)";
    });
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        Array.prototype.forEach.call(shots, function (shot) {
          shot.style.removeProperty("--lux-x");
          shot.style.removeProperty("--lux-y");
          shot.style.clipPath = "circle(140% at 50% 50%)";
        });
        window.setTimeout(function () {
          Array.prototype.forEach.call(shots, function (shot) {
            shot.style.clipPath = "";
          });
        }, 1300);
      });
    });
  }

  function wireProjectLists() {
    document.querySelectorAll(".portfolio-case-grid").forEach(function (grid) {
      var cards = grid.querySelectorAll(".portfolio-case-card");
      if (cards.length < 2) return;
      collage(cards, grid, { host: grid, start: 94, end: mobile() ? 48 : 24 });
      var title = document.querySelector(".portfolio-hero__title, .case-study__title");
      if (title) titleHold(title, grid, { amp: mobile() ? 18 : Math.min(vh * 0.22, 180), slide: mobile() ? -12 : -48 });
    });

    document.querySelectorAll(".case-study__film, .case-study__stage").forEach(function (film) {
      depthNodes([film], film, { y: 48, scale: 0.9, blur: 10, circle: true, start: 96, end: mobile() ? 60 : 48 });
    });

    var viz = document.querySelectorAll(".case-viz-tile");
    if (viz.length) {
      Array.prototype.forEach.call(viz, function (tile) {
        iris(tile, 96, mobile() ? 62 : 58, { startFrac: mobile() ? 0.45 : 0.22, fill: true });
      });
      var vizTitle = document.querySelector(".case-study__title");
      var rail = document.querySelector(".case-viz-rail");
      if (vizTitle && rail) titleHold(vizTitle, rail, { amp: mobile() ? 16 : 120, slide: -28, end: 55 });
    }
  }

  function wireGalleries() {
    function bind(rootSel, itemSel) {
      var rootEl = document.querySelector(rootSel);
      if (!rootEl) return;
      var bound = false;
      function tryBind() {
        var items = rootEl.querySelectorAll(itemSel);
        if (items.length < 2 || bound) return;
        bound = true;
        var hero = Array.prototype.slice.call(items, 0, mobile() ? 4 : 6);
        collage(hero, rootEl, { host: rootEl, start: 96, end: mobile() ? 52 : 28 });
        var title = document.querySelector(".portfolio-hero__title");
        if (title) titleHold(title, rootEl, { amp: mobile() ? 16 : 160, slide: -36 });
        var rest = Array.prototype.slice.call(items, hero.length, hero.length + 12);
        if (rest.length) depthNodes(rest, rootEl, { y: 36, scale: 0.96, blur: 0, start: 96, end: 40 });
        measure();
        schedule();
      }
      tryBind();
      if (!bound && window.MutationObserver) {
        var obs = new MutationObserver(function () {
          tryBind();
          if (bound) obs.disconnect();
        });
        obs.observe(rootEl, { childList: true, subtree: true });
      }
    }
    bind("#reels-gallery", ".reels-masonry__item");
    bind("#graphics-gallery", ".graphics-masonry__item");
  }

  function wireServices() {
    var hero = document.querySelector(".service-hero");
    var blocks = document.querySelectorAll("main .service-block");
    if (!hero && !blocks.length) return;
    if (hero) {
      depthNodes(hero.querySelectorAll(".service-hero__title, .service-hero__num"), hero, {
        y: 32,
        scale: 1,
        blur: 6,
        start: 100,
        end: mobile() ? 70 : 62,
      });
    }
    Array.prototype.forEach.call(blocks, function (block) {
      iris(block, 96, mobile() ? 64 : 52, { startFrac: mobile() ? 0.5 : 0.38, fill: true });
      depthNodes(block.querySelectorAll("h2, li, p"), block, {
        y: mobile() ? 16 : 26,
        x: 0,
        scale: 1,
        blur: 4,
        start: 94,
        end: mobile() ? 68 : 58,
      });
    });
  }

  function wireContactCta() {
    document.querySelectorAll(".portfolio-contact-cta").forEach(function (el) {
      iris(el, 98, mobile() ? 70 : 60, { startFrac: 0.42, fill: false });
      depthNodes(el.querySelectorAll("h2, p, .glass-btn"), el, {
        y: 22,
        scale: 1,
        blur: 0,
        start: 96,
        end: 64,
      });
    });
  }

  function boot() {
    wireHome();
    wireAbout();
    wirePortfolioChapters();
    wireProjectLists();
    wireGalleries();
    wireServices();
    wireContactCta();
    measure();
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", function () {
      measure();
      schedule();
    });
    if (window.ScrollTrigger && ScrollTrigger.addEventListener) {
      ScrollTrigger.addEventListener("refresh", function () {
        measure();
        schedule();
      });
    }
    window.setTimeout(function () {
      measure();
      schedule();
    }, 600);
    window.setTimeout(function () {
      measure();
      schedule();
    }, 1600);
  }

  function start() {
    var started = false;
    function go() {
      if (started) return;
      started = true;
      boot();
    }
    if (document.body.classList.contains("home-page")) {
      window.addEventListener("cosgral:sections-ready", go, { once: true });
      window.setTimeout(go, 1800);
    } else if (window.cosgralSmoothScroll && window.cosgralSmoothScroll.ready) {
      window.cosgralSmoothScroll.ready.then(go);
      window.setTimeout(go, 800);
    } else {
      go();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
