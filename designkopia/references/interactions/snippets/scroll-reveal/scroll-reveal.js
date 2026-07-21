(function (global) {
  'use strict';

  function initScrollReveal(opts) {
    opts = opts || {};
    const root = opts.root ? document.querySelector(opts.root) : null;
    const els = document.querySelectorAll(opts.selector || '.reveal');
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visible');
            io.unobserve(e.target);
          }
        });
      },
      {
        threshold: opts.threshold ?? 0.12,
        root: root,
        rootMargin: opts.rootMargin || '0px 0px -48px 0px',
      }
    );
    els.forEach((el) => io.observe(el));
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initScrollReveal = initScrollReveal;
})(typeof window !== 'undefined' ? window : globalThis);
