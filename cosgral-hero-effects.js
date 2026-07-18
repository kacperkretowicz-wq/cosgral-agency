

window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  // Disable scroll restoration and force scroll to top on page load/refresh
  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // This build replaces the earlier 11-direction switcher with a single clean intro —
  // clear any keys a prior session left behind so nothing stale lingers around.
  localStorage.removeItem('heroDirection');
  localStorage.removeItem('effectMode');
  localStorage.removeItem('bgTransitionMode');

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
    const h1_static = r1.left - currentX1;
    const h2_static = r2.left - currentX2;

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
    if (time !== undefined && (time < 1.0 || time > 2.5)) return;

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

  let cachedPathsW1 = [];
  let cachedPathsW2 = [];

  // ——— 1. DOM cache ———
  const DOM = {
    hero:           document.querySelector('.section_hero'),
    bg:             document.querySelector('.hero_bg'),
    headingMain:    document.querySelector('[data-hero-heading="main"]'),
    headingFirst:   document.querySelector('.hero_heading_first'),
    headingSecond:  document.querySelector('.hero_heading_second'),
    headingThird:   document.querySelector('.hero_heading_third'),
    headingBottom:  document.querySelector('.hero_heading_bottom'),
    overlay:        document.querySelector('.hero_overlay'),
    vvHeadingFirst: document.querySelector('[data-vv="1"] h2'),
    vvHeadingSecond:document.querySelector('[data-vv="2"] h2'),
    v1:             document.querySelector('[data-vv="1"]'),
    v2:             document.querySelector('[data-vv="2"]'),
    vvHeadFirst:    document.querySelector('[data-vv="1"] .vv_content_head'),
    vvHeadSecond:   document.querySelector('[data-vv="2"] .vv_content_head'),
    vvSharedDesc:   document.querySelector('.vv_shared_desc'),
    vvWrapper:      document.querySelector('.vv_wrapper'),
    rlVertical:     document.querySelector('.hero_root_line path.rl-vertical'),
    rlLead:         document.querySelector('.hero_root_line path.rl-lead'),
    rlW1:           document.querySelector('.hero_root_line path.rl-w1'),
    rlW1Letters:    Array.from(document.querySelectorAll('.hero_root_line path.rl-letter-w1')),
    rlMid:          document.querySelector('.hero_root_line path.rl-mid'),
    rlW2:           document.querySelector('.hero_root_line path.rl-w2'),
    rlW2Letters:    Array.from(document.querySelectorAll('.hero_root_line path.rl-letter-w2')),
    rlTail:         document.querySelector('.hero_root_line path.rl-tail'),
    filmFirst:      document.querySelector('[data-film="1"]'),
    filmSecond:     document.querySelector('[data-film="2"]'),
    headingFilms:   document.querySelectorAll('[data-heading-films]'),
    bodyFilms:      document.querySelectorAll('[data-body-films]'),
    navbar:         document.querySelector('.u-navbar'),
  };

  if (!DOM.hero) return;

  // ─── 1b. Hero frame sequence — canvas.hero_bg replaces the old static <img>. Frames
  // are the first 3s (72 @ 24fps) of an AI-turned clip of the same photo, watermark
  // removed. Scroll drives which frame is drawn (see the {f} tween in buildHeroTimeline);
  // "cover" + "center 8%" fit is done by hand since object-fit/object-position don't
  // apply to <canvas>.
  const heroSeq = (() => {
    const canvas = DOM.bg;
    if (!canvas || canvas.tagName !== 'CANVAS') return null;
    const frameCount = parseInt(canvas.dataset.frameCount, 10) || 0;
    const base = canvas.dataset.frameBase;
    const fallbackSrc = canvas.dataset.frameFallback;
    if (!frameCount || !base) return null;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    const images = new Array(frameCount).fill(null);
    let lastLoadedIndex = -1;
    let lastDrawnIndex = -1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pad3 = (n) => String(n).padStart(3, '0');

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      draw(lastDrawnIndex >= 0 ? lastDrawnIndex : 0, true);
    };

    const draw = (index, force) => {
      const clamped = Math.max(0, Math.min(frameCount - 1, index));
      // Fall back to the closest already-loaded frame so scrubbing ahead of the
      // preload never blanks the canvas — it just holds the last good frame.
      const img = images[clamped] || images[lastLoadedIndex] || images[0];
      if (!img) return;
      if (!force && clamped === lastDrawnIndex) return;
      lastDrawnIndex = clamped;

      const cw = canvas.width, ch = canvas.height;
      if (!cw || !ch) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (!iw || !ih) return;

      // Setting canvas.width/height (in resize()) resets all 2D context state,
      // including smoothing — re-apply every draw rather than only once at setup.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const scale = Math.max(cw / iw, ch / ih);
      const sw = iw * scale, sh = ih * scale;
      const dx = (cw - sw) * 0.5;      // object-position horizontal: center
      // object-position vertical: 0% (top-anchored) — frames were regenerated with
      // ~24% synthetic headroom mirrored onto the top, so anchoring at the top shows
      // that headroom + the head, and only ever crops from the (unimportant) bottom.
      const dy = 0;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, sw, sh);
    };

    const preload = () => {
      for (let i = 0; i < frameCount; i++) {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => {
          images[i] = im;
          if (i > lastLoadedIndex) lastLoadedIndex = i;
          if (i === 0) { resize(); }
        };
        im.src = `${base}${pad3(i)}.jpg`;
      }
    };

    // Static <img> fallback if canvas 2D context is unavailable (very old browsers).
    if (!ctx) {
      const img = document.createElement('img');
      img.className = 'hero_bg';
      img.alt = '';
      img.loading = 'eager';
      img.src = fallbackSrc;
      canvas.replaceWith(img);
      return null;
    }

    preload();
    resize();

    let _resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        resize();
      }, 150);
    });

    return { draw, frameCount };
  })();

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
  if (DOM.rlVertical) DOM.rlVertical.style.display = 'none';

  // VV stoi NIERUCHOMO od startu w swoim docelowym miejscu (bez y-przesunięcia) —
  // korzeń rysuje litery dokładnie tam, gdzie one stoją, więc odsłonięcie (clip-path)
  // wygląda jak zamiana narysowanej linii w tekst, a nie jak osobny napis wjeżdżający
  // z innego miejsca. Opis i labelki pod nagłówkiem czekają ukryte (opacity:0) na
  // swoim miejscu i tylko fadują — też bez jazdy z dołu.
  if (DOM.vvWrapper) gsap.set(DOM.vvWrapper, { y: 0, opacity: 1 });
  if (DOM.vvSharedDesc) gsap.set(DOM.vvSharedDesc, { opacity: 0 });

  if (DOM.v1) gsap.set(DOM.v1, { x: 0 });
  if (DOM.v2) gsap.set(DOM.v2, { x: 0 });
  if (DOM.vvHeadingFirst)  gsap.set(DOM.vvHeadingFirst,  { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
  if (DOM.vvHeadingSecond) gsap.set(DOM.vvHeadingSecond, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
  if (DOM.bg) gsap.set(DOM.bg, { clipPath: 'inset(0% 0% 0% 0%)' });

  // ─── Root line — budowana W LOCIE z realnych konturów liter (fontTools) i realnej ──
  // pozycji nagłówków "COSGRAL"/"agency" (getBoundingClientRect), żeby korzeń pisał
  // dokładnie tam, gdzie te napisy faktycznie stoją — nie w osobnym, przesuniętym miejscu.
  const rootLineSvg = document.querySelector('.hero_root_line svg');
  const rootLineContainer = document.querySelector('.hero_root_line');
  const rootLineLen = { vertical: 0, lead: 0, w1: 0, mid: 0, w2: 0, tail: 0 };

  function buildRootLinePath() {
    if (!DOM.rlLead || !DOM.rlW1 || !DOM.rlMid || !DOM.rlW2 || !DOM.rlTail || !DOM.vvHeadingFirst || !DOM.vvHeadingSecond || !rootLineContainer || !DOM.rlVertical) return;
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

    const buildWordLetters = (word, x0, yBase, fontSizePx, targetWidth) => {
      const scale = fontSizePx / UPM;
      let cursor = 0;
      const letterPaths = [];

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
        if (!g) {
          cursor += fontSizePx * 0.5 * scaleAdjust;
          letterPaths.push({ ch, d: '', x: x0 + cursor, width: fontSizePx * 0.5 * scaleAdjust });
          continue;
        }
        const d = transformGlyphAdjusted(g.segs, scale, scaleAdjust, x0 + cursor, yBase);
        const w = g.adv * scale * scaleAdjust;
        letterPaths.push({ ch, d: d.trim(), x: x0 + cursor, width: w });
        cursor += w;
      }
      return letterPaths;
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

    const targets = getVvMeetTargets();
    const x1 = r1.left - containerRect.left - currentX1 + targets.x1;
    const base1 = r1.top - containerRect.top + r1.height * 0.86;
    const x2 = r2.left - containerRect.left - currentX2 + targets.x2;
    const base2 = r2.top - containerRect.top + r2.height * 0.86;

    rootLineSvg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);

    // Pięć NIEZALEŻNYCH odcinków ścieżki — każdy dekoracyjny ("pióro w drodze") odcinek
    // sam się rysuje i sam się cofa do zera (znika), a każdy odcinek z literami rysuje
    // się i ZOSTAJE (aż do natychmiastowej podmiany na solidny tekst). Dzięki temu po
    // animacji nie zostają żadne czerwone linie — tylko czyste "COSGRAL" / "agency".

    // rl-lead: linia wchodząca z lewego brzegu ekranu prosto do pierwszej litery "COSGRAL"
    let dLead = `M0 ${base1.toFixed(1)} L${x1.toFixed(1)} ${base1.toFixed(1)}`;

    // rl-w1: same litery "COSGRAL" — rysują się i ZOSTAJĄ (szerokość dopasowana subpikselowo)
    const pathsW1 = buildWordLetters('COSGRAL', x1, base1, fs1, r1.width);
    cachedPathsW1 = pathsW1;
    const dW1 = pathsW1.map(p => p.d).join(' ').trim();
    const end1x = x1 + pathsW1.reduce((sum, p) => sum + p.width, 0);

    // rl-mid: connector2, koniec "COSGRAL" -> początek "agency" — rysuje się i znika (linia prosta)
    const dMid = `M${end1x.toFixed(1)} ${base1.toFixed(1)} L${x2.toFixed(1)} ${base2.toFixed(1)}`;

    // rl-w2: same litery "agency" — rysują się i ZOSTAJĄ (szerokość dopasowana subpikselowo)
    const pathsW2 = buildWordLetters('AGENCY', x2, base2, fs2, r2.width);
    cachedPathsW2 = pathsW2;
    const dW2 = pathsW2.map(p => p.d).join(' ').trim();

    // rl-vertical: pionowa linia na środku ekranu, pokrywająca się ze zwężonym obrazem
    const centerX = containerRect.width / 2;
    const r1_rect = DOM.vvHeadingFirst.getBoundingClientRect();
    const yTopRel = r1_rect.top - containerRect.top + r1_rect.height * 0.15;
    const yBottomRel = r1_rect.top - containerRect.top + r1_rect.height * 0.95;
    const dVertical = `M${centerX.toFixed(1)} ${yTopRel.toFixed(1)} L${centerX.toFixed(1)} ${yBottomRel.toFixed(1)}`;
    
    DOM.rlVertical.setAttribute('d', dVertical);
    const lenVertical = DOM.rlVertical.getTotalLength();
    rootLineLen.vertical = lenVertical;
    // Red vertical outline is no longer part of the choreography — keep it hidden.
    gsap.set(DOM.rlVertical, { strokeDasharray: lenVertical, strokeDashoffset: lenVertical, opacity: 0 });

    // Populate static letter path elements. opacity: 0, NOT 1 — a path with
    // dashoffset === dasharray can still leak sub-pixel dash fragments (float
    // rounding), which showed up as stray red dots. The timeline flips each
    // path to opacity 1 exactly when its draw starts.
    pathsW1.forEach((letter, index) => {
      const pathEl = DOM.rlW1Letters[index];
      if (pathEl) {
        pathEl.setAttribute('d', letter.d || '');
        const len = pathEl.getTotalLength();
        gsap.set(pathEl, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      }
    });

    pathsW2.forEach((letter, index) => {
      const pathEl = DOM.rlW2Letters[index];
      if (pathEl) {
        pathEl.setAttribute('d', letter.d || '');
        const len = pathEl.getTotalLength();
        gsap.set(pathEl, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      }
    });

    // Set d attributes on the original elements for compatibility / structure
    DOM.rlLead.setAttribute('d', dLead);
    DOM.rlW1.setAttribute('d', dW1);
    DOM.rlMid.setAttribute('d', dMid);
    DOM.rlW2.setAttribute('d', dW2);

    const lenLead = DOM.rlLead.getTotalLength();
    rootLineLen.lead = lenLead;
    gsap.set(DOM.rlLead, { strokeDasharray: lenLead, strokeDashoffset: lenLead, opacity: 0 });

    const lenMid = DOM.rlMid.getTotalLength();
    rootLineLen.mid = lenMid;
    gsap.set(DOM.rlMid, { strokeDasharray: lenMid, strokeDashoffset: lenMid, opacity: 0 });

    // Hide original static outline blocks so they don't overlap at page load
    gsap.set([DOM.rlW1, DOM.rlW2], { opacity: 0 });
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

  // ─── 6. Hero-load entrance (preloader curtain → this choreography) ──────────
  // Wraps each of the four H1 word spans in its own overflow:hidden mask so they can
  // slide up out of/into view like film-title cards — the same visual language used
  // for [data-heading-films] elsewhere on the page, kept to ONE motion vocabulary.
  function wrapInLineMask(el) {
    if (!el) return null;
    if (el.parentElement && el.parentElement.classList.contains('hero-line-mask')) return el.parentElement;
    const mask = document.createElement('span');
    mask.className = 'hero-line-mask';
    Object.assign(mask.style, { display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', position: 'relative' });
    el.parentElement.insertBefore(mask, el);
    mask.appendChild(el);
    return mask;
  }

  const h1Words = DOM.headingMain ? Array.from(DOM.headingMain.querySelectorAll('.hero_heading_first, .hero_heading_second, .hero_heading_third, .hero_heading_bottom')) : [];
  h1Words.forEach(wrapInLineMask);
  gsap.set(h1Words, { display: 'inline-block', yPercent: REDUCED_MOTION ? 0 : 110 });
  gsap.set(DOM.bg, { scale: REDUCED_MOTION ? 1 : 1.08 });
  if (DOM.navbar) gsap.set(DOM.navbar, { autoAlpha: 0 });

  // Called once from the preloader's first-visit timeline (nested at ~40% into the
  // curtain lift) and once directly on repeat visits (fast:true, no preloader curtain).
  function playHeroEntrance({ fast = false } = {}) {
    const k = fast ? 0.7 : 1;
    const tl = gsap.timeline();
    if (REDUCED_MOTION) {
      tl.to(DOM.navbar, { autoAlpha: 1, duration: 0.3 }, 0);
      return tl;
    }
    tl.to(DOM.bg,     { scale: 1,   duration: 1.6 * k, ease: 'expo.out' }, 0)
      .to(h1Words,    { yPercent: 0, duration: 0.9 * k, stagger: 0.08, ease: 'expo.out' }, 0.1 * k)
      .to(DOM.navbar, { autoAlpha: 1, duration: 0.6 * k, ease: 'power2.out' }, 0.7 * k);
    return tl;
  }
  window.playHeroEntrance = playHeroEntrance;

  // Gate for index.html's preloader script — it awaits this before building its own
  // timeline, so entrance setup above is guaranteed to have run first regardless of
  // actual <script> execution order between this file and the inline preloader script.
  if (window.__resolveHeroEntranceReady) window.__resolveHeroEntranceReady();

  // ─── 7. GSAP matchMedia — only scroll-driven hero animation ─────────────────
  const wrapper = document.querySelector('.hero_stack_wrapper');
  const mm = gsap.matchMedia();

  function buildHeroTimeline({ isDesktop }) {
    const scrollTriggerConfig = {
      trigger: wrapper,
      start: 'top top',
      end: REDUCED_MOTION ? '+=300%' : '+=400%',
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    };

    const tl = gsap.timeline({
      onUpdate: function() {
        updateAllMasks();
        updateDynamicPaths(this.time());
        updateFilmFocusability(this.time());
      },
      scrollTrigger: isDesktop
        ? { ...scrollTriggerConfig, onRefresh: (self) => self.animation.progress(self.progress) }
        : scrollTriggerConfig,
    });

    splitLetters(DOM.vvHeadingFirst);
    splitLetters(DOM.vvHeadingSecond);

    // Cleanup any leftover DOM/state from a previous build — breakpoint switches
    // rebuild this timeline in place (no page reload), so a stale curtain from the
    // last build must go before this one creates its own.
    document.querySelectorAll('.js-hero-fx').forEach((el) => el.remove());
    gsap.set(DOM.bg, { opacity: 1, scale: 1.0, visibility: 'visible', x: 0, y: 0, skewX: 0 });
    gsap.set([DOM.vvHeadFirst, DOM.vvHeadSecond], { scale: 1.0, opacity: 1, x: 0, y: 0, skewX: 0 });

    // Helper function to calculate Y-crop for short inset line matching text height
    const getShortInset = () => {
      const r1 = DOM.vvHeadingFirst.getBoundingClientRect();
      const fs1 = parseFloat(getComputedStyle(DOM.vvHeadingFirst).fontSize);
      
      const yTopPx = r1.top + r1.height * 0.15;
      const yBottomPx = r1.top + r1.height * 0.95;
      
      const vh = window.innerHeight;
      const topPct = (yTopPx / vh) * 100;
      const bottomPct = ((vh - yBottomPx) / vh) * 100;
      
      return `inset(${topPct.toFixed(2)}% 49.6% ${bottomPct.toFixed(2)}% 49.6%)`;
    };

    // Setup initial text and spans
    const charSpansW1 = DOM.vvHeadingFirst.querySelectorAll('.char-span');
    const charSpansW2 = DOM.vvHeadingSecond.querySelectorAll('.char-span');

    if (REDUCED_MOTION) {
      gsap.set([charSpansW1, charSpansW2], { opacity: 1 });
      gsap.set([DOM.vvHeadingFirst, DOM.vvHeadingSecond], { clipPath: 'inset(0 0% 0 0)', opacity: 1 });
    } else {
      gsap.set([charSpansW1, charSpansW2], { opacity: 0 });
      gsap.set([DOM.vvHeadingFirst, DOM.vvHeadingSecond], { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
    }

    // Step 0: Scrub through the hero frame sequence (the man turning) as the user
    // scrolls — finishes just before the image is fully cropped into a line at 1.1,
    // so the last frames land while it's still wide enough to read.
    if (heroSeq && !REDUCED_MOTION) {
      const seqState = { f: 0 };
      tl.to(seqState, {
        f: heroSeq.frameCount - 1,
        duration: 0.9,
        ease: 'none',
        onUpdate: () => heroSeq.draw(Math.round(seqState.f)),
      }, 0);
    }

    tl
      // Step 1: H1 lines retreat back up through their masks
      .to(h1Words, { yPercent: REDUCED_MOTION ? 0 : -110, duration: 0.3, stagger: 0.08, ease: 'expo.inOut' }, 0.3);

    // Step 2: Crop the background image horizontally to the center to form a line (slightly thicker: 49.6% inset)
    // Both tweens are fromTo with explicit 4-component insets: the browser serializes
    // symmetric insets to shorthand ("inset(0% 49.6%)"), and a captured shorthand start
    // vs 4-number target makes GSAP start the unmatched numbers (left!) from 0 —
    // that rendered a sudden "left half of the photo" flash mid-transition.
    tl.fromTo(DOM.bg, {
      clipPath: 'inset(0% 0% 0% 0%)'
    }, {
      clipPath: 'inset(0% 49.6% 0% 49.6%)',
      duration: 0.8,
      ease: 'expo.inOut'
    }, 0.3)
    // Shorten the vertical line Y-axis to match letter C height in the center
    .fromTo(DOM.bg, {
      clipPath: 'inset(0% 49.6% 0% 49.6%)'
    }, {
      clipPath: () => getShortInset(),
      duration: 0.3,
      ease: 'power2.inOut',
      immediateRender: false
    }, 1.1);

    // Step 3: Fade in the shared description only AFTER the full wordmark has been
    // spelled out (last AGENCY letter lands ~2.7) — not while the image line shrinks.
    if (DOM.vvSharedDesc) {
      tl.fromTo(DOM.vvSharedDesc,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        2.75
      );
    }

    // Set headings target positions to their centered target early in the timeline (at time 1.0)
    // so that the outlines draw in the center rather than on left/right.
    tl.set(DOM.vvHeadFirst, { x: () => getVvMeetTargets().x1 }, 1.0);
    tl.set(DOM.vvHeadSecond, { x: () => getVvMeetTargets().x2 }, 1.0);
    
    // Fade out overlay light mix-blend grading at scroll time 0.3 to 0.8
    tl.to(DOM.overlay, { duration: 0.5, opacity: 0 }, 0.3);

    if (!REDUCED_MOTION) {
      // Step 4/5: (removed) — no red vertical outline over the shrunken image line.
      // The image line simply fades away while the first letter draws itself,
      // exactly like every other letter of the wordmark.
      tl.to(DOM.bg, {
        opacity: 0,
        duration: 0.3
      }, 1.5);

      // Draw the 'C' outline directly (same treatment as the remaining letters)
      if (DOM.rlW1Letters[0]) {
        tl.set(DOM.rlW1Letters[0], { opacity: 1 }, 1.5);
        tl.to(DOM.rlW1Letters[0], {
          strokeDashoffset: 0,
          duration: 0.2,
          ease: 'power1.inOut'
        }, 1.5);
      }

      // Step 6: Reveal the solid letter 'C' and fade out its outline
      tl.set(DOM.vvHeadingFirst, { clipPath: 'inset(0 0% 0 0)' }, 1.7)
        .to(charSpansW1[0], { opacity: 1, duration: 0.15 }, 1.75);
      if (DOM.rlW1Letters[0]) {
        tl.to(DOM.rlW1Letters[0], { opacity: 0, duration: 0.15 }, 1.75);
      }

      // Step 7: Staggered drawing of the remaining letters and mid connector (letter-by-letter)
      let staggerTime = 1.75;
      const dt = 0.07; // Compacted stagger step to fit exactly in 5.0 seconds

      // COSGRAL subsequent letters (indices 1 to 6: 'O', 'S', 'G', 'R', 'A', 'L')
      for (let i = 1; i <= 6; i++) {
        const startTime = staggerTime;
        const pathEl = DOM.rlW1Letters[i];
        if (pathEl) {
          tl.set(pathEl, { opacity: 1 }, startTime);
          tl.to(pathEl, {
            strokeDashoffset: 0,
            duration: 0.2,
            ease: 'power1.inOut'
          }, startTime);
          tl.to(charSpansW1[i], { opacity: 1, duration: 0.12 }, startTime + 0.15);
          tl.to(pathEl, {
            opacity: 0,
            duration: 0.12
          }, startTime + 0.15);
        }
        staggerTime += dt;
      }

      // Connector rlMid
      const startTimeMid = staggerTime;
      tl.set(DOM.rlMid, { opacity: 1 }, startTimeMid);
      tl.to(DOM.rlMid, {
        strokeDashoffset: 0,
        duration: 0.2,
        ease: 'power1.inOut'
      }, startTimeMid);
      tl.to(DOM.rlMid, {
        opacity: 0,
        duration: 0.12
      }, startTimeMid + 0.15);
      staggerTime += dt;

      // AGENCY letters (indices 0 to 5: 'A', 'G', 'E', 'N', 'C', 'Y')
      tl.set(DOM.vvHeadingSecond, { clipPath: 'inset(0 0% 0 0)' }, 2.3);
      for (let i = 0; i <= 5; i++) {
        const startTime = staggerTime;
        const pathEl = DOM.rlW2Letters[i];
        if (pathEl) {
          tl.set(pathEl, { opacity: 1 }, startTime);
          tl.to(pathEl, {
            strokeDashoffset: 0,
            duration: 0.2,
            ease: 'power1.inOut'
          }, startTime);
          tl.to(charSpansW2[i], { opacity: 1, duration: 0.12 }, startTime + 0.15);
          tl.to(pathEl, {
            opacity: 0,
            duration: 0.12
          }, startTime + 0.15);
        }
        staggerTime += dt;
      }
    } else {
      // Under reduced motion, simply fade out the image and fade in the fully visible headings
      tl.to(DOM.bg, { opacity: 0, duration: 0.5 }, 1.3)
        .to([DOM.vvHeadingFirst, DOM.vvHeadingSecond], { opacity: 1, duration: 0.5 }, 1.3);
    }

    tl
      // Step 8: Films Open (desktop: full screen +10; mobile: half screen each)
      .to(filmFirstMaskState,  { duration: 1, h: isDesktop ? () => window.innerHeight + 10 : () => window.innerHeight / 2 + 1 }, 3.0)
      .to(filmSecondMaskState, { duration: 1, h: isDesktop ? () => window.innerHeight + 10 : () => window.innerHeight / 2 + 1 }, '<')
      .fromTo(
        [DOM.filmFirst, DOM.filmSecond],
        { pointerEvents: 'none' },
        { pointerEvents: 'auto', duration: 0 },
        4.0,
      )
      // Step 9: Hold pin
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
