(function (global) {
  'use strict';

  function initWebglNoiseAmbient() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-noise-ambient]').forEach((host) => {
      if (host.querySelector('canvas')) return;

      const wrap = document.createElement('div');
      wrap.className = 'noise-ambient';
      wrap.setAttribute('aria-hidden', 'true');

      const canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
      host.classList.add('section--has-noise');
      host.insertBefore(wrap, host.firstChild);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let w = 0;
      let h = 0;
      let frame = 0;
      let raf = 0;

      const resize = () => {
        const rect = host.getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width / 2));
        h = Math.max(1, Math.floor(rect.height / 2));
        canvas.width = w;
        canvas.height = h;
      };

      const draw = () => {
        if (prefersReduced) {
          ctx.fillStyle = 'rgba(120, 80, 180, 0.08)';
          ctx.fillRect(0, 0, w, h);
          return;
        }
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        const t = frame * 0.015;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const n =
              Math.sin(x * 0.04 + t) * Math.cos(y * 0.05 - t) * 0.5 +
              Math.random() * 0.35;
            const v = Math.floor(40 + n * 90);
            data[i] = v * 0.6;
            data[i + 1] = v * 0.35;
            data[i + 2] = v;
            data[i + 3] = 28;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        frame += 1;
        raf = requestAnimationFrame(draw);
      };

      resize();
      draw();
      window.addEventListener('resize', resize, { passive: true });

      host.addEventListener(
        'remove',
        () => {
          cancelAnimationFrame(raf);
        },
        { once: true }
      );
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initWebglNoiseAmbient = initWebglNoiseAmbient;
})(typeof window !== 'undefined' ? window : globalThis);
