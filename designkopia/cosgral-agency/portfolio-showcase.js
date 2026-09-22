/**
 * Portfolio showcase — Parhouse-inspired:
 * intro → collage (clear center links) → soft tile exit →
 * full-bleed horizontal project strip (scroll scrub + drag) →
 * montaż → grafiki → automatyzacje.
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("portfolio-page--showcase")) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var intro = document.querySelector("[data-portfolio-intro]");
  var introTitle = intro && intro.querySelector(".portfolio-intro__title");
  var introLead = intro && intro.querySelector(".portfolio-intro__lead");
  var collage = document.querySelector("[data-portfolio-collage]");
  var collagePin = collage && collage.querySelector(".portfolio-collage__pin");
  var tiles = collage ? Array.prototype.slice.call(collage.querySelectorAll("[data-collage-tile]")) : [];
  var centerNav = collage && collage.querySelector("[data-center-nav]");
  var stripSection = document.querySelector("[data-web-strip-section]");
  var stripPin = stripSection && stripSection.querySelector(".portfolio-web-strip__pin");
  var stripViewport = stripSection && stripSection.querySelector(".portfolio-web-strip__viewport");
  var stripTrack = stripSection && stripSection.querySelector("[data-web-strip-track]");
  var stripPanels = stripTrack ? Array.prototype.slice.call(stripTrack.querySelectorAll("[data-web-panel]")) : [];
  var stripEyebrow = stripSection && stripSection.querySelector(".portfolio-web-strip__eyebrow");

  var stripX = 0;
  var stripMin = 0;
  var stripScrub = null;
  var dragging = false;
  var dragStartX = 0;
  var dragOrigin = 0;
  var dragMoved = false;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function hideCube() {
    document.body.classList.add("is-portfolio-cube-off");
    var portal = document.querySelector(".subpage-cube-portal");
    if (portal) {
      portal.style.visibility = "hidden";
      portal.style.opacity = "0";
    }
  }

  function scrollToY(y, opts) {
    opts = opts || {};
    var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
    if (lenis && lenis.scrollTo) {
      lenis.scrollTo(y, {
        immediate: !!opts.immediate,
        duration: opts.duration != null ? opts.duration : 1.15,
      });
    } else {
      window.scrollTo({ top: y, behavior: opts.immediate ? "auto" : "smooth" });
    }
  }

  function flashThenScroll(selector) {
    var el = document.querySelector(selector);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - (MOBILE ? 64 : 80);
    var overlay = document.getElementById("page-transition");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "page-transition";
      overlay.className = "page-transition";
      overlay.innerHTML =
        '<div class="page-transition__veil" aria-hidden="true"></div>' +
        '<div class="page-transition__panel page-transition__panel--top" aria-hidden="true"></div>' +
        '<div class="page-transition__panel page-transition__panel--bottom" aria-hidden="true"></div>' +
        '<div class="page-transition__mark" aria-hidden="true"></div>';
      document.body.appendChild(overlay);
    }
    document.documentElement.classList.add("is-page-transitioning");
    overlay.classList.add("is-active", "is-covering");
    window.setTimeout(function () {
      scrollToY(y, { immediate: true });
      if (window.ScrollTrigger) ScrollTrigger.update();
      overlay.classList.remove("is-covering");
      overlay.classList.add("is-revealing");
      window.setTimeout(function () {
        overlay.classList.remove("is-active", "is-revealing");
        document.documentElement.classList.remove("is-page-transitioning");
      }, 520);
    }, 280);
  }

  function playVideosIn(root) {
    if (!root || !window.CosgralPortfolioVideo) return;
    root.querySelectorAll("video[data-portfolio-video]").forEach(function (video) {
      window.CosgralPortfolioVideo.register(video);
      window.CosgralPortfolioVideo.play(video);
    });
  }

  function initIntro() {
    if (!intro) return;
    document.body.classList.add("is-portfolio-showcase");
    hideCube();

    if (REDUCED || !window.gsap) {
      if (introTitle) introTitle.style.opacity = "1";
      if (introLead) introLead.style.opacity = "1";
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.set([introTitle, introLead].filter(Boolean), { autoAlpha: 0, y: 28 });
    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .to(introTitle, { autoAlpha: 1, y: 0, duration: 1.15 }, 0.5)
      .to(introLead, { autoAlpha: 1, y: 0, duration: 0.85 }, "-=0.5");
  }

  function initCollage() {
    if (!collage || !window.gsap || !window.ScrollTrigger || REDUCED) {
      playVideosIn(collage);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    playVideosIn(collage);

    tiles.forEach(function (tile, i) {
      gsap.set(tile, { autoAlpha: 0, y: 40 + (i % 3) * 10, scale: 0.94 });
    });
    if (centerNav) {
      gsap.set(centerNav, { autoAlpha: 0, xPercent: -50, yPercent: -50, y: 20 });
    }

    ScrollTrigger.create({
      trigger: collage,
      start: "top 70%",
      once: true,
      onEnter: function () {
        gsap.to(tiles, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.1,
          stagger: 0.09,
          ease: "power3.out",
        });
        if (centerNav) {
          gsap.to(centerNav, {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            delay: 0.18,
            ease: "power3.out",
          });
        }
      },
    });

    /* Soft exit — tiles leave before strip; short pin, then free scroll into strip */
    if (!collagePin) return;
    gsap
      .timeline({
        scrollTrigger: {
          id: "portfolio-collage-exit",
          trigger: collage,
          start: "top top",
          end: MOBILE ? "+=85%" : "+=100%",
          pin: collagePin,
          scrub: 1.15,
          anticipatePin: 0.25,
          invalidateOnRefresh: true,
        },
      })
      .to(
        centerNav,
        { autoAlpha: 0, y: -24, filter: "blur(8px)", duration: 0.35, ease: "none" },
        0.05
      )
      .to(
        tiles,
        {
          x: function (i) {
            return window.innerWidth * (0.7 + (i % 4) * 0.08);
          },
          y: function (i) {
            return (i % 2 === 0 ? -1 : 1) * (20 + i * 7);
          },
          rotation: function (i) {
            return (i % 2 === 0 ? -1 : 1) * (2 + i * 0.5);
          },
          autoAlpha: 0,
          duration: 1.15,
          stagger: { each: 0.08, from: "edges" },
          ease: "none",
        },
        0.15
      );
  }

  function getStripTravel() {
    if (!stripTrack || !stripViewport) return 0;
    return Math.max(0, stripTrack.scrollWidth - stripViewport.clientWidth);
  }

  function applyStripX(x) {
    stripX = clamp(x, stripMin, 0);
    if (!stripTrack) return;
    gsap.set(stripTrack, { x: stripX });
  }

  function syncStripFromScrub(progress) {
    var travel = getStripTravel();
    stripMin = -travel;
    applyStripX(-travel * progress);
  }

  function initWebStrip() {
    if (!stripSection || !stripViewport || !stripTrack) return;
    playVideosIn(stripSection);

    if (REDUCED || !window.gsap || !window.ScrollTrigger) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    if (stripEyebrow) gsap.set(stripEyebrow, { autoAlpha: 0, y: 16 });
    gsap.set(stripPanels, { autoAlpha: 0.35, scale: 0.97 });

    ScrollTrigger.create({
      trigger: stripSection,
      start: "top 75%",
      once: true,
      onEnter: function () {
        if (stripEyebrow) {
          gsap.to(stripEyebrow, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" });
        }
        gsap.to(stripPanels, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.95,
          stagger: 0.1,
          ease: "power3.out",
        });
      },
    });

    /* Vertical scroll → horizontal film strip (Parhouse core) */
    var pinTarget = stripPin || stripSection;
    stripScrub = ScrollTrigger.create({
      id: "portfolio-web-strip",
      trigger: stripSection,
      start: "top top",
      end: function () {
        return "+=" + Math.max(window.innerHeight * (MOBILE ? 1.6 : 2.2), getStripTravel() * 1.05);
      },
      pin: pinTarget,
      scrub: 1.05,
      anticipatePin: 0.3,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        syncStripFromScrub(self.progress);
      },
    });

    /* Drag also nudges the scrub progress via scroll */
    stripViewport.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragOrigin = stripX;
      stripViewport.classList.add("is-dragging");
      try {
        stripViewport.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    stripViewport.addEventListener("pointermove", function (e) {
      if (!dragging || !stripScrub) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 6) dragMoved = true;
      var travel = getStripTravel();
      if (travel <= 0) return;
      var nextX = clamp(dragOrigin + dx, -travel, 0);
      var progress = travel ? -nextX / travel : 0;
      var start = stripScrub.start;
      var end = stripScrub.end;
      var y = start + (end - start) * progress;
      scrollToY(y, { immediate: true });
      if (window.ScrollTrigger) ScrollTrigger.update();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      stripViewport.classList.remove("is-dragging");
      try {
        stripViewport.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    stripViewport.addEventListener("pointerup", endDrag);
    stripViewport.addEventListener("pointercancel", endDrag);

    stripPanels.forEach(function (panel) {
      panel.addEventListener("click", function (e) {
        if (dragMoved) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    });

    window.addEventListener("resize", function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  function initJumps() {
    document.querySelectorAll("[data-showcase-jump]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href") || "";
        if (href.charAt(0) !== "#") return;
        e.preventDefault();
        if (history.replaceState) history.replaceState(null, "", href);
        flashThenScroll(href);
      });
    });
  }

  function initDeepLink() {
    var hash = (location.hash || "").replace("#", "");
    if (!hash || hash === "ai") return;
    var map = {
      strony: "#strony",
      montaz: "#montaz",
      grafiki: "#grafiki",
      automatyzacje: "#automatyzacje",
      "automatyzacje-intro": "#automatyzacje",
    };
    var sel = map[hash] || "#" + hash;
    if (!document.querySelector(sel)) return;
    requestAnimationFrame(function () {
      window.setTimeout(function () {
        flashThenScroll(sel);
      }, 200);
    });
  }

  function initHashChange() {
    window.addEventListener("hashchange", function () {
      var hash = (location.hash || "").replace("#", "");
      if (!hash || hash === "ai") return;
      var sel = "#" + hash;
      if (document.querySelector(sel)) flashThenScroll(sel);
    });
  }

  function initSectionReveals() {
    if (REDUCED || !window.gsap || !window.ScrollTrigger) return;
    document.querySelectorAll("[data-portfolio-section]").forEach(function (section) {
      var head = section.querySelector(".portfolio-section-block__head");
      var body = section.querySelectorAll(".portfolio-case-card, .portfolio-preview-grid__item");
      var revealed = false;
      function reveal() {
        if (revealed) return;
        revealed = true;
        if (head) gsap.to(head, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", overwrite: "auto" });
        if (body.length) {
          gsap.to(body, {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            stagger: 0.07,
            ease: "power3.out",
            delay: 0.08,
            overwrite: "auto",
          });
        }
        playVideosIn(section);
      }

      if (head) gsap.set(head, { autoAlpha: 0, y: 36 });
      if (body.length) gsap.set(body, { autoAlpha: 0, y: 40 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        once: true,
        onEnter: reveal,
        onRefresh: function (self) {
          if (self.progress > 0 || section.getBoundingClientRect().top < window.innerHeight * 0.85) {
            reveal();
          }
        },
      });
    });
  }

  function init() {
    initIntro();
    initCollage();
    initWebStrip();
    initJumps();
    initSectionReveals();
    initDeepLink();
    initHashChange();

    window.cosgralPortfolioShowcase = {
      scrollTo: flashThenScroll,
    };

    window.addEventListener("load", function () {
      hideCube();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
