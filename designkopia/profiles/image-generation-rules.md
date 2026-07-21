# Reguły generacji obrazów i layoutu — obowiązkowe

Źródło prawdy dla `image-generator`, `page-exporter`, `interaction-composer`.
Uzupełnienie: `profiles/mockup-photo-inspiration-rules.yaml`.

## 1. Ciemne tło strony + ciemne zdjęcie

Gdy `#background` strony ≈ tło na zdjęciu, **nie wstawiaj „karty” z ramką** — zdjęcie musi się zlewać:
- full-bleed hero + `mask-image` / gradient fade do `--bg`
- bez `border-radius` na hero jeśli tło jest to samo
- opcjonalnie `box-shadow: none`, overlay `linear-gradient(to top, var(--bg), transparent)`

## 2. Footer / branding

- **NIGDY** „Template: Luzia / Spector / …” w stopce ani losowo na stronie
- Domyślnie: **`cosgral.design`** (link lub tekst)
- Szablon Framer tylko w `manifest.json` / YAML profilu — nie w UI

## 3. Kadrowanie w HTML (`object-position`)

Każdy obraz w `manifest.json` joba:
```json
{ "file": "...", "object_position": "center center", "focal_point": "center" }
```

Zasady:
- `object-fit: cover` **zawsze** z explicit `object-position` per asset
- Portret / sylwetka: sprawdź czy twarz nie jest ucięta — `center top` lub `55% center`
- Grid: unikaj `grid-row: span 2` + `height: 100%` bez testu kadru — często ucina lewą krawędź
- Preferuj równy grid lub osobne cropy w `cropped/`

## 4. Zakazane typy zdjęć (sztuczne / CGI)

**Nie generuj:**
- suknia / gown na granatowym tle, „liquid silk on mannequin” — wygląda jak fake CGI
- jewelry ring macro na piasku (st03-09)
- chess on green velvet (st03-04)
- neon green liquid macro (st03-10)

**OK:** runway z modelem, B&W editorial fashion, macro **tkaniny**, flatlay ubrań, coat na modelu z rim light

## 5. Typografia na stronie

- Jedna rodzina z template YAML na **całej** stronie: `body`, `p`, `figcaption`, `dt`, `dd`, `li`, `button`, `span` — wszystko `font-family: var(--font)`
- Nie zostawiaj domyślnego system-ui pod opisami przy custom heading font

## 6. Spójność kolorystyczna **per landing** (reguła #8)

Przed generacją obrazów wybierz **jedną paletę joba** w `product.yaml`:
```yaml
job_palette: warm_organic   # lub bw_editorial, bold_monochrome, dark_runway_red
```

Wszystkie 4–6 zdjęć na **jednej** stronie muszą:
- dzielić ten sam `palette_family` LUB świadomy kontrast (np. cała strona B&W + 1 accent)
- **Nie** mieszaj sage + red studio + navy gown na jednym landingu bez powodu

### 6b. Wyjątek markowy: LUMÉRA (`products/lumera-brand.yaml`)

- `job_palette: bold_monochrome` — dominanta czerwień/biel/czerń
- **Nie używaj** `04-deep-luxury-hero` / `deep_luxury` na jobach `lumera-*` — to inna estetyka (navy/gold), user odrzucił jako nie-LUMÉRA
- Night Oil: ten sam studio language co Vitamin C (`inspiration_ref: 01-bold-red-packshot`), butelka black/charcoal + white label
- `03-warm-organic` / asset-03: max 1 sekcja akcentu, nie cała kampania

## 7. Efekt text cycle (#5)

- **Max 1× na projekt** — user: zbyt często używany
- Jeśli używasz: `min-width` = najdłuższe słowo w ch (np. `9ch`), `display: inline-block`, `text-align: left`
- Alternatywa: statyczny nagłówek + letter-hover na CTA

## 8. Różnorodność między projektami

- W obrębie **jednego** landingu: spójnie
- Między landingami: rotuj `palette_family` z approved
- Można samodzielnie dodawać do `approved/` po feedbacku — user może też dosłać referencje kolorów

## 8b. Mockupy jako photo grade (obowiązkowe)

Przed anchor:
```bash
python scripts/pick-photo-grade.py --job <slug> --json
```

Zasady:
- `photo_grade_ref` z layout mockupu zapisuj do `outputs/pages/<slug>/photo-grade-ref.json`
- Anchor prompt: `reference_image_paths` z `photo_grade_ref`
- Nie kopiuj subject z mockupu; tylko światło/paleta/texture
- Po batchu:
```bash
python scripts/check-image-variability.py <slug>
```

## Checklist przed oddaniem strony

- [ ] Footer = cosgral.design
- [ ] `object-position` na każdym `<img>` w gridzie
- [ ] Jedna paleta na job
- [ ] Brak sztucznych gown/CGI packshotów
- [ ] Font na wszystkich elementach tekstowych
- [ ] Ciemny hero zblendowany jeśli dark theme
- [ ] Text cycle wyłączony lub max 1 z poprawnym min-width
- [ ] **Min. 6–8 sekcji** z profilu template (hero, portfolio, services, process, FAQ, CTA…) — strona musi mieć ~4–6 scrolli
- [ ] Przy batchu >2 landings: pełna głębokość albo mniej stron na raz
- [ ] Unikać inscenizowanych postaci męskich „AI stock”; preferuj dłonie, plecy, sylwetki bez twarzy

## 9. Product lock — ten sam produkt we wszystkich kadrach (reguła krytyczna)

**Problem:** niezależne GenerateImage = różne produkty w jednym jobie.

**Proces (obowiązkowy):**
1. W `product.yaml` zapisz `product_visual_spec` (kształt, materiał, kolory, końcówki — szczegółowo).
2. Wygeneruj **tylko** `00-anchor-packshot.png` → zapisz w manifeście `status: pending_approval`.
3. **Nie generuj** lifestyle/macro/flatlay dopóki anchor nie jest `approved` (user lub style-qa).
4. Kolejne ujęcia: ten sam `product_visual_spec` w prompcie + `reference_image_paths: [anchor]` jeśli dostępne.
5. W `manifest.json` każdy plik: `derived_from_anchor: true`, `inspiration_ref`, `shot_rationale`.

**FAIL style-qa** jeśli packshoty wyglądają jak różne SKU.

## 10. Style vs subject — dwa źródła (2026-06-24)

**Nie używaj** `references/inspiration/` (deprecated). Czytaj:

| Źródło | Rola | Pole w manifeście |
|--------|------|-------------------|
| `references/style-dna/` | JAK — światło, paleta, kadr, grade | `style_ref`, `style_dimensions` |
| `references/agency-content/` | CO — temat portfolio agencji | `subject_ref`, `subject_hint` |
| `references/moodboards-ui/` | UI/layout | tylko layout-planner |
| `products/<slug>/product.yaml` | CO — produkt e-commerce | `product_visual_spec` |

**Prompt musi rozdzielać:**
```
SUBJECT (generate): {subject_hint from product.yaml or agency-content}
STYLE ONLY (do not copy subjects from): {style_dimensions from style-dna}
```

**FAIL** `check-agency-shots.py` jeśli `job_type: agency_portfolio` i subject to skincare macro / beauty flatlay.

Każdy obraz w manifeście:
```json
{
  "subject_ref": "references/agency-content/campaigns/bw-case-study-grid-wall.png",
  "style_ref": "references/style-dna/lighting/cinematic-red-gel-portrait.png",
  "style_dimensions": ["cinematic_gel", "bold_red"],
  "subject_hint": "Case study grid wall for marketing agency portfolio",
  "shot_rationale": "Subject from agency work; lighting from style-dna only"
}
```

`inspiration_ref` — tylko kompatybilność wsteczna; nowe joby: `subject_ref` + `style_ref`.

## 10b. Domyślne reference paths — zakaz

Nie wolno używać jako domyślnego anchor reference:
- `profiles/approved/01-bold-red-packshot.png`
- `profiles/approved/02-bw-geometric-packshot.png`

Wyjątki:
- user explicit prosi o red/BW mood
- job `lumera-*` (brand lock)
- brak mockup photo grade i user akceptuje fallback

## 11. Agency portfolio (job_type: agency_portfolio)

- Wczytaj `profiles/job-types/agency-portfolio.yaml` + `references/agency-content/manifest.yaml`
- **Brak product lock** — anchor = `hero_campaign`, nie packshot SKU
- Wymagane role: hero_campaign, case_study_grid, branding_proof, campaign_spotlight ×2, studio_culture
- Tematy: kampanie klientów, branding, studio, case study — **nie** skincare macro jako hero
- Style z `style-dna/` — możesz użyć grade/macro jako **oświetlenie**, nie jako temat twarzy/skóry
- Min. 2 różne branże / typy kampanii w jednym jobie

## 12. Zakaz tekstu i etykiet na zdjęciach (reguła krytyczna)

**Nie generuj i nie dodawaj w HTML na zdjęciach:**
- napisów typu PACKSHOT, STILL LIFE, HERO, watermark
- białych tagów / caption overlay na obrazie
- losowego tekstu na tle, papierze, rekwizytach

**Prompt (dodawaj zawsze):** `no text, no labels, no watermarks, no captions anywhere in frame`

**HTML:** nie używaj `figcaption` overlay na zdjęciach w galerii — opisy tylko w `alt` lub copy obok.

**FAIL style-qa** jeśli obraz lub UI ma widoczne etykiety shot type na zdjęciu.

## 13. Różnorodność ujęć w jednym jobie

Ten sam produkt, **inny typ kadru** per plik:
- max **1×** packshot hero (anchor)
- nie powtarzaj poziomego packshotu na washi w galerii ze zmienionymi rekwizytami
- rotuj: macro / portrait / hands / flatlay / lip wearing / founder

**FAIL concept-guardian** jeśli ≥2 obrazy mają tę samą kompozycję (ten sam kąt produktu + ten sam typ tła).

## 14. Brand atmosphere shots (tła, kafelki, sceny)

Oprócz product lock (anchor + derived) każdy job `product_brand` ma **min. 2 kadry atmosferyczne** — jak na mockupach: człowiek, tło, rekwizyty, mood bez packshotu.

**Plan:** `python scripts/plan-brand-shots.py --job <slug> --write-shot-plan`

| Rola | Produkt w kadrze | Użycie na stronie |
|------|------------------|-------------------|
| `section_background` | nie | hero bg, full-bleed band |
| `brand_tile` | opcjonalnie mały | gallery grid, masonry |
| `lifestyle_scene` | opcjonalnie | story split, ritual |
| `texture_mood` | nie | accent band, spec texture |
| `editorial_context` | opcjonalnie | campaign still, feature tile |

**Zasady:**
- `shot_type: atmosphere`, `product_lock: false`, `derived_from_anchor: false` (chyba że `product_presence: optional_hero` i po gate)
- Styl z `photo_grade_ref` (mockup) + `style_dna` — **nie** kopiuj osoby/sceny z mockupu 1:1
- Atmosphere **nie zastępuje** anchor packshotu w hero produktowym
- W HTML: `section_background` → `background-image` + overlay; `brand_tile` → `<img>` w gridzie z `object-position` z manifestu

**Gate:** `python scripts/check-brand-shots.py <slug>` — FAIL bez min. 2 atmosphere + anchor.
