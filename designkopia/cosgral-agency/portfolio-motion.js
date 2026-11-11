/* Realizacje — chapter choreography. Every chapter publishes how far it sits
 * from the viewport (--d, signed, and --ad) on each scroll frame, and the CSS
 * spreads its layers across that one number: the outline numeral far behind,
 * the artwork in the middle, the copy in front; --ex makes the artwork flee
 * past the screen edges early in a slide and gather again as it lands.
 * Chapter titles are inked by heading-ink.js each time their chapter activates.
 * Photo tiles and copy fly out sideways, each on its own cue: to the left when
 * the slide moves right, to the right when it moves left; the next chapter's
 * pieces fly in from the opposite side the same way.
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

  // Everything that flies: the chapter's photo tiles, display words and copy.
  var FLY = [
    ".portfolio-chapter__copy > :not(.visually-hidden)", ".pf-ch-index",
    ".chapter-lux__shot", ".chapter-lux__word", ".chapter-lux__meta", ".chapter-lux__foot",
    ".chapter-show__stage > *", ".chapter-show__word",
    ".sys-fan__head > *", ".sys-fan__arc", ".chapter-montaz__belt", ".portfolio-tile__viz-word"
  ].join(",");
  function flyEase(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function fly(chapter, d, w) {
    if (!chapter.__fly || layoutDirty) chapter.__fly = Array.prototype.slice.call(chapter.querySelectorAll(FLY));
    var ad = Math.abs(d), dir = d < 0 ? -1 : 1;
    chapter.__fly.forEach(function (el, k) {
      // A scrambled but stable cue per piece, so they leave and land in a mixed order.
      // Spread over most of the slide so each piece is seen travelling, not just gone.
      var cue = ((k * 0.618034 + 0.17) % 1) * 0.3;
      var reach = 0.75 + ((k * 0.414214) % 1) * 0.35;
      var t = Math.max(0, Math.min(1, (ad - cue) / 0.7));
      var x = reduced || ad === 0 ? 0 : dir * w * reach * flyEase(t);
      el.style.translate = x ? x.toFixed(1) + "px 0" : "";
    });
  }

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
      fly(chapter, d, w);
    });
  }
  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  function invalidateLayout() {
    layoutDirty = true; last = [];
    chapters.forEach(function (c) { c.__fly = null; });
    queue();
  }
  scroller.addEventListener("scroll", queue, { passive: true });
  // Galleries build their tiles after load: refresh the list of flying pieces.
  var flyRefresh = 0;
  new MutationObserver(function () {
    if (flyRefresh) return;
    flyRefresh = requestAnimationFrame(function () {
      flyRefresh = 0;
      chapters.forEach(function (c) { c.__fly = null; });
      last = []; queue();
    });
  }).observe(scroller, { childList: true, subtree: true });
  window.addEventListener("resize", invalidateLayout, { passive: true });
  window.addEventListener("cosgral:langchange", invalidateLayout);
  document.fonts?.ready.then(invalidateLayout);
  new ResizeObserver(invalidateLayout).observe(scroller);
  document.documentElement.classList.add("pf-motion");
  update();
})();
