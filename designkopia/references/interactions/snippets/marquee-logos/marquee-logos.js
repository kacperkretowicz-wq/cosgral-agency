(function (global) {
  'use strict';

  function initMarqueeLogos() {
    document.querySelectorAll('.marquee-track').forEach((track) => {
      if (track.dataset.duplicated) return;
      track.innerHTML += track.innerHTML;
      track.dataset.duplicated = 'true';
    });
  }

  global.DesignSnippets = global.DesignSnippets || {};
  global.DesignSnippets.initMarqueeLogos = initMarqueeLogos;
})(typeof window !== 'undefined' ? window : globalThis);
