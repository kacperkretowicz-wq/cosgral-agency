/** INDEX overlay — mashachern, travelagency */
(function (global) {
  'use strict';

  function initIndexOverlay() {
    const overlay = document.getElementById('index-overlay');
    const openBtn = document.querySelector('[data-index-open]');
    const closeBtn = document.querySelector('[data-index-close]');
    if (!overlay) return;

    function setOpen(open) {
      overlay.classList.toggle('is-open', open);
      overlay.hidden = !open;
      if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    }

    openBtn?.addEventListener('click', () => setOpen(true));
    closeBtn?.addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) setOpen(false);
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initIndexOverlay = initIndexOverlay;
})(typeof window !== 'undefined' ? window : globalThis);
