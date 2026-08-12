/**
 * Wymusza przeładowanie po deployu (localStorage) i po BFCache na iOS Safari.
 */
(function () {
  "use strict";

  var meta = document.querySelector('meta[name="cosgral-build"]');
  var build = (meta && meta.getAttribute("content")) || "";
  var key = "cosgral-build";

  if (build) {
    var prev = localStorage.getItem(key);
    if (prev && prev !== build) {
      localStorage.setItem(key, build);
      location.reload();
      return;
    }
    localStorage.setItem(key, build);
  }

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) location.reload();
  });
})();
