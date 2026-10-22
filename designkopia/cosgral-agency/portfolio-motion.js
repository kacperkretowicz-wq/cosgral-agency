/* Realizacje — chapter choreography. Every chapter publishes how far it sits
 * from the viewport (--d, signed, and --ad) on each scroll frame, and the CSS
 * spreads its layers across that one number: the outline numeral far behind,
 * the artwork in the middle, the copy in front; --ex makes the artwork flee
 * past the screen edges early in a slide and gather again as it lands.
 * Headings are poured: an outline first, then liquid rising inside the letters.
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
    splitTitle(chapter.querySelector(".portfolio-chapter__title"));
  });

  /* Words in masks; re-split when the language switch rewrites the text */
  function splitTitle(title) {
    if (!title) return;
    var busy = false;
    function split() {
      if (title.querySelector(".pf-w")) return;
      var text = title.textContent.replace(/\s+/g, " ").trim();
      if (!text) return;
      busy = true;
      title.setAttribute("aria-label", text);
      title.textContent = "";
      text.split(" ").forEach(function (word, i) {
        if (i) title.appendChild(document.createTextNode(" "));
        var outer = document.createElement("span");
        outer.className = "pf-w";
        outer.setAttribute("aria-hidden", "true");
        var inner = document.createElement("span");
        inner.className = "pf-w__i pf-liq";
        inner.style.setProperty("--wi", i);
        fillLiquid(inner, word);
        outer.appendChild(inner);
        title.appendChild(outer);
      });
      busy = false;
    }
    split();
    new MutationObserver(function () { if (!busy) split(); }).observe(title, { childList: true, characterData: true, subtree: true });
  }

  function fillLiquid(host, text) {
    host.textContent = "";
    var outline = document.createElement("span");
    outline.className = "pf-liq__o";
    outline.textContent = text;
    var fill = document.createElement("span");
    fill.className = "pf-liq__f";
    fill.setAttribute("aria-hidden", "true");
    fill.textContent = text;
    host.appendChild(outline);
    host.appendChild(fill);
  }

  /* Headings built later (opened chapters, case copy) pour in once */
  var POURED = ".expand-gallery__heading, .sys-fan__title, .expand-deck__name, .expand-web-panel__title, .portfolio-contact-cta h2";
  function pour(el) {
    if (el.querySelector(".pf-liq")) return;
    var text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;
    var host = document.createElement("span");
    host.className = "pf-liq pf-liq--block";
    fillLiquid(host, text);
    el.textContent = "";
    el.appendChild(host);
    if (reduced) { host.classList.add("is-poured"); return; }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { host.classList.add("is-poured"); });
    });
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches && node.matches(POURED)) pour(node);
    if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll(POURED), pour);
  }
  scan(document.body);
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      if (r.target.nodeType === 1 && r.target.matches && r.target.matches(POURED)) pour(r.target);
      Array.prototype.forEach.call(r.addedNodes, scan);
    });
  }).observe(document.body, { childList: true, subtree: true });

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
