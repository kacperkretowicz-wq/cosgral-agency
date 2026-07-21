# Advanced Effects Arsenal — audyt referencji (2026-06-26)

Pięć stron wskazanych przez usera jako poziom techniczny do dorównania. Cel: skatalogować
techniki i wpiąć je w system (maszynowo: `profiles/effects-stack.yaml`; agenci: framer-effects-researcher,
motion-director, motion-implementer).

> **Uwaga o detekcji stacku:** poniższe stacki wyznaczone z analizy markdown (WebFetch gubi `<script>`),
> więc są ORIENTACYJNE. Pełna forensyka: BuiltWith/Wappalyzer lub DevTools → Network/Sources na żywej
> stronie (parhouse user trzyma lokalnie na `localhost:8080/parhouse/`). Wartość tego audytu = TECHNIKI, nie marka stacku.

## Spektrum (mapuje się na tiery w effects-stack.yaml)

```
minimal ───────── content ───────── editorial-motion ───────── experimental
trovearchive      blueprintapps      jackandai / voyeur          parhouse
(cisza=luksus)    (treść+dane)       (choreografia scrolla)      (WOW/3D/WebGL)
```

To wprost realizuje wizję pkt 10: „niektóre strony bardziej standardowe — zależnie od przekazu”.
System dobiera TIER do marki, nie wszystko zawsze na maksa.

---

## 1. voyeurverite.com — film/brand, editorial-motion
- **Stack (orient.):** Webflow + GSAP (timeline/scroll) + Lenis (smooth) + prawdopodobnie Barba (page transitions).
- **Sygnatura:** hero filmowy (wideo), sekcje filarów numerowane (001/002…), scroll-triggered reveals,
  sticky/collapse nav, płynne przejścia podstron, ziarno/kino-feel.
- **Do arsenału:** `scroll-scrubbed-video`, `text-split-reveal`, `page-transition`, `sticky-collapse-nav`, `grain-noise-overlay`, `shader-gradient-bg`.

## 2. jackandai.com — agencja AI, editorial-motion (najbliżej stacku docelowego)
- **Stack (orient.):** Next.js/React + Framer Motion + GSAP + Lenis.
- **Sygnatura:** parallax i **masked image reveal** w case’ach, **pinned multi-step „HOW WE CREATE 001–004”**,
  staggered reveal logo klientów, cursor-tracking hover na logach, scale/opacity na CTA.
- **Do arsenału:** `pinned-scroll-sequence`, `masked-image-reveal`, `parallax-layers`, `marquee-logos`, `custom-cursor`, `magnetic-button`.

## 3. parhouse.agency — studio, experimental (gold standard efektów usera)
- **Stack (orient.):** typowy agencyjny — GSAP + Lenis + WebGL/Three; ciężka choreografia. (Detekcja słaba — zweryfikować lokalnie.)
- **Sygnatura:** ruchome kształty, dystorsje obrazu (shader), sceny canvas/3D, horizontal scroll, własny kursor, page transitions.
- **Do arsenału:** `webgl-image-distortion`, `r3f-scene`, `moving-shapes-physics`, `horizontal-scroll-pin`, `shader-gradient-bg`, `scroll-scrubbed-canvas`.

## 4. blueprintapps.io — SaaS/B2B, content
- **Stack (orient.):** komponentowy (Next/React), nastawiony na treść; lekki motion.
- **Sygnatura:** karty usług, **metryki/liczniki** (5%, 94%…), tabela porównawcza, karuzela „Featured on”, wideo inline. Mało WOW — celowo.
- **Do arsenału:** `number-count-up`, `embla-carousel`, `video-inline`, `comparison-table`, `scroll-reveal-stagger`.
- **Lekcja:** dowód, że zaawansowanie ≠ maksymalny motion. Dla B2B przekaz = jasność.

## 5. trovearchive (.com; .pl odmówił połączenia) — luksus/sklep, minimal
- **Stack (orient.):** WordPress + WooCommerce; minimalistyczny, performance-first.
- **Sygnatura:** progresywne odsłanianie obrazów (blur→ostry), delikatne hover, dużo whitespace, symetria, „mindful luxury”.
- **Do arsenału:** `image-progressive-reveal`, `hover-scale-soft`, `smooth-scroll`, `scroll-reveal-stagger`.

---

## Wniosek dla systemu
1. **Stack docelowy potwierdzony:** Next/React + Framer Motion + GSAP + Lenis (+ R3F/OGL/Spline na tier experimental). Zob. `profiles/effects-stack.yaml`.
2. **Tier dobierany do przekazu** — od minimal (trove) po experimental (parhouse). To nie „zawsze maks”.
3. **`efekty.txt`** (React/Lenis/shadery) jest teraz spójny z kierunkiem — to surowiec do portów na konkretne techniki z katalogu.
4. **Następny krok techniczny:** scaffolding Next/Framer + biblioteka komponentów-efektów (1 plik na technikę z katalogu), zastępująca uboższe vanilla snippety.
