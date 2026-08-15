/**
 * O nas — hero intro + przejście do sekcji zespołu (jak portfolio hero → strony).
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("about-page")) return;

  var hero = document.querySelector(".about-hero");
  var team = document.querySelector(".about-team");
  if (!hero) return;

  function dispatchStep(index, initial) {
    window.dispatchEvent(
      new CustomEvent("cosgral:section-step", {
        detail: {
          index: index,
          id: index === 0 ? "about-hero" : "about-team",
          initial: !!initial,
        },
      })
    );
  }

  function bootIndex() {
    if (!team) return 0;
    var teamTop = team.getBoundingClientRect().top + window.scrollY;
    return window.scrollY + window.innerHeight * 0.42 < teamTop ? 0 : 1;
  }

  function boot() {
    dispatchStep(bootIndex(), true);
  }

  if (window.cosgralCube) boot();
  else window.addEventListener("cosgral:cube-ready", boot, { once: true });

  if (!window.ScrollTrigger) return;

  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom top",
    onLeave: function () {
      dispatchStep(1);
    },
    onEnterBack: function () {
      dispatchStep(0);
    },
  });
})();
