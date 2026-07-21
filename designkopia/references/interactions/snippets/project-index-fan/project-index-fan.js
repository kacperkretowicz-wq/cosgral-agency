(function (global) {
  'use strict';

  function initProjectIndexFan() {
    document.querySelectorAll('.index-fan-wrap').forEach((wrap) => {
      const links = [...wrap.querySelectorAll('.project-link')];
      if (!links.length) return;

      const clear = () => {
        wrap.classList.remove('is-fan-active');
        links.forEach((l) => {
          l.classList.remove('is-fan-focus', 'is-fan-above', 'is-fan-below');
        });
      };

      links.forEach((link, index) => {
        link.addEventListener('mouseenter', () => {
          wrap.classList.add('is-fan-active');
          links.forEach((l, i) => {
            l.classList.toggle('is-fan-focus', i === index);
            l.classList.toggle('is-fan-above', i < index);
            l.classList.toggle('is-fan-below', i > index);
          });
        });
      });

      wrap.addEventListener('mouseleave', clear);
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initProjectIndexFan = initProjectIndexFan;
})(typeof window !== 'undefined' ? window : globalThis);
