

window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reduced-motion users always get the plain clip-path reveal, regardless of the
  // dev switcher's saved choice — elastic bounce / per-letter stagger / scramble
  // are exactly the motion patterns prefers-reduced-motion exists to opt out of.
  const getEffectMode = () => (REDUCED_MOTION ? 'classic' : (localStorage.getItem('effectMode') || 'classic'));

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

  // Deterministic pseudorandom (sin-hash) keyed by (char index, quantized time step) —
  // NOT Math.random(): scrubbing forward/backward through the same position must render
  // the same frame every time, which a real RNG can't guarantee.
  const decodePseudoRandom = (index, step) => {
    const x = Math.sin(index * 127.1 + step * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const updateScrambleGlobal = (timelineInstance) => {
    const effectMode = getEffectMode();
    if (effectMode !== 'decode') return;
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
  // Nagłówki VV — "dopisywane" (wipe od lewej), jakby to korzeń je kreślił, DOKŁADNIE
  // w tym samym miejscu gdzie realnie stoją (bez osobnego, przesuniętego szkicu).
  const effectMode = getEffectMode();
  const isCustomTextAnim = ['glitch', 'kinetic', 'ink', 'particles', 'slanted', 'strobe', 'matrix', 'vortex', 'slingshot', 'decode', 'zoom', 'flip', 'liquid', 'spark'].includes(effectMode);

  if (DOM.vvHeadingFirst) {
    if (effectMode === 'ink') {
      gsap.set(DOM.vvHeadingFirst, { clipPath: 'none', opacity: 0 });
      DOM.vvHeadingFirst.style.filter = 'url(#smoke-melt)';
    } else if (isCustomTextAnim) {
      gsap.set(DOM.vvHeadingFirst, { clipPath: 'none', opacity: 1 });
    } else {
      gsap.set(DOM.vvHeadingFirst, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
    }
  }

  if (DOM.vvHeadingSecond) {
    if (effectMode === 'ink') {
      gsap.set(DOM.vvHeadingSecond, { clipPath: 'none', opacity: 0 });
      DOM.vvHeadingSecond.style.filter = 'url(#smoke-melt)';
    } else if (isCustomTextAnim) {
      gsap.set(DOM.vvHeadingSecond, { clipPath: 'none', opacity: 1 });
    } else {
      gsap.set(DOM.vvHeadingSecond, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
    }
  }

  // Ensure content wrappers start at 0 translation
  if (DOM.v1) gsap.set(DOM.v1, { x: 0 });
  if (DOM.v2) gsap.set(DOM.v2, { x: 0 });

  if (isCustomTextAnim && effectMode !== 'ink') {
    splitLetters(DOM.vvHeadingFirst);
    splitLetters(DOM.vvHeadingSecond);
    gsap.set(DOM.vvHeadingFirst.querySelectorAll('.char-span'), { opacity: 0 });
    gsap.set(DOM.vvHeadingSecond.querySelectorAll('.char-span'), { opacity: 0 });
  }

  // ─── Root line — budowana W LOCIE z realnych konturów liter (fontTools) i realnej ──
  // pozycji nagłówków "COSGRAL"/"agency" (getBoundingClientRect), żeby korzeń pisał
  // dokładnie tam, gdzie te napisy faktycznie stoją — nie w osobnym, przesuniętym miejscu.
  const rootLineSvg = document.querySelector('.hero_root_line svg');
  const rootLineContainer = document.querySelector('.hero_root_line');
  const rootLineLen = { lead: 0, w1: 0, mid: 0, w2: 0, tail: 0 };

  function buildRootLinePath() {
    if (!DOM.rlLead || !DOM.rlW1 || !DOM.rlMid || !DOM.rlW2 || !DOM.rlTail || !DOM.vvHeadingFirst || !DOM.vvHeadingSecond || !rootLineContainer) return;
    const currentMode = getEffectMode();
    const customList = ['glitch', 'kinetic', 'ink', 'particles', 'slanted', 'strobe', 'matrix', 'vortex', 'slingshot', 'decode', 'zoom', 'flip', 'liquid', 'spark'];
    if (customList.includes(currentMode) && currentMode !== 'ink') {
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
    document.fonts.ready.then(buildRootLinePath);
  } else {
    buildRootLinePath();
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

  // Per-mode word-reveal choreography, shared by both words (word1 @1.6/1.3, word2 @2.2/1.9)
  // and both breakpoints — single source of truth, was duplicated 2x before this refactor.
  const WORD_REVEALS = {
    spark: (tl, chars, headingEl, at) => {
      // Neon flash + brief chromatic aberration per letter, fading to clean text — one
      // monotonic fromTo (no oscillation), so it stays clear of WCAG 2.3.1 flash limits.
      tl.fromTo(chars,
        { opacity: 0, textShadow: '2px 0 0 #00eaff, -2px 0 0 #ee3335, 0 0 24px #ee3335, 0 0 60px #ee3335' },
        { opacity: 1, textShadow: '0px 0 0 rgba(0,0,0,0), 0px 0 0 rgba(0,0,0,0), 0 0 0px rgba(238,51,53,0), 0 0 0px rgba(238,51,53,0)', duration: 0.4, stagger: 0.03, ease: 'power2.out' },
        at
      );
    },
    liquid: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { y: 90, scaleY: 1.6, scaleX: 0.85, opacity: 0, filter: 'blur(6px)' },
        { y: 0, scaleY: 1, scaleX: 1, opacity: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.045, ease: 'elastic.out(1, 0.55)' },
        at
      );
    },
    glitch: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { scaleY: 4, skewX: -30, opacity: 0, textShadow: '4px 0 0 #ee3335, -4px 0 0 #00ffff' },
        { scaleY: 1, skewX: 0, opacity: 1, textShadow: '0px 0 0 rgba(0,0,0,0)', duration: 0.45, stagger: 0.03, ease: 'elastic.out(1.1, 0.4)' },
        at
      );
    },
    kinetic: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { rotationX: -90, y: 60, scale: 0, opacity: 0, transformOrigin: '50% 100% -50px' },
        { rotationX: 0, y: 0, scale: 1, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'back.out(2)' },
        at
      );
    },
    ink: (tl, chars, headingEl, at) => {
      // Filter on/off is tracked as GSAP .set()s (not raw style writes) so scrubbing
      // backward past `at` correctly restores the blur instead of leaving it removed.
      tl.set(headingEl, { filter: 'url(#smoke-melt)' }, at);
      tl.fromTo('#smoke-melt feDisplacementMap',
        { attr: { scale: 80 } },
        { attr: { scale: 0 }, duration: 0.7, ease: 'power2.out' },
        at
      );
      tl.fromTo(headingEl, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
      tl.set(headingEl, { filter: 'none' }, at + 0.7);
    },
    particles: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { x: () => gsap.utils.random(-100, 100), y: () => gsap.utils.random(-50, 50), scale: 0, rotation: () => gsap.utils.random(-180, 180), opacity: 0 },
        { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.55, stagger: 0.03, ease: 'power2.out' },
        at
      );
    },
    slanted: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { y: (i) => i % 2 === 0 ? -100 : 100, x: (i) => i % 2 === 0 ? 50 : -50, skewX: (i) => i % 2 === 0 ? 40 : -40, opacity: 0 },
        { y: 0, x: 0, skewX: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power3.out' },
        at
      );
    },
    strobe: (tl, chars, headingEl, at) => {
      // Single flash-in per letter, not a rapid on/off strobe — the original had ~3
      // opacity swings inside 0.15s per letter (>>3/sec), over the WCAG 2.3.1 flash cap.
      tl.fromTo(chars,
        { opacity: 0, scale: 0.8, textShadow: '30px 0 10px rgba(238,51,53,0.8), -30px 0 10px rgba(238,51,53,0.4)' },
        { opacity: 1, scale: 1, textShadow: '0px 0 0 rgba(238,51,53,0)', duration: 0.5, stagger: 0.04, ease: 'power2.out' },
        at
      );
    },
    matrix: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { y: -150, scaleY: 3, opacity: 0, filter: 'brightness(3) drop-shadow(0 0 10px #ee3335)' },
        { y: 0, scaleY: 1, opacity: 1, filter: 'brightness(1) drop-shadow(0 0 0px transparent)', duration: 0.55, stagger: 0.04, ease: 'bounce.out' },
        at
      );
    },
    vortex: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { rotationY: 180, rotationZ: -90, scale: 0, x: -100, y: 50, opacity: 0, transformOrigin: '0% 50% -100px' },
        { rotationY: 0, rotationZ: 0, scale: 1, x: 0, y: 0, opacity: 1, duration: 0.65, stagger: 0.04, ease: 'power2.out' },
        at
      );
    },
    slingshot: (tl, chars, headingEl, at) => {
      tl.fromTo(chars,
        { scaleX: 0.1, scaleY: 0.5, x: -300, opacity: 0 },
        { scaleX: 1, scaleY: 1, x: 0, opacity: 1, duration: 0.6, stagger: 0.03, ease: 'elastic.out(1, 0.3)' },
        at
      );
    },
    decode: (tl, chars, headingEl, at) => {
      scrambleTextEffect(chars, 0.5, at, tl);
    },
    zoom: (tl, chars, headingEl, at) => {
      gsap.set(chars, { transformPerspective: 1000 });
      tl.fromTo(chars,
        { z: 800, rotationX: -15, filter: 'blur(15px)', opacity: 0 },
        { z: 0, rotationX: 0, filter: 'blur(0px)', opacity: 1, duration: 0.7, stagger: 0.04, ease: 'power3.out' },
        at
      );
    },
    flip: (tl, chars, headingEl, at) => {
      gsap.set(chars, { transformPerspective: 1000, transformOrigin: '50% 0%' });
      tl.fromTo(chars,
        { rotationX: -90, opacity: 0 },
        { rotationX: 0, opacity: 1, duration: 0.65, stagger: 0.04, ease: 'back.out(1.7)' },
        at
      );
    },
  };

  // Modes not in WORD_REVEALS (classic, spark, and any unrecognized value) fall through to
  // the clip-path wipe reveal — same behavior 'liquid' had pre-refactor (unimplemented -> classic).
  function applyWordReveal(tl, effectMode, chars, headingEl, at) {
    const fn = WORD_REVEALS[effectMode];
    if (fn) {
      fn(tl, chars, headingEl, at);
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

    const effectMode = getEffectMode();
    splitLetters(DOM.vvHeadingFirst);
    splitLetters(DOM.vvHeadingSecond);
    const charsFirst = DOM.vvHeadingFirst ? DOM.vvHeadingFirst.querySelectorAll('.char-span') : [];
    const charsSecond = DOM.vvHeadingSecond ? DOM.vvHeadingSecond.querySelectorAll('.char-span') : [];

    tl
      .to(DOM.bg,              { duration: 1,    scale: 1 }, 0)
      .to(DOM.headingMain,     { duration: 0.7, opacity: 0 }, 0.62)
      .to(DOM.headingFirst,    { duration: 0.5, x: 0, opacity: 0 }, 0.62)
      .to(DOM.headingThird,    { duration: 0.5, x: 0, opacity: 0 }, 0.62)
      // Step 2+3: pióro pisze, a tło hero gaśnie na bazie wybranego efektu przejścia
      const transMode = localStorage.getItem('bgTransitionMode') || 'blur';
      
      // Cleanup any leftover elements from other transitions
      document.querySelectorAll('.hero_shutter_left, .hero_shutter_right, [class^="hero_strip_"], [class^="hero_slash_"], [class^="hero_wipe_"], [class^="hero_grid_"]').forEach(el => el.remove());
      gsap.set(DOM.bg, { opacity: 1, scale: 1.0, filter: 'none', clipPath: 'none', x: 0, y: 0, skewX: 0 });
      gsap.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { scale: 1.0, filter: 'none', opacity: 1, x: 0, y: 0, skewX: 0 });

      if (transMode === 'liquid-chromatic') {
        // Option B: WebGL Chromatic Liquid Melt
        const lcDisp = document.querySelector('#lc-disp');
        const lcRed = document.querySelector('#lc-red');
        const lcBlue = document.querySelector('#lc-blue');
        
        gsap.set(DOM.bg, { filter: 'url(#liquid-chromatic)' });
        if (lcDisp && lcRed && lcBlue) {
          gsap.set(lcDisp, { attr: { scale: 0 } });
          gsap.set([lcRed, lcBlue], { attr: { dx: 0 } });
          
          tl.to(lcDisp, { attr: { scale: 140 }, duration: 0.6, ease: 'power1.in' }, 1.0)
            .to(lcRed, { attr: { dx: 22 }, duration: 0.6, ease: 'power1.in' }, 1.0)
            .to(lcBlue, { attr: { dx: -22 }, duration: 0.6, ease: 'power1.in' }, 1.0)
            .to(lcDisp, { attr: { scale: 0 }, duration: 0.6, ease: 'power1.out' }, 1.6)
            .to(lcRed, { attr: { dx: 0 }, duration: 0.6, ease: 'power1.out' }, 1.6)
            .to(lcBlue, { attr: { dx: 0 }, duration: 0.6, ease: 'power1.out' }, 1.6);
        }
        tl.to(DOM.bg, { opacity: 0, scale: 1.1, duration: 1.2, ease: 'power2.inOut' }, 1.0)
          .to(DOM.hero, { opacity: 0, duration: 1.2 }, 1.0);
        
        // Connect to second effect: Apply chromatic filter to text reveal
        tl.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { filter: 'url(#liquid-chromatic)' }, 1.5);
        tl.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { filter: 'none' }, 2.5);

      } else if (transMode === 'portal-zoom') {
        // Option C: Portal Frame Zoom & Parallax Scale
        gsap.set(DOM.bg, { clipPath: 'inset(22% 28% 22% 28% round 16px)', scale: 1.35 });
        tl.to(DOM.bg, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1.0, duration: 1.2, ease: 'power3.inOut' }, 1.0)
          .to(DOM.hero, { opacity: 0, duration: 1.2, ease: 'power3.inOut' }, 1.0);
        
        // Connect to second effect: Parallax rotate-fade entry of headings
        tl.fromTo([DOM.vvHeadFirst, DOM.vvHeadSecond],
          { opacity: 0, scale: 0.8, y: 40 },
          { opacity: 1, scale: 1.0, y: 0, duration: 0.8, ease: 'power3.out' },
          1.5
        );

      } else if (transMode === 'color-wipes') {
        // Option D: Editorial Multi-Layered Color Wipes
        let wipe1 = document.createElement('div');
        wipe1.className = 'hero_wipe_1';
        Object.assign(wipe1.style, {
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          background: '#1a1614', zIndex: 10, transform: 'translateX(-100%)'
        });
        DOM.hero.appendChild(wipe1);

        let wipe2 = document.createElement('div');
        wipe2.className = 'hero_wipe_2';
        Object.assign(wipe2.style, {
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          background: '#ee3335', zIndex: 11, transform: 'translateX(-100%)'
        });
        DOM.hero.appendChild(wipe2);

        let wipe3 = document.createElement('div');
        wipe3.className = 'hero_wipe_3';
        Object.assign(wipe3.style, {
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          background: '#f5f2ed', zIndex: 12, transform: 'translateX(-100%)'
        });
        DOM.hero.appendChild(wipe3);

        tl.to(wipe1, { x: '0%', duration: 0.7, ease: 'expo.inOut' }, 1.0)
          .to(wipe2, { x: '0%', duration: 0.7, ease: 'expo.inOut' }, 1.1)
          .to(wipe3, { x: '0%', duration: 0.7, ease: 'expo.inOut' }, 1.2)
          .to(wipe1, { x: '100%', duration: 0.7, ease: 'expo.inOut' }, 1.7)
          .to(wipe2, { x: '100%', duration: 0.7, ease: 'expo.inOut' }, 1.8)
          .to(wipe3, { x: '100%', duration: 0.7, ease: 'expo.inOut' }, 1.9)
          .set(DOM.hero, { opacity: 0 }, 1.9);

        // Connect to second effect: Wipes-reveal fade
        tl.fromTo([DOM.vvHeadFirst, DOM.vvHeadSecond],
          { opacity: 0, x: -40 },
          { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
          1.8
        );

      } else if (transMode === 'blob-expand') {
        // Option E: Organic Blob Reveal (Spinning organic SVG mask scale-up)
        const blobPath = document.querySelector('#blob-path');
        gsap.set(DOM.bg, { clipPath: 'url(#blob-clip)' });
        if (blobPath) {
          gsap.set(blobPath, { attr: { transform: 'matrix(0, 0, 0, 0, 0.5, 0.5)' } });
          // We animate the scale s from 0 to 3 using matrix coordinates
          const scaleObj = { s: 0 };
          const updateBlob = () => {
            const s = scaleObj.s;
            // Add a rotation of s * 60 degrees to make it spin organically!
            const rotRad = s * 60 * Math.PI / 180;
            const a = s * Math.cos(rotRad);
            const b = s * Math.sin(rotRad);
            const c = -s * Math.sin(rotRad);
            const d = s * Math.cos(rotRad);
            const tx = 0.5 * (1 - a - c);
            const ty = 0.5 * (1 - b - d);
            blobPath.setAttribute('transform', `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`);
          };
          tl.to(scaleObj, { s: 3.5, duration: 1.2, ease: 'power2.inOut', onUpdate: updateBlob }, 1.0);
        }
        tl.to(DOM.hero, { opacity: 0, duration: 1.2 }, 1.0);

      } else if (transMode === 'strips') {
        // Option F: Staggered Column Slide
        const numStrips = 5;
        const strips = [];
        for (let i = 0; i < numStrips; i++) {
          const strip = document.createElement('div');
          strip.className = `hero_strip_${i}`;
          Object.assign(strip.style, {
            position: 'absolute',
            left: `${(i / numStrips) * 100}%`, top: '0',
            width: `${100 / numStrips}%`, height: '100%',
            overflow: 'hidden', zIndex: 1
          });
          const img = DOM.bg.cloneNode();
          Object.assign(img.style, {
            position: 'absolute',
            left: `-${i * 100}%`, top: '0',
            width: `${numStrips * 100}%`, height: '100%',
            objectFit: 'cover'
          });
          strip.appendChild(img);
          DOM.hero.appendChild(strip);
          strips.push(strip);
        }
        gsap.set(DOM.bg, { opacity: 0 });
        strips.forEach((strip, i) => {
          const dir = i % 2 === 0 ? -1 : 1;
          tl.to(strip, { y: `${dir * 100}%`, duration: 1.0, ease: 'power2.inOut' }, 1.0 + i * 0.08);
        });
        tl.to(DOM.hero, { opacity: 0, duration: 1.4 }, 1.0);

      } else if (transMode === 'slash') {
        // Option G: Diagonal Editorial Slash Cuts
        const slashes = [];
        const polygons = [
          'polygon(0% 0%, 50% 0%, 20% 100%, 0% 100%)',
          'polygon(50% 0%, 80% 0%, 50% 100%, 20% 100%)',
          'polygon(80% 0%, 100% 0%, 100% 100%, 50% 100%)'
        ];
        polygons.forEach((poly, i) => {
          const slash = document.createElement('div');
          slash.className = `hero_slash_${i}`;
          Object.assign(slash.style, {
            position: 'absolute', inset: 0, zIndex: 1,
            clipPath: poly
          });
          const img = DOM.bg.cloneNode();
          Object.assign(img.style, {
            position: 'absolute', inset: 0, objectFit: 'cover'
          });
          slash.appendChild(img);
          DOM.hero.appendChild(slash);
          slashes.push(slash);
        });
        gsap.set(DOM.bg, { opacity: 0 });
        
        tl.to(slashes[0], { x: '-80%', y: '-40%', duration: 1.2, ease: 'power2.inOut' }, 1.0)
          .to(slashes[1], { x: '-30%', y: '50%', duration: 1.2, ease: 'power2.inOut' }, 1.0)
          .to(slashes[2], { x: '80%', y: '40%', duration: 1.2, ease: 'power2.inOut' }, 1.0)
          .to(DOM.hero, { opacity: 0, duration: 1.2 }, 1.0);

      } else if (transMode === 'grid-reveal') {
        // Option H: Grid Reveal Dissolve (3x3 staggered geometric scale shutter)
        const gridW = 3;
        const gridH = 3;
        const gridBlocks = [];
        for (let y = 0; y < gridH; y++) {
          for (let x = 0; x < gridW; x++) {
            const block = document.createElement('div');
            block.className = 'hero_grid_block';
            Object.assign(block.style, {
              position: 'absolute',
              left: `${(x / gridW) * 100}%`,
              top: `${(y / gridH) * 100}%`,
              width: `${100 / gridW}%`,
              height: `${100 / gridH}%`,
              background: '#f5f2ed',
              zIndex: 10,
              transform: 'scale(0)'
            });
            DOM.hero.appendChild(block);
            gridBlocks.push(block);
          }
        }
        gridBlocks.forEach((block, idx) => {
          const row = Math.floor(idx / gridW);
          const col = idx % gridW;
          const delay = (row + col) * 0.1;
          tl.to(block, { scale: 1.05, duration: 0.6, ease: 'power2.inOut' }, 1.0 + delay);
        });
        tl.set(DOM.hero, { opacity: 0 }, 1.8);

      } else {
        // Option A: Cinematic Lens Blur + Zoom-Fade
        tl.to(DOM.bg, { filter: 'blur(20px)', scale: 1.15, duration: 1.2, ease: 'power2.inOut' }, 1)
          .to(DOM.hero, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 1);
      }
      
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

    applyWordReveal(tl, effectMode, charsFirst, DOM.vvHeadingFirst, WORD_REVEALS[effectMode] ? 1.6 : 1.3);

    tl
      .to(DOM.rlW1,            { opacity: 0, duration: 0.1 }, 1.6)
      .fromTo([DOM.vvDecorFirst, DOM.vvParaFirst], { opacity: 0, y: 15 }, { duration: 0.45, opacity: 1, y: 0, ease: 'power2.out' }, 1.65)
      // — Słowo 2: agency —
      .to(DOM.rlMid,           { duration: 0.3,  strokeDashoffset: 0, ease: 'power1.inOut' }, 1.6)
      .to(DOM.rlW2,            { duration: 0.3,  strokeDashoffset: 0, ease: 'power1.inOut' }, 1.9)
      // Fadeout lines after convergence (time 3.1)
      .to([DOM.rlMid, DOM.rlW2], { opacity: 0, duration: 0.15 }, 3.1);

    applyWordReveal(tl, effectMode, charsSecond, DOM.vvHeadingSecond, WORD_REVEALS[effectMode] ? 2.2 : 1.9);

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
