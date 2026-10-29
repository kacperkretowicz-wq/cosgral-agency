/* Montage preview is deliberately independent of images and WebGL contexts. */
(function () {
  'use strict';
  const chapter = document.getElementById('montaz');
  const scroller = document.querySelector('[data-chapters-scroller]');
  if (!chapter || !scroller) return;
  const surface = document.createElement('div');
  surface.className = 'pf-montage-reveal';
  surface.hidden = true;
  surface.setAttribute('aria-hidden', 'true');
  const title = document.createElement('strong');
  title.className = 'pf-montage-word';
  const canvas = document.createElement('canvas');
  surface.append(title, canvas);
  document.body.append(surface);
  const ctx = canvas.getContext('2d', {alpha: true});
  if (!ctx) return;
  let width = 1, height = 1, ratio = 1, visible = false, raf = 0, last = 0, moved = 0, previous = null;
  const points = [];
  function language() { title.textContent = document.documentElement.lang === 'en' ? 'EDITS' : 'MONTAŻ'; }
  function black() { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height); }
  function resize() {
    ratio = Math.min(1, 1200 / innerWidth);
    width = canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    height = canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    previous = null; black(); sync();
  }
  function sync() {
    const index = [...scroller.querySelectorAll('[data-portfolio-tile]')].indexOf(chapter);
    const settled = Math.abs(scroller.scrollLeft / Math.max(1, scroller.clientWidth) - index) < .025;
    const next = settled && !document.hidden && !document.body.classList.contains('pf-wall-open') && !document.documentElement.classList.contains('is-nav-menu-open');
    if (next !== visible) {
      visible = next; surface.hidden = !next; previous = null; points.length = 0;
      if (!next) { cancelAnimationFrame(raf); raf = 0; last = 0; black(); }
    }
  }
  function stamp(x, y) {
    const radius = Math.max(76, Math.min(170, innerWidth * .105)) * ratio;
    const brush = ctx.createRadialGradient(x, y, radius * .12, x, y, radius);
    brush.addColorStop(0, 'rgba(0,0,0,.94)');
    brush.addColorStop(.6, 'rgba(0,0,0,.76)');
    brush.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = brush; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min(80, now - last) : 16; last = now;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,' + (1 - Math.exp(-dt / 1600)).toFixed(4) + ')';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    for (const p of points.splice(0)) {
      if (previous) {
        const count = Math.min(80, Math.max(1, Math.ceil(Math.hypot(p.x - previous.x, p.y - previous.y) / (12 * ratio))));
        for (let k = 1; k <= count; k++) stamp(previous.x + (p.x - previous.x) * k / count, previous.y + (p.y - previous.y) * k / count);
      } else stamp(p.x, p.y);
      previous = p;
    }
    if (now - moved < 6500) raf = requestAnimationFrame(frame); else { black(); previous = null; last = 0; }
  }
  window.addEventListener('pointermove', e => {
    if (!visible || e.pointerType === 'touch') return;
    points.push({x: e.clientX * ratio, y: e.clientY * ratio});
    if (points.length > 12) points.splice(0, points.length - 12);
    moved = performance.now(); if (!raf) raf = requestAnimationFrame(frame);
  }, {passive: true});
  window.addEventListener('pointerout', e => { if (!e.relatedTarget) previous = null; });
  scroller.addEventListener('scroll', sync, {passive: true});
  window.addEventListener('resize', resize, {passive: true});
  window.addEventListener('cosgral:langchange', language);
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.body, {attributes: true, attributeFilter: ['class']});
  new MutationObserver(sync).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  language(); resize();
})();
