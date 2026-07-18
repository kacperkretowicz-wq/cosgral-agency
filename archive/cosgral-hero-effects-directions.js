

window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lockHeading = (el) => {
    if (!el || el._locked) return;
    el._locked = true;

    // Lock innerHTML
    const origInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(el, 'innerHTML', {
      set(val) {
        if (val.includes('char-span') || val === '') {
          origInnerHTML.set.call(this, val);
        } else {
          console.log("BLOCKED innerHTML overwrite on:", el.tagName, "value:", val);
        }
      },
      get() {
        return origInnerHTML.get.call(this);
      },
      configurable: true
    });

    // Lock textContent
    const origTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(el, 'textContent', {
      set(val) {
        const textClean = val.trim().toUpperCase();
        if (textClean === 'COSGRAL' || textClean === 'AGENCY' || textClean === '') {
          console.log("BLOCKED textContent overwrite on:", el.tagName, "value:", val);
        } else {
          origTextContent.set.call(this, val);
        }
      },
      get() {
        return origTextContent.get.call(this);
      },
      configurable: true
    });
  };

  const splitLetters = (el) => {
    if (!el) return;
    if (el.querySelector('.char-span')) return; // already split!
    const text = el.textContent.trim();
    if (!text) return;
    el.innerHTML = text.split('').map(ch => `<span class="char-span" style="display: inline-block; position: relative;">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    lockHeading(el);
  };

  const scrambleTextEffect = (chars, duration, startTime, timeline) => {
    chars.forEach((char, index) => {
      const originalText = char.dataset.origText || char.textContent;
      char.dataset.origText = originalText;

      // Animate opacity directly to ensure 100% scrubbable fade-in
      timeline.fromTo(char,
        { opacity: 0 },
        { opacity: 1, duration: 0.1, ease: 'none' },
        startTime + index * 0.04
      );
    });
  };

  const getVvMeetTargets = () => {
    const head1 = DOM.vvHeadFirst;
    const head2 = DOM.vvHeadSecond;
    const h1 = DOM.vvHeadingFirst;
    const h2 = DOM.vvHeadingSecond;
    if (!head1 || !head2 || !h1 || !h2 || !rootLineContainer) return { x1: 0, x2: 0 };

    const containerRect = rootLineContainer.getBoundingClientRect();
    const r1 = h1.getBoundingClientRect();
    const r2 = h2.getBoundingClientRect();

    const currentX1 = gsap.getProperty(head1, 'x') || 0;
    const currentX2 = gsap.getProperty(head2, 'x') || 0;
    const h1_static = r1.left - containerRect.left - currentX1;
    const h2_static = r2.left - containerRect.left - currentX2;

    const rootFS = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const center = window.innerWidth / 2;

    // Width of both words
    const w1 = r1.width;
    const w2 = r2.width;
    const gap = 1.5 * rootFS;

    // Visual centering: center the entire combined block [h1 + gap + h2]
    const totalW = w1 + gap + w2;
    const targetLeft1 = center - totalW / 2;
    const targetLeft2 = targetLeft1 + w1 + gap;

    return {
      x1: targetLeft1 - h1_static,
      x2: targetLeft2 - h2_static
    };
  };

  const _dynPathsCache = { mid: '', w1: '', w2: '' };

  // `time` = current tl.time() during scrub, so this can skip everywhere except the
  // convergence window [2.15, 3.2] where v1/v2 (and thus the connector paths) actually
  // move; called with no args (time === undefined) from resize/ResizeObserver, which
  // always forces a recompute since layout genuinely changed.
  const updateDynamicPaths = (time) => {
    if (!DOM.rlMid || !DOM.vvHeadingFirst || !DOM.vvHeadingSecond || !rootLineContainer || !window.buildWord) return;
    if (time !== undefined && (time < 2.15 || time > 3.2)) return;

    const containerRect = rootLineContainer.getBoundingClientRect();
    const r1 = DOM.vvHeadingFirst.getBoundingClientRect();
    const r2 = DOM.vvHeadingSecond.getBoundingClientRect();
    const fs1 = parseFloat(getComputedStyle(DOM.vvHeadingFirst).fontSize);
    const fs2 = parseFloat(getComputedStyle(DOM.vvHeadingSecond).fontSize);

    const x1 = r1.left - containerRect.left;
    const base1 = r1.top - containerRect.top + r1.height * 0.86;
    const x2 = r2.left - containerRect.left;
    const base2 = r2.top - containerRect.top + r2.height * 0.86;

    let end1x = x1;
    const spans1 = DOM.vvHeadingFirst.querySelectorAll('.char-span');
    if (spans1.length > 0) {
      const lastSpanRect = spans1[spans1.length - 1].getBoundingClientRect();
      end1x = lastSpanRect.right - containerRect.left;
    } else {
      end1x = x1 + r1.width;
    }

    const dMid = `M${end1x.toFixed(1)} ${base1.toFixed(1)} L${x2.toFixed(1)} ${base2.toFixed(1)}`;

    const setIfChanged = (el, key, d) => {
      if (_dynPathsCache[key] === d) return;
      _dynPathsCache[key] = d;
      el.setAttribute('d', d);
    };

    setIfChanged(DOM.rlMid, 'mid', dMid);

    // Dynamic alignment of word outline paths
    const word1 = window.buildWord('COSGRAL', x1, base1, fs1, r1.width);
    setIfChanged(DOM.rlW1, 'w1', word1.d);

    const word2 = window.buildWord('AGENCY', x2, base2, fs2, r2.width);
    setIfChanged(DOM.rlW2, 'w2', word2.d);
  };

  const DECODE_RED = '#ee3335';

  // Deterministic pseudorandom (sin-hash) keyed by (index, step) — NOT Math.random():
  // scrubbing forward/backward through the same position must render the same frame
  // every time, which a real RNG can't guarantee. Used both for the decode-grid scramble
  // and as a seeded jitter source for zig-zag/timing offsets in several directions below.
  const decodePseudoRandom = (index, step) => {
    const x = Math.sin(index * 127.1 + step * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const updateScrambleGlobal = (timelineInstance) => {
    if (getDirectionId() !== 'decode-grid') return;
    const time = timelineInstance.time();
    const step = Math.floor(time * 30); // 1/30s buckets
    const symbols = '@#$%&*?ØÆΣΩαβγδεζηθικλμνξοπρστυφχψω1234567890'.split('');

    const scrambleWord = (chars, baseStart) => {
      chars.forEach((char, index) => {
        const orig = char.dataset.origText || char.textContent;
        char.dataset.origText = orig;
        const start = baseStart + index * 0.04;
        const end = start + 0.5;
        if (time >= start && time < end) {
          char.textContent = decodePseudoRandom(index, step) < 0.3
            ? symbols[Math.floor(decodePseudoRandom(index, step + 7) * symbols.length)]
            : orig;
          char.style.color = DECODE_RED;
          char.style.textShadow = `0 0 8px ${DECODE_RED}`;
        } else {
          char.textContent = orig;
          char.style.color = '';
          char.style.textShadow = '';
        }
      });
    };

    scrambleWord(DOM.vvHeadingFirst ? DOM.vvHeadingFirst.querySelectorAll('.char-span') : [], 1.6);
    scrambleWord(DOM.vvHeadingSecond ? DOM.vvHeadingSecond.querySelectorAll('.char-span') : [], 2.2);
  };

  // ─── 1. DOM cache ───────────────────────────────────────────────────────────
  const DOM = {
    hero:           document.querySelector('.section_hero'),
    bg:             document.querySelector('.hero_bg'),
    headingMain:    document.querySelector('[data-hero-heading="main"]'),
    headingFirst:   document.querySelector('.hero_heading_first'),
    headingThird:   document.querySelector('.hero_heading_third'),
    decorFirst:     document.querySelector('.hero_decor.first'),
    decorSecond:    document.querySelector('.hero_decor.second'),
    overlay:        document.querySelector('.hero_overlay'),
    vvHeadingFirst: document.querySelector('[data-vv="1"] h2'),
    vvHeadingSecond:document.querySelector('[data-vv="2"] h2'),
    v1:             document.querySelector('[data-vv="1"]'),
    v2:             document.querySelector('[data-vv="2"]'),
    vvHeadFirst:    document.querySelector('[data-vv="1"] .vv_content_head'),
    vvHeadSecond:   document.querySelector('[data-vv="2"] .vv_content_head'),
    vvDecorFirst:   document.querySelector('[data-vv="1"] .vv_decor'),
    vvDecorSecond:  document.querySelector('[data-vv="2"] .vv_decor'),
    vvParaFirst:    document.querySelector('[data-vv="1"] .u-p1'),
    vvParaSecond:   document.querySelector('[data-vv="2"] .u-p1'),
    vvWrapper:      document.querySelector('.vv_wrapper'),
    rlLead:         document.querySelector('.hero_root_line path.rl-lead'),
    rlW1:           document.querySelector('.hero_root_line path.rl-w1'),
    rlMid:          document.querySelector('.hero_root_line path.rl-mid'),
    rlW2:           document.querySelector('.hero_root_line path.rl-w2'),
    rlTail:         document.querySelector('.hero_root_line path.rl-tail'),
    filmFirst:      document.querySelector('[data-film="1"]'),
    filmSecond:     document.querySelector('[data-film="2"]'),
    headingFilms:   document.querySelectorAll('[data-heading-films]'),
    bodyFilms:      document.querySelectorAll('[data-body-films]'),
  };

  if (!DOM.hero) return;

  // ─── 2. Mask state ──────────────────────────────────────────────────────────
  const filmFirstMaskState  = { w: window.innerWidth, h: 0 };
  const filmSecondMaskState = { w: window.innerWidth, h: 0 };

  // These are real <a href> links, clip-path-hidden until the reveal at t=4.0 — without
  // this they stay keyboard-tabbable (full-size box, only visually clipped) and a
  // keyboard user can focus an invisible link before it's ever shown. Pointer-events
  // already gates mouse interaction; tabindex mirrors that for keyboard interaction.
  if (DOM.filmFirst) DOM.filmFirst.tabIndex = -1;
  if (DOM.filmSecond) DOM.filmSecond.tabIndex = -1;
  if (DOM.rlTail) DOM.rlTail.style.display = 'none';

  // VV stoi NIERUCHOMO od startu w swoim docelowym miejscu (bez y-przesunięcia) —
  // korzeń rysuje litery dokładnie tam, gdzie one stoją, więc odsłonięcie (clip-path)
  // wygląda jak zamiana narysowanej linii w tekst, a nie jak osobny napis wjeżdżający
  // z innego miejsca. Opis i labelki pod nagłówkiem czekają ukryte (opacity:0) na
  // swoim miejscu i tylko fadują — też bez jazdy z dołu.
  if (DOM.vvWrapper) gsap.set(DOM.vvWrapper, { y: 0, opacity: 1 });
  [DOM.vvDecorFirst, DOM.vvDecorSecond, DOM.vvParaFirst, DOM.vvParaSecond].forEach((el) => {
    if (el) gsap.set(el, { opacity: 0 });
  });

  // ─── 2b. Direction implementations (prep / words / bg) ───────────────────────
  // Each "direction" bundles: prep() — resting state of a heading BEFORE any scroll
  // (must look right at scrub position 0), words() — how that heading's letters/block
  // reveal (called once per word, at the shared pen-timing slots 1.6/2.2), and
  // bg() — how the hero photo/background transitions away in the 1.0–2.2 window.
  // All DOM nodes an effect creates get class `js-hero-fx` so buildHeroTimeline can
  // sweep them in one shot when switching direction (dev switcher forces a reload,
  // but breakpoint changes rebuild the timeline in place without one).

  function prepClassic(headingEl) {
    gsap.set(headingEl, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
  }

  function prepChars(headingEl) {
    splitLetters(headingEl);
    gsap.set(headingEl, { clipPath: 'none', opacity: 1 });
    gsap.set(headingEl.querySelectorAll('.char-span'), { opacity: 0 });
  }

  function prepHidden(headingEl) {
    gsap.set(headingEl, { clipPath: 'none', opacity: 0 });
  }

  function prepWholeDim(headingEl) {
    gsap.set(headingEl, { clipPath: 'none', opacity: 0.12, filter: 'blur(14px) brightness(2.4)' });
  }

  function prepInk(headingEl, wordIndex) {
    gsap.set(headingEl, { clipPath: 'none', opacity: 0 });
    headingEl.style.filter = `url(#smoke-melt-${wordIndex})`;
  }

  function prepOutline(headingEl) {
    splitLetters(headingEl);
    const chars = headingEl.querySelectorAll('.char-span');
    gsap.set(headingEl, { clipPath: 'none', opacity: 1 });
    gsap.set(chars, { opacity: 0, color: 'transparent' });
    chars.forEach((el) => { el.style.webkitTextStroke = '1.5px #ee3335'; });
  }

  function prepSlit(headingEl) {
    splitLetters(headingEl);
    gsap.set(headingEl, { clipPath: 'none', opacity: 1 });
    gsap.set(headingEl.querySelectorAll('.char-span'), { clipPath: 'inset(100% 0 0 0)', opacity: 1, y: 14 });
  }

  // — signature —
  function bgLensBlur(tl) {
    tl.to(DOM.bg, { filter: 'blur(20px) grayscale(0.65)', scale: 1.15, duration: 1.2, ease: 'power2.inOut' }, 1)
      .to(DOM.hero, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 1);
  }

  // — ink-melt — (bg reuses the "chromatic liquid melt" glass filter)
  function bgChromaticMelt(tl) {
    const lcDisp = document.querySelector('#lc-disp');
    const lcRed  = document.querySelector('#lc-red');
    const lcBlue = document.querySelector('#lc-blue');

    gsap.set(DOM.bg, { filter: 'url(#liquid-chromatic)' });
    if (lcDisp && lcRed && lcBlue) {
      gsap.set(lcDisp, { attr: { scale: 0 } });
      gsap.set([lcRed, lcBlue], { attr: { dx: 0 } });

      tl.to(lcDisp, { attr: { scale: 140 }, duration: 0.6, ease: 'power1.in' }, 1.0)
        .to(lcRed,  { attr: { dx: 22 },  duration: 0.6, ease: 'power1.in' }, 1.0)
        .to(lcBlue, { attr: { dx: -22 }, duration: 0.6, ease: 'power1.in' }, 1.0)
        .to(lcDisp, { attr: { scale: 0 }, duration: 0.6, ease: 'power1.out' }, 1.6)
        .to(lcRed,  { attr: { dx: 0 },   duration: 0.6, ease: 'power1.out' }, 1.6)
        .to(lcBlue, { attr: { dx: 0 },   duration: 0.6, ease: 'power1.out' }, 1.6);
    }
    tl.to(DOM.bg,   { opacity: 0, scale: 1.1, duration: 1.2, ease: 'power2.inOut' }, 1.0)
      .to(DOM.hero, { opacity: 0, duration: 1.2 }, 1.0);

    tl.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { filter: 'url(#liquid-chromatic)' }, 1.5);
    tl.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { filter: 'none' }, 2.5);
  }

  function inkWords(tl, chars, headingEl, at, wordIndex) {
    const filterId = `smoke-melt-${wordIndex}`;
    // Filter on/off tracked as GSAP .set()s (not raw style writes) so scrubbing
    // backward past `at` correctly restores the blur instead of leaving it removed.
    tl.set(headingEl, { filter: `url(#${filterId})` }, at);
    tl.fromTo(`#${filterId} feDisplacementMap`,
      { attr: { scale: 80 } },
      { attr: { scale: 0 }, duration: 0.7, ease: 'power2.out' },
      at
    );
    tl.fromTo(headingEl, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
    tl.set(headingEl, { filter: 'none' }, at + 0.7);
  }

  // — kinetic-portal —
  function bgPortalZoom(tl) {
    gsap.set(DOM.bg, { clipPath: 'inset(22% 28% 22% 28% round 16px)', scale: 1.35 });
    tl.to(DOM.bg,   { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1.0, duration: 1.2, ease: 'power3.inOut' }, 1.0)
      .to(DOM.hero, { opacity: 0, duration: 1.2, ease: 'power3.inOut' }, 1.0);

    // Red frame that traces the same clip-path expansion as the photo — reads as the
    // pen's line opening a window onto the hero image, echoing the letter root-line.
    const frame = document.createElement('div');
    frame.className = 'js-hero-fx hero_portal_frame';
    Object.assign(frame.style, {
      position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none',
      border: '1px solid #ee3335', borderRadius: '16px',
      clipPath: 'inset(22% 28% 22% 28% round 16px)',
    });
    DOM.hero.appendChild(frame);
    tl.to(frame, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.2, ease: 'power3.inOut' }, 1.0)
      .to(frame, { opacity: 0, duration: 0.2 }, 2.1);

    tl.fromTo([DOM.vvHeadFirst, DOM.vvHeadSecond],
      { opacity: 0, scale: 0.8, y: 40 },
      { opacity: 1, scale: 1.0, y: 0, duration: 0.8, ease: 'power3.out' },
      1.5
    );
  }

  function kineticWords(tl, chars, headingEl, at) {
    gsap.set(chars, { transformPerspective: 1000 });
    tl.fromTo(chars,
      { rotationX: -90, y: 60, scale: 0, opacity: 0, transformOrigin: '50% 100% -50px' },
      { rotationX: 0, y: 0, scale: 1, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'back.out(2)' },
      at
    );
  }

  // — decode-grid — (dark curtain + scanning line instead of a hard cream cut)
  function bgGridReveal(tl) {
    const gridW = 3, gridH = 3;
    const blocks = [];
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const block = document.createElement('div');
        block.className = 'js-hero-fx hero_grid_block';
        Object.assign(block.style, {
          position: 'absolute',
          left: `${(x / gridW) * 100}%`, top: `${(y / gridH) * 100}%`,
          width: `${100 / gridW}%`, height: `${100 / gridH}%`,
          background: '#1a1614', outline: '1px solid rgba(238,51,53,0.35)',
          zIndex: 10, transform: 'scale(0)',
        });
        DOM.hero.appendChild(block);
        blocks.push({ el: block, row: y, col: x });
      }
    }
    const maxSum = (gridW - 1) + (gridH - 1);
    blocks.forEach(({ el, row, col }) => {
      tl.to(el, { scale: 1.05, duration: 0.3, ease: 'power2.inOut' }, 1.0 + (row + col) * 0.05);
    });
    tl.set(DOM.bg, { opacity: 0 }, 1.5);
    blocks.forEach(({ el, row, col }) => {
      tl.to(el, { scale: 0, duration: 0.3, ease: 'power2.inOut' }, 1.55 + (maxSum - (row + col)) * 0.05);
    });

    const scanner = document.createElement('div');
    scanner.className = 'js-hero-fx hero_scanner';
    Object.assign(scanner.style, {
      position: 'absolute', left: '0', top: '0', width: '100%', height: '2px',
      background: '#ee3335', zIndex: 11, boxShadow: '0 0 12px #ee3335',
    });
    DOM.hero.appendChild(scanner);
    tl.fromTo(scanner, { top: '0%' },   { top: '100%', duration: 0.5, ease: 'none' }, 1.0)
      .fromTo(scanner, { top: '100%' }, { top: '0%',   duration: 0.5, ease: 'none' }, 1.55)
      .to(scanner, { opacity: 0, duration: 0.1 }, 2.05);

    tl.to(DOM.hero, { opacity: 0, duration: 0.01 }, 2.2);
  }

  // — editorial-slice —
  function bgEditorialStrips(tl) {
    const numStrips = 7;
    const strips = [];
    for (let i = 0; i < numStrips; i++) {
      const strip = document.createElement('div');
      strip.className = 'js-hero-fx hero_strip';
      Object.assign(strip.style, {
        position: 'absolute', left: `${(i / numStrips) * 100}%`, top: '0',
        width: `${100 / numStrips}%`, height: '100%', overflow: 'hidden', zIndex: 1,
      });
      const img = DOM.bg.cloneNode();
      Object.assign(img.style, {
        position: 'absolute', left: `-${i * 100}%`, top: '0',
        width: `${numStrips * 100}%`, height: '100%', objectFit: 'cover',
        transformOrigin: i % 2 === 0 ? '50% 0%' : '50% 100%',
      });
      strip.appendChild(img);
      if (i > 0) {
        const sep = document.createElement('div');
        sep.className = 'js-hero-fx hero_strip_sep';
        Object.assign(sep.style, {
          position: 'absolute', left: '0', top: '0', width: '1px', height: '100%',
          background: 'rgba(238,51,53,0.5)', zIndex: 2, opacity: '0',
        });
        strip.appendChild(sep);
        tl.to(sep, { opacity: 1, duration: 0.15 }, 0.95 + i * 0.01);
      }
      DOM.hero.appendChild(strip);
      strips.push({ strip, img, i });
    }
    gsap.set(DOM.bg, { opacity: 0 });
    strips.forEach(({ strip, img, i }) => {
      const dir = i % 2 === 0 ? -1 : 1;
      tl.to(strip, { y: `${dir * 100}%`, duration: 0.8, ease: 'power3.inOut' }, 1.0 + i * 0.05)
        .to(img,   { scale: 1.06, duration: 0.8, ease: 'power3.inOut' }, 1.0 + i * 0.05);
    });
    tl.to(DOM.hero, { opacity: 0, duration: 0.01 }, 2.15);
  }

  function editorialSlantedWords(tl, chars, headingEl, at) {
    tl.fromTo(chars,
      { y: (i) => i % 2 === 0 ? -80 : 80, x: (i) => i % 2 === 0 ? 28 : -28, skewX: (i) => i % 2 === 0 ? 16 : -16, opacity: 0 },
      { y: 0, x: 0, skewX: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' },
      at
    );
  }

  // — letter-portal — the hero photo seen through the real glyph contours of
  // COSGRAL/agency (reusing the same `d` the root-line pen already draws), which then
  // crossfades into the plain solid heading. Built lazily: needs DOM.rlW1/rlW2 to
  // already have real `d` attributes, which only exist after buildRootLinePath() has
  // run once (itself gated on document.fonts.ready).
  let _portalGroup = null, _portalImg1 = null, _portalImg2 = null;

  function ensurePortalSvg() {
    if (_portalGroup && document.body.contains(_portalGroup)) return true;
    _portalGroup = null; // stale ref from a removed breakpoint-switch DOM node
    if (!DOM.rlW1 || !DOM.rlW2 || !rootLineContainer) return false;
    const d1 = DOM.rlW1.getAttribute('d');
    const d2 = DOM.rlW2.getAttribute('d');
    if (!d1 || !d2) return false;

    const svgNS = 'http://www.w3.org/2000/svg';
    const rect = rootLineContainer.getBoundingClientRect();
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'js-hero-fx hero_letter_portal');
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    Object.assign(svg.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      zIndex: '3', pointerEvents: 'none', opacity: '1',
    });

    const defs = document.createElementNS(svgNS, 'defs');
    const makeClip = (id, d) => {
      const clip = document.createElementNS(svgNS, 'clipPath');
      clip.setAttribute('id', id);
      clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('clip-rule', 'evenodd');
      clip.appendChild(path);
      defs.appendChild(clip);
    };
    makeClip('glyph-portal-clip-1', d1);
    makeClip('glyph-portal-clip-2', d2);
    svg.appendChild(defs);

    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('class', 'portal-zoom-group');

    const src = DOM.bg.currentSrc || DOM.bg.src || '';
    const makeImageGroup = (clipId) => {
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('clip-path', `url(#${clipId})`);
      const img = document.createElementNS(svgNS, 'image');
      img.setAttribute('href', src);
      img.setAttribute('x', '0');
      img.setAttribute('y', '0');
      img.setAttribute('width', String(rect.width));
      img.setAttribute('height', String(rect.height));
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      g.appendChild(img);
      group.appendChild(g);
      return g;
    };
    _portalImg1 = makeImageGroup('glyph-portal-clip-1');
    _portalImg2 = makeImageGroup('glyph-portal-clip-2');
    svg.appendChild(group);
    rootLineContainer.appendChild(svg);

    const bbox1 = DOM.rlW1.getBBox();
    gsap.set(group, { svgOrigin: `${(bbox1.x + bbox1.width / 2).toFixed(1)} ${(bbox1.y + bbox1.height / 2).toFixed(1)}` });

    _portalGroup = svg;
    return true;
  }

  function bgLetterPortal(tl) {
    tl.to(DOM.bg,   { filter: 'blur(14px)', scale: 1.08, duration: 1.1, ease: 'power2.inOut' }, 1.0)
      .to(DOM.bg,   { opacity: 0, duration: 0.45 }, 1.1)
      .to(DOM.hero, { opacity: 0, duration: 0.01 }, 1.6);

    // ensurePortalSvg() depends on DOM.rlW1/rlW2 already having real glyph `d` paths,
    // which are only set once document.fonts.ready resolves — a microtask that always
    // fires AFTER this synchronous buildHeroTimeline() call, never before, so the first
    // attempt here reliably fails even when fonts are already cached. Retry once fonts
    // resolve and splice the portal tweens into this SAME timeline (tl.seek re-renders
    // the current scrub position so nothing looks frozen if the user already scrolled).
    const addPortalTweens = () => {
      if (!ensurePortalSvg()) return false;
      const zoomGroup = _portalGroup.querySelector('.portal-zoom-group');
      gsap.set(zoomGroup, { scale: 1.14 });
      gsap.set(_portalGroup, { opacity: 1 });
      gsap.set([_portalImg1, _portalImg2], { opacity: 0 });

      [[_portalImg1, 1.6], [_portalImg2, 2.2]].forEach(([img, at]) => {
        tl.to(img, { opacity: 1, duration: 0.15 }, at)
          .to(img, { opacity: 0, duration: 0.2 }, at + 0.2);
      });
      tl.to(zoomGroup, { scale: 1, duration: 0.3, ease: 'power2.out' }, 1.6)
        .to(_portalGroup, { opacity: 0, duration: 0.15 }, 2.6);
      tl.seek(tl.time(), false);
      return true;
    };

    if (!addPortalTweens() && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (getDirectionId() !== 'letter-portal') return; // direction switched before fonts resolved
        if (!addPortalTweens()) {
          console.warn('[cosgral-hero] letter-portal: glyph paths still not ready, portal flourish skipped this load.');
        }
      });
    }
  }

  function portalWords(tl, chars, headingEl, at) {
    // Crossfades in exactly as bgLetterPortal fades its matching image-clip group out.
    tl.fromTo(headingEl, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.inOut' }, at + 0.2);
  }

  // — darkroom — negative flash, safelight wash, grain, image "develops" into view
  function bgDarkroom(tl) {
    tl.to(DOM.bg, { filter: 'invert(1) brightness(2.1) contrast(1.35)', duration: 0.3, ease: 'power2.in' }, 1.0);

    const safelight = document.createElement('div');
    safelight.className = 'js-hero-fx hero_safelight';
    Object.assign(safelight.style, {
      position: 'absolute', inset: '0', background: '#ee3335',
      mixBlendMode: 'multiply', zIndex: 4, opacity: '0',
    });
    DOM.hero.appendChild(safelight);
    tl.to(safelight, { opacity: 0.55, duration: 0.25 }, 1.1)
      .to(safelight, { opacity: 0, duration: 0.3 }, 1.7);

    const grain = document.createElement('div');
    grain.className = 'js-hero-fx hero_grain';
    Object.assign(grain.style, {
      position: 'absolute', inset: '0', zIndex: 5, opacity: '0',
      filter: 'url(#hero-grain)', background: '#808080', mixBlendMode: 'overlay',
    });
    DOM.hero.appendChild(grain);
    tl.to(grain, { opacity: 0.35, duration: 0.2 }, 1.1)
      .to(grain, { opacity: 0, duration: 0.3 }, 1.8);

    tl.to(DOM.bg, { opacity: 0, filter: 'invert(0) brightness(1) contrast(1)', duration: 0.55, ease: 'power2.inOut' }, 1.35);
    tl.to(DOM.hero, { opacity: 0, duration: 0.01 }, 2.0);
  }

  function darkroomWords(tl, chars, headingEl, at) {
    tl.fromTo(headingEl,
      { opacity: 0.12, filter: 'blur(14px) brightness(2.4)' },
      { opacity: 1, filter: 'blur(0px) brightness(1)', duration: 0.5, ease: 'power2.inOut' },
      at
    );
  }

  // — outline-fill — pen leaves a red stroke-only outline, then it fills in letter
  // by letter while the photo behind pulls back into a blueprint grid and zips shut.
  function outlineWords(tl, chars, headingEl, at) {
    tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.03, ease: 'power1.out' }, at)
      .to(chars, { color: '#f5f2ed', duration: 0.3, stagger: 0.04, ease: 'power2.inOut' }, at + 0.25);

    // -webkit-text-stroke is a shorthand GSAP can't tween directly, so drive it with a
    // manual per-char tween that writes the interpolated stroke width/alpha each frame —
    // still scrub-safe since `this.progress()` runs backward correctly on reverse scrub.
    chars.forEach((el, i) => {
      tl.to(el, {
        duration: 0.3, ease: 'power2.inOut',
        onUpdate: function () {
          const p = this.progress();
          el.style.webkitTextStroke = `${(1.5 * (1 - p)).toFixed(2)}px rgba(238,51,53,${(1 - p).toFixed(2)})`;
        },
      }, at + 0.25 + i * 0.04);
    });
  }

  function bgBlueprint(tl) {
    const grid = document.createElement('div');
    grid.className = 'js-hero-fx hero_blueprint_grid';
    Object.assign(grid.style, {
      position: 'absolute', inset: '0', zIndex: 2, opacity: '0',
      backgroundImage:
        'repeating-linear-gradient(90deg, rgba(238,51,53,0.16) 0 1px, transparent 1px 8vw), repeating-linear-gradient(0deg, rgba(238,51,53,0.16) 0 1px, transparent 1px 8vw)',
    });
    DOM.hero.appendChild(grid);

    tl.to(DOM.bg, { filter: 'grayscale(1) contrast(0.9)', duration: 0.3 }, 1.0)
      .to(grid, { opacity: 0.5, duration: 0.3 }, 1.0)
      .to([DOM.bg, grid], { scaleX: 0.04, opacity: 0, duration: 0.5, ease: 'expo.inOut', transformOrigin: '50% 50%' }, 1.4)
      .to(DOM.hero, { opacity: 0, duration: 0.01 }, 1.95);
  }

  // — editorial-tear — photo tears along a jagged diagonal, halves fly apart
  function bgTear(tl) {
    const zig = [];
    for (let i = 0; i <= 12; i++) zig.push(50 + (decodePseudoRandom(i, 42) - 0.5) * 7);

    const topPoints = ['0% 0%', '100% 0%', '100% 34%'];
    zig.forEach((x, i) => topPoints.push(`${x.toFixed(1)}% ${(34 + (i / 12) * 32).toFixed(1)}%`));
    topPoints.push('0% 66%');
    const topPoly = `polygon(${topPoints.join(', ')})`;

    const botPoints = ['0% 100%', '100% 100%', '100% 66%'];
    [...zig].reverse().forEach((x, i) => botPoints.push(`${x.toFixed(1)}% ${(66 - (i / 12) * 32).toFixed(1)}%`));
    botPoints.push('0% 34%');
    const botPoly = `polygon(${botPoints.join(', ')})`;

    const top = document.createElement('div');
    top.className = 'js-hero-fx hero_tear_top';
    const bot = document.createElement('div');
    bot.className = 'js-hero-fx hero_tear_bottom';
    [top, bot].forEach((el) => {
      Object.assign(el.style, { position: 'absolute', inset: '0', zIndex: 2, filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))' });
      const img = DOM.bg.cloneNode();
      Object.assign(img.style, { position: 'absolute', inset: '0', objectFit: 'cover' });
      el.appendChild(img);
      DOM.hero.appendChild(el);
    });
    top.style.clipPath = topPoly;
    bot.style.clipPath = botPoly;

    gsap.set(DOM.bg, { opacity: 0 });

    tl.to(top, { x: '-13%', y: '-6%', rotation: -2.6, duration: 0.55, ease: 'power3.inOut' }, 1.0)
      .to(bot, { x: '12%', y: '7%', rotation: 2.2, duration: 0.55, ease: 'power3.inOut' }, 1.0)
      .to([top, bot], { opacity: 0, duration: 0.2 }, 1.55)
      .to(DOM.hero, { opacity: 0, duration: 0.01 }, 1.8);
  }

  function tearWords(tl, chars, headingEl, at) {
    tl.fromTo(chars,
      { opacity: 0, scale: 1.18, rotation: (i) => (i % 2 ? 1.4 : -1.2), textShadow: '3px 3px 0 #ee3335' },
      { opacity: 1, scale: 1, rotation: 0, textShadow: '0px 0px 0 rgba(238,51,53,0)', duration: 0.35, stagger: 0.05, ease: 'power4.out' },
      at
    );
  }

  // — chromatic-dive — camera dives into the photo; pen's letter segments are
  // deliberately suppressed here (see hidesLetterStrokes) so only the lead/mid travel
  // lines show, and the words "snap into focus" from the opposite direction instead.
  function bgDive(tl) {
    gsap.set(DOM.bg, { transformOrigin: '62% 38%' });
    const lcDisp = document.querySelector('#lc-disp');
    const lcRed  = document.querySelector('#lc-red');
    const lcBlue = document.querySelector('#lc-blue');

    const vignette = document.createElement('div');
    vignette.className = 'js-hero-fx hero_vignette';
    Object.assign(vignette.style, {
      position: 'absolute', inset: '0', zIndex: 2, opacity: '0',
      background: 'radial-gradient(circle at 62% 38%, transparent 30%, #1a1614 78%)',
    });
    DOM.hero.appendChild(vignette);

    gsap.set(DOM.bg, { filter: 'url(#liquid-chromatic)' });
    tl.to(DOM.bg, { scale: 5.5, duration: 0.8, ease: 'expo.in' }, 1.0)
      .to(vignette, { opacity: 1, duration: 0.6 }, 1.2);
    if (lcDisp && lcRed && lcBlue) {
      gsap.set(lcDisp, { attr: { scale: 0 } });
      gsap.set([lcRed, lcBlue], { attr: { dx: 0 } });
      tl.to(lcDisp, { attr: { scale: 55 }, duration: 0.8, ease: 'expo.in' }, 1.0)
        .to(lcRed,  { attr: { dx: 16 },  duration: 0.8, ease: 'expo.in' }, 1.0)
        .to(lcBlue, { attr: { dx: -16 }, duration: 0.8, ease: 'expo.in' }, 1.0);
    }
    tl.to(DOM.bg, { opacity: 0, duration: 0.15 }, 1.75)
      .to(DOM.hero, { opacity: 0, duration: 0.01 }, 1.95)
      .set(DOM.bg, { filter: 'none', scale: 1, transformOrigin: '50% 50%' }, 2.0);
    if (lcDisp) tl.set(lcDisp, { attr: { scale: 0 } }, 2.0);
    if (lcRed && lcBlue) tl.set([lcRed, lcBlue], { attr: { dx: 0 } }, 2.0);
  }

  function diveWords(tl, chars, headingEl, at) {
    tl.fromTo(headingEl,
      { opacity: 0, scale: 1.45, filter: 'blur(9px)', letterSpacing: '0.14em' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0em', duration: 0.5, ease: 'power3.out' },
      at
    );
  }

  // — slit-drip — photo splits into vertical slit-scan strips that stretch and drip
  function bgSlitDrip(tl) {
    const numStrips = 24;
    gsap.set(DOM.bg, { opacity: 0 });
    for (let i = 0; i < numStrips; i++) {
      const strip = document.createElement('div');
      strip.className = 'js-hero-fx hero_slit_strip';
      Object.assign(strip.style, {
        position: 'absolute', left: `${(i / numStrips) * 100}%`, top: '0',
        width: `${100 / numStrips + 0.1}%`, height: '100%', overflow: 'hidden', zIndex: 1,
      });
      const img = DOM.bg.cloneNode();
      Object.assign(img.style, {
        position: 'absolute', left: `-${i * 100}%`, top: '0',
        width: `${numStrips * 100}%`, height: '100%', objectFit: 'cover',
        transformOrigin: '50% 0%',
      });
      strip.appendChild(img);
      DOM.hero.appendChild(strip);

      const scaleTarget = 1.4 + decodePseudoRandom(i, 7) * 2.2;
      const startDelay = 1.0 + decodePseudoRandom(i, 13) * 0.35;
      const fadeDelay = 1.55 + decodePseudoRandom(i, 19) * 0.3;
      tl.to(img, { scaleY: scaleTarget, duration: 0.55, ease: 'power2.in' }, startDelay)
        .to(strip, { opacity: 0, duration: 0.25 }, fadeDelay);
    }
    tl.to(DOM.hero, { opacity: 0, duration: 0.01 }, 2.15);
  }

  function slitWords(tl, chars, headingEl, at) {
    chars.forEach((el, i) => {
      const d = i * 0.035 + decodePseudoRandom(i, 3) * 0.05;
      tl.fromTo(el,
        { clipPath: 'inset(100% 0 0 0)', y: 14 },
        { clipPath: 'inset(0% 0 0 0)', y: 0, duration: 0.4, ease: 'power3.out' },
        at + d
      );
      if (i % 4 === 0) {
        // Target the heading's actual resting color (--cream), not '' — GSAP can't
        // interpolate color toward an empty string, so that left the accent stuck red.
        tl.fromTo(el, { color: '#ee3335' }, { color: '#f5f2ed', duration: 0.25, ease: 'power2.out' }, at + d + 0.15);
      }
    });
  }

  // ─── 2c. Direction registry ───────────────────────────────────────────────────
  // `words: null` falls back to the classic clip-path wipe in applyWordReveal().
  // `needsSplit: true` marks directions whose root-line pen build must split the
  // heading into char-spans before measuring (kept in sync with prepChars/prepSlit/
  // prepOutline so the pen and the reveal agree on the same DOM shape up front).
  const HERO_DIRECTIONS = {
    signature: {
      label: 'Signature',
      prep: prepClassic,
      words: null,
      bg: bgLensBlur,
    },
    'ink-melt': {
      label: 'Ink Melt',
      prep: prepInk,
      words: inkWords,
      bg: bgChromaticMelt,
    },
    'kinetic-portal': {
      label: 'Kinetic Portal',
      prep: prepChars,
      words: kineticWords,
      bg: bgPortalZoom,
      needsSplit: true,
    },
    'decode-grid': {
      label: 'Decode Grid',
      prep: prepChars,
      words: (tl, chars, headingEl, at) => scrambleTextEffect(chars, 0.5, at, tl),
      bg: bgGridReveal,
      needsSplit: true,
    },
    'editorial-slice': {
      label: 'Editorial Slice',
      prep: prepChars,
      words: editorialSlantedWords,
      bg: bgEditorialStrips,
      needsSplit: true,
    },
    'letter-portal': {
      label: 'Letter Portal',
      prep: prepHidden,
      words: portalWords,
      bg: bgLetterPortal,
    },
    darkroom: {
      label: 'Darkroom',
      prep: prepWholeDim,
      words: darkroomWords,
      bg: bgDarkroom,
    },
    'outline-fill': {
      label: 'Outline Fill',
      prep: prepOutline,
      words: outlineWords,
      bg: bgBlueprint,
      needsSplit: true,
    },
    'editorial-tear': {
      label: 'Editorial Tear',
      prep: prepChars,
      words: tearWords,
      bg: bgTear,
      needsSplit: true,
    },
    'chromatic-dive': {
      label: 'Chromatic Dive',
      prep: prepHidden,
      words: diveWords,
      bg: bgDive,
      hidesLetterStrokes: true,
    },
    'slit-drip': {
      label: 'Slit Drip',
      prep: prepSlit,
      words: slitWords,
      bg: bgSlitDrip,
      needsSplit: true,
    },
  };

  const LEGACY_DIRECTION_MAP = {
    kinetic: 'kinetic-portal',
    ink: 'ink-melt',
    decode: 'decode-grid',
    slanted: 'editorial-slice',
  };

  (function migrateLegacyDirection() {
    if (localStorage.getItem('heroDirection')) return;
    const legacyEffect = localStorage.getItem('effectMode');
    if (legacyEffect) {
      localStorage.setItem('heroDirection', LEGACY_DIRECTION_MAP[legacyEffect] || 'signature');
    }
    localStorage.removeItem('effectMode');
    localStorage.removeItem('bgTransitionMode');
  })();

  const getDirectionId = () => {
    if (REDUCED_MOTION) return 'signature';
    const id = localStorage.getItem('heroDirection');
    return (id && HERO_DIRECTIONS[id]) ? id : 'signature';
  };

  // Nagłówki VV — resting state before any scroll, per selected direction.
  if (DOM.v1) gsap.set(DOM.v1, { x: 0 });
  if (DOM.v2) gsap.set(DOM.v2, { x: 0 });

  const initialDirection = HERO_DIRECTIONS[getDirectionId()];
  if (DOM.vvHeadingFirst) initialDirection.prep(DOM.vvHeadingFirst, 1);
  if (DOM.vvHeadingSecond) initialDirection.prep(DOM.vvHeadingSecond, 2);

  // ─── Root line — budowana W LOCIE z realnych konturów liter (fontTools) i realnej ──
  // pozycji nagłówków "COSGRAL"/"agency" (getBoundingClientRect), żeby korzeń pisał
  // dokładnie tam, gdzie te napisy faktycznie stoją — nie w osobnym, przesuniętym miejscu.
  const rootLineSvg = document.querySelector('.hero_root_line svg');
  const rootLineContainer = document.querySelector('.hero_root_line');
  const rootLineLen = { lead: 0, w1: 0, mid: 0, w2: 0, tail: 0 };

  function buildRootLinePath() {
    if (!DOM.rlLead || !DOM.rlW1 || !DOM.rlMid || !DOM.rlW2 || !DOM.rlTail || !DOM.vvHeadingFirst || !DOM.vvHeadingSecond || !rootLineContainer) return;
    if (HERO_DIRECTIONS[getDirectionId()].needsSplit) {
      splitLetters(DOM.vvHeadingFirst);
      splitLetters(DOM.vvHeadingSecond);
    }
    const glyphEl = document.getElementById('root-line-glyphs');
    if (!glyphEl) return;
    const glyphData = JSON.parse(glyphEl.textContent);
    const UPM = glyphData.upm;
    const GLYPHS = glyphData.glyphs;

    const transformGlyphAdjusted = (segs, scale, scaleAdjust, dx, dy) => {
      let d = '';
      for (const seg of segs) {
        const cmd = seg[0];
        if (cmd === 'Z') { d += 'Z '; continue; }
        const nums = seg.slice(1);
        const out = [];
        for (let i = 0; i < nums.length; i += 2) {
          out.push(
            (nums[i] * scale * scaleAdjust + dx).toFixed(2),
            (-nums[i + 1] * scale + dy).toFixed(2)
          );
        }
        d += cmd + out.join(' ') + ' ';
      }
      return d;
    };

    const buildWord = (word, x0, yBase, fontSizePx, targetWidth) => {
      window.buildWord = buildWord;
      const scale = fontSizePx / UPM;
      let cursor = 0;
      let d = '';

      // Calculate native width (with 0 tracking)
      for (const ch of word) {
        const g = GLYPHS[ch];
        if (!g) { cursor += fontSizePx * 0.5; continue; }
        cursor += g.adv * scale;
      }
      const nativeWidth = cursor;
      const scaleAdjust = targetWidth ? (targetWidth / nativeWidth) : 1;

      cursor = 0;
      for (const ch of word) {
        const g = GLYPHS[ch];
        if (!g) { cursor += fontSizePx * 0.5 * scaleAdjust; continue; }
        d += transformGlyphAdjusted(g.segs, scale, scaleAdjust, x0 + cursor, yBase);
        cursor += g.adv * scale * scaleAdjust;
      }
      return { d: d.trim(), width: cursor };
    };

    const containerRect = rootLineContainer.getBoundingClientRect();
    const r1 = DOM.vvHeadingFirst.getBoundingClientRect();
    const r2 = DOM.vvHeadingSecond.getBoundingClientRect();
    const fs1 = parseFloat(getComputedStyle(DOM.vvHeadingFirst).fontSize);
    const fs2 = parseFloat(getComputedStyle(DOM.vvHeadingSecond).fontSize);

    // Subtract current GSAP wrapper translations to get stable base coordinates
    const currentX1 = gsap.getProperty(DOM.vvHeadFirst, 'x') || 0;
    const currentX2 = gsap.getProperty(DOM.vvHeadSecond, 'x') || 0;

    const x1 = r1.left - containerRect.left - currentX1;
    const base1 = r1.top - containerRect.top + r1.height * 0.86;
    const x2 = r2.left - containerRect.left - currentX2;
    const base2 = r2.top - containerRect.top + r2.height * 0.86;

    rootLineSvg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);

    // Pięć NIEZALEŻNYCH odcinków ścieżki — każdy dekoracyjny ("pióro w drodze") odcinek
    // sam się rysuje i sam się cofa do zera (znika), a każdy odcinek z literami rysuje
    // się i ZOSTAJE (aż do natychmiastowej podmiany na solidny tekst). Dzięki temu po
    // animacji nie zostają żadne czerwone linie — tylko czyste "COSGRAL" / "agency".

    // rl-lead: linia wchodząca z lewego brzegu ekranu prosto do pierwszej litery "COSGRAL"
    let dLead = `M0 ${base1.toFixed(1)} L${x1.toFixed(1)} ${base1.toFixed(1)}`;

    // rl-w1: same litery "COSGRAL" — rysują się i ZOSTAJĄ (szerokość dopasowana subpikselowo)
    const word1 = buildWord('COSGRAL', x1, base1, fs1, r1.width);
    const dW1 = word1.d;
    const end1x = x1 + word1.width;

    // rl-mid: connector2, koniec "COSGRAL" -> początek "agency" — rysuje się i znika (linia prosta)
    const dMid = `M${end1x.toFixed(1)} ${base1.toFixed(1)} L${x2.toFixed(1)} ${base2.toFixed(1)}`;

    // rl-w2: same litery "agency" — rysują się i ZOSTAJĄ (szerokość dopasowana subpikselowo)
    const word2 = buildWord('AGENCY', x2, base2, fs2, r2.width);
    const dW2 = word2.d;

    const segments = [
      ['rlLead', dLead, 'lead'],
      ['rlW1', dW1, 'w1'],
      ['rlMid', dMid, 'mid'],
      ['rlW2', dW2, 'w2'],
    ];
    segments.forEach(([domKey, d, lenKey]) => {
      const el = DOM[domKey];
      el.setAttribute('d', d);
      const len = el.getTotalLength();
      rootLineLen[lenKey] = len;
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      buildRootLinePath();
      if (getDirectionId() === 'letter-portal') ensurePortalSvg();
    });
  } else {
    buildRootLinePath();
    if (getDirectionId() === 'letter-portal') ensurePortalSvg();
  }

  let _rootLineResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_rootLineResizeTimer);
    _rootLineResizeTimer = setTimeout(() => {
      buildRootLinePath();
      if (typeof updateDynamicPaths === 'function') updateDynamicPaths();
      ScrollTrigger.refresh();
    }, 200);
  });

  // Skip sub-pixel/no-op layout churn (clip-path & char-span reveals can trigger the
  // observer without any real size change) and debounce genuine changes 150ms.
  let _headingResizeTimer;
  const _lastHeadingSize = new WeakMap();
  const headingObserver = new ResizeObserver((entries) => {
    let changed = false;
    entries.forEach((entry) => {
      const { width, height } = entry.contentRect;
      const prev = _lastHeadingSize.get(entry.target);
      if (!prev || Math.abs(width - prev.w) >= 1 || Math.abs(height - prev.h) >= 1) {
        changed = true;
      }
      _lastHeadingSize.set(entry.target, { w: width, h: height });
    });
    if (!changed) return;
    clearTimeout(_headingResizeTimer);
    _headingResizeTimer = setTimeout(() => {
      buildRootLinePath();
      if (typeof updateDynamicPaths === 'function') updateDynamicPaths();
      ScrollTrigger.refresh();
    }, 150);
  });
  if (DOM.vvHeadingFirst) headingObserver.observe(DOM.vvHeadingFirst);
  if (DOM.vvHeadingSecond) headingObserver.observe(DOM.vvHeadingSecond);

  // ─── 3. Clip-path helpers ───────────────────────────────────────────────────
  const getClipPath = (w, h, type) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rx = vw / 2 - w / 2;
    let   ry = vh / 2 - h / 2;
    if (type === 'top')    ry = 0 - 1; ////
    if (type === 'bottom') ry = vh - h + 1; ///
    return `polygon(${rx - 1}px ${ry - 1}px, ${rx + w + 1}px ${ry - 1}px, ${rx + w + 1}px ${ry + h + 1}px, ${rx - 1}px ${ry + h + 1}px)`;
    // return `polygon(${rx}px ${ry}px, ${rx + w}px ${ry}px, ${rx + w}px ${ry + h}px, ${rx}px ${ry + h}px)`;
  };

  // One function, one frame, one DOM-write per element
  // Guard against redundant writes (same value) rather than throttling by real time —
  // a real-time throttle here caused masks to visibly update at ~20fps during scrub,
  // and also silently dropped renders under jump-cut / programmatic progress changes.
  let _maskFirstClip = '';
  let _maskSecondClip = '';
  const updateAllMasks = () => {
    if (DOM.filmFirst) {
      const clip = getClipPath(filmFirstMaskState.w, filmFirstMaskState.h, 'top');
      if (clip !== _maskFirstClip) { _maskFirstClip = clip; DOM.filmFirst.style.clipPath = clip; }
    }
    if (DOM.filmSecond) {
      const clip = getClipPath(filmSecondMaskState.w, filmSecondMaskState.h, 'bottom');
      if (clip !== _maskSecondClip) { _maskSecondClip = clip; DOM.filmSecond.style.clipPath = clip; }
    }
  };

  // Keyed off tl.time() (like updateAllMasks/updateDynamicPaths) rather than a tween
  // onStart/onReverseComplete callback — those don't reliably fire on a direct
  // .progress() jump across a duration:0 tween, only on continuous playback.
  let _filmsFocusable = false;
  const updateFilmFocusability = (time) => {
    const focusable = time >= 4.0;
    if (focusable === _filmsFocusable) return;
    _filmsFocusable = focusable;
    if (DOM.filmFirst) DOM.filmFirst.tabIndex = focusable ? 0 : -1;
    if (DOM.filmSecond) DOM.filmSecond.tabIndex = focusable ? 0 : -1;
  };

  // ─── 5. SplitText + about-section triggers (FIX #1) ─────────────────────────
  // Run ONCE at startup — not inside matchMedia, so they survive breakpoint changes.
  if (DOM.headingFilms.length) {
    new SplitText(DOM.headingFilms, { types: 'lines', mask: 'lines', linesClass: 'line' });
    gsap.set('[data-heading-films] .line-mask', { width: '100%' });
    gsap.set('[data-heading-films] .line', {
      display: 'inline-flex',
      justifyContent: 'space-between',
      width: '100%',
    });

    DOM.headingFilms.forEach((el) => {
      gsap.set(el.querySelectorAll('.line'), { yPercent: 100, opacity: 0 });
      const a = gsap.fromTo(
        el.querySelectorAll('.line'),
        { yPercent: 100, opacity: 0 },
        { yPercent: 0, opacity: 1, ease: 'power4.inOut', duration: 0.8, stagger: 0.05, paused: true },
      );
      ScrollTrigger.create({
        trigger: '.hero_stack_wrapper',
        start: 'bottom bottom',
        onEnter:     () => a.play(),
        onLeaveBack: () => a.reverse(),
      });
    });
  }

  DOM.bodyFilms.forEach((el) => {
    gsap.set(el, { opacity: 0 });
    const a = gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, ease: 'power4.inOut', duration: 1.5, delay: 0.5, paused: true },
    );
    ScrollTrigger.create({
      trigger: '.section_about',
      start: 'top-=175% top',
      onEnter:     () => a.play(),
      onLeaveBack: () => a.reverse(),
    });
  });

  // ─── 6. GSAP matchMedia — only scroll-driven hero animation ─────────────────
  const wrapper = document.querySelector('.hero_stack_wrapper');
  const mm = gsap.matchMedia();

  // Modes without a `words` fn (only `signature` today) fall through to the classic
  // clip-path wipe reveal.
  function applyWordReveal(tl, direction, chars, headingEl, at, wordIndex) {
    if (direction.words) {
      direction.words(tl, chars, headingEl, at, wordIndex);
      return;
    }
    tl.to(headingEl, { clipPath: 'inset(0 0% 0 0)', duration: 0.3, ease: 'power1.inOut' }, at);
  }

  function buildHeroTimeline({ isDesktop }) {
    const scrollTriggerConfig = {
      trigger: wrapper,
      start: 'top top',
      end: REDUCED_MOTION ? '+=300%' : '+=900%',
      pin: true,
      scrub: 1.6,
      invalidateOnRefresh: true,
    };

    const tl = gsap.timeline({
      onUpdate: function() {
        updateAllMasks();
        updateScrambleGlobal(this);
        updateDynamicPaths(this.time());
        updateFilmFocusability(this.time());
      },
      scrollTrigger: isDesktop
        ? { ...scrollTriggerConfig, onRefresh: (self) => self.animation.progress(self.progress) }
        : scrollTriggerConfig,
    });

    const directionId = getDirectionId();
    const direction = HERO_DIRECTIONS[directionId];
    splitLetters(DOM.vvHeadingFirst);
    splitLetters(DOM.vvHeadingSecond);
    const charsFirst = DOM.vvHeadingFirst ? DOM.vvHeadingFirst.querySelectorAll('.char-span') : [];
    const charsSecond = DOM.vvHeadingSecond ? DOM.vvHeadingSecond.querySelectorAll('.char-span') : [];

    tl
      .to(DOM.bg,              { duration: 1,    scale: 1 }, 0)
      .to(DOM.headingMain,     { duration: 0.7, opacity: 0 }, 0.62)
      .to(DOM.headingFirst,    { duration: 0.5, x: 0, opacity: 0 }, 0.62)
      .to(DOM.headingThird,    { duration: 0.5, x: 0, opacity: 0 }, 0.62);

    // Cleanup any leftover DOM/state from a previously-selected direction — breakpoint
    // switches rebuild this timeline in place (no page reload), so stale fx nodes from
    // the last build must go before the new direction's bg() creates its own.
    document.querySelectorAll('.js-hero-fx').forEach((el) => el.remove());
    gsap.set(DOM.bg, { opacity: 1, scale: 1.0, filter: 'none', clipPath: 'none', x: 0, y: 0, skewX: 0 });
    gsap.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { scale: 1.0, filter: 'none', opacity: 1, x: 0, y: 0, skewX: 0 });

    if (direction.hidesLetterStrokes) {
      tl.set([DOM.rlW1, DOM.rlW2], { opacity: 0 }, 0);
    }

    direction.bg(tl);

    tl.to(DOM.overlay,         { duration: 0.5, opacity: 1 }, 2)
      // — Słowo 1: COSGRAL —
      .to(DOM.rlLead,          { duration: 0.3,  strokeDashoffset: 0, ease: 'power1.inOut' }, 1)
      .to(DOM.rlW1,            { duration: 0.3,  strokeDashoffset: 0, ease: 'power1.inOut' }, 1.3);

    // Decorative "pen travels on" retract (draw-in then vanish) is pure flourish —
    // skip it under reduced motion instead of leaving a static drawn-then-frozen line.
    if (!REDUCED_MOTION) {
      tl.to(DOM.rlLead, { duration: 0.25, strokeDashoffset: () => rootLineLen.lead, ease: 'power1.in' }, 1.3);
    } else {
      tl.set(DOM.rlLead, { opacity: 0 }, 1.3);
    }

    applyWordReveal(tl, direction, charsFirst, DOM.vvHeadingFirst, direction.words ? 1.6 : 1.3, 1);

    tl
      // Fade the drawn outline out just BEFORE the wipe/reveal finishes so there is
      // never a frame with both the red outline and the finished heading at full opacity.
      .to(DOM.rlW1,            { opacity: 0, duration: 0.15 }, 1.45)
      .fromTo([DOM.vvDecorFirst, DOM.vvParaFirst], { opacity: 0, y: 15 }, { duration: 0.45, opacity: 1, y: 0, ease: 'power2.out' }, 1.65)
      // — Słowo 2: agency —
      .to(DOM.rlMid,           { duration: 0.3,  strokeDashoffset: 0, ease: 'power1.inOut' }, 1.6)
      .to(DOM.rlW2,            { duration: 0.3,  strokeDashoffset: 0, ease: 'power1.inOut' }, 1.9)
      .to(DOM.rlW2,            { opacity: 0, duration: 0.15 }, 2.05)
      // rl-mid keeps tracking the live connector during convergence, so it fades after
      .to(DOM.rlMid,           { opacity: 0, duration: 0.15 }, 3.1);

    applyWordReveal(tl, direction, charsSecond, DOM.vvHeadingSecond, direction.words ? 2.2 : 1.9, 2);

    tl
      .fromTo([DOM.vvDecorSecond, DOM.vvParaSecond], { opacity: 0, y: 15 }, { duration: 0.45, opacity: 1, y: 0, ease: 'power2.out' }, 2.25)
      // Headings Inward Convergence — elastic "rubber snap" bounce is skipped under
      // reduced motion in favor of a plain ease-out to the same target position.
      .to(DOM.vvHeadFirst,     { x: () => getVvMeetTargets().x1, duration: 0.9, ease: REDUCED_MOTION ? 'power2.out' : 'elastic.out(1.1, 0.4)' }, 2.2)
      .to(DOM.vvHeadSecond,    { x: () => getVvMeetTargets().x2, duration: 0.9, ease: REDUCED_MOTION ? 'power2.out' : 'elastic.out(1.1, 0.4)' }, 2.2);

    tl
      // Step 4: Films Open (desktop: full screen +10; mobile: half screen each)
      .to(filmFirstMaskState,  { duration: 1, h: isDesktop ? () => window.innerHeight + 10 : () => window.innerHeight / 2 + 1 }, 3.0)
      .to(filmSecondMaskState, { duration: 1, h: isDesktop ? () => window.innerHeight + 10 : () => window.innerHeight / 2 + 1 }, '<')
      .fromTo(
        [DOM.filmFirst, DOM.filmSecond],
        { pointerEvents: 'none' },
        { pointerEvents: 'auto', duration: 0 },
        4.0,
      )
      // Step 5: Hold pin
      .to(filmSecondMaskState, { duration: 1 }, 4.0);

    return tl;
  }

  mm.add(
    {
      desktop: '(min-width: 992px)',
      mobile:  '(max-width: 991px)',
    },
    (context) => {
      const { desktop: isDesktop } = context.conditions;

      updateAllMasks();

      const tl = buildHeroTimeline({ isDesktop });

      // Cleanup: kills timeline + its ScrollTrigger on breakpoint switch
      return () => tl?.kill();
    },
  );
});
