/* Service pages use a small, independent menu; they do not mount the home cube. */
(() => {
  const nav = document.getElementById('site-nav');
  const toggle = document.getElementById('nav-toggle');
  const overlay = document.getElementById('nav-overlay');
  if (!document.body.classList.contains('service-page') || !nav || !toggle || !overlay) return;

  const links = [...overlay.querySelectorAll('a[href]')];
  let open = false;

  function setOpen(next) {
    open = next;
    nav.classList.toggle('is-open', next);
    overlay.classList.toggle('is-open', next);
    document.body.classList.toggle('is-nav-menu-open', next);
    toggle.setAttribute('aria-expanded', String(next));
    overlay.setAttribute('aria-hidden', String(!next));
    if (next) links[0]?.focus();
    else toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(!open));
  overlay.querySelector('[data-nav-close]')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });
})();
