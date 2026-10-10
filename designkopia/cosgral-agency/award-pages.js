/**
 * Subpage scrollytelling. One observer, one scroll progress line.
 * No pins, no per-frame layout reads. Home keeps its own chapters.
 */
(function () {
  "use strict";
  if (!document.body || document.body.classList.contains("home-page")) return;

  var reduce = document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var nodes = document.querySelectorAll(
    "main section, main article, main figure, main header, .service-block, .about-team__member, .portfolio-section, .case-study__body, .case-study__stage"
  );
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (el.classList.contains("award-reveal")) continue;
    el.classList.add("award-reveal");
    if (reduce) {
      el.classList.add("is-in");
      continue;
    }
    var top = el.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.92) el.classList.add("is-in");
  }

  var images = document.querySelectorAll("main img");
  for (var j = 0; j < images.length; j++) {
    var img = images[j];
    if (img.closest("nav, footer, .site-nav, .site-footer")) continue;
    img.classList.add("award-grade");
    var frame = img.closest(".award-parallax, figure, .about-team__photo") || img.parentElement;
    if (frame && !frame.querySelector("video")) frame.classList.add("award-parallax");
  }

  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var n = 0; n < entries.length; n++) {
        if (!entries[n].isIntersecting) continue;
        entries[n].target.classList.add("is-in");
        io.unobserve(entries[n].target);
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.14 });
    var pending = document.querySelectorAll(".award-reveal:not(.is-in)");
    for (var k = 0; k < pending.length; k++) io.observe(pending[k]);
  }

  var reels = document.querySelectorAll("video.award-reel");
  if (!reduce && reels.length && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      for (var r = 0; r < entries.length; r++) {
        var video = entries[r].target;
        if (entries[r].isIntersecting) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          video.pause();
        }
      }
    }, { threshold: 0.35 });
    for (var v = 0; v < reels.length; v++) rio.observe(reels[v]);
  }

  document.documentElement.classList.add("award-motion");
  if (reduce) return;

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var p = max > 0 ? y / max : 0;
      document.documentElement.style.setProperty("--page-p", p.toFixed(3));
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
