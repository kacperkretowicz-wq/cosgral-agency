# Schema: profiles/templates/*.yaml

Jeden plik YAML per template screen.

## Wymagane pola

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | Slug, np. `hero-minimal` |
| `name` | string | Czytelna nazwa |
| `source_image` | string | Ścieżka względna, np. `references/templates/hero.png` |
| `tags` | string[] | Min. 1: hero, product-grid, lifestyle, cta, footer, nav, features |
| `sections` | array | Lista sekcji od góry do dołu |
| `typography` | object | font families, sizes |
| `spacing` | object | padding, grid |
| `color_tokens` | object | background, accent, text, muted |
| `mixable_with` | string[] | Id innych templateów do łączenia sekcji |

## Struktura `sections[]`

```yaml
- id: hero
  type: hero
  layout: split  # split | centered | full-bleed
  columns: 2
  notes: "Duży nagłówek po lewej, produkt po prawej"
```

## Struktura `typography`

```yaml
typography:
  heading_font: "Playfair Display"
  body_font: "Inter"
  heading_sizes:
    h1: "3rem"
    h2: "2rem"
  body_size: "1rem"
  weights:
    heading: 600
    body: 400
```

## Struktura `color_tokens`

```yaml
color_tokens:
  background: "#FAFAF8"
  accent: "#2C2C2C"
  text: "#1A1A1A"
  muted: "#6B6B6B"
```

## Struktura `spacing`

```yaml
spacing:
  page_max_width: "1200px"
  section_padding_y: "80px"
  section_padding_x: "24px"
  grid_columns: 12
  gap: "24px"
```
