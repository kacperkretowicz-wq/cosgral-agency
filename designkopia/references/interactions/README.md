# Interakcje — biblioteka snippetów + katalog 21st.dev

## Dwie warstwy

1. **`snippets/`** — gotowe vanilla HTML/CSS/JS z audytu web + ATLAS v2 (używaj w pierwszej kolejności)
2. **`manifest.yaml`** — katalog efektów z `efekty.txt` (21st.dev) — portuj do snippets gdy potrzebne

## Snippet library

```
references/interactions/snippets/
├── manifest.yaml       ← katalog 13 snippetów
├── README.md
├── keyboard-slides/    ← Readymag ArrowDown
├── pill-nav/
├── index-overlay/
├── project-index-row/
├── expandable-plus/
├── masonry-grid/
├── manifesto-display/
├── video-hero/
├── marquee-logos/
├── scroll-reveal/
├── origin-button/
├── stacked-cards/
└── scroll-snap-vertical/
```

Compose: `python scripts/compose-interactions.py outputs/pages/<job>/layout-plan.json`

## Agent

**`interaction-composer`** — obowiązkowy krok po `page-exporter` w `/design-generate`.

## Mapowanie z audytu

`profiles/reference-patterns.yaml` — willvint.com → readymag-slides + snippet_ids

## 21st.dev (efekty.txt)

Portuj do `snippets/` jako vanilla zanim użyjesz React w landingach.
