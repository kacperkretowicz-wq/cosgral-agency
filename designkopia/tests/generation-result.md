# Test generation MVP — vitamin-serum-test

## Job

- **Slug:** `vitamin-serum-test`
- **Product:** `products/vitamin-serum/product.yaml`
- **Templates:** hero-minimal + grid-editorial + cta-minimal

## Deliverables

| Output | Path |
|--------|------|
| Images (5 placeholders) | `outputs/images/vitamin-serum-test/` |
| Manifest | `outputs/images/vitamin-serum-test/manifest.json` |
| HTML page | `outputs/pages/vitamin-serum-test/index.html` |
| CSS | `outputs/pages/vitamin-serum-test/styles.css` |

## Podgląd

Otwórz w przeglądarce:

```
outputs/pages/vitamin-serum-test/index.html
```

## Style QA — vitamin-serum-test

**Status:** PASS (MVP — placeholder SVG images)

### Obrazy
- packshot: PASS — zgodny z prompt_prefix/suffix, placeholder MVP
- hero: PASS
- lifestyle: PASS
- macro: PASS
- flatlay: PASS

### Layout
- hero: PASS — split layout z hero-minimal tokens
- product-grid: PASS — grid editorial z benefits
- cta: PASS — cta-minimal sekcja + footer
- Obrazy osadzone: PASS — ścieżki względne poprawne

### Figma
- POMINIĘTO — `figma.config.yaml` fileKey pusty (faza 2)

## Następny krok produkcyjny

Uruchom `/design-generate` w chacie — agent użyje GenerateImage dla photorealistic PNG zamiast SVG placeholderów.
