/**
 * Team section — reveal per card on scroll (no pin, no scrub).
 */
(function () {
  function boot() {
    const cards = document.querySelectorAll('.history_team_card');
    if (!cards.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof gsap === 'undefined') return;

    cards.forEach((card) => {
      const isRight = card.classList.contains('is-right');
      const role = card.querySelector('.history_team_role');
      const media = card.querySelector('.history_team_media');
      const info = card.querySelector('.history_team_info');

      if (role) gsap.set(role, { autoAlpha: 0, x: isRight ? 20 : -20 });
      if (media) gsap.set(media, { autoAlpha: 0, scale: 0.95, y: 30 });
      if (info) gsap.set(info, { autoAlpha: 0, x: isRight ? -40 : 40 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: 'top 82%',
          once: true,
        },
      });

      if (role) tl.to(role, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.1);
      if (media) tl.to(media, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.15);
      if (info) tl.to(info, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power3.out' }, 0.3);
    });

    requestAnimationFrame(() => ScrollTrigger.refresh(true));
  }

  function ready() {
    if (document.readyState === 'loading') {
      return new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    return Promise.resolve();
  }

  const domReady = ready();
  const smootherReady = window.smootherReady || Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));

  domReady.then(() => Promise.race([smootherReady, timeout])).then(boot);
})();
