/**
 * SOLACE landing interactions — vanilla port z efekty.txt
 * Efekty: #5 text cycle, #12 origin button, #14 fan gallery (GSAP), #18 letter hover, scroll reveal, marquee
 * Bez: hero parallax (#16) — odrzucone
 * Obrazy: wyłącznie ../../images/solace-landing/ (bez unsplash/pravatar)
 */
(function () {
  'use strict';

  const IMG = '../../images/solace-landing/';

  /* —— #5 Animated text cycle —— */
  function initTextCycle() {
    const el = document.getElementById('text-cycle');
    if (!el) return;
    const words = ['calm', 'botanical', 'ritual', 'renewal'];
    let i = 0;
    el.style.display = 'inline-block';
    el.style.minWidth = '6ch';
    el.style.transition = 'opacity 0.4s ease, filter 0.4s ease, transform 0.4s ease';
    setInterval(() => {
      el.style.opacity = '0';
      el.style.filter = 'blur(6px)';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.style.opacity = '1';
        el.style.filter = 'blur(0)';
        el.style.transform = 'translateY(0)';
      }, 400);
    }, 3200);
  }

  /* —— #18 Letter hover wave —— */
  function initLetterHover(selector) {
    document.querySelectorAll(selector).forEach((node) => {
      const text = node.textContent.trim();
      node.textContent = '';
      node.setAttribute('aria-label', text);
      [...text].forEach((char, index) => {
        const span = document.createElement('span');
        span.className = 'letter-wave';
        span.textContent = char === ' ' ? '\u00a0' : char;
        span.style.transitionDelay = `${index * 0.03}s`;
        node.appendChild(span);
      });
    });
  }

  /* —— Scroll reveal —— */
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  /* —— #14 GSAP fan gallery — własne zdjęcia —— */
  function initFanGallery() {
    const root = document.getElementById('fan-gallery');
    if (!root || typeof gsap === 'undefined') return;

    const cards = [
      { src: IMG + 'solace-01-sage-packshot.png', alt: 'Revive Gel Cleanser' },
      { src: IMG + 'solace-02-terracotta-hero.png', alt: 'Barrier Repair Moisturizer' },
      { src: IMG + 'solace-04-texture-macro.png', alt: 'Texture macro' },
      { src: IMG + 'solace-asset-portrait.png', alt: 'Editorial portrait' },
      { src: IMG + 'solace-05-forest-packshot.png', alt: 'Forest packshot' },
      { src: IMG + 'solace-asset-botanical-still-life.png', alt: 'Botanical still life' },
      { src: IMG + 'solace-03-duo-lifestyle.png', alt: 'Lifestyle duo' },
    ];

    const FAN = [
      { rot: -21, scale: 0.78, x: -72, y: 18 },
      { rot: -14, scale: 0.85, x: -48, y: 10 },
      { rot: -7, scale: 0.93, x: -24, y: 4 },
      { rot: 0, scale: 1, x: 0, y: 0 },
      { rot: 7, scale: 0.93, x: 24, y: 4 },
      { rot: 14, scale: 0.85, x: 48, y: 10 },
      { rot: 21, scale: 0.78, x: 72, y: 18 },
    ];

    const stage = document.createElement('div');
    stage.className = 'fan-stage';
    cards.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'fan-card';
      card.innerHTML = `<img src="${c.src}" alt="${c.alt}" loading="lazy">`;
      const p = FAN[i];
      gsap.set(card, {
        rotation: p.rot,
        scale: p.scale,
        x: p.x,
        y: p.y,
        zIndex: i === 3 ? 10 : 5 - Math.abs(i - 3),
      });
      stage.appendChild(card);
    });
    root.appendChild(stage);

    let center = 3;
    const total = cards.length;

    function layout(animate) {
      cards.forEach((_, i) => {
        const slot = ((i - center + 3) % total + total) % total;
        const p = FAN[slot];
        const card = stage.children[i];
        const props = {
          rotation: p.rot,
          scale: p.scale,
          x: p.x,
          y: p.y,
          zIndex: slot === 3 ? 10 : 5 - Math.abs(slot - 3),
          duration: animate ? 0.55 : 0,
          ease: 'power3.out',
        };
        gsap.to(card, props);
      });
    }

    root.querySelector('.fan-prev')?.addEventListener('click', () => {
      center = (center - 1 + total) % total;
      layout(true);
    });
    root.querySelector('.fan-next')?.addEventListener('click', () => {
      center = (center + 1) % total;
      layout(true);
    });

    layout(false);

    /* entry */
    gsap.from(stage, { opacity: 0, y: 40, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: root, start: 'top 80%' } });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTextCycle();
    initLetterHover('.letter-hover');
    initScrollReveal();
    if (typeof gsap !== 'undefined' && gsap.registerPlugin && window.ScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
      initFanGallery();
    }
  });
})();
