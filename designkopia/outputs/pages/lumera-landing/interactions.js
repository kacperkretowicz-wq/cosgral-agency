/**
 * LUMÉRA — lumera-commercial vertical (NOT readymag-slides / ENCRE)
 */
(function () {
  'use strict';

  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
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
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  function initOriginButtons() {
    document.querySelectorAll('.btn-origin').forEach((btn) => {
      btn.addEventListener('mousedown', () => btn.classList.add('is-pressed'));
      btn.addEventListener('mouseup', () => btn.classList.remove('is-pressed'));
      btn.addEventListener('mouseleave', () => btn.classList.remove('is-pressed'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initOriginButtons();
  });
})();
