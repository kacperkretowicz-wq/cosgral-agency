(function () {
  "use strict";
  var video = document.querySelector(".auto-cover__video");
  if (!video || !video.play) return;

  var play = function () {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  };
  if (video.readyState >= 2) play();
  else video.addEventListener("canplay", play, { once: true });
})();
