(function (global) {
  'use strict';

  function initOriginButtons() {
    document.querySelectorAll('.btn-origin, .project-link').forEach((btn) => {
      btn.addEventListener('mousedown', () => btn.classList.add('is-pressed'));
      btn.addEventListener('mouseup', () => btn.classList.remove('is-pressed'));
      btn.addEventListener('mouseleave', () => btn.classList.remove('is-pressed'));
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initOriginButtons = initOriginButtons;
})(typeof window !== 'undefined' ? window : globalThis);
