/* Keep toolbar/keyboard resizes from moving the document underneath a finger. */
(function () {
  var root = document.documentElement;
  var width = 0;
  function measure() {
    var nextWidth = root.clientWidth;
    if (nextWidth === width) return;
    width = nextWidth;
    if (matchMedia('(max-width: 900px), (pointer: coarse)').matches) {
      root.style.setProperty('--stable-vh', (window.innerHeight / 100) + 'px');
    } else {
      root.style.removeProperty('--stable-vh');
    }
  }
  measure();
  window.addEventListener('resize', measure, { passive: true });
})();
