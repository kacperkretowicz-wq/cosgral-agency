# Schema: products/<slug>/projects.yaml

Wymagane dla archetypów: `readymag-slides`, `studio-manifesto`, `masonry-portfolio`, `product-serial`.

## Pola

```yaml
version: "1"
brand: string
slug: string

projects:
  - id: string
    title: string
    client: string
    year: number
    disciplines: [string]   # Branding, Video, Fashion…
    category: string        # opcjonalnie: Fashion / Wellness
    href: string
    thumbnail: string       # ścieżka względem outputs/pages/<job>/
    object_position: string
    featured: boolean       # opcjonalnie

categories: [string]        # opcjonalnie — filtry jak mariano

expandables:                # dave-green style
  - id: string
    label: "Info +"
    items: [string]

media:
  hero_video:
    src: string             # mp4 path lub puste → poster only
    poster: string
    role: hero_loop
```

## Kto czyta

- `layout-planner` — czy projects.yaml istnieje dla portfolio jobs
- `page-exporter` — renderuje `project-index-row.html` partial
- `interaction-composer` — expandable-plus z `expandables`

## Przykład

`products/atlas-creative/projects.yaml`
