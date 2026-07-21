# Design + Photoshoot Agent System

Wieloagentowy system w Cursorze do generowania zdjęć produktowych w Twoim stylu oraz layoutów stron z zapamiętanych templateów.

## Szybki start

### Templatey layoutu (już dodane)

| ID | Template | Preview |
|----|----------|---------|
| `kirk` | Kirk — Colorful Portfolio | [kirk-sinner.framer.website](https://kirk-sinner.framer.website/) |
| `portfolite` | Portfolite — Dark Brand | [portfolite.framer.website](https://portfolite.framer.website/) |
| `taylor` | Taylor — Editorial Portfolio | [taylordesigner.framer.website](https://taylordesigner.framer.website/) |
| `salient` | Salient — Studio Agency | [salient.framer.website](https://salient.framer.website/) |

Profile w `profiles/templates/`. Mix w prompcie: *„hero z taylor + grid z kirk + FAQ z salient”*.

### 1. Onboarding (raz, gdy masz referencje)

1. Wrzuć zdjęcia stylu photoshoot do `references/style/` (8–15 szt.)
2. Opcjonalnie dodaj własne screeny layoutów do `references/templates/`
3. W chacie napisz:

```
/design-onboard
```

Agent przeanalizuje referencje i zapisze profile w `profiles/`.

### 2. Przygotuj produkt

Utwórz folder np. `products/vitamin-serum/` z plikiem `product.yaml`:

```yaml
name: Vitamin C Serum
description: Lightweight brightening serum, glass dropper bottle, amber liquid
color: amber glass with white label
material: glass, matte paper label
packaging: 30ml dropper bottle
price: "49 USD"
headline: "Radiance in every drop"
cta: "Shop now"
```

Opcjonalnie dodaj zdjęcie referencyjne produktu (`product.jpg`).

### 3. Generacja

```
/design-generate Stwórz stronę dla vitamin-serum. Hero z hero-minimal + grid z grid-editorial + cta-minimal. Zdjęcia: packshot, hero, lifestyle, macro.
```

Wyniki:
- `outputs/images/<job-slug>/` — zdjęcia produktowe
- `outputs/pages/<job-slug>/` — `index.html` + `styles.css`

Otwórz `index.html` w przeglądarce, żeby zobaczyć podgląd.

## Figma (faza 2)

1. Utwórz plik w Figma „Design Output”
2. Skopiuj `fileKey` z URL do `figma.config.yaml`
3. Przy generacji `layout-composer` zbuduje frame w Figma

## Silnik (egzekwowany przepływ)

Przepływ jest egzekwowany przez sędziego — faza nie domyka się bez artefaktów i zaliczonych bramek:

```bash
python scripts/run-pipeline.py init <job> --prompt "<opis marki>"
python scripts/run-pipeline.py next <job>     # co dalej (agent + artefakt)
python scripts/run-pipeline.py check <job>    # waliduj fazę → advance / FAIL+retry
python scripts/run-pipeline.py status <job>   # tablica faz
python scripts/run-pipeline.py audit-all      # pokrycie bramkami wszystkich jobów
```

Kanon przepływu: `profiles/pipeline.yaml`. Spójność plików/mapy: `python scripts/check-agents.py`.

## Podagenci

Pełna mapa-prawda (40 plików, status active/optional/alias, pofazowo): **`profiles/AGENT-MAP.md`**.
Kanon przepływu (kto w której fazie): `profiles/pipeline.yaml`. Arsenał efektów: `profiles/effects-stack.yaml`.

Kluczowi: `design-orchestrator` (koordynacja), faza research (web/visual/typography/layout-screenshot/style-sense),
`concept-ideation` (3 koncepcje), `template-mixer`+`layout-assembler` (layout), `media-producer`+`shot-planner`+`image-generator`
(zdjęcia/atmosfera), `motion-director`+`motion-implementer` (efekty), `style-qa`+`concept-guardian`+`variability-guardian`+`coherence-reviewer` (QA).

## Strony referencyjne (audyt)

- `references/web-audits/editorial-sites-2026-06-23.md` — 13 stron Readymag + trovearchive
- `profiles/reference-patterns.yaml` — URL → archetyp + snippety
- `references/interactions/snippets/` — biblioteka vanilla (keyboard-slides, pill-nav, masonry…)

Compose snippety: `python scripts/compose-interactions.py outputs/pages/<job>/layout-plan.json`

## Archetypy layoutu (8)

`lumera-commercial` · `readymag-slides` · `studio-manifesto` · `masonry-portfolio` · `product-editorial` · `portfolio-index` · `product-serial` · `case-study-long`

Portfolio/agencja: dodaj `products/<slug>/projects.yaml` (schema: `profiles/SCHEMA-projects.md`).

## Skills

- `/design-onboard` — skill `design-onboard`
- `/design-generate` — skill `design-generate`

## Walidacja

```bash
python scripts/validate-profiles.py
```

## Profile

- Schemat stylu: [profiles/SCHEMA-style-profile.md](profiles/SCHEMA-style-profile.md)
- Schemat templateów: [profiles/SCHEMA-template.md](profiles/SCHEMA-template.md)

Profile możesz edytować ręcznie przed generacją.
