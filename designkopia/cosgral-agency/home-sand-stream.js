/**
 * Legacy canvas sand disabled — shatter lives in home-hero-3d.js (Three.js).
 * Keeps cosgralSand bridge for any remaining readers.
 */
(function () {
  "use strict";
  var canvas = document.getElementById("home-sand");
  if (canvas) {
    canvas.style.display = "none";
  }
  window.cosgralSand = window.cosgralSand || { break: 0, stream: 0 };
})();
