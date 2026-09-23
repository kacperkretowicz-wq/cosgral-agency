/* Original, lightweight motion layers for the three illustrative product stills. */
(() => {
  const overlays = {
    crm: `<path class="tf-motion__route" d="M360 515C430 480 440 440 511 420S612 390 645 347S752 355 810 307"/>
      <circle class="tf-motion__pin tf-motion__pin--1" cx="360" cy="515" r="23"/>
      <circle class="tf-motion__pin tf-motion__pin--2" cx="511" cy="420" r="23"/>
      <circle class="tf-motion__pin tf-motion__pin--3" cx="645" cy="347" r="23"/>
      <circle class="tf-motion__pin tf-motion__pin--4" cx="810" cy="307" r="23"/>`,
    code39: `<defs><linearGradient id="tf-code-scan"><stop stop-color="#AD684B" stop-opacity="0"/><stop offset=".48" stop-color="#AD684B" stop-opacity=".13"/><stop offset=".5" stop-color="#AD684B" stop-opacity=".5"/><stop offset=".52" stop-color="#AD684B" stop-opacity=".13"/><stop offset="1" stop-color="#AD684B" stop-opacity="0"/></linearGradient></defs>
      <rect class="tf-motion__scanner" x="737" y="354" width="82" height="149" fill="url(#tf-code-scan)"/>`,
    forecast: `<path class="tf-motion__forecast" d="M300 508 L354 491 L408 501 L462 480 L516 487 L570 467 L624 481 L678 458 L732 450 L786 432 L839 444"/>
      <circle class="tf-motion__forecast-point" cx="839" cy="444" r="9"/>`
  };

  for (const img of document.querySelectorAll('img[src*="telforceone-"]')) {
    const match = img.getAttribute('src').match(/telforceone-(crm|code39|forecast)\.svg/);
    if (!match || !img.parentElement.matches('.portfolio-case-card__preview, .case-study__film--visual')) continue;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `tf-preview-motion tf-preview-motion--${match[1]}`);
    svg.setAttribute('viewBox', '0 0 1280 720');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = overlays[match[1]];
    img.after(svg);
  }
})();
