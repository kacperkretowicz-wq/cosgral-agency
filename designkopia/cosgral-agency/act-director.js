/**
 * COSGRAL V3 — pinowana narracja aktów 1-4 (crossfade jak lusion.co).
 */
(function () {
  "use strict";

  const FORCE_MOTION = new URLSearchParams(location.search).has("forceMotion");
  const REDUCED_MOTION = FORCE_MOTION ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrapper = document.querySelector(".act-wrapper");
  if (!wrapper || REDUCED_MOTION || typeof gsap === "undefined") return;

  const acts = {
    1: document.querySelector(".act--1"),
    2: document.querySelector(".act--2"),
    3: document.querySelector(".act--3"),
    4: document.querySelector(".act--4"),
  };
  const heroVideo = document.querySelector("[data-hero-bg-video]");
  const act2Video = document.querySelector("[data-act2-bg-video]");

  const TRANS_START = 2.0;
  const ACT1_OUT = 0.65;
  const ACT2_IN = 0.85;

  const actHidden = { opacity: 0, visibility: "hidden", scale: 1, filter: "blur(0px)" };
  const actVisible = { opacity: 1, visibility: "visible" };

  [acts[2], acts[3], acts[4]].forEach(function (el) {
    if (el) gsap.set(el, actHidden);
  });
  if (acts[1]) gsap.set(acts[1], actVisible);
  if (acts[4]) gsap.set(acts[4], { pointerEvents: "none" });
  if (act2Video) act2Video.pause();
  if (heroVideo) gsap.set(heroVideo, { scale: 1.06, transformOrigin: "center center" });

  init();

  async function init() {
    await window.cosgralSmoothScroll?.ready;
    await window.heroTextReveal?.ready;

    const introLead = acts[1] && acts[1].querySelector(".act__lead");
    const introSub = acts[1] && acts[1].querySelector(".act__sub");
    if (introLead) gsap.set(introLead, { opacity: 0, y: 20 });
    if (introSub) gsap.set(introSub, { opacity: 0, y: 20 });

    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    window.heroTextReveal?.appendToTimeline(intro, 0.3);
    if (introLead) intro.to(introLead, { opacity: 1, y: 0, duration: 0.75 }, 1.05);
    if (introSub) intro.to(introSub, { opacity: 1, y: 0, duration: 0.75 }, 1.25);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: "+=420%",
        pin: true,
        scrub: 1.65,
        invalidateOnRefresh: true,
      },
    });

    function animateActText(el, at, dur, direction) {
      if (!el) return;
      const lead = el.querySelector(".act__lead");
      const sub = el.querySelector(".act__sub");
      const ease = direction === "in" ? "power3.out" : "power2.in";

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
      tl.set(el, { visibility: "visible" }, at)
        .fromTo(
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

    tl.to({}, { duration: 2.0 }, 0);

    if (heroVideo) {
      tl.to(heroVideo, { scale: 1, duration: 2.0, ease: "none" }, 0);
    }

    fadeActOut(acts[1], TRANS_START, ACT1_OUT);
    fadeActIn(acts[2], TRANS_START + ACT1_OUT * 0.72, ACT2_IN);

    if (heroVideo) {
      tl.to(heroVideo, { scale: 1.08, filter: "blur(6px)", duration: ACT1_OUT, ease: "power2.in" }, TRANS_START);
      tl.call(function () { heroVideo.pause(); }, null, TRANS_START + ACT1_OUT);
    }

    if (act2Video) {
      gsap.set(act2Video, { scale: 1.08, transformOrigin: "center center" });
      tl.to(act2Video, { scale: 1, duration: ACT2_IN, ease: "power2.out" }, TRANS_START + ACT1_OUT * 0.72);
      tl.call(function () {
        act2Video.currentTime = 0;
        act2Video.play().catch(function () {});
      }, null, TRANS_START + ACT1_OUT * 0.72);
      tl.call(function () { act2Video.pause(); }, null, 3.85);
    }

    fadeActOut(acts[2], 3.85, 0.45);
    fadeActIn(acts[3], 4.25, 0.65);
    fadeActOut(acts[3], 5.45, 0.4);
    fadeActIn(acts[4], 6.2, 0.7);

    const scrollHint = document.querySelector(".act-scroll-hint");
    if (scrollHint) tl.to(scrollHint, { opacity: 0, y: 12, duration: 0.45, ease: "power2.in" }, 5.8);

    tl.set(acts[4], { pointerEvents: "auto" }, 7.2);
    tl.to({}, { duration: 10 - 7.2 }, 7.2);

    if (new URLSearchParams(location.search).has("debug")) {
      window.__actDebug = { tl, intro, acts };
    }

    ScrollTrigger.refresh();
  }
})();
