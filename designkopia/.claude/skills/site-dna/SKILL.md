---
name: site-dna
description: >
  Forensyka strony z URL — wklej linka, a skill wykryje stack, biblioteki,
  fonty, kolory, layout i efekty; napisze szczegółowy opis + REBUILD-BLUEPRINT.md
  (instrukcja 1:1 dla agenta AI: co zainstalować, jaka technologia, jak zbudować)
  i dopisze wykryte efekty do rosnącej biblioteki references/site-dna/effects-library.yaml.
  Użyj gdy user wkleja URL strony do przeanalizowania / odtworzenia / nauczenia się jej efektów.
---

# /site-dna — forensyka strony + blueprint odbudowy 1:1 + biblioteka efektów

**Input:** URL strony (argument skilla lub z wiadomości usera).
**Output:** `references/site-dna/<slug>/` → `site-dna.json`, `capture/`, `REBUILD-BLUEPRINT.md`
oraz wpisy w `references/site-dna/effects-library.yaml`.

## Krok 1 — analiza maszynowa (skrypt)

```bash
python scripts/site-dna.py <url>
```

Skrypt pobiera HTML + CSS + JS (w tym bundle wstrzykiwane dynamicznie — drugi przebieg),
wykrywa builder/framework/biblioteki/fonty/kolory/heurystyki efektów i zapisuje
`references/site-dna/<slug>/site-dna.json` + dowody w `capture/`.
Jeśli fetch padnie (Cloudflare/JS-only render), użyj fallbacku:
`python scripts/audit-site.py <url>` (puppeteer) lub WebFetch i zapisz HTML ręcznie do `capture/`.

## Krok 2 — pogłębienie analizy (Ty, nie skrypt)

Przeczytaj `site-dna.json` ORAZ pliki z `capture/` (index.html, główny CSS, główny JS strony —
nie chunki jQuery/Webflow). Ustal to, czego regex nie widzi:

1. **Anatomia layoutu** — sekcja po sekcji z `dom.sections_order` + realnego HTML:
   co jest w hero, jaka siatka, asymetria, mega-type, numeracja sekcji, footer.
2. **Choreografia motion** — z JS strony: co dzieje się na load (preloader?),
   na scroll (pin? scrub? ile scrolla konsumuje hero?), na hover (magnetic? distortion?).
   Szukaj `ScrollTrigger.create`, `pin:`, `scrub:`, `timeline`, `clip-path`, wartości `end:`.
3. **Typografia** — skala (rozmiary h1 vs body z CSS), pairing, uppercase/tracking.
4. **Paleta** — z `colors_top` odsiej szumy (szarości borderów), nazwij role (bg/ink/accent).
5. **Signature moment** — JEDNA rzecz, która robi „wow" na tej stronie. Nazwij ją wprost.

Strona wielopodstronowa? WebFetch 1–2 kluczowe podstrony (work/about) jeśli istotne.

## Krok 3 — REBUILD-BLUEPRINT.md (instrukcja 1:1 dla agenta AI)

Zapisz `references/site-dna/<slug>/REBUILD-BLUEPRINT.md` o strukturze:

```markdown
# REBUILD BLUEPRINT — <url>
## 1. Czym jest ta strona (opis + vibe + signature moment)
## 2. Wykryty stack (tabela: warstwa | technologia | pewność | dowód)
## 3. Anatomia layoutu (sekcja po sekcji: treść, siatka, zachowanie przy scrollu)
## 4. Design tokens (paleta hex z rolami, typografia: rodziny/skala/tracking)
## 5. Efekty (tabela: technique_id | co robi | lib oryginału | jak w naszym stacku)
## 6. INSTRUKCJA DLA AGENTA — zbuduj 1:1
### 6.1 Setup (dokładne komendy: create-next-app LUB web/ tego repo, npm install …)
### 6.2 Struktura plików (drzewko komponentów per sekcja)
### 6.3 Kolejność implementacji (fundament → layout → motion → tuning)
### 6.4 Spec per sekcja (markup + wartości animacji: end, scrub, ease, stagger)
### 6.5 Kryteria akceptacji (po czym poznać, że klon = oryginał)
```

Zasady:
- Sekcja 6 ma być **wykonywalna bez oglądania oryginału** — konkretne komendy,
  konkretne paczki (`npm_install` z site-dna.json + Twoje korekty), konkretne wartości.
- Mapuj efekty na istniejące komponenty `web/lib/effects/*.tsx` (18 szt.) i technique_id
  z `profiles/effects-stack.yaml`; stack docelowy = `effects-stack.yaml: target_stack`.
- Efekty `caution` (image-trail, custom-cursor) oznacz flagą — jak w site-clone-registry.

## Krok 4 — zasil bibliotekę efektów (uczenie się)

Dla KAŻDEGO wykrytego efektu sprawdź `references/site-dna/effects-library.yaml`
oraz `profiles/site-clone-registry.yaml: techniques`:

- Technika już znana → dopisz tylko URL do jej `seen_on[]` (biblioteka liczy częstość).
- Technika NOWA → dodaj wpis wg schematu z nagłówka effects-library.yaml
  (id `<slug>-<nazwa>`, what, lib, dom hooks, impl sketch z realnego JS strony, react_equiv).
- Technika nowa i wybitna (kandydat na signature) → zaproponuj userowi delegację do
  **effect-smith**, żeby powstał komponent w `web/lib/effects/` (protokół:
  `profiles/effects-authoring.md`). Nie odpalaj effect-smith bez zgody usera.

## Krok 5 — raport dla usera

Podsumuj: stack, 3–5 najciekawszych efektów, signature moment, ścieżki do
blueprint/JSON/biblioteki. Zaproponuj następny krok: budowa 1:1 (lane klonowania:
site-extractor → reskin-stylist → …) LUB inspiracja do nowego joba (pipeline).
