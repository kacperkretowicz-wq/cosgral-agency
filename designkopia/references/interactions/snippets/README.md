# Snippet library — vanilla HTML/CSS/JS

Źródło wzorców z audytu `references/web-audits/` + prototyp ATLAS v2.

## Użycie

1. `layout-planner` zapisuje `snippet_ids` w `layout-plan.json`
2. `page-exporter` wstawia HTML partials + klasy wymagane przez snippet
3. `interaction-composer` kopiuje/składa CSS+JS z folderów snippetów do `interactions.js` / `styles.css`

## Katalog

Pełna lista: `manifest.yaml`

## Zasady

- Snippety używają CSS variables (`--bg`, `--ink`, `--font-display`, `--mono`, `--accent`)
- Max 2–4 snippety per landing (z `interaction_set`)
- Nie duplikuj React z `efekty.txt` — portuj tutaj jako vanilla
