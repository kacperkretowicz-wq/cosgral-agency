/* Motion overlays for automation case tiles — TFO + remaining systems cards. */
(() => {
  const overlays = {
    crm: {
      viewBox: "0 0 1280 720",
      html: `<path class="tf-motion__route" d="M360 515C430 480 440 440 511 420S612 390 645 347S752 355 810 307"/>
      <circle class="tf-motion__pin tf-motion__pin--1" cx="360" cy="515" r="23"/>
      <circle class="tf-motion__pin tf-motion__pin--2" cx="511" cy="420" r="23"/>
      <circle class="tf-motion__pin tf-motion__pin--3" cx="645" cy="347" r="23"/>
      <circle class="tf-motion__pin tf-motion__pin--4" cx="810" cy="307" r="23"/>`,
    },
    code39: {
      viewBox: "0 0 1280 720",
      html: `<defs><linearGradient id="tf-code-scan"><stop stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".48" stop-color="#FFFFFF" stop-opacity=".15"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".65"/><stop offset=".52" stop-color="#FFFFFF" stop-opacity=".15"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
      <rect class="tf-motion__scanner" x="737" y="354" width="82" height="149" fill="url(#tf-code-scan)"/>`,
    },
    forecast: {
      viewBox: "0 0 1280 720",
      html: `<path class="tf-motion__forecast" d="M300 508 L354 491 L408 501 L462 480 L516 487 L570 467 L624 481 L678 458 L732 450 L786 432 L839 444"/>
      <circle class="tf-motion__forecast-point" cx="839" cy="444" r="9"/>`,
    },
    /* Trove panel — bars + alert pulse (viewBox matches shelfsync.svg 640×360) */
    shelfsync: {
      viewBox: "0 0 640 360",
      html: `<g class="tf-motion__bars" fill="rgba(255,255,255,0.55)">
        <rect class="tf-motion__bar tf-motion__bar--1" x="56" y="244" width="28" height="48" rx="4"/>
        <rect class="tf-motion__bar tf-motion__bar--2" x="96" y="228" width="28" height="64" rx="4"/>
        <rect class="tf-motion__bar tf-motion__bar--3" x="136" y="236" width="28" height="56" rx="4"/>
        <rect class="tf-motion__bar tf-motion__bar--4" x="176" y="214" width="28" height="78" rx="4"/>
        <rect class="tf-motion__bar tf-motion__bar--5" x="216" y="248" width="28" height="44" rx="4"/>
        <rect class="tf-motion__bar tf-motion__bar--6" x="256" y="232" width="28" height="60" rx="4"/>
      </g>
      <circle class="tf-motion__alert" cx="456" cy="172" r="9"/>
      <rect class="tf-motion__price-flash" x="248" y="158" width="88" height="28" rx="6" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>`,
    },
    /* CRM pipeline — card hops lead → deal → won */
    "northline-crm": {
      viewBox: "0 0 640 360",
      html: `<rect class="tf-motion__pipe-card tf-motion__pipe-card--1" x="70" y="154" width="92" height="26" rx="6" fill="rgba(255,255,255,0.2)"/>
      <rect class="tf-motion__pipe-card tf-motion__pipe-card--2" x="220" y="154" width="92" height="26" rx="6" fill="rgba(255,255,255,0.28)"/>
      <rect class="tf-motion__pipe-card tf-motion__pipe-card--3" x="370" y="154" width="92" height="26" rx="6" fill="rgba(255,255,255,0.4)"/>
      <circle class="tf-motion__pipe-dot" cx="545" cy="175" r="20" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>`,
    },
    /* Chatbot — reply bubble + typing dots */
    "atelier-bloom": {
      viewBox: "0 0 640 360",
      html: `<rect class="tf-motion__chat-bubble" x="282" y="164" width="218" height="68" rx="16" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>
      <g class="tf-motion__typing" fill="rgba(255,255,255,0.85)">
        <circle class="tf-motion__dot tf-motion__dot--1" cx="168" cy="122" r="3.5"/>
        <circle class="tf-motion__dot tf-motion__dot--2" cx="182" cy="122" r="3.5"/>
        <circle class="tf-motion__dot tf-motion__dot--3" cx="196" cy="122" r="3.5"/>
      </g>
      <rect class="tf-motion__ai-pill" x="370" y="252" width="130" height="28" rx="14" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.5"/>`,
    },
    /* Workflow — step glow + flow dashes */
    "parcel-co": {
      viewBox: "0 0 640 360",
      html: `<circle class="tf-motion__step tf-motion__step--1" cx="116" cy="148" r="26" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
      <circle class="tf-motion__step tf-motion__step--2" cx="280" cy="148" r="26" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
      <circle class="tf-motion__step tf-motion__step--3" cx="444" cy="148" r="26" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
      <path class="tf-motion__flow" d="M184 170H212M348 170H376M512 170H532" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="12 10"/>
      <circle class="tf-motion__done" cx="556" cy="170" r="26" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`,
    },
  };

  const srcMatchers = [
    { re: /telforceone-(crm|code39|forecast)\.svg/, keyFrom: (m) => m[1] },
    { re: /(shelfsync|northline-crm|atelier-bloom|parcel-co)\.svg/, keyFrom: (m) => m[1] },
  ];

  for (const img of document.querySelectorAll(".portfolio-case-card__preview img, .case-study__film--visual img")) {
    const src = img.getAttribute("src") || "";
    let key = null;
    for (const matcher of srcMatchers) {
      const match = src.match(matcher.re);
      if (match) {
        key = matcher.keyFrom(match);
        break;
      }
    }
    if (!key || !overlays[key]) continue;
    const parent = img.parentElement;
    if (!parent || !parent.matches(".portfolio-case-card__preview, .case-study__film--visual")) continue;
    if (parent.querySelector(".tf-preview-motion")) continue;

    parent.classList.add("portfolio-case-card__preview--animated");
    const spec = overlays[key];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `tf-preview-motion tf-preview-motion--${key}`);
    svg.setAttribute("viewBox", spec.viewBox);
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = spec.html;
    img.after(svg);
  }
})();
