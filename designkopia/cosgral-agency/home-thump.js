/**
 * Screen thump — water-drop ripple when later sections land.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var root = document.querySelector(".home-thump");
  if (!root || REDUCED || !window.gsap) {
    window.cosgralThump = { pulse: function () {} };
    return;
  }

  var rings = root.querySelectorAll(".home-thump__ring");
  var busy = false;
  var lastPulse = 0;

  function pulse(scene) {
    if (REDUCED || !window.gsap) return;
    var now = performance.now();
    if (now - lastPulse < 900) return;
    lastPulse = now;
    var rect = (scene || document.body).getBoundingClientRect
      ? (scene || document.body).getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    var cx = rect.left + rect.width * 0.5;
    var cy = rect.top + Math.min(rect.height * 0.42, window.innerHeight * 0.48);
    root.style.setProperty("--tx", cx + "px");
    root.style.setProperty("--ty", cy + "px");
    root.classList.add("is-active");

    gsap.killTweensOf(rings);
    gsap.fromTo(
      rings,
      { scale: 0.12, opacity: 0.5 },
      {
        scale: function (i) {
          return 2.2 + i * 0.55;
        },
        opacity: 0,
        duration: 1.15,
        stagger: 0.1,
        ease: "power2.out",
        overwrite: true,
        onComplete: function () {
          root.classList.remove("is-active");
        },
      }
    );

    var panel = scene && (scene.querySelector(".home-scene__panel") || scene);
    if (panel) {
      gsap.fromTo(
        panel,
        { scale: 0.985, y: 18 },
        {
          scale: 1,
          y: 0,
          duration: 0.95,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // Whole-frame water punch
    if (!busy) {
      busy = true;
      var film = document.querySelector("main.home-film");
      if (film) {
        gsap.fromTo(
          film,
          { scale: 1.016 },
          {
            scale: 1,
            duration: 0.9,
            ease: "power3.out",
            transformOrigin: "50% 42%",
            onComplete: function () {
              busy = false;
              gsap.set(film, { clearProps: "transform" });
            },
          }
        );
      } else {
        busy = false;
      }
    }
  }

  window.cosgralThump = { pulse: pulse };
})();
