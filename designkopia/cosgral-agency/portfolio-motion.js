/* Realizacje — chapter choreography. Every chapter publishes how far it sits
 * from the viewport (--d, signed, and --ad) on each scroll frame, and the CSS
 * spreads its layers across that one number: the outline numeral far behind,
 * the artwork in the middle, the copy in front; --ex makes the artwork flee
 * past the screen edges early in a slide and gather again as it lands.
 * Chapter titles are inked by heading-ink.js each time their chapter activates.
 */
(function () {
  "use strict";
  var scroller = document.querySelector("[data-chapters-scroller]");
  if (!scroller) return;
  var chapters = Array.prototype.slice.call(scroller.querySelectorAll("[data-portfolio-tile]"));
  var reduced = document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  var last = [];
  var raf = 0;
  var offsets = [], layoutDirty = true;

  chapters.forEach(function (chapter, i) {
    var mark = document.createElement("div");
    mark.className = "pf-ch-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = (i < 9 ? "0" : "") + (i + 1);
    chapter.insertBefore(mark, chapter.firstChild);
  });

  function update() {
    raf = 0;
    var w = Math.max(1, scroller.clientWidth);
    // Read the chapter layout together. Scroll frames only write transforms;
    // no offsetLeft read follows another chapter's CSS property writes.
    if (layoutDirty) {
      offsets = chapters.map(function (chapter) { return chapter.offsetLeft; });
      layoutDirty = false;
    }
    var left = scroller.scrollLeft;
    chapters.forEach(function (chapter, i) {
      var d = reduced ? 0 : Math.max(-1.25, Math.min(1.25, (offsets[i] - left) / w));
      var key = d.toFixed(4);
      if (last[i] === key) return;
      last[i] = key;
      chapter.style.setProperty("--d", key);
      var ad = Math.abs(d);
      var ex = Math.min(1, ad / 0.6);
      chapter.style.setProperty("--ad", ad.toFixed(4));
      chapter.style.setProperty("--ex", (ex * ex * (3 - 2 * ex)).toFixed(4));
    });
  }
  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  function invalidateLayout() { layoutDirty = true; last = []; queue(); }
  scroller.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", invalidateLayout, { passive: true });
  window.addEventListener("cosgral:langchange", invalidateLayout);
  document.fonts?.ready.then(invalidateLayout);
  new ResizeObserver(invalidateLayout).observe(scroller);
  document.documentElement.classList.add("pf-motion");
  update();
})();
