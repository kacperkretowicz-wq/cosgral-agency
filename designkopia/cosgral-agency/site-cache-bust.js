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
    if (!event.persisted) return;
    /* Drop interaction locks before reload — bfcache can revive mid-transition. */
    try {
      if (window.cosgralPageTransition && window.cosgralPageTransition.reset) {
        window.cosgralPageTransition.reset();
      }
      if (window.cosgralServiceDive && window.cosgralServiceDive.reset) {
        window.cosgralServiceDive.reset();
      }
      if (window.cosgralNavMenu && window.cosgralNavMenu.reset) {
        window.cosgralNavMenu.reset();
      }
      document.documentElement.classList.remove(
        "is-page-enter",
        "is-page-transitioning",
        "is-nav-menu-open",
        "is-service-dive-enter"
      );
      document.body.classList.remove("is-nav-menu-open", "is-nav-services-expanded");
    } catch (e) {}
    location.reload();
  });
})();
