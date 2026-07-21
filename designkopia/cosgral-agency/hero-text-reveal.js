/**
 * COSGRAL V3 — efekt "pojawiającego się napisu" na wordmarku hero.
 *
 * Uproszczony port `cosgral-hero-effects.js` (patrz PLAN-PRZEBUDOWY-V3.md §4.1):
 * tylko jedno słowo (COSGRAL), tylko tryb "classic" (clip-path wipe). Bez
 * konwergencji dwóch nagłówków, bez 16 trybów efektów, bez masek filmowych.
 *
 * Nie tworzy własnego ScrollTrigera/pina — cube-director.js wywołuje
 * `window.heroTextReveal.appendToTimeline(masterTl, at)` i wkleja tweeny do
 * WSPÓLNEGO master-timeline (jeden pin na #act-wrapper).
 */
(function () {
  "use strict";

  // patrz cube-director.js — ten sam wyjątek testowy ?forceMotion=1
  const FORCE_MOTION = new URLSearchParams(location.search).has("forceMotion");
  const REDUCED_MOTION = FORCE_MOTION ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WORD = "COSGRAL";

  const DOM = {};
  let glyphData = null;
  let rootLineLen = 0;

  function cacheDom() {
    DOM.heading = document.querySelector("[data-hero-heading='main']");
    DOM.container = document.querySelector(".hero_root_line");
    DOM.svg = document.querySelector(".hero_root_line svg");
    DOM.lead = document.querySelector(".hero_root_line path.rl-lead");
    DOM.w1 = document.querySelector(".hero_root_line path.rl-w1");
  }

  function transformGlyph(segs, scale, scaleAdjust, dx, dy) {
    let d = "";
    for (const seg of segs) {
      const cmd = seg[0];
      if (cmd === "Z") { d += "Z "; continue; }
      const nums = seg.slice(1);
      const out = [];
      for (let i = 0; i < nums.length; i += 2) {
        out.push(
          (nums[i] * scale * scaleAdjust + dx).toFixed(2),
          (-nums[i + 1] * scale + dy).toFixed(2)
        );
      }
      d += cmd + out.join(" ") + " ";
    }
    return d;
  }

  function buildWord(word, x0, yBase, fontSizePx, targetWidth) {
    const UPM = glyphData.upm;
    const GLYPHS = glyphData.glyphs;
    const scale = fontSizePx / UPM;
    let cursor = 0;
    for (const ch of word) {
      const g = GLYPHS[ch];
      cursor += g ? g.adv * scale : fontSizePx * 0.5;
    }
    const nativeWidth = cursor;
    const scaleAdjust = targetWidth ? targetWidth / nativeWidth : 1;

    cursor = 0;
    let d = "";
    for (const ch of word) {
      const g = GLYPHS[ch];
      if (!g) { cursor += fontSizePx * 0.5 * scaleAdjust; continue; }
      d += transformGlyph(g.segs, scale, scaleAdjust, x0 + cursor, yBase);
      cursor += g.adv * scale * scaleAdjust;
    }
    return { d: d.trim(), width: cursor };
  }

  function buildRootLinePath() {
    if (!DOM.heading || !DOM.lead || !DOM.w1 || !DOM.container || !glyphData) return;

    const containerRect = DOM.container.getBoundingClientRect();
    const r = DOM.heading.getBoundingClientRect();
    const fontSizePx = parseFloat(getComputedStyle(DOM.heading).fontSize);

    const x0 = r.left - containerRect.left;
    const baseY = r.top - containerRect.top + r.height * 0.86;

    DOM.svg.setAttribute("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`);

    const dLead = `M0 ${baseY.toFixed(1)} L${x0.toFixed(1)} ${baseY.toFixed(1)}`;
    const word = buildWord(WORD, x0, baseY, fontSizePx, r.width);

    DOM.lead.setAttribute("d", dLead);
    DOM.w1.setAttribute("d", word.d);

    const leadLen = DOM.lead.getTotalLength();
    rootLineLen = leadLen;
    gsap.set(DOM.lead, { strokeDasharray: leadLen, strokeDashoffset: leadLen, opacity: 1 });
    const w1Len = DOM.w1.getTotalLength();
    gsap.set(DOM.w1, { strokeDasharray: w1Len, strokeDashoffset: w1Len, opacity: 1 });
  }

  let resizeTimer;
  function scheduleRebuild() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildRootLinePath();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 200);
  }

  async function init() {
    cacheDom();
    if (!DOM.heading) return;

    // W reduced-motion cube-director.js nigdy nie woła appendToTimeline() (nie ma
    // pinowanej narracji), więc nie ustawiamy tu clip-path — CSS (html.reduce-motion
    // .hero-wordmark { clip-path: none }) ma zostać jedynym źródłem prawdy.
    if (!REDUCED_MOTION) {
      gsap.set(DOM.heading, { clipPath: "inset(0 100% 0 0)", opacity: 1 });
    }

    try {
      const res = await fetch("hero-glyphs.json");
      glyphData = await res.json();
    } catch (err) {
      console.warn("[hero-text-reveal] nie udało się wczytać hero-glyphs.json — fallback do prostego fade", err);
      glyphData = null;
    }

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    if (glyphData) buildRootLinePath();

    window.addEventListener("resize", scheduleRebuild);
    if (window.ResizeObserver && DOM.heading) {
      new ResizeObserver(scheduleRebuild).observe(DOM.heading);
    }
  }

  const ready = init();

  /**
   * Wkleja tweeny reveal-u wordmarku do master-timeline `tl`, zaczynając od
   * pozycji `at` (jednostki timeline'u cube-directora). Zwraca długość
   * zajętego okna (do orientacji, nieużywane obowiązkowo przez wołającego).
   */
  function appendToTimeline(tl, at) {
    if (!DOM.heading) return 0;

    if (!glyphData || !DOM.lead || !DOM.w1) {
      // fallback bez glifów: zwykły clip-path wipe, bez rysowanej linii
      tl.to(DOM.heading, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power1.inOut" }, at);
      return 0.5;
    }

    if (!REDUCED_MOTION) {
      tl.to(DOM.lead, { strokeDashoffset: 0, duration: 0.35, ease: "power1.inOut" }, at)
        .to(DOM.lead, { strokeDashoffset: () => rootLineLen, duration: 0.25, ease: "power1.in" }, at + 0.35)
        .to(DOM.w1, { strokeDashoffset: 0, duration: 0.4, ease: "power1.inOut" }, at + 0.35);
      tl.to(DOM.heading, { clipPath: "inset(0 0% 0 0)", duration: 0.3, ease: "power1.inOut" }, at + 0.7);
      tl.to(DOM.w1, { opacity: 0, duration: 0.15 }, at + 0.75);
    } else {
      tl.set(DOM.lead, { opacity: 0 }, at);
      tl.set(DOM.w1, { opacity: 0 }, at);
      tl.to(DOM.heading, { clipPath: "inset(0 0% 0 0)", duration: 0.3, ease: "power1.inOut" }, at);
    }
    return 1.0;
  }

  window.heroTextReveal = { ready, appendToTimeline };
})();
