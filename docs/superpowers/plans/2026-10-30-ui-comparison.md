# COSGRAL UI comparison implementation plan

Goal: provide two test branches matching the approved A/B concept board for comparison through GitHub.

Architecture: both branches share the current scroll, copy, neutral palette and WebGL fixes. Each adds a separate variant stylesheet and explicit hero pose settings, reuses existing project videos and keeps the existing animation infrastructure. Use the existing isolated checkout; no worktrees.

- [ ] Commit the shared fixes on fix/mobile-scroll-stability.
- [ ] A, test/ui-a-cube-first: large cube alongside hero text on desktop, stacked mobile hero, visible project/contact actions, named project cards and SVG arrow links. Put services after the work/FAQ light section; keep both neutral animated transitions.
- [ ] B, test/ui-b-projects-first: compact masthead, small animated cube, immediate named projects, a simple six-service index and the existing FAQ/process/contact sections.
- [ ] Test both variants at 390 and 1440px, with and without WebGL. Check overflow, menu, project links, PL/EN copy, media readiness and cube rendering. Run the existing regression suite on each branch.
- [ ] Commit each variant from the common base and push all three branches. Do not deploy production or merge branches.

The concept board's project artwork was illustrative. Implementation uses the actual existing Trove Archive and Juicy Events recordings. No invented metrics or client outcomes. Preserve existing contact details and form behavior.
