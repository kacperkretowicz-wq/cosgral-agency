/**
 * Preferencje ruchu: respektuj reduceMotion/forceMotion w URL,
 * na desktopie (mysz) ignoruj OS prefers-reduced-motion (Windows Chrome).
 */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  if (params.has("reduceMotion")) {
    document.documentElement.classList.add("reduce-motion");
    try { localStorage.removeItem("cosgral-force-motion"); } catch (e) {}
    return;
  }
  if (params.has("forceMotion")) {
    try { localStorage.setItem("cosgral-force-motion", "1"); } catch (e) {}
    return;
  }
  try {
    if (localStorage.getItem("cosgral-force-motion") === "1") return;
  } catch (e) {}
  if (typeof window.matchMedia !== "function") return;

  var isDesktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (isDesktopPointer) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("reduce-motion");
  }
})();
