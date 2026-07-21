# web/ — runtime generatora + biblioteka efektów

Next.js (App Router) + TypeScript + Tailwind + **Framer Motion + Lenis + GSAP**.
To jest realizacja stacku docelowego z `profiles/effects-stack.yaml` — koniec eksportu vanilla.

## Start

```bash
cd web
npm install
npm run dev        # http://localhost:3000  (demo "z duszą")
npm run typecheck  # kontrola typów
npm run build      # produkcyjny build
```

## Co tu jest

- `app/layout.tsx` — root: `SmoothScroll` (Lenis+GSAP) + `CustomCursor` + `GrainOverlay` + fonty
- `app/page.tsx` — DEMO landing składający efekty (hero shader+shapes+split, marquee, masked+parallax, pinned 001–004, count-up, CTA)
- `lib/effects/` — **jeden komponent na technikę** z `profiles/effects-stack.yaml`
- `lib/motion.ts` — wspólne warianty + `usePrefersReducedMotion`

## Mapowanie komponent → technika (effects-stack.yaml)

| Komponent | technique_id | tier |
|-----------|-------------|------|
| SmoothScroll | smooth-scroll | wszystkie |
| Reveal / RevealItem | scroll-reveal-stagger | wszystkie |
| MaskedReveal | masked-image-reveal | editorial_motion |
| ParallaxLayer | parallax-layers | editorial_motion |
| PinnedSequence | pinned-scroll-sequence | editorial_motion |
| Marquee | marquee-logos | content/editorial |
| MagneticButton | magnetic-button | editorial/experimental |
| CustomCursor | custom-cursor | editorial/experimental |
| SplitText | text-split-reveal | editorial/experimental |
| CountUp | number-count-up | content |
| MovingShapes | moving-shapes-physics | editorial/experimental |
| GrainOverlay | grain-noise-overlay | wszystkie |
| ShaderGradientBg | shader-gradient-bg | experimental | **WebGL/OGL** — fbm-noise mesh z tokenów |
| WebGLImageDistortion | webgl-image-distortion | experimental | **WebGL/OGL** — ripple + RGB-split na hover |
| HorizontalScrollPin | horizontal-scroll-pin | experimental | GSAP pin poziomy |

## Tier experimental (doinstaluj gdy potrzebne)
`r3f-scene`, `webgl-image-distortion`, prawdziwy `shader-gradient-bg`:
```bash
npm i three @react-three/fiber @react-three/drei ogl
```
Karuzela: `npm i embla-carousel-react`. Spline: `npm i @splinetool/react-spline`.

## Jak używa tego pipeline (most → web)
Faza `build` odpala `python scripts/build-page.py <job>`, który z artefaktów joba
(`layout-plan` + `palette-lock` + `typography-lock` + `motion-plan` + `copy-draft` + obrazy) emituje:
- `web/generated/<job>.json` — **page-spec** (tier, tokeny, sekcje),
- `web/public/g/<job>/*.png` — obrazy,
- `outputs/pages/<job>/build.json` — manifest builda.

Trasa `app/g/[job]/page.tsx` (SSG) renderuje spec przez `lib/render/GeneratedPage.tsx`:
mapuje sekcje → komponenty efektów, nakłada tokeny jako CSS vars, **bramkuje efekty wg tieru**.
Podgląd: `npm run dev` → `http://localhost:3000/g/<job>`. Schemat spec: `lib/render/types.ts`.

## Tokeny per job
Nadpisz w `:root` (globals.css) lub inline na `<html>`:
`--bg --fg --muted --accent --surface --font-heading --font-body --font-mono`.
Każdy efekt respektuje `prefers-reduced-motion`.
