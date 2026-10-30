# UI comparison — A / cube first

Branch: `test/ui-a-cube-first`. Common baseline: `fix/mobile-scroll-stability` (`8a1ccbf`).

A keeps a full-height animated cube hero, with the text on the left on desktop and stacked on mobile. Project/contact actions are visible immediately. Trove Archive and Juicy Events use existing project recordings, with named links and SVG arrows. Services follow the work/FAQ section. The existing cube orbit, menu pose and neutral shader remain active.

The production `main` branch is unchanged. Select this branch in your hosting provider. Netlify's existing configuration publishes `designkopia/cosgral-agency` without a build command.

Local preview:

```sh
python3 -m http.server 8765 --directory designkopia/cosgral-agency
```

Validation: 16 regression tests passed; Chromium checks at 390px and 1440px passed with and without WebGL (menu, CTA presence, no horizontal overflow, named project links, PL/EN copy). Physical phone testing remains outstanding.
