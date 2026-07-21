(function (global) {
  'use strict';

  function initExpandablePlus() {
    document.querySelectorAll('.expand-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('aria-controls');
        const list = id ? document.getElementById(id) : null;
        if (!list) return;
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        list.hidden = open;
      });
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initExpandablePlus = initExpandablePlus;
})(typeof window !== 'undefined' ? window : globalThis);
