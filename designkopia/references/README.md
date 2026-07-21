# Referencje — struktura po reorganizacji 2026-06-24

## Trzy systemy (nie mieszaj)

| Folder | Rola | Kto czyta |
|--------|------|-----------|
| `style-dna/` | **JAK** — światło, paleta, kadr, grade | image-generator (style_ref) |
| `agency-content/` | **CO** — temat portfolio agencji | image-generator (subject_ref) przy `agency_portfolio` |
| `moodboards-ui/` | **UI** — layout, typografia galerii | layout-planner, concept-ideation |

## Produkt / e-commerce

Dla `job_type: product_brand` — subject z `products/<slug>/product.yaml` + product lock.  
Style z `style-dna/`. **Nie** używaj `agency-content/` jako tematu.

## Agencja marketingowa

Dla `job_type: agency_portfolio` — subject z `agency-content/` + `profiles/job-types/agency-portfolio.yaml` shot_brief.  
Style z `style-dna/`. **Zakaz** folderów beauty/skincare jako tematu (gate: `check-agency-shots.py`).

## Legacy

- `references/inspiration/manifest.yaml` — **deprecated**, mapowanie historyczne
- `references/_archive/duplicates/` — duplikaty fashion-editorial
- `references/_migration-map.yaml` — log migracji; `python scripts/reorganize-references.py`

## Dodawanie nowych zdjęć

1. **Styl** → `style-dna/<lighting|palette|composition|grade>/` + wpis w `style-dna/manifest.yaml` z `style_dimensions`
2. **Praca agencji** → `agency-content/<folder>/` + wpis z `subject_tags` i `shot_roles`
3. **UI inspiracja** → `moodboards-ui/` tylko

Nigdy nie wrzucaj wszystkiego do jednego folderu.
