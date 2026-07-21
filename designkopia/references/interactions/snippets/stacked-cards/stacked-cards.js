(function (global) {
  'use strict';

  function initStackedCards() {
    document.querySelectorAll('.stack-wrap').forEach((wrap) => {
      wrap.addEventListener('mouseenter', () => wrap.classList.add('is-hover'));
      wrap.addEventListener('mouseleave', () => wrap.classList.remove('is-hover'));
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initStackedCards = initStackedCards;
})(typeof window !== 'undefined' ? window : globalThis);
