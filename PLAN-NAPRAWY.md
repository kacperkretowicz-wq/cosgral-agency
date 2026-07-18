# PLAN NAPRAWY — cosgral-agency (18.07.2026)

> **STATUS: WYKONANE.** Wszystkie 5 kroków wdrożone i zweryfikowane Playwrightem
> (first visit, repeat visit, scroll 18/50/80%, 0 błędów JS, 0 requestów 4xx/5xx).
> Zmienione pliki: `cosgral-layout-fix.css`, `index.html`, `cosgral-hero-effects.js`.

Zgłoszone problemy:
1. Strona po uruchomieniu jest biała.
2. Brak zdjęcia pana odwróconego tyłem (hero) i efektu.
3. "AGENCY" jest z małej litery / nierówne względem COSGRAL.
4. Opis "strony, landingi, AI photoshooty i wizualizacje" ma być pod napisem
   COSGRAL AGENCY — resztę tekstów usunąć.

## Diagnoza (zweryfikowana testami Playwright + inspekcją w przeglądarce)

### A. Biała strona = zakryty hero (to jeden i ten sam bug co brak zdjęcia)
- Preloader, GSAP, obrazy — wszystko ładuje się poprawnie (0 błędów JS, 0 requestów 404,
  `hero_bg` ma naturalWidth 1536 i wypełnia cały viewport z opacity 1).
- Winowajca: ostatnie reguły w `cosgral-layout-fix.css` (dodane 17.07 ~22:55):
  ```css
  .section_vv { position: relative; z-index: 3 !important; }
  ```
  `section_vv` zajmuje cały viewport i ma NIEPRZEZROCZYSTE kremowe tło
  (`#f5f2ed` z `cosgral-brand.css` — "Light beige revealed when image narrows").
  Z z-index 3 leży NAD `section_hero` (z-index 2), więc od zejścia kurtyny preloadera
  zakrywa zdjęcie mężczyzny i całe intro. Widać tylko navbar na kremowym tle
  → wrażenie "białej strony". Potwierdzone `document.elementsFromPoint(720,450)`.
- Nagłówki VV są do tego clip-hidden (`inset(0 100% 0 0)`) aż do choreografii scrollowej,
  więc przed pierwszym scrollem ekran jest całkiem pusty.
- **Poprawka (przetestowana, działa):** tło `section_vv` na transparent — beż
  "odsłaniany przy zwężaniu zdjęcia" i tak daje `section_hero` (`#f5f0ee`).
  Po tej jednej regule zdjęcie pana + intro + efekt rysowania liter wracają.

### B. "AGENCY" małe / nierówne
- `cosgral-layout-fix.css` wymusza RÓŻNE rozmiary obu nagłówków:
  `.vv_content.one h2` → clamp(1.85rem, 3.6vw, 2.75rem)
  `.vv_content.two h2` → clamp(1.45rem, 2.6vw, 2rem) + letter-spacing .03em
  → AGENCY jest mniejsze i nie trzyma linii bazowej COSGRAL.
- Rysowane litery root-line skalują się do fontu i szerokości nagłówka
  (`buildWordLetters('AGENCY', …, fs2, r2.width)`), więc dziedziczą ten rozjazd
  (dodatkowo `scaleAdjust = targetWidth/nativeWidth` zniekształca proporcje glifów).
- W słowniku `#root-line-glyphs` są też stare minuskuły `a,c,e,g,n,y` (poprzednia
  wersja rysowała lowercase "agency") — wersaliki A,G,E,N,C,Y są dostępne,
  markup już ma "AGENCY", więc wystarczy wyrównać typografię.

### C. Opisy pod nagłówkami
Obecnie w `section_vv` są dwa paragrafy rozrzucone na krawędzie ekranu:
- vv1: "cosgral.agency — strony, landingi, AI photoshooty i wizualizacje."
- vv2: "Technologia z Voyeur i Playfight, kadr z Parhouse — jedna wizytówka."

### D. Kruchy boot (ryzyko "białej strony" przy każdej czkawce)
Preloader (inline w `index.html`) czeka bez żadnego timeoutu na dwa promisy:
`window.smootherReady` (rozwiązywany dopiero po DOMContentLoaded + podwójnym
requestAnimationFrame + ScrollSmoother.create) i `window.heroEntranceReady`
(rozwiązywany na końcu callbacku Webflow.push w cosgral-hero-effects.js).
Jeden błąd JS / zdławiona karta / brak CDN = kurtyna wisi wiecznie.

## Kroki naprawy (kolejność wykonania)

### Krok 1 — odsłonięcie hero (1 reguła CSS)
W `cosgral-layout-fix.css` dopisać na końcu:
```css
.section_vv { background: transparent !important; }
```
Zostawić `z-index: 3` (potrzebny, żeby VV i root-line były nad panelami filmów).
Weryfikacja: po załadowaniu widać zdjęcie mężczyzny na czerwonym tle full-bleed.

### Krok 2 — wyrównanie COSGRAL / AGENCY
W `cosgral-layout-fix.css` ujednolicić oba nagłówki:
```css
.section_vv .vv_content.one h2,
.section_vv .vv_content.two h2 {
  font-size: clamp(1.85rem, 3.6vw, 2.75rem) !important;
  line-height: 1.05 !important;
  letter-spacing: 0 !important;
}
```
(usunąć osobny, mniejszy clamp dla `.two`). Root-line przeliczy się sam —
czyta font-size i getBoundingClientRect na żywo. Sprawdzić baseline po zbiegnięciu
słów (`getVvMeetTargets` w cosgral-hero-effects.js wyrównuje tylko X — jeśli po
ujednoliceniu fontów baseline dalej się rozjeżdża, wyrównać też Y).
Opcjonalne czyszczenie: usunąć nieużywane minuskuły a,c,e,g,n,y z `#root-line-glyphs`.

### Krok 3 — copy pod wordmarkiem
W `index.html` (sekcja `section_vv`):
- paragraf vv1 zmienić na: `strony, landingi, AI photoshooty i wizualizacje`
  (bez prefiksu "cosgral.agency — ", bez kropki wg gustu);
- usunąć paragraf vv2 ("Technologia z Voyeur i Playfight…") oraz — skoro "resztę
  usunąć" — także decor-labelki `web`/`ai` przy AGENCY (labelki `studio`/`cg` przy
  COSGRAL zostawić lub usunąć symetrycznie — do decyzji);
- w `cosgral-hero-effects.js` usunąć referencje do `DOM.vvParaSecond`
  (gsap.set/fade), a `vvParaFirst` po zbiegnięciu słów wycentrować pod całym
  wordmarkiem COSGRAL AGENCY (teraz jest przyklejony do lewej krawędzi viewportu).

### Krok 4 — failsafe preloadera (żeby biała strona nie wróciła)
W inline skrypcie `initPreloader` w `index.html` zamienić oba `await` na wyścig
z timeoutem, np.:
```js
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
if (window.smootherReady)     await withTimeout(window.smootherReady, 4000);
if (window.heroEntranceReady) await withTimeout(window.heroEntranceReady, 4000);
```
Dzięki temu nawet gdy któryś skrypt padnie, kurtyna zejdzie i strona będzie używalna.

### Krok 5 — weryfikacja end-to-end
1. Serwer MUSI mieć root w `cosgral-main` (obrazy są linkowane `../../images/...`):
   `cd cosgral-main && python -m http.server 8734`
   → http://localhost:8734/designkopia/cosgral-agency/index.html
   (otwarcie index.html dwuklikiem file:// też zadziała ścieżkowo, ale serwer jest
   pewniejszy — CDN-owe skrypty wymagają internetu w obu wariantach).
2. Playwright (wzorzec: test_hero_effects.py): first visit (czyste sessionStorage),
   repeat visit, scroll 0/25/50/75/100%, prefers-reduced-motion.
   Sprawdzić: zdjęcie na starcie, kurtyna schodzi ≤3s, licznik 001→100,
   COSGRAL i AGENCY równe po zbiegnięciu, opis wycentrowany pod wordmarkiem,
   brak requestów 404 i błędów konsoli.

## Zakres plików
| Plik | Zmiana |
|---|---|
| `cosgral-layout-fix.css` | Krok 1 (tło VV) + Krok 2 (fonty nagłówków) |
| `index.html` | Krok 3 (copy) + Krok 4 (failsafe preloadera) |
| `cosgral-hero-effects.js` | Krok 3 (vvParaSecond out, centrowanie opisu), ew. Krok 2 (baseline) |

Ryzyka: po Kroku 1 sprawdzić moment, gdy zdjęcie zwęża się do kreski — beż spod
spodu pochodzi teraz z `section_hero` (#f5f0ee vs dawne #f5f2ed VV — różnica
niezauważalna). Po Kroku 2 sprawdzić mobile (<992px), bo clampy działają od vw.
