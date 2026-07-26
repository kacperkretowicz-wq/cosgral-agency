/**
 * COSGRAL V4 — 6-chapter pinned narrative (VOID → CONTACT).
 */
(function () {
  "use strict";

  var FORCE_MOTION = new URLSearchParams(location.search).has("forceMotion");
  var REDUCED_MOTION = FORCE_MOTION ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wrapper = document.querySelector(".act-wrapper");
  if (!wrapper || REDUCED_MOTION || typeof gsap === "undefined") return;

  var acts = {};
  for (var i = 1; i <= 6; i++) {
    acts[i] = document.querySelector(".act--" + i);
  }

  var heroVideo = document.querySelector("[data-hero-bg-video]");
  var act2Video = document.querySelector("[data-act2-bg-video]");
  var actHidden = { opacity: 0, visibility: "hidden", scale: 1, filter: "blur(0px)" };
  var actVisible = { opacity: 1, visibility: "visible" };

  for (var j = 2; j <= 6; j++) {
    if (acts[j]) gsap.set(acts[j], actHidden);
  }
  if (acts[1]) gsap.set(acts[1], actVisible);
  if (acts[6]) gsap.set(acts[6], { pointerEvents: "none" });
  if (act2Video) act2Video.pause();
  if (heroVideo) gsap.set(heroVideo, { scale: 1.06, transformOrigin: "center center" });

  init();

  function init() {
    Promise.all([
      window.cosgralSmoothScroll && window.cosgralSmoothScroll.ready,
      window.heroTextReveal && window.heroTextReveal.ready,
    ]).then(function () {
      runTimeline();
    });
  }

  function runTimeline() {
    var introLead = acts[1] && acts[1].querySelector(".act__lead");
    var introSub = acts[1] && acts[1].querySelector(".act__sub");
    if (introLead) gsap.set(introLead, { opacity: 0, y: 20 });
    if (introSub) gsap.set(introSub, { opacity: 0, y: 20 });

    var intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (window.heroTextReveal) window.heroTextReveal.appendToTimeline(intro, 0.3);
    if (introLead) intro.to(introLead, { opacity: 1, y: 0, duration: 0.75 }, 1.05);
    if (introSub) intro.to(introSub, { opacity: 1, y: 0, duration: 0.75 }, 1.25);

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: "+=580%",
        pin: true,
        scrub: 1.65,
        invalidateOnRefresh: true,
      },
    });

    function animateActText(el, at, dur, direction) {
      if (!el) return;
      var lead = el.querySelector(".act__lead");
      var sub = el.querySelector(".act__sub");
      var ease = direction === "in" ? "power3.out" : "power2.in";
      if (lead) {
        tl.fromTo(
          lead,
          { y: direction === "in" ? 56 : 0, opacity: direction === "in" ? 0 : 1, filter: direction === "in" ? "blur(10px)" : "blur(0px)" },
          { y: direction === "in" ? 0 : -36, opacity: direction === "in" ? 1 : 0, filter: direction === "in" ? "blur(0px)" : "blur(8px)", duration: dur * 0.9, ease: ease },
          at + dur * 0.08
        );
      }
      if (sub) {
        tl.fromTo(
          sub,
          { y: direction === "in" ? 32 : 0, opacity: direction === "in" ? 0 : 1 },
          { y: direction === "in" ? 0 : -20, opacity: direction === "in" ? 1 : 0, duration: dur * 0.85, ease: ease },
          at + dur * 0.18
        );
      }
    }

    function fadeActIn(el, at, dur) {
      if (!el) return;
      tl.set(el, { visibility: "visible" }, at).fromTo(
        el,
        { opacity: 0, scale: 1.04, filter: "blur(16px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: dur, ease: "power3.out" },
        at
      );
      animateActText(el, at, dur, "in");
    }

    function fadeActOut(el, at, dur) {
      if (!el) return;
      animateActText(el, at, dur, "out");
      tl.to(el, { opacity: 0, scale: 0.97, filter: "blur(12px)", duration: dur, ease: "power2.in" }, at)
        .set(el, { visibility: "hidden", scale: 1, filter: "blur(0px)" }, at + dur);
    }

    function cross(from, to, at, dur) {
      fadeActOut(acts[from], at, dur * 0.55);
      fadeActIn(acts[to], at + dur * 0.42, dur * 0.65);
    }

    tl.to({}, { duration: 2.0 }, 0);
    if (heroVideo) tl.to(heroVideo, { scale: 1, duration: 2.0, ease: "none" }, 0);

    cross(1, 2, 2.0, 0.7);
    if (heroVideo) {
      tl.to(heroVideo, { scale: 1.08, filter: "blur(6px)", duration: 0.55, ease: "power2.in" }, 2.0);
      tl.call(function () { heroVideo.pause(); }, null, 2.55);
    }
    if (act2Video) {
      gsap.set(act2Video, { scale: 1.08, transformOrigin: "center center" });
      tl.to(act2Video, { scale: 1, duration: 0.65, ease: "power2.out" }, 2.42);
      tl.call(function () {
        act2Video.currentTime = 0;
        act2Video.play().catch(function () {});
      }, null, 2.42);
      tl.call(function () { act2Video.pause(); }, null, 4.2);
    }

    cross(2, 3, 3.75, 0.55);
    cross(3, 4, 4.85, 0.6);
    cross(4, 5, 6.0, 0.55);
    cross(5, 6, 7.1, 0.65);

    var scrollHint = document.querySelector(".act-scroll-hint");
    if (scrollHint) tl.to(scrollHint, { opacity: 0, y: 12, duration: 0.45, ease: "power2.in" }, 6.5);

    tl.set(acts[6], { pointerEvents: "auto" }, 7.9);
    tl.to({}, { duration: 10 - 7.9 }, 7.9);

    ScrollTrigger.refresh();
  }
})();
