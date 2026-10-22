# Editorial Glass — motion refinement

Base: `test/editorial-glass`, commit `a0963b008329009c65f10384b26ef06bc7bea26d` (12 October 2026).

## References

- [Superpower scroll transition](https://pl.pinterest.com/pin/968344357401975808/): a soft curved boundary, deep red/orange/yellow color falloff, and reversible movement between paper and ink.
- [Features Section Scroll Animation](https://pl.pinterest.com/pin/968344357401976084/): controlled entrances, layered graphic movement, and a clear hierarchy of typography and artwork.
- [Saved Cosgral inspiration board](https://pl.pinterest.com/kacper6207/cosgral-website-inspo/): reviewed seven pins in the existing Pinterest session.

## Changes

- Replace the two hard circular wipes with a responsive thermal horizon drawn from scroll progress. Its fragment shader is original implementation code; the reference video is not shipped as an asset.
- Keep the six service illustrations and their authored angles. Independent CSS translate/rotate animates their details without overwriting the original transforms.
- Scrub card entrances in both directions, stagger service columns, add a small portfolio-media parallax, and give artwork a damped pointer response.
- Measure gallery layout after FLIP finishes. Refreshing during the animation previously captured a temporary scale and could leave a mobile card wider than the viewport.
- Follow the actual horizon separately for the navigation and chat contrast. The chat root is outside the body, so its tone class belongs on the document root.
- Fit SEO and automation artwork text on mobile and keep the gyroscope gate in the hero/menu instead of over the page content.

## Rendering and fallback

The horizon has no idle render loop. Resolution is capped at DPR 1.25 on desktop and 1.5 on small screens. Reduced motion and WebGL failures show readable static sections. Context restoration recreates the shader, and a change to the reduced-motion preference stops the new animations without reloading.

## Validation

Local Chrome browser checks: 1440×1000 desktop and 390×844 mobile emulation; exact pixel equality after forward/reverse scrolling; rapid gallery layout changes; horizontal overflow; FAQ; PL/EN; pointer return; chat contrast; reduced motion; missing horizon WebGL; context loss/restoration; live preference change. No JavaScript errors or failed local asset responses occurred. The stationary horizon drew zero additional frames during the measured one-second interval.

Mobile checks used browser emulation, not a physical phone. These source changes do not establish a production deployment.
