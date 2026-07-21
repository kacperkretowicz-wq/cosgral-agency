# Porównanie: Puppeteer vs Cursor Browser (audyt wizualny)

**Data:** 2026-06-23  
**Strony:** trovearchive.com, willvint.com, bicemucci.com

## TL;DR

| | Puppeteer | Cursor Browser |
|---|-----------|----------------|
| Metryki (scrollHeight, fonty, platforma) | ✅ szybko, 13 stron naraz | ✅ też (CDP) |
| Wizualny wygląd sekcji | ❌ tylko screenshot headless | ✅ widzę layout, typografię, kolory |
| Interakcje (klawisze, slajdy, hover) | ❌ nie testował | ✅ ArrowDown = zmiana slajdu |
| Cookie / overlay | ❌ często niewidoczne | ✅ klikam i widzę prawdziwą stronę |
| Accessibility tree | częściowo | ✅ pełna lista projektów (bicemucci) |

**Wniosek:** Puppeteer = szybki skan techniczny. Cursor Browser = audyt UX i efektów.

---

## 1. trovearchive.com (commercial / WordPress)

### Puppeteer (wcześniej)
- Klasyczny vertical scroll (~4.3× viewport w raporcie)
- Montserrat, WooCommerce
- Brak Lenis/GSAP

### Cursor Browser — dodatkowo
- **Scroll działa normalnie** — `scrollHeight: 6138`, viewport ~693 (~8.8×)
- **Hero:** TROVE + „Not Trending. / Always Chosen. / DROP LONDON 001” na lifestyle photo (Union Jack top)
- **Sekcja filozofii:** „luxury is about reducing production…”, „Luxury is not more. Luxury is knowing.”
- **CTA:** „EXPLORE OUR COLLECTION” — dużo whitespace, editorial commercial
- **Tech:** jQuery, Woo (`woo: true`), brak GSAP/Lenis
- **Uwaga:** pierwszy screenshot szary (lazy load) — dopiero po scrollu widać content

**Mapowanie:** `commercial-vertical`, `aqua-clean` / Inter-only, scroll reveal na sekcjach tekstu

---

## 2. willvint.com (Readymag / editorial)

### Puppeteer (wcześniej)
- `scrollY: 0`, slide-based
- Space Mono + custom display
- 7× video w DOM

### Cursor Browser — dodatkowo
- **`overflow: hidden`** — scroll kółkiem **nie działa** (potwierdzone)
- **ArrowDown = slide transition:** niebieski gradient + gigantyczne „WILL V” → czarne tło + condensed „WILL V”
- **Nav pill:** ©WILL VINT | Work | Play | Contact (fixed, czarny pill)
- **Layout:** split — typografia + grid z obrazami i geometrycznym „X”
- **Snapshot accessibility:** prawie pusty (tylko `document`) — content w warstwach RM, nie w semantycznym HTML
- **Fonty:** Space Mono + `wtqc`, `gzjd` (custom RM)

**Mapowanie:** `viewport-sections` + **keyboard/slide navigation**, `mono-architect`, origin button na Work/Play

---

## 3. bicemucci.com (Readymag / studio manifesto)

### Puppeteer (wcześniej)
- Manifesto + project index
- Inter

### Cursor Browser — dodatkowo
- **Cookie wall** blokuje widok — trzeba „Accetta tutto”
- **Manifesto w snapshot:** pełny tekst „Ciao! Sono Bice…”, nav Home / Manifesto / Contact
- **8 projektów** z tagami: „Ferroni — Branding”, „Like Home — Branding, Video” itd.
- **Linki „view project”** na każdym kafelku (hover CTA)
- **ArrowDown:** slajd zielony + różowy display „pensiar” (typography jako content)
- **Hero:** paper-cut 3D city (czerwony) — craft/illustration
- **Grid „Progetti”:** zaokrąglone miniatury, 3+ kolumny
- **6 video** w DOM, `overflow: hidden`

**Mapowanie:** `studio-manifesto`, stacked cards + origin button, Inter body + display per slide

---

## Co dodać do systemu

1. **Audyt 2-etapowy:** Puppeteer (batch) → Cursor Browser (top 3–5 stron głęboko)
2. **layout-planner:** dla Readymag — `navigation: keyboard-slides` zamiast `vertical-scroll`
3. **page-exporter:** symulacja slajdów przez scroll-snap + sekcje 100vh LUB JS na strzałki
4. **Checklist audytu wizualnego:** cookie dismiss, ArrowDown/PageDown, screenshot per slide, CDP overflow/scrollHeight

---

## Runda 2 (dave-green, from.cm, n9cra)

### dave-green.com
- Biały canvas → ArrowDown odsłania masonry grid
- Nav: Personal · Work; CTA „Good Form →” pod projektem
- Expandable „Info +” / „Good Form +”

### from.cm
- Manifesto jako gigantyczna typografia po liniach (IT)
- Split: grain shapes + photo + white display type
- Slajdy ArrowDown, nav institutional (SERVIZI, PUBBLICAZIONI…)

### n9cra.com
- Video hero loop, grain/VHS; nav ON: N9CRA | INQUIRE | SHOP NOW
- COLLECTIONS label; custom font; slajdy z night scene + yellow bar

