/** keyboard-slides — ArrowDown/Up between viewport sections */
(function (global) {
  'use strict';

  function initKeyboardSlides(opts) {
    opts = opts || {};
    const container = document.querySelector(opts.container || '.snap-container');
    const sections = [...document.querySelectorAll(opts.section || '.viewport-section')];
    const counter = document.getElementById(opts.counterId || 'slide-counter');
    if (!container || !sections.length) return;

    function getActiveIndex() {
      const mid = container.scrollTop + container.clientHeight * 0.45;
      let active = 0;
      sections.forEach((sec, i) => {
        if (sec.offsetTop <= mid) active = i;
      });
      return active;
    }

    function updateCounter() {
      if (!counter) return;
      const i = getActiveIndex();
      counter.textContent =
        String(i + 1).padStart(2, '0') + ' / ' + String(sections.length).padStart(2, '0');
    }

    function scrollToSection(index) {
      if (!sections[index]) return;
      sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    container.addEventListener('scroll', updateCounter, { passive: true });
    updateCounter();

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const i = getActiveIndex();
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToSection(Math.min(i + 1, sections.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToSection(Math.max(i - 1, 0));
      }
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initKeyboardSlides = initKeyboardSlides;
})(typeof window !== 'undefined' ? window : globalThis);
