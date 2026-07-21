# Subject lanes — TEMAT ujęć per branża (nie styl)
# Parallel: agency-content = agencja | subject-lanes/* = auto, fashion, sklep, food, SaaS, foto

version: "1"
updated_at: "2026-06-24"

folders:
  automotive:
    description: Pojazd, detal, motion, interior, environment — kampania auto
    shot_roles: [hero_vehicle, detail_macro, motion_blur, interior, environment]
  fashion:
    description: Lookbook, on-model, flatlay apparel, retail interior
    shot_roles: [lookbook_hero, on_model, flatlay, detail_texture, store]
  retail:
    description: Sklep, półka, multi-product, packaging lineup
    shot_roles: [shop_grid, shelf, bundle, packaging_lineup]
  food-beverage:
    description: Produkt spożywczy, bottle, serve, ingredient
    shot_roles: [hero_product, pour, ingredient, table_scene]
  saas:
    description: UI screens, device mockup, team — bez fake stock handshake
    shot_roles: [ui_hero, device_mockup, abstract_gradient, team_candid]
  photography:
    description: Portfolio fotografa — serie, print, behind scenes
    shot_roles: [series_hero, gallery_tile, bts, print_mockup]

rules:
  - visual-researcher wybiera folder po job_type z profiles/job-types/index.yaml
  - style zawsze z references/style-dna/ — nigdy mieszaj tematu ze stylem w jednym polu
  - puste foldery OK — user wrzuca referencje tematyczne
