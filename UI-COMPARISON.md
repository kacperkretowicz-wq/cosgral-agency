# UI comparison — B / projects first

Branch: `test/ui-b-projects-first`. Common baseline: `fix/mobile-scroll-stability` (`8a1ccbf`). Alternative: `test/ui-a-cube-first`.

B keeps a small live cube in a compact masthead and brings the first real project into the first viewport. Trove Archive and Juicy Events use the existing recordings and working project-page links, with SVG arrows. All six services are presented as a simple index below the work/FAQ section. Both neutral shader transitions, the cube orbit/menu animation and the contact form remain available. The cube exits before the project content while scrolling.

The production `main` branch is unchanged. Select this branch in your hosting provider. Netlify's existing configuration publishes `designkopia/cosgral-agency` without a build command.

Local preview:

```sh
python3 -m http.server 8765 --directory designkopia/cosgral-agency
```

Validation: 16 regression tests passed; Chromium checks at 390px and 1440px passed with and without WebGL, including actual project CTA clicks, menu, no horizontal overflow, named project links and PL/EN copy. Physical phone testing remains outstanding. The contact form needs its existing hosting backend to actually send messages.
