# Notatki kalibracyjne — generacja obrazów

## SOLACE landing (2026-06-22) — feedback użytkownika

### Problemy do unikania
- **Nazwy na opakowaniu:** GenerateImage wymyśla losowy tekst na label — nie trzyma `product.yaml` name. Przed generacją produktów: w prompcie explicite `blank minimal label no readable text` LUB generuj opakowanie bez tekstu i dodaj label w post-process (Figma/HTML).
- **Revive + krem duo (solace-03):** średnie — unikaj mieszania dwóch produktów w jednym kadrze na start; osobne ujęcia per SKU.
- **Brak art assetów:** przy każdym jobie min. pack produktowy PLUS artystyczne assety strony:
  - portret editorial (realistyczna osoba)
  - macro detal (krople, tekstura skóry, szkło)
  - krajobraz / abstract tło (nie produkt)
  - still life / botanical (opcjonalnie)

### Checklist art assets (obowiązkowy przy /design-generate landing)
- [ ] min. 1 portret lub sylwetka w stylu palety joba
- [ ] min. 1 macro (krople, texture close-up)
- [ ] min. 1 tło abstract / krajobraz / texture (bez produktu)
- [ ] produkty: osobno per SKU, bez losowych napisów na opakowaniu

### style-test-02 (2026-06-22) — zatwierdzone wszystkie 8
- User: bardzo podoba się różnorodność tematów — zapamiętać wszystkie w `profiles/approved/st02-*`
- Tematy OK: owoc, ceramika, portret, wino, macro szkło, botanika, perfumy, knit/dłonie
- **Nie ograniczać generacji do skincare** — różnorodność = feature, nie bug

### style-test-03 (2026-06-22) — 7/10 zatwierdzone
- **Super (7):** grejpfrut, aparat, chleb flatlay, portret orange, wazon blue, granat B&W, herbata/dłonie
- **Najmniej (nie do approved):** #04 pionek szachowy zielony, #09 pierścionek macro, #10 zielony liquid macro
- deep_luxury nadal OK (wino navy z st02-04) — unikać chess/jewelry/neon-green liquid

### SOLACE — co zapamiętać
- Paleta sage/terracotta OK jako kierunek, ale produkt shots wymagają iteracji.
- Nie zapisuj do `approved/` bez explicite akceptacji użytkownika (LUMÉRA approved, SOLACE nie).
- **Hero parallax (#16):** odrzucone — nie stosować na landingach (zdjęcie „skacze” przy scrollu).
- **Kadrowanie w layoutcie:** portrety i produkty często źle wycentrowane w `<img object-fit: cover>` — twarz po prawej zamiast w centrum. Przy eksporcie HTML: `object-position` per asset LUB osobne cropy w `outputs/images/<job>/cropped/`.

### Interakcje — czego unikać
- Hero parallax / scroll-jump na głównym zdjęciu
- Efekty z obrazami z neta (unsplash, pravatar) — tylko własne assety

### batch-five (2026-06-23) — feedback użytkownika

**Obrazy — słabsze / odrzucić przy regeneracji:**
- lavender-sky: luneta + kompas/mapa (04, 05) — średnie
- matcha-field: macro matchy (05) + las bambusowy (04) — mało jakościowe
- Postacie męskie wyglądają na inscenizowane AI — unikać „panów” w scenach rzemiosła

**Obrazy — OK:** ceramika (coral-clay), miodnia (amber-mead), większość azulejo

**Strony za krótkie (1–2 scrolla):**
- Przyczyna: batch 5× naraz = minimalny HTML (1–3 bloki), **nie** pełne sekcje z template YAML
- LUMÉRA/SOLACE: mix 4 templateów, 7–8 sekcji, FAQ, CTA, galeria, produkty
- batch-five: np. coral-clay = jedno okno macOS; fabrica bez pricing/team/FAQ z profilu
- **Reguła na przyszłość:** min. 6–8 sekcji per landing (jak w `profiles/templates/*.yaml`), nawet przy wielu jobach — max 2 landings równolegle jeśli pełna głębokość

**Ranking usera:** LUMÉRA + SOLACE najlepsze; batch-five najsłabsze jakościowo layoutu (niekoniecznie zdjęć)

### Kadrowanie i placement (layout)
- Przy każdym obrazie w `manifest.json` joba dodawaj: `focal_point` + `object_position` CSS
- Portrety: sprawdź czy twarz jest w centrum kadru przed wstawieniem do grida
- Produkty w kartach: preferuj packshoty z produktem na środku, nie na krawędzi
- Unikaj `grid-row: span 2` bez testu — ucina lewą/prawą krawędź (patrz elara works)

## Regresja procesu (2026-06-23) — feedback usera

### Co działało (LUMÉRA, SOLACE)
- Mix **3–4 templateów** z YAML, **7–8 sekcji**
- Numerowane bloki `(01) COLLECTION`
- **Inter + JetBrains Mono** — nie „beauty serif AI”
- Asymetryczny hero, product cards, FAQ

### Co poszło nie tak (batch-five, ATLAS, Lippier)
- **Jeden schemat:** hero → manifesto → grid → founder → CTA
- **Te same interakcje:** scroll reveal + origin + letter hover
- **Cormorant + Inter** jako default beauty
- **7 niezależnych GenerateImage** = różne produkty
- **Brak inspiration_ref** w manifeście
- Batch 5 stron naraz = MVP

### Reguły naprawcze (profiles/generation-process.yaml)
1. **Product lock** — anchor packshot przed resztą
2. **layout-archetypes.yaml** — jeden archetyp per job
3. **interaction-sets.yaml** — rotacja efektów
4. **Max 2 pełne landings** równolegle
5. **inspiration_ref** obowiązkowy per shot
6. **Zakaz** domyślnego bundle bez zapisu w layout-plan

### LUMÉRA — paleta + unikalność obrazów (feedback user 2026-06-23)

**LUMÉRA ≠ ENCRE:** nie readymag-slides, nie pill-nav, nie keyboard-slides, nie manifesto display (RED & BLACK / RED & LIGHT), nie marquee, nie index overlay — to `lumera-commercial` vertical.

**Każde ujęcie raz na stronie:** FAIL jeśli ten sam PNG w collection + gallery + piece + ritual. Packshot produktu tylko w (01) COLLECTION. Gallery = inne kadry kampanii.

**Night Oil:** inny kadr niż Serum (01) — upright black + white label na black studio, NIE tilted red-on-red kopia. Product lock od 01 ale **kompozycja musi się różnić**.

**Wygenerowane bez etykiety / identyczne jak Serum:** karygodny błąd — concept-guardian FAIL Gate B.

### Copy — ton trovearchive (2026-06-23)

**LUMÉRA ≠ style-test-01 full mix.** User: marka to **czerwień, biel, czerń** — ciemne kadry, editorial impact. Większość strony w tym klimacie.

- **NIE na LUMÉRA:** granat, navy, `deep_luxury`, `04-deep-luxury-hero`, gold foil wine bottle, Night Oil jako osobna „linia luxury navy”
- **TAK:** `01-bold-red-packshot` jako product lock dla **obu** SKU; Night Oil = black glass / white label na **red lub black studio**
- B&W (`02`) = akcent case-study, max ~2 ujęcia
- Warm stone (`03`, asset-03) = opcjonalnie max 1 sekcja, nie dominanta
- `06-night-oil-packshot` / `07-duo-ritual-stone` wygenerowane bez brand_lock → **odrzucić** do akceptacji
- **concept-guardian** musi FAILować `lumera-navy-drift` — zapis w `concept-profile.brand_locks` + `products/lumera-brand.yaml`

### Copy — ton trovearchive (2026-06-23)
- **Wzorzec:** trovearchive.com — „Not trending. Always chosen.”, „Luxury is not more. Luxury is knowing.”
- Mało tekstu, zdania krótkie, bez cringe poetyki
- **ENCRE poprawione:** usunięto Pinterest/atrament/signature; fakty produktu zamiast manifesto wall
- page-exporter + concept-guardian: FAIL/WARN na `cringy-brand-poetry` w concept-profile

### Lippier v2 — feedback user (2026-06-23)
- **Italic blockquote** burgund przy founder — wygląda jak AI beauty; zamienić na mono uppercase bez kursywy
- **Figcaption overlay** na galerii (PACKSHOT · STILL LIFE) — usuwać; zero etykiet na zdjęciach
- **Dwa packshoty** poziome na washi z innymi rekwizytami — ten sam typ kadru = FAIL; każde ujęcie inny shot_type
- **Inter plain body** na hero-lead / tagline (`Dwustronny liner: pigment…`) — bardzo AI i zwykłe; **nie używać** na nowych landingach (reguła `inter-plain-lead` w typography-pairings.yaml). Lippier v2 — bez dalszych zmian typografii na prośbę usera.
- Reguły: `image-generation-rules.md` §11–§12

### Inspiracja z wygenerowanych obrazów — stan na 2026-06-23
- **NIE** — system nie czerpał systematycznie z każdego pliku w `references/inspiration/`
- Manifest inspiracji istniał, ale image-generator **nie miał obowiązku** mapowania per shot
- Od teraz: `inspiration_ref` + `shot_rationale` w manifest.json = wymagane (style-qa FAIL)

## Reguły globalne (2026-06-23) — `profiles/image-generation-rules.md`

### Layout & UI
1. **Ciemne zdjęcie na ciemnym tle** — blend (mask/gradient), nie „karta” z odcięciem (NOIR hero)
2. **Footer** — zawsze `cosgral.design`, nigdy „Template: Luzia/Spector” w UI
3. **object-position** na każdym `<img>` w gridzie
4. **Typografia** — `font-family: var(--font)` na body, p, figcaption, dt, dd, li (nie tylko h1)

### Obrazy
5. **Zakaz:** sztuczne suknie na navy, CGI mannequin gown (noir-03) — usunąć z UI
6. **Spójność per landing** — jedna paleta joba, nie mix przypadkowych kolorów
7. **Text cycle (#5)** — max 1× na projekt; lepiej statyczny nagłówek (przerwa przy krótszych słowach)

### elara-photo / noir-atelier feedback
- Elara: grid 2×2 równy, object-position per zdjęcie (silhouette 65% center)
- Noir: hero zblendowany, gown usunięty ze stack/fan
