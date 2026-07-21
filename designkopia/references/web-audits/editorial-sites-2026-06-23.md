# Audyt stron referencyjnych — editorial / portfolio / advanced layouts

**Data:** 2026-06-23  
**Zaudytowane:** 13/13 stron (Puppeteer headless, viewport 1440×900)  
**Pominięte:** Framer Artiact (na życzenie usera — patrz sekcja Plan B)  
**Raw data:** `references/web-audits/_raw/puppeteer-audit.json`

---

## Podsumowanie ekosystemu

| Wzorzec | Ile stron | Przykłady |
|---------|-----------|-----------|
| Readymag (slide / overlay INDEX) | 12 | mashachern, willvint, mariano, travelagency, bicemucci, dave-green, thomjohn, n9cra, from.cm, readymag×2, danilamel |
| Klasyczny vertical scroll | 1 | trovearchive (WordPress/WooCommerce) |
| Ultra-long case study scroll | 1 | danilamel/samokat (~77× viewport) |
| Video-first hero | 3+ | willvint, bicemucci, n9cra |

**Ważne:** większość Readymagów **nie scrolluje pionowo** na landing — `scrollHeight ≈ viewport`, nawigacja przez INDEX / slajdy / overlay. To nie są „krótkie strony”, tylko **multi-page experience w jednym URL**.

---

## Per-site analysis

### 1. [mashachern.com](https://mashachern.com/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | Custom (Suisse Int'l — credit w UI) |
| Layout | Czarny canvas, fixed nav: ABOUT / CONTACT / INDEX / Close |
| Scroll | Brak pionowego scrolla — galeria/index jako overlay |
| Obrazy | ~21 w DOM (grid/index) |
| Efekty | Fixed layers (4), brak Lenis/GSAP |

**Wnioski:** ultra-minimal portfolio typographera; typografia jako content; INDEX zamiast klasycznego scrolla.

---

### 2. [willvint.com](https://willvint.com/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | **Space Mono** + custom display |
| Layout | Work / Play / Contact + lista projektów z rokiem (2023–2026) |
| Media | **7× video** w DOM |
| Scroll | Slide-based (scrollY=0) |

**Wnioski:** motion-first designer portfolio; mono + display; projekty = tytuł + rok + wyróżniki ([WINNER]).

---

### 3. [marianorrisesparza.com/projects](https://marianorrisesparza.com/projects)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | **Inter** (400/600/700) |
| Layout | Lista projektów pogrupowana: Fashion / Wellness / Entertainment / Personal |
| Media | 15 img, 1 video |
| Copy | „Photography & Content, featured in Vogue Spain” — tagi dyscypliny |

**Wnioski:** portfolio fotografa z **kategoryzacją narracyjną**; każdy wpis = klient + medium + wyróżnik.

---

### 4. [travelagency.agency](https://travelagency.agency/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | 3× custom font |
| Layout | COLLECTION / INDEX / SHOP / LIBRARY / ABOUT + CART |
| Scroll | Slide-based |

**Wnioski:** editorial e-commerce; hybryda lookbook + sklep; INDEX jako hub nawigacji.

---

### 5. [bicemucci.com](https://bicemucci.com/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | **Inter** |
| Layout | Manifesto intro (długi tekst osobisty) → grid „view project” ×8 |
| Media | 6 video |
| Footer | Progetti z listą: Klient — dyscypliny |

**Wnioski:** personal brand GD; **manifesto + project grid**; video thumbnails jako karty.

---

### 6. [trovearchive.com](https://trovearchive.com/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | **WordPress + WooCommerce** |
| Typografia | **Montserrat** (+ Roboto, Open Sans) |
| Layout | Klasyczny landing: hero „Not trending.” → produkty → filozofia → newsletter |
| Scroll | **4.3× viewport** — jedyny klasyczny vertical scroll w batchu |
| Sekcje | h1/h2: MINDFUL LUXURY, produkty z ceną, THE PHILOSOPHY |

**Wnioski:** „normalny” commercial/e-commerce styl — najbliższy naszym `hero-minimal` / `luzia` / `daniel`; dobry reference dla **prostego scrolla + CTA**.

---

### 7. [readymag — JOSER JEWELLERY](https://readymag.website/u46566036/3033186/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag (subdomain) |
| Typografia | Source Sans Pro, Inter, Roboto + custom |
| Layout | SHOP / LOOKBOOK / CONTACTS / BRAND; serie: Memphis, Parthenon, Kazanskiy |
| Copy | „FINE JEWELLERY WITH CONCEPTUAL APPROACH…” |
| Obrazy | 36 img |

**Wnioski:** luxury product + **serie/kolekcje** jako struktura; dual CTA (collection / lookbook).

---

### 8. [dave-green.com](https://dave-green.com/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | Inter + custom |
| Layout | Personal / Work / Info + **expandable client list** (Good Form +, Giant Management +) |
| Scroll | Slide-based |

**Wnioski:** photographer rep site; **akordeon/expand (+)** zamiast długiej listy; kontakt w headerze.

---

### 9. [thomjohn.studio](https://thomjohn.studio/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | Inter, Roboto + custom |
| Layout | Karuzela projektów (**1/3** counter) + lista z tagami (Design, Photography, Animation…) |
| Footer | © + CONTACT + Back To Top |

**Wnioski:** studio portfolio; **carousel z licznikiem** + discipline tags per project.

---

### 10. [readymag — SISTRS](https://readymag.website/u1736040839/4184355/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | Custom (1 family) |
| Layout | E-commerce lingerie; manifesto **numbered list** (1–5); RU/EN |
| Nav | каталог, корзина, telegram/whatsapp |

**Wnioski:** brand manifest jako numerowana lista; soft editorial + shop; custom font only.

---

### 11. [danilamel.com/samokat](https://danilamel.com/samokat/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | **12+ display fonts**: Druk Condensed/Wide, Graphik, Austin, Kazimir, Giorgio Sans… |
| Layout | **Case study** Yandex/Samokat/Sber — rozdziały z typografią jako hero |
| Scroll | **~77× viewport** — najdłuższy w batchu |
| Obrazy | 49 img |

**Wnioski:** reference dla **long-form case study**; typografia = główny visual; każdy rozdział = inna para fontów (ale spójna narracja).

---

### 12. [n9cra.com](https://n9cra.com/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | Custom |
| Layout | Minimal: SEDIMENT / NIYA / NECKLACES / ON: N9CRA / INQUIRE / SHOP NOW |
| Media | **Video hero** (0 img w DOM na load) |
| Scroll | Slide-based |

**Wnioski:** jewellery luxury; **video loop jako tło**; ultra-minimal nav; zero clutter.

---

### 13. [from.cm](https://from.cm/)

| Aspekt | Obserwacja |
|--------|------------|
| Platforma | Readymag |
| Typografia | 2× custom |
| Layout | City-making agency; manifesto + NEWSLETTER / SHOP / SERVIZI |
| Copy | „CITTÀ VITALI, SOSTENIBILI E ACCOGLIENTI” — duży editorial headline |
| Język | IT |

**Wnioski:** institutional editorial; długi manifest + services; podobny ton do from.cm / NGO premium.

---

## Plan B — Framer Artiact (pominięty)

> **Pominięty na życzenie usera.** Normalny/commercial styl — mapuj na `profiles/templates/hero-minimal`, `luzia`, `daniel` gdy potrzebny prostszy layout bez advanced Readymag interactions.

---

## Patterns do zaadaptowania

### Layout & nawigacja
1. **Fixed minimal nav** (3–6 linków) + opcjonalny INDEX/Close overlay.
2. **Project index** z rokiem, kategorią i dyscypliną (willvint, mariano, bicemucci).
3. **Manifesto block** — długi editorial copy przed gridem (bicemucci, from.cm, sistrs).
4. **Serie/kolekcje** jako struktura produktu (JOSER, travelagency).
5. **Expandable lists (+)** dla klientów/rep (dave-green).
6. **Carousel z licznikiem** 1/N (thomjohn).
7. **Klasyczny vertical scroll** dla commercial (trovearchive) — 6–8 sekcji, hero → produkt → filozofia → CTA.

### Typografia
1. **Custom/display font** na premium (Suisse, Space Mono, Druk, custom RM).
2. **Inter jako workhorse** na listach i body (mariano, bicemucci, dave-green).
3. **Typographic credits** w UI (mashachern — „Typeface Suisse Int'l”).
4. **Case study mode:** zmiana display font per rozdział, max 2 rodziny naraz w HTML (danilamel).

### Obrazy & media
1. **Video jako hero/loop** zamiast statycznego kadru (n9cra, willvint).
2. **Grid index** z hover „view project” (bicemucci).
3. **Full-bleed photography** z minimalnym UI na czarnym tle.
4. **object-position** per kadr — kadry są artystyczne, nie packshot.

### Scroll & rytm
1. Readymag: **slide transitions** zamiast długiego scrolla — symulować przez sekcje full-viewport + scroll-snap (bez kopiowania RM 1:1).
2. Case study: **chapter sections** z wyraźnymi breakpointami (danilamel).
3. Commercial: **4–8× viewport** vertical (trovearchive).

---

## Patterns do ograniczenia

| Pattern | Dlaczego |
|---------|----------|
| 77-screen scroll bez rozdziałów | tylko gdy explicit case-study job |
| Lenis sticky gallery (#01) | nie wykryto na referencjach; ryzyko clash z RM-style |
| Hero parallax (#16) | odrzucony przez usera wcześniej |
| Text cycle >1× | reguła projektu |
| Cookie wall UI | nie kopiować Cookiebot overlay |
| WordPress generic (Montserrat + Woo blocks) | tylko trovearchive jako „commercial lane” |
| Losowy mix fontów bez narracji | danilamel ma sens tylko w case study |

---

## Mapowanie na system

### `profiles/typography-pairings.yaml`

| Strona / styl | Rekomendowany pairing | Uzasadnienie |
|---------------|----------------------|--------------|
| mashachern, n9cra, travelagency | `mono-architect` (Space Grotesk + Inter) | minimal luxury, tight nav |
| willvint, thomjohn | `mono-architect` lub `nocturne-luxury` | mono labels + editorial |
| mariano, bicemucci, dave-green | `warm-fashion` (Sora + DM Sans) | portfolio lists, czytelność |
| JOSER, sistrs | `soft-beauty` lub custom display + Inter | luxury product |
| danilamel case study | display per chapter + `mono-architect` body | Druk/Graphik → Google: Bebas/Syne/Space Grotesk jako proxy |
| trovearchive | `aqua-clean` lub Inter-only | commercial, jasny |
| from.cm | `warm-fashion` lub `nocturne-luxury` | institutional editorial |

**Akcja:** przy `/design-generate` layout-planner wybiera `typography_map` z pairings + template YAML override.

### `layout-planner`

| Tryb | Kiedy | Sekcje (min) |
|------|-------|--------------|
| `portfolio-index` | mashachern, willvint, mariano | nav + hero/index + project-list + about + contact (6) |
| `studio-manifesto` | bicemucci, from.cm, sistrs | nav + manifesto + works grid + services + cta + footer (7) |
| `product-serial` | JOSER, travelagency, n9cra | nav + hero video + collections + detail + shop cta + footer (7) |
| `case-study-long` | danilamel | chapters: intro + problem + typography + UI + gallery + results + cta (8+) |
| `commercial-vertical` | trovearchive, Artiact-planB | hero + products + philosophy + social proof + newsletter + footer (6) |

**Reguła:** Readymag „1 screen” ≠ krótka strona — planuj **viewport sections** z scroll-snap lub slide JS.

### `references/interactions/manifest.yaml`

| Efekt | Fit | Strona inspiracji |
|-------|-----|-------------------|
| effect-05 text cycle | medium (max 1×) | willvint hero titles |
| effect-08 feature tabs | high | mariano categories |
| effect-09 stacked cards | high | bicemucci project grid |
| effect-10 marquee | medium | client logos (thomjohn) |
| effect-12 scroll reveal | high | trovearchive, from.cm |
| effect-13 letter hover | medium | mashachern, luxury nav |
| effect-14 origin button | high | view project / shop now |
| effect-17 GSAP fan | medium | project index hover |
| effect-01 lenis sticky | **low** | brak na referencjach |
| effect-16 hero parallax | **zakazany** | — |

---

## Rekomendacje implementacyjne (następny sprint)

1. Dodać `scroll_mode: viewport-sections | vertical | case-study` do outputu layout-planner.
2. W page-exporter: `scroll-snap-type: y mandatory` dla trybu portfolio-index.
3. Rozszerzyć `typography-pairings.yaml` o `display_proxy` (Druk → Bebas Neue, Suisse → Instrument Sans).
4. Zachować **commercial lane** (trovearchive/Artiact-planB) osobno od **editorial lane** (Readymag batch).

---

## Metryki audytu

- **Strony zaudytowane:** 13/13 ✅
- **Platforma dominująca:** Readymag (12/13)
- **Wykryte Lenis/GSAP:** 0 (własny silnik Readymag)
- **Najdłuższy scroll:** danilamel/samokat (77.4× viewport)
- **Jedyny klasyczny e-commerce scroll:** trovearchive (4.3×)
