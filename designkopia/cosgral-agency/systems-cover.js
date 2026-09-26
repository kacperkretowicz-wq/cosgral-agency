(function () {
  "use strict";
  var reel = document.querySelector("[data-auto-cover-reel]");
  if (!reel) return;
  var shots = Array.prototype.slice.call(reel.querySelectorAll(".auto-cover__shot"));
  if (shots.length < 2) return;

  var reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    shots.forEach(function (el, i) {
      el.classList.toggle("is-on", i === 0);
    });
    return;
  }

  var i = 0;
  shots[0].classList.add("is-on");
  window.setInterval(function () {
    shots[i].classList.remove("is-on");
    i = (i + 1) % shots.length;
    shots[i].classList.add("is-on");
  }, 3200);

  var video = document.querySelector(".auto-cover__video");
  if (video && video.play) {
    var play = function () {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (video.readyState >= 2) play();
    else video.addEventListener("canplay", play, { once: true });
  }
})();
