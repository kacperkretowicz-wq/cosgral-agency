/**
 * Asset URLs carry their own versions. Record the build without restarting
 * an already fresh page or discarding the browser's saved back navigation.
 */
(function () {
  "use strict";

  var meta = document.querySelector('meta[name="cosgral-build"]');
  var build = (meta && meta.getAttribute("content")) || "";
  var key = "cosgral-build";

  if (build) {
    try { localStorage.setItem(key, build); } catch (_) {}
  }
})();
