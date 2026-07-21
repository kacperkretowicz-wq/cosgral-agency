# Ekstrakcja efektów z szablonów Framer

## Czy da się wyciągnąć efekty z linku?

**Tak — częściowo.** Z opublikowanego demo (`*.framer.website`) da się zreverse-engineerować **zachowanie** (scroll reveal, underline, sticky, liczniki, fade-in). Nie dostajemy pliku projektu Framera ani dokładnych parametrów z edytora — tylko to, co widać w runtime.

## Jak sprawdzamy

1. **URL demo** z `profiles/templates/<id>.yaml` → pole `preview_url` (np. `https://salient.framer.website/`)
2. **Puppeteer** — scroll, hover, obserwacja zmian DOM/CSS
3. **Inspekcja runtime:**
   - `[data-framer-name]` — nazwy warstw z edytora (np. `Invisible Line 1`, `Helper Nav BG (for Sticky Scroll Effect)`)
   - `[data-framer-appear-id]` — animacje wejścia przy scrollu (viewport)
   - klasy typu `reveal-root` — scroll-linked reveal
   - skrypt `framerusercontent.com/.../script_main.*.mjs` — bundlowany Framer Motion

## Co zwykle znajdujemy (Salient jako przykład)

| Efekt w UI | Sygnał w DOM | Port do nas |
|------------|--------------|-------------|
| Link underline pojawia się | `Invisible Line` + `Black Line` pod tekstem | CSS `scaleX` na `::after` |
| Sekcja wjeżdża przy scrollu | `data-framer-appear-id`, `reveal-root` | IntersectionObserver + `.reveal` |
| Sticky nav / scroll | `Helper Nav BG (for Sticky Scroll Effect)` | `position: sticky` + backdrop |
| Liczniki statystyk | elementy z cyframi w About | `countUp` on scroll |
| Hero timestamp | `#time` / live clock | prosty JS `Date` |
| Logo marquee | poziomy ticker | CSS `@keyframes marquee` |

## Workflow dodawania do zbioru

1. User podaje link marketplace **lub** `preview_url` demo
2. `template-analyst` / `interaction-composer` — audyt efektów (lista + priorytet)
3. Wpis do `references/interactions/manifest.yaml` jako `source: framer`, `template_id: salient`
4. Implementacja vanilla w `outputs/pages/<job>/interactions.js` (jak 21st.dev)
5. **Bez** obrazów z demo Framera — tylko własne assety

## Ograniczenia

- Marketplace page ≠ live demo — zawsze używaj `preview_url` jeśli jest
- Niektóre efekty są w WebGL/Lottie — trudniejsze, czasem pomijamy
- Parametry easing/duration — przybliżone wizualnie, nie 1:1 z Framera
- User musi podać **konkretny link** do szablonu, który go interesuje

## Następny krok

Wrzuć link (marketplace lub demo) + napisz które efekty Ci się podobają — zrobię audyt i dodam do `manifest.yaml`.
