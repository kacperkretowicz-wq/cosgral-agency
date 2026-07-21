# Rejestr inspiracji ze stron — crawler buduje ten folder stopniowo

## Jak używać

```bash
# Pierwszy crawl (np. Framer templates, agencja, showcase)
python scripts/crawl-inspiration-site.py https://example.com/templates/ --max-pages 40

# Dokładaj kolejne podstrony bez kasowania
python scripts/crawl-inspiration-site.py https://example.com/new-section --incremental

# Powiąż z jobem
python scripts/crawl-inspiration-site.py https://willvint.com/ --job forma-agency --incremental
```

## Struktura

```
inspiration-registry/
  willvint.com/
    registry.yaml          # indeks + categories_index
    pages/
      <hash>.json          # light audit per URL
```

## Kategorie (auto)

| category | Znaczenie |
|----------|-----------|
| template_showcase | Szablony, themes, UI kits |
| portfolio_example | Work, case study, project |
| interaction_demo | Demo motion / playground |
| product_page | Shop, product, collection |
| site_home | Homepage |
| landing_marketing | Campaign, pricing |
| about_team | About, studio, contact |
| blog_editorial | Blog, journal |

## Agenci

- **inspiration-harvester** — uruchamia crawler, kuruje registry
- **framer-effects-researcher** — filtruje `platform: framer`
- **style-sense-agent** — mood z zebranych stron + style-dna

Nie kopiuj HTML ani screenshotów 1:1 — tylko URL + metadane do research.
