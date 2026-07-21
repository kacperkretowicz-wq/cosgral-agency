# Schema: style-profile.yaml

Plik: `profiles/style-profile.yaml`

## Wymagane pola

| Pole | Typ | Opis |
|------|-----|------|
| `version` | string | Wersja schematu, np. `"1"` |
| `updated_at` | string | ISO date, np. `2026-06-22` |
| `reference_count` | number | Liczba przeanalizowanych obrazów |
| `lighting` | string | soft_studio \| natural_window \| hard_editorial \| mixed |
| `background` | string | Opis dominujących teł |
| `camera` | object | `angle`, `focal_feel`, `depth_of_field` |
| `color_grade` | object | `temperature`, `contrast`, `saturation` |
| `realism_level` | string | hyperreal \| natural \| stylized |
| `props_and_composition` | string | Typowe rekwizyty i układ kadru |
| `negative_prompts` | string[] | Czego unikać w generowaniu |
| `prompt_prefix` | string | Stały prefix każdego prompta obrazu |
| `prompt_suffix` | string | Stały suffix każdego prompta obrazu |

## Opcjonalne pola

| Pole | Typ | Opis |
|------|-----|------|
| `notes` | string | Outliers, uwagi analityka |
| `shot_types` | object | Nadpisania per typ ujęcia (packshot, hero, ...) |

## Przykład minimalny

```yaml
version: "1"
updated_at: "2026-06-22"
reference_count: 0
lighting: soft_studio
background: seamless off-white with subtle shadow
camera:
  angle: "45-degree three-quarter view"
  focal_feel: medium format commercial
  depth_of_field: shallow on product, soft background falloff
color_grade:
  temperature: warm neutral
  contrast: medium-high
  saturation: natural muted
realism_level: natural
props_and_composition: minimal props, generous negative space, product centered
negative_prompts:
  - harsh flash
  - oversaturated colors
  - cluttered background
  - watermark
  - text overlay
prompt_prefix: "Professional product photography,"
prompt_suffix: "commercial quality, no text, no watermark, photorealistic"
notes: "Uzupełnij przez /design-onboard po wrzuceniu referencji do references/style/"
```
