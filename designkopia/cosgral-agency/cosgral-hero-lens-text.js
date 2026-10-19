/** Mirrors the real hero headline onto a canvas texture so the glass cube's
 * transmission pass can show the actual DOM text (plain, undistorted, in
 * cosgral-glass-cube.js) instead of only the procedural ambient-background ribbon. */
export function createHeroLensText(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;

  if (document.documentElement.classList.contains('reduce-motion')) return { texture, setActive() {} };

  const ctx = canvas.getContext('2d');
  let queued = false, active = false, dirty = true, lastDrawAt = -Infinity, timer = 0;

  // Every text element the cube's flight path can visually cross while it's
  // on screen — not just the hero title. #rozpad's runway word is the same
  // element "shatter-beat" (the cube's own scroll timeline) is built around,
  // so the cube reliably passes right over it.
  const targets = [
      document.querySelector('.home-hero__title'),
      document.querySelector('.home-hero__tagline'),
      document.querySelector('#rozpad .runway-word')
    ].filter(Boolean);

  function draw() {
    queued = false;
    if (!active) return;
    dirty = false;lastDrawAt = performance.now();
    const els = targets;
    if (!els.length) return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    // This texture is only seen inside a small glass object, not fullscreen.
    const dpr = Math.min(window.devicePixelRatio || 1, 1, 1536 / w, 1024 / h);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > h) continue;
      const cs = getComputedStyle(el);
      const opacity = parseFloat(cs.opacity);
      if (!(opacity > 0.05)) continue;
      ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      try { ctx.letterSpacing = cs.letterSpacing; } catch (e) { /* unsupported — tighter text, still readable */ }
      ctx.globalAlpha = opacity;

      // Split into colored runs so inline emphasis (e.g. <em>KODUJEMY.</em>)
      // keeps its own color instead of the whole line flattening to one.
      const runs = [];
      el.childNodes.forEach((node) => {
        const text = node.textContent || '';
        if (!text) return;
        const color = node.nodeType === 1 ? getComputedStyle(node).color : cs.color;
        runs.push({ text, color });
      });
      if (!runs.length) continue;
      const widths = runs.map((r) => ctx.measureText(r.text).width);
      const totalWidth = widths.reduce((a, b) => a + b, 0);
      let x = rect.left + rect.width / 2 - totalWidth / 2;
      const cy = rect.top + rect.height / 2;
      runs.forEach((r, i) => {
        ctx.fillStyle = r.color;
        ctx.fillText(r.text, x, cy);
        x += widths[i];
      });
    }
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }

  function queueDraw() {
    dirty = true;
    if (!active || queued || timer) return;
    const wait = 32 - (performance.now() - lastDrawAt);
    if (wait > 0) {timer = setTimeout(() => {timer = 0;queueDraw();}, wait);return;}
    queued = true;
    requestAnimationFrame(draw);
  }

  window.addEventListener('cosgral:cube-intro-done', queueDraw);
  window.addEventListener('cosgral:chrome-tone', queueDraw);
  window.addEventListener('cosgral:langchange', () => window.setTimeout(queueDraw, 60));
  window.addEventListener('cosgral:i18n-ready', queueDraw);
  window.addEventListener('resize', queueDraw, { passive: true });
  window.visualViewport?.addEventListener('resize', queueDraw, { passive: true });
  document.fonts?.ready.then(queueDraw);

  // Some targets (e.g. #rozpad's runway word) use a scroll-scrubbed reveal —
  // their opacity/position changes continuously as you scroll, not just once.
  // A one-time capture goes stale the moment the user keeps scrolling, so
  // redraw on every scroll tick too (queueDraw already dedupes to one rAF).
  window.addEventListener('scroll', queueDraw, { passive: true });
  window.cosgralSmoothScroll?.lenis?.on?.('scroll', queueDraw);

  // The hero's own reveal (preloader exit, editorial-motion fade-in) can still be
  // mid-transition when the triggers above fire, leaving this canvas captured
  // blank. Catch the moment the real text actually becomes visible...
  const readyObserver = new MutationObserver(() => {
    if (document.documentElement.classList.contains('editorial-ready') ||
        document.body.classList.contains('is-ready') ||
        document.body.classList.contains('editorial-ready')) {
      window.setTimeout(queueDraw, 300);
      readyObserver.disconnect();
    }
  });
  readyObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  readyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Initial font/reveal changes only queue a capture while glass is visible.
  [0, 400, 1200, 2500, 4000].forEach((delay) => window.setTimeout(queueDraw, delay));

  return { texture, redraw: queueDraw, setActive(value) {
    if (active === value) return;
    active = value;
    if (!active) {clearTimeout(timer);timer = 0;}
    else if (dirty) queueDraw();
  }};
}
