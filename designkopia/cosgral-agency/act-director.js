/**
 * COSGRAL V3 — act-director: pinowana narracja aktów 1-4 BEZ sceny 3D.
 *
 * Zastępuje cube-director.js (2026-07-21, decyzja klienta: model 3D usunięty,
 * rolę sześcianu pełni wideo mirrored-cube.mp4 w akcie 1 — hero-cube-video.js).
 * Timingi przejść aktów są przeniesione 1:1 z master-timeline cube-directora
 * (jednostki 0..10 mapowane na progress ScrollTriggera 0..1):
 *   0-2    HOLD      — akt 1 (intro gra na load, nie w scrubie)
 *   2-2.6  DISSOLVE  — akt 1 znika
 *   3.0    akt 2 in, 3.9 akt 2 out
 *   4.35   akt 3 in, 5.55 akt 3 out
 *   6.35   akt 4 in (formularz), 7.4 pointer-events + koniec przejść
 *   7.4-10 hold — normalny scroll za wrapperem
 */
(function () {
  "use strict";

  const REDUCED_MOTION = false;
  const wrapper = document.querySelector(".act-wrapper");
  if (!wrapper || REDUCED_MOTION || typeof gsap === "undefined") return;

  const acts = {
    1: document.querySelector(".act--1"),
    2: document.querySelector(".act--2"),
    3: document.querySelector(".act--3"),
    4: document.querySelector(".act--4"),
  };

  // Akt 1 widoczny OD PIERWSZEJ KLATKI — pierwszy ekran nie może być pustą czernią.
  [acts[2], acts[3], acts[4]].forEach(function (el) {
    if (el) gsap.set(el, { opacity: 0, visibility: "hidden" });
  });
  if (acts[1]) gsap.set(acts[1], { opacity: 1, visibility: "visible" });
  if (acts[4]) gsap.set(acts[4], { pointerEvents: "none" });

  init();

  async function init() {
    await window.heroTextReveal?.ready;

    // ─── INTRO (na load, czasowe — NIE scrub) ────────────────────────────
    const introLead = acts[1] && acts[1].querySelector(".act__lead");
    const introSub = acts[1] && acts[1].querySelector(".act__sub");
    if (introLead) gsap.set(introLead, { opacity: 0, y: 16 });
    if (introSub) gsap.set(introSub, { opacity: 0, y: 16 });

    const intro = gsap.timeline({ defaults: { ease: "power2.out" } });
    window.heroTextReveal?.appendToTimeline(intro, 0.3);
    if (introLead) intro.to(introLead, { opacity: 1, y: 0, duration: 0.6 }, 1.1);
    if (introSub) intro.to(introSub, { opacity: 1, y: 0, duration: 0.6 }, 1.3);

    // ─── scrub timeline (pin) ────────────────────────────────────────────
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: "+=400%",
        pin: true,
        scrub: 1.1,
        invalidateOnRefresh: true,
      },
    });

    const fadeActIn = (el, at, dur) => {
      if (!el) return;
      tl.set(el, { visibility: "visible" }, at)
        .to(el, { opacity: 1, duration: dur || 0.5, ease: "power2.out" }, at);
    };
    const fadeActOut = (el, at, dur) => {
      if (!el) return;
      dur = dur || 0.4;
      tl.to(el, { opacity: 0, duration: dur, ease: "power2.in" }, at)
        .set(el, { visibility: "hidden" }, at + dur);
    };

    tl.to({}, { duration: 2.0 }, 0);            // HOLD — intro pokazało akt 1
    fadeActOut(acts[1], 2.0, 0.4);              // DISSOLVE
    fadeActIn(acts[2], 3.0, 0.6);
    fadeActOut(acts[2], 3.9, 0.3);
    fadeActIn(acts[3], 4.35, 0.55);
    fadeActOut(acts[3], 5.55, 0.35);
    fadeActIn(acts[4], 6.35, 0.6);

    const scrollHint = document.querySelector(".act-scroll-hint");
    if (scrollHint) tl.to(scrollHint, { opacity: 0, duration: 0.4 }, 6.0);
    tl.set(acts[4], { pointerEvents: "auto" }, 7.4);
    tl.to({}, { duration: 10 - 7.4 }, 7.4);     // hold do końca pina

    if (new URLSearchParams(location.search).has("debug")) {
      window.__actDebug = { tl, intro, acts };
    }
  }
})();
