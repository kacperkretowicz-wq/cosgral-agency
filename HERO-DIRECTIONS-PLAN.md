# [NIEAKTUALNY — NIE WYKONYWAĆ] HERO-DIRECTIONS-PLAN

> ⛔ **PLAN ZASTĄPIONY.** Ten kierunek (11 przełączalnych efektów) został
> wykonany, obejrzany i odrzucony przez właściciela. Obowiązujący plan:
> **`HERO-CLEAN-INTRO-PLAN.md`** (jedno czyste intro, zero trybów).
> Plik zostaje wyłącznie jako zapis historyczny decyzji.

# HERO-DIRECTIONS-PLAN — kuracja 5 najlepszych + 6 nowych kierunków sekcji 1

> Wykonywalny plan dla modelu-wykonawcy (tańszy model AI pracujący w tym repo).
> Autor kuracji i projektów efektów: audyt 2026-07-17 (Fable), po refaktorze
> opisanym w `HERO-EFFECTS-BLUEPRINT.md` (tamten plan jest w większości WYKONANY —
> ten plan jest jego następcą i punktem wyjścia jest AKTUALNY kod).
> Zakres: wyłącznie sekcja 1 (`.hero_stack_wrapper`) w `index.html` +
> `cosgral-hero-effects.js`. Innych sekcji NIE dotykać.

---

## 0. Stan zastany (zweryfikowany w kodzie — nie odkrywaj tego od nowa)

- Cała logika hero jest w **`cosgral-hero-effects.js`** (już wyniesiona z inline).
- Tryby tekstu: mapa **`WORD_REVEALS`** (13 wpisów) + `classic` (clip-path wipe
  w `applyWordReveal` jako fallback). Razem 15 przycisków.
- Przejścia tła: gałąź `if (transMode === ...)` w `buildHeroTimeline` —
  8 trybów: `blur` (domyślny), `liquid-chromatic`, `portal-zoom`, `color-wipes`,
  `blob-expand`, `strips`, `slash`, `grid-reveal`.
- Switcher: `#design-switcher` w `index.html`, widoczny tylko z `?dev=1`,
  DWA niezależne wymiary w localStorage: `effectMode` + `bgTransitionMode`,
  przełączenie = `location.reload()`.
- `decode` jest już deterministyczny (`decodePseudoRandom`), reduced-motion
  obsłużone (`REDUCED_MOTION` wymusza classic + krótszy pin `+=300%`).
- Filtry SVG istnieją w DOM: `#smoke-melt`, `#liquid-chromatic` (`#lc-disp`,
  `#lc-red`, `#lc-blue`), `#blob-clip`/`#blob-path`.
- **Złoto do ponownego użycia:** kontury liter COSGRAL/agency jako ścieżki SVG
  już istnieją — `DOM.rlW1` / `DOM.rlW2` (atrybut `d` budowany przez
  `buildWord()` z JSON `#root-line-glyphs`, pozycjonowany 1:1 na realnych
  nagłówkach `[data-vv] h2`). Nowy efekt „Letter Portal" (C1) opiera się na
  KOPII tych `d` — nie licz glifów od nowa.
- Oś czasu timeline `tl` (scrub 1.6, pin, end `+=900%`):

  | slot | co się dzieje | wolno ruszać? |
  |------|---------------|----------------|
  | 0 → 1.0 | bg scale→1, fade H1 @0.62 | TAK (delikatnie) |
  | **1.0 → 2.2** | **OKNO PRZEJŚCIA TŁA** (hero musi zniknąć do 2.2) | TAK — tu żyją kierunki |
  | 1.3/1.6 | reveal słowa 1 (classic @1.3, custom @1.6) | TAK |
  | 1.9/2.2 | reveal słowa 2 (classic @1.9, custom @2.2) | TAK |
  | 2.2 → 3.1 | konwergencja nagłówków (elastic) | **NIE DOTYKAĆ** |
  | 3.0 → 4.0 | maski filmowe otwierają się | **NIE DOTYKAĆ** |

**Pułapki (aktualne):** body `index.html` = jedna linia → edycje w HTML robić
Pythonem (`re`), nie sed/ręcznie; `lockHeading` blokuje zapisy innerHTML na
nagłówkach VV; pomiary szerokości ważne po `document.fonts.ready`; w ukrytej
karcie preloader „wisi na 001" — to nie bug; testować w widocznej karcie
(skrypty `test_all_modes.py` już to obchodzą).

---

## 1. DECYZJA KURATORSKA (nie negocjować z nią — wykonać)

Problem: 15 trybów tekstu × 8 przejść tła = 120 kombinacji, z czego większość
to warianty tej samej rodziny (4× „rotacja 3D", 3× „elastic squash", 3×
„glow/shadow fade"). To dlatego całość czuć jako generyczną. Lekarstwo:
**jeden wymiar wyboru = KIERUNEK (direction)** — spójna para
(przejście tła + reveal tekstu + mikro-detale), każda o innym charakterze.

### 1a. ZOSTAJE — 5 kierunków z istniejącego materiału (pary):

| id kierunku | tekst (z WORD_REVEALS) | tło (z transMode) | charakter |
|---|---|---|---|
| `signature` (DOMYŚLNY) | classic (wipe za piórem) | `blur` (lens blur + NOWE: desaturacja) | filmowy, elegancki |
| `ink-melt` | `ink` (smoke-melt) | `liquid-chromatic` | organiczny, malarski |
| `kinetic-portal` | `kinetic` (letter flip 3D) | `portal-zoom` (kadr-rama) | przestrzenny, architektoniczny |
| `decode-grid` | `decode` (scramble) | `grid-reveal` (PRZESTROJONY na ciemny, patrz B4) | techniczny, cyfrowy |
| `editorial-slice` | `slanted` (STONOWANY, patrz B5) | `strips` (kolumny, dopracowane) | edytorski, magazynowy |

### 1b. DO ARCHIWUM (nie kasować — przenieść):

Tryby tekstu: `liquid`, `spark`, `glitch`, `particles`, `strobe`, `matrix`,
`vortex`, `slingshot`, `zoom`, `flip`.
Przejścia tła: `color-wipes`, `blob-expand`, `slash`.
→ kod przenieś do nowego pliku `archive/hero-modes-archive.js` (NIE podpinany
w HTML, czysty magazyn), przyciski usuń ze switchera.

### 1c. NOWE — 6 kierunków (projekty w sekcji 4, implementować w tej kolejności):

| id | nazwa robocza | jedno zdanie |
|---|---|---|
| `letter-portal` | Typograf | zdjęcie hero widoczne PRZEZ kontury liter COSGRAL/agency, kamera dojeżdża, litery „zalewają się" solidem |
| `darkroom` | Ciemnia | wywoływanie odbitki: negatyw → czerwone światło ciemniowe → napisy „wywołują się" z ziarna i rozmycia |
| `outline-fill` | Kontur | litery najpierw jako czerwony obrys (kontynuacja pióra), potem wypełnienie zalewa litera po literze; tło składa się jak rysunek techniczny |
| `editorial-tear` | Rozdarcie | zdjęcie rozdziera się jak papier po postrzępionej linii, połówki odjeżdżają z rotacją, typografia stemplowana jak kolaż |
| `chromatic-dive` | Obiektyw | najazd kamery W GŁĄB zdjęcia z narastającą aberracją chromatyczną i winietą; typografia „łapie ostrość" z przeciwnej skali |
| `slit-drip` | Slit-scan | zdjęcie rozpada się na pionowe paski, które rozciągają się i „ściekają" w dół (estetyka pixel-sort); litery składają się z pionowych szczelin |

Po wykonaniu: switcher = **11 przycisków** (5 + 6), jeden wymiar.

---

## 2. ETAP A — architektura: rejestr HERO_DIRECTIONS + nowy switcher

### TASK-A0: baseline (bez zmian w kodzie)
1. Serwer: `cd <root>/cosgral-main && python -m http.server 8931`; strona:
   `http://127.0.0.1:8931/designkopia/cosgral-agency/index.html?dev=1`.
2. Zrzuty p-punktów p ∈ {0, .12, .2, .3, .45, .6, .75, .9, 1} dla 5 par z 1a
   (ustaw obie stare wartości localStorage: `effectMode` + `bgTransitionMode`).
   Mechanika scrolla — jak w `HERO-EFFECTS-BLUEPRINT.md` §5/TASK-00 (snippet
   `st.scroll(...)`), wzorzec skryptu: `test_all_modes.py`.
3. Zapisz do `test-output/directions-baseline/<para>/pNN.png`.
**Akceptacja:** komplet zrzutów, brak nowych błędów konsoli.

### TASK-A1: rejestr kierunków (bez zmiany wyglądu 5 par)
W `cosgral-hero-effects.js`:

1. Dodaj rejestr (nad `buildHeroTimeline`):
```js
// Każdy kierunek: prep() przed budową tl (stany startowe), bg(tl) w oknie 1.0–2.2,
// words === null -> classic wipe w applyWordReveal; cleanup przez klasę .js-hero-fx.
const HERO_DIRECTIONS = {
  'signature':       { label: 'Signature',   words: null,                  bg: bgLensBlur },
  'ink-melt':        { label: 'Ink Melt',    words: WORD_REVEALS.ink,      bg: bgChromaticMelt, prep: prepInk },
  'kinetic-portal':  { label: 'Kinetic',     words: WORD_REVEALS.kinetic,  bg: bgPortalZoom,    prep: prepChars },
  'decode-grid':     { label: 'Decode',      words: WORD_REVEALS.decode,   bg: bgGridReveal,    prep: prepChars },
  'editorial-slice': { label: 'Slice',       words: WORD_REVEALS.slanted,  bg: bgStrips,        prep: prepChars },
  // C1–C6 dopisywane w Etapie C
};
const getDirectionId = () => {
  if (REDUCED_MOTION) return 'signature';
  const id = localStorage.getItem('heroDirection');
  if (id && HERO_DIRECTIONS[id]) return id;
  return 'signature';
};
```
2. Wytnij z `buildHeroTimeline` gałęzie `if (transMode === ...)` do nazwanych
   funkcji `bgLensBlur(tl)`, `bgChromaticMelt(tl)`, `bgPortalZoom(tl)`,
   `bgGridReveal(tl)`, `bgStrips(tl)` — ciała 1:1, zero zmian logiki.
   Gałęzie archiwalne (`color-wipes`, `blob-expand`, `slash`) przenieś do
   `archive/hero-modes-archive.js` razem z archiwalnymi wpisami WORD_REVEALS.
3. Stany startowe nagłówków (obecne bloki `if (effectMode === 'ink') ... else if
   (isCustomTextAnim) ... else ...`) zamień na `prep`: `prepChars` (split +
   chars opacity 0), `prepInk` (opacity 0 + filter smoke), brak prep = classic
   (`clipPath: inset(0 100% 0 0)`). Usuń listę `isCustomTextAnim` (oba
   wystąpienia) i `getEffectMode()` — jedynym źródłem jest rejestr.
4. `updateScrambleGlobal`: warunek `effectMode !== 'decode'` zamień na
   `getDirectionId() !== 'decode-grid'`.
5. Wszystkie elementy DOM tworzone przez efekty (paski, siatki, ramki, svg)
   dostają dodatkowo klasę **`js-hero-fx`**; cleanup na początku budowy
   timeline zamień na jedną linię:
   `document.querySelectorAll('.js-hero-fx').forEach(el => el.remove());`
6. Migracja legacy: przy starcie, jeśli brak `heroDirection`, a są stare klucze —
   zmapuj (np. `effectMode=kinetic` → `kinetic-portal`; cokolwiek spoza 5 par →
   `signature`), zapisz `heroDirection`, usuń `effectMode` i `bgTransitionMode`.
**Akceptacja:** dla każdego z 5 kierunków zrzuty p-punktów identyczne
z baseline A0 (diff ≈ 0) na desktop 1440×900 i mobile 375×812.

### TASK-A2: nowy switcher
W `index.html` (edycja Pythonem — body to jedna linia!):
1. Zastąp CAŁĄ zawartość `#design-switcher` jedną sekcją „DIRECTION:" z 11
   przyciskami (na razie 5 — nowe dochodzą w Etapie C) wołającymi
   `setDirection('<id>')`; skrypt podświetlenia czyta `heroDirection`.
   `setDirection = id => { localStorage.setItem('heroDirection', id); location.reload(); }`.
2. Zostaw mechanizm `?dev=1` bez zmian.
3. Zaktualizuj `test_all_modes.py` i `test_hero_effects.py`: lista trybów =
   nowe id kierunków, klucz localStorage = `heroDirection`.
**Akceptacja:** bez `?dev=1` panelu nie ma; z `?dev=1` każdy przycisk
przełącza i podświetla się; stare klucze localStorage znikają po wizycie.

---

## 3. ETAP B — dopracowanie 5 zostawionych kierunków

Każdy task: osobno, po nim procedura weryfikacji z §6.

### TASK-B1 `signature` — usuń „podwójny obraz" i pogłęb obiektyw
1. Tło: do istniejącego `blur(20px) + scale 1.15` dodaj desaturację —
   `filter: 'blur(20px) grayscale(0.65)'` w tym samym tweenie (jeden string
   filter, nie dwa tweeny na filter!).
2. Znany zgrzyt: po wipe słowa czerwone narysowane litery (`rl-w1`) wiszą nad
   solidnym tekstem do @1.6 i gasną w 0.1 — widać moment „dwóch napisów".
   Prztymuj: fade `rl-w1` zacznij dokładnie z KOŃCEM wipe słowa 1
   (@1.3+0.3=1.6 → zacznij @1.55, duration 0.15). Analogicznie `rl-w2` dla
   słowa 2 (wipe @1.9+0.3 → fade @2.15, duration 0.15; obecnie fade siedzi
   dopiero @3.1 razem z `rl-mid` — `rl-mid` zostaw @3.1, rozdziel tween).
**Akceptacja:** na zrzutach wokół p≈0.18 i p≈0.24 nie ma klatki z jednocześnie
w pełni widocznym czerwonym obrysem i pełnym solidem; scrub w tył przywraca obrys.

### TASK-B2 `ink-melt` — napraw konflikt współdzielonego filtra
Diagnoza (zweryfikowana): oba słowa tweenują TEN SAM `#smoke-melt
feDisplacementMap`. Słowo 1: scale 80→0 @1.6–2.3, słowo 2: fromTo znów od 80
@2.2 — okna nachodzą się na 0.1 i słowo 1 (które wciąż ma filtr do @2.3)
dostaje z powrotem pełny melt.
1. W `index.html` zdubluj filtr: `#smoke-melt-1` i `#smoke-melt-2`
   (identyczna treść, inne id; edycja Pythonem).
2. `prepInk` + `WORD_REVEALS.ink`: słowo 1 używa `-1`, słowo 2 `-2`
   (przekaż index/id przez argument `headingEl` → wybór filtra po tym,
   który to nagłówek).
3. Tło `bgChromaticMelt` zostaje jak jest (już spójne stylistycznie).
**Akceptacja:** przy scrubie przez p≈0.24–0.26 słowo COSGRAL pozostaje ostre,
gdy „agency" się wywołuje; w tył — odwracalne; FPS reveal ≥ 50.

### TASK-B3 `kinetic-portal` — perspektywa + rama kadru
1. Bug: `kinetic` ustawia `transformOrigin '50% 100% -50px'`, ale NIE ustawia
   `transformPerspective` → rotationX renderuje się płasko. Dodaj w tweenie
   `transformPerspective: 1000` (wzór: tryby `zoom`/`flip` w archiwum).
2. Rama kadru: w `bgPortalZoom` stwórz div `.js-hero-fx.hero_portal_frame`
   (position absolute, inset odpowiadający startowemu `inset(22% 28%)`,
   `border: 1px solid #ee3335`, borderRadius 16px, zIndex nad bg) i animuj
   jego inset/borderRadius DOKŁADNIE tym samym easingiem i czasem co clip-path
   bg (`power3.inOut`, 1.2, @1.0), na końcu opacity→0 (duration 0.2 @2.1).
   Wrażenie: czerwona linia kadru „otwiera" zdjęcie na pełny ekran.
**Akceptacja:** litery mają widoczną głębię (skrót perspektywiczny na
zrzutach p≈0.2); rama idealnie skleja się z krawędzią clip-pathu w każdym
p-punkcie (nakładka diff), znika przed konwergencją.

### TASK-B4 `decode-grid` — z kremowej migawki na ciemną kurtynę z odsłoną
Obecnie: kremowe bloki 3×3 zakrywają ekran i hero znika twardym `set` @1.8 —
to jest ten „generyczny" moment.
1. Kolor bloków: `#1a1614`, plus `outline: 1px solid rgba(238,51,53,0.35)`.
2. Choreografia: bloki skalują się IN po przekątnej (delay `(row+col)*0.08`)
   @1.0–1.6 (zakrycie); @1.6 `set` bg `opacity 0` (pod przykryciem — bez
   twardego cięcia na oku); bloki skalują się OUT w odwrotnej kolejności
   delay `(maxSum-(row+col))*0.08` @1.7–2.15 odsłaniając już ciemną scenę
   z typografią.
3. Skaner: cienka linia `2px` `#ee3335` (`.js-hero-fx`), pełna szerokość,
   przejeżdża z góry na dół raz @1.0–1.6 i raz w górę @1.7–2.15
   (fromTo na `y`, ease 'none') — rymuje się ze scramble.
**Akceptacja:** żadnej klatki z twardym skokiem jasności (porównaj sąsiednie
p-punkty); scrub w tył odtwarza zakrycie/odsłonę symetrycznie.

### TASK-B5 `editorial-slice` — z kreskówki w editorial
1. `strips`: 5 → **7** kolumn; do tweenu każdej dodaj wewnętrznemu obrazowi
   delikatną skalę `scale: 1.06` z `transformOrigin` naprzemiennie
   `50% 0%`/`50% 100%`; ease `power3.inOut` (zamiast power2), stagger 0.08 zostaje.
2. Separatory: między kolumnami pionowe linie 1px `rgba(238,51,53,0.5)`
   (`.js-hero-fx`), fade-in @0.9–1.0, potem jadą razem ze swoją kolumną.
3. `slanted` (tekst): stonuj — `skewX: ±40` → `±16`, `y: ±100` → `±80`,
   `x: ±50` → `±28`; stagger 0.03 → 0.05, żeby rytm liter zgrał się z rytmem
   kolumn (0.08).
**Akceptacja:** kolumny i litery czytane jako JEDEN system (ten sam kierunek
naprzemienności); brak komiksowego przestrzelenia skew na zrzutach p≈0.2.

---

## 4. ETAP C — sześć NOWYCH kierunków (projekty wykonawcze)

Zasady wspólne dla C1–C6 (obowiązują każdy task):
- Wszystko w timeline `tl` przez `fromTo/to/set` — **zero** `setInterval`,
  zero `Math.random()` (wolno: `decodePseudoRandom(i, stała)` per indeks —
  deterministycznie od indeksu, NIE od czasu rzeczywistego).
- Okno tła: 1.0–2.2; hero niewidoczne najpóźniej @2.2; nic nie rusza
  konwergencji (2.2–3.1) ani masek filmowych (3.0–4.0). Elementy pomocnicze
  znikają (opacity 0) najpóźniej @2.2.
- Każdy tworzony węzeł DOM: klasa `js-hero-fx` (cleanup z A1 go sprzątnie).
- Reduced motion: kierunki NIE są dostępne (getDirectionId wymusza
  `signature`) — nie pisz osobnych wariantów.
- Rejestracja: wpis w `HERO_DIRECTIONS`, przycisk w switcherze, id w listach
  skryptów testowych. Po tasku: weryfikacja §6.

### TASK-C1 `letter-portal` — „Typograf" (priorytet 1, poziom signature)
**Zamysł:** widz patrzy na zdjęcie hero PRZEZ litery COSGRAL/agency — litery
są oknami. Kamera „dojeżdża" (litery rosną z przeskalowania do miejsca
docelowego), po czym okna zalewają się solidnym kolorem i stają się realnym
tekstem. Domknięcie konceptu pióra: pióro pisze litery, litery są soczewką,
soczewka staje się słowem.

**Implementacja:**
1. Funkcja `buildLetterPortal()` wołana w `prep` (po `document.fonts.ready`
   i po zbudowaniu root-line — glify już mają `d`):
   - Utwórz w kontenerze root-line (ten sam układ współrzędnych co
     `.hero_root_line` svg!) `<svg class="js-hero-fx hero_letter_portal">`
     z tym samym `viewBox`.
   - `<clipPath id="glyph-portal-clip" clipPathUnits="userSpaceOnUse">` z DWIEMA
     ścieżkami: `d` skopiowane z `DOM.rlW1.getAttribute('d')` i
     `DOM.rlW2.getAttribute('d')`; na ścieżkach `clip-rule="evenodd"`
     (inaczej znikną światła liter O/A/G/R).
   - W svg `<g class="portal-zoom-group">` z `<image>` (href = `src`
     `DOM.bg`, `preserveAspectRatio="xMidYMid slice"`, wymiary = viewBox),
     `clip-path="url(#glyph-portal-clip)"`.
   - Nakładka solidu: druga para tych samych ścieżek jako `<path>` z
     `fill: #f5f2ed`, `fill-rule="evenodd"`, `opacity: 0` (do „zalania").
2. Timeline:
   - @1.0–1.2: `DOM.bg` → `opacity 0.18, filter blur(10px)`; svg portal
     `opacity 0→1` (duration 0.2).
   - @1.0–1.5: zoom-dojazd: `gsap.fromTo(zoomGroup, { scale: 6 }, { scale: 1,
     ease: 'expo.inOut', duration: 0.5 })` z `svgOrigin` = środek bboxa
     ścieżki W1 (np. `DOM.rlW1.getBBox()` → `cx cy` w stringu svgOrigin).
   - @1.55–1.8: „zalanie" słowa 1 — solid-path W1 `opacity 0→1`; realny h2
     słowa 1 w tym kierunku reveal przez zwykły fade (words: własna funkcja
     `portalWords` — h2 `opacity 0→1` @1.6, bez split).
   - @1.9–2.15: to samo dla słowa 2.
   - @2.15–2.2: cały svg portal `opacity→0` (realne nagłówki przejmują scenę
     ZANIM ruszy konwergencja @2.2 — krytyczne!).
   - `DOM.hero` `opacity 0` @1.5 (zdjęcie żyje już tylko w literach).
3. Rejestr: `prep` = `prepPortal` (h2 `clipPath none, opacity 0`; budowa svg),
   `words` = `portalWords`, `bg` = `bgLetterPortal`.
4. Fallback: jeśli `!DOM.rlW1.getAttribute('d')` (brak glifów) → w `prep`
   przełącz zachowanie na `signature` (log warn, bez wysypki).
**Akceptacja:** w oknie 1.0–1.5 zdjęcie WYRAŹNIE czytelne wewnątrz konturów
liter (zrzut p≈0.14); światła liter zachowane; @p≈0.24 na scenie wyłącznie
realne nagłówki (portal zniknął); konwergencja rusza bez cienia portalu;
scrub w tył pełnowymiarowo odwracalny.

### TASK-C2 `darkroom` — „Ciemnia"
**Zamysł:** proces wywoływania odbitki — rym do masek filmowych dalej w sekcji.
1. `bgDarkroom(tl)`:
   - @1.0–1.25: bg → `filter: 'invert(1) brightness(2.1) contrast(1.35)'`
     (negatyw przepalony), ease power2.in.
   - @1.1: div `.js-hero-fx.hero_safelight` (inset 0, background `#ee3335`,
     `mix-blend-mode: multiply`, opacity 0) → `opacity 0.55` @1.1–1.35 —
     czerwone światło ciemniowe zalewa kadr.
   - @1.35–1.9: bg `opacity → 0` + `filter` wraca do
     `'invert(0) brightness(1) contrast(1)'` w tym samym tweenie (jeden
     string!); safelight `opacity → 0` @1.7–2.0.
   - Ziarno: div `.js-hero-fx.hero_grain` (inset 0, `filter: url(#grain)` —
     dodaj do `index.html` filtr `feTurbulence type="fractalNoise"
     baseFrequency="0.9" numOctaves="2" seed="11"` + `feColorMatrix` do mono;
     STATYCZNY — animuje się tylko `opacity` 0→0.35 @1.1, →0 @2.1).
2. `darkroomWords` (words): nagłówki bez split; per słowo fromTo
   `{ opacity: 0.12, filter: 'blur(14px) brightness(2.4)' }` →
   `{ opacity: 1, filter: 'blur(0px) brightness(1)', duration: 0.5,
   ease: 'power2.inOut' }` @1.6 / @2.2 — napis „dochodzi" jak obraz
   w wywoływaczu. `prep`: h2 `clipPath none, opacity 0.12 + blur` (spójny stan
   startowy dla scrubu wstecz).
**Akceptacja:** sekwencja negatyw → czerwień → czysta typografia czytelna na
zrzutach p ∈ {0.12, 0.16, 0.22}; filtr graniczny nie zostaje na bg po @1.9
(sprawdź computed style); ziarno statyczne (dwa zrzuty w tym samym p —
identyczne).

### TASK-C3 `outline-fill` — „Kontur"
**Zamysł:** najbliższy DNA strony — pióro rysuje, litery zostają obrysem
architektonicznym, wypełnienie „zalewa" je litera po literze; tło zwija się
jak rysunek techniczny (echo istniejącego zwinięcia hero `scaleX 0.05`).
1. `prep`: split obu nagłówków; char-spany:
   `color: transparent; -webkit-text-stroke: 1.5px #ee3335; opacity: 0`.
2. `outlineWords(tl, chars, headingEl, at)`:
   - faza obrys: `fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.2,
     stagger: 0.03 }, at)` — obrysy wchodzą tuż po przejeździe pióra
     (at = 1.6 / 2.2).
   - faza zalanie: `to(chars, { color: '#f5f2ed',
     webkitTextStroke: '0px rgba(238,51,53,0)', duration: 0.25,
     stagger: 0.04, ease: 'power2.inOut' }, at + 0.25)`.
     (GSAP animuje `webkitTextStroke` jako complex string — sprawdź w konsoli,
     że interpoluje; jeśli nie, animuj przez CSS variable
     `--stroke-c` + styl `-webkit-text-stroke: 1.5px var(--stroke-c)`.)
3. `bgBlueprint(tl)`:
   - @1.0–1.4: nakładka `.js-hero-fx.hero_blueprint_grid` (inset 0,
     `background: repeating-linear-gradient(90deg, rgba(238,51,53,.16) 0 1px,
     transparent 1px 8vw), repeating-linear-gradient(0deg, ...)`) fade-in 0→0.5;
     bg → `grayscale(1) contrast(0.9)`.
   - @1.4–2.0: bg + siatka `scaleX → 0.04, opacity → 0`
     (`transformOrigin: '50% 50%'`, ease `expo.inOut`) — kadr zamyka się do
     pionowej kreski (cytat z istniejącego zwinięcia `.section_hero`), potem
     kreska gaśnie.
**Akceptacja:** widoczna WYRAŹNA faza czystego obrysu (zrzut p≈0.19: litery
transparent + czerwony stroke); zalanie postępuje literami, nie całym słowem;
po p≈0.24 zero czerwonego stroke'a; scrub w tył przywraca obrysy.

### TASK-C4 `editorial-tear` — „Rozdarcie"
1. `bgTear(tl)`:
   - Dwa klony zdjęcia (wzór klonowania: gałąź `slash` w archiwum) w divach
     `.js-hero-fx.hero_tear_top/.hero_tear_bottom`, clip-path = poligon
     z POSTRZĘPIONĄ linią podziału po przekątnej (12–14 wierzchołków; offsety
     zygzaka policz `decodePseudoRandom(i, 42)*3.5%` — deterministyczne,
     zapisane raz przy budowie): góra `polygon(0 0, 100% 0, 100% 38%, …zygzak…,
     0 52%)`, dół dopełnienie z TYM SAMYM zygzakiem.
   - Pod klonami podłoga: div `#f5f2ed` ze znacznikami pasowania (dwa krzyżyki
     1px #ee3335 w rogach, pseudo-elementy lub inline svg).
   - @1.0–1.9: góra → `x: -13%, y: -6%, rotation: -2.6`, dół → `x: 12%,
     y: 7%, rotation: 2.2`, oba `opacity → 0` na końcówce (@1.7–1.9), ease
     `power3.inOut`; cień rozdarcia: na klonach
     `filter: drop-shadow(0 6px 18px rgba(0,0,0,0.45))` ustawiony w prep
     (statyczny — drop-shadow honoruje clip-path, box-shadow NIE).
   - `DOM.bg` `opacity 0` (set @1.0 — klony przejmują obraz od pierwszej klatki
     okna).
2. `tearWords`: stempel kolażowy — `fromTo(chars, { opacity: 0, scale: 1.18,
   rotation: (i) => (i % 2 ? 1.4 : -1.2), textShadow: '3px 3px 0 #ee3335' },
   { opacity: 1, scale: 1, rotation: 0, textShadow: '0px 0px 0 rgba(238,51,53,0)',
   duration: 0.35, stagger: 0.05, ease: 'power4.out' }, at)`; prep = `prepChars`.
**Akceptacja:** linia rozdarcia obu połówek IDENTYCZNA (dopełniające się
poligony — na zrzucie p≈0.13 brak prześwitu i brak nakładki); rotacje subtelne
(≤3°); podłoga ze znacznikami widoczna tylko w oknie 1.0–2.2.

### TASK-C5 `chromatic-dive` — „Obiektyw"
1. `bgDive(tl)`:
   - `prep`: `gsap.set(DOM.bg, { transformOrigin: '62% 38%' })` (punkt
     ogniskowej — dobierz raz pod kompozycję zdjęcia i zapisz w komentarzu).
   - @1.0–1.8: `scale 1 → 5.5`, ease `expo.in` + filtr `#liquid-chromatic`:
     `lc-disp` scale 0→60, `lc-red` dx 0→16, `lc-blue` dx 0→-16 (reuse
     istniejących node'ów — sprawdź, że `ink-melt` ich nie trzyma: filtr
     wolno współdzielić, bo kierunki są rozłączne per przeładowanie).
   - Winieta: div `.js-hero-fx.hero_vignette`
     (`background: radial-gradient(circle at 62% 38%, transparent 30%,
     #1a1614 78%)`, opacity 0→1 @1.2–1.8).
   - @1.75–1.9: bg `opacity → 0`; @1.9 `set` filter none + lc-* z powrotem
     na 0 (przez `set` w tl — odwracalne przy scrubie).
2. `diveWords`: kontr-ruch ostrości — per słowo (bez split):
   `fromTo(headingEl, { opacity: 0, scale: 1.45, filter: 'blur(9px)',
   letterSpacing: '0.14em' }, { opacity: 1, scale: 1, filter: 'blur(0px)',
   letterSpacing: '0em', duration: 0.5, ease: 'power3.out' }, at)`.
   UWAGA: `letterSpacing` zmienia szerokość → glify pióra liczone są dla
   spacing 0; w tym kierunku pióro NIE rysuje liter — patrz punkt 3.
3. W tym kierunku wyłącz odcinki literowe pióra (`rl-w1`/`rl-w2` opacity 0
   od startu przez prep), zostaw `rl-lead`/`rl-mid` (linia podróżuje, litery
   „łapią ostrość" same). To celowa wariacja sygnatury, nie jej usunięcie.
**Akceptacja:** dojazd czuć jako ruch W GŁĄB (ognisko poza centrum — kadr
ucieka asymetrycznie); aberracja narasta z dojazdem i znika przed @2.2;
typografia osiada bez rozjechania z konwergencją (spacing kończy na 0em
PRZED 2.2); FPS ≥ 45 na scrubie (filtr na przeskalowanym img jest drogi —
jeśli spada, ogranicz `lc-disp` scale do 40).

### TASK-C6 `slit-drip` — „Slit-scan"
1. `bgSlitDrip(tl)`:
   - 24 pionowe paski (wzór: gałąź `strips`, ale `numStrips = 24`, zIndex 1,
     wewnętrzny obraz przesunięty per pasek jak w oryginale).
   - Per pasek `i`: `to(innerImg, { scaleY: 1.4 + decodePseudoRandom(i, 7) * 2.2,
     transformOrigin: '50% 0%', ease: 'power2.in', duration: 0.7 },
     1.0 + decodePseudoRandom(i, 13) * 0.35)` + pasek `opacity → 0`
     (duration 0.3, @1.55 + pseudoRandom(i,19)*0.3) — obraz „ścieka" i gaśnie
     paskami.
   - `DOM.bg` opacity 0 (set @1.0). Wszystko musi zgasnąć ≤ @2.2.
2. `slitWords`: litery z pionowych szczelin — `fromTo(chars,
   { clipPath: 'inset(100% 0 0 0)', y: 14, opacity: 1 },
   { clipPath: 'inset(0% 0 0 0)', y: 0, duration: 0.4,
   stagger: { each: 0.04, from: 'random' } — NIE: 'random' łamie determinizm →
   użyj `each: 0.04, from: 'start'` albo tablicy delayów z decodePseudoRandom },
   at)`; co czwarta litera dodatkowo `color: #ee3335` → kolor bazowy
   (duration 0.15, od at+0.3) — cyfrowy akcent.
   `prep`: `prepChars` + na char-spanach startowy `clipPath: 'inset(100% 0 0 0)'`.
**Akceptacja:** rytm pasków nieregularny ale IDENTYCZNY między przeładowaniami
i kierunkami scrubu (dwa zrzuty p≈0.15 z dwóch przejazdów — diff 0);
24 paski nie duszą FPS (≥ 50); litery wynurzają się ze szczelin, nie fade'ują.

---

## 5. ETAP D — domknięcie

### TASK-D1: sanity + porządek
- `python scripts/check-agents.py` i `python scripts/validate-profiles.py`
  (z rootu repo) — muszą przechodzić (nie ruszaliśmy agentów, ale sprawdź).
- Grep po `effectMode` i `bgTransitionMode` — jedyne wystąpienia: migracja
  legacy z TASK-A1. Zero odwołań do archiwum z plików ładowanych w HTML.
- Konsola: zero błędów/warningów GSAP we WSZYSTKICH 11 kierunkach
  (desktop + mobile), poza ewentualnym znanym 404 `/ccss/...` jeśli wciąż jest.

### TASK-D2: rejestr technik (samorosnąca biblioteka)
Dopisz nowe nazwane techniki do `profiles/site-clone-registry.yaml`
(sekcja `techniques`) i `references/site-dna/effects-library.yaml`:
`cosgral-letter-portal`, `cosgral-darkroom-develop`, `cosgral-outline-fill`,
`cosgral-editorial-tear`, `cosgral-chromatic-dive`, `cosgral-slit-drip`
(po wzorze istniejących wpisów: opis, biblioteka=GSAP/SVG, plik źródłowy).

### TASK-D3: bramki QA
Agenci: `style-qa`, `concept-guardian` (sekcja 1 = signature moment),
`performance-warden` (LCP < 4s, CLS < 0.25 — filtry SVG w C2/C5 to główne
ryzyko), `accessibility-steward` (reduced-motion → signature; brak
migotania > 3 Hz w żadnym kierunku), `awwwards-juror` (cel ≥ 7.5/10;
`letter-portal` zgłoś jako signature-kandydata).

---

## 6. Procedura weryfikacji (po KAŻDYM tasku)

1. `sessionStorage.clear(); localStorage.setItem('heroDirection','<id>')` → reload
   z `?dev=1`.
2. Przejazd po p-punktach {0, .12, .2, .3, .45, .6, .75, .9, 1} (snippet
   z `HERO-EFFECTS-BLUEPRINT.md` TASK-00) + zrzuty do
   `test-output/directions/<id>/`.
3. Scrub w tył p=1→0 — stan wraca do wyjściowego (zero „duchów": pasków,
   ramek, filtrów, koloru na literach).
4. Konsola czysta; `document.querySelectorAll('.js-hero-fx').length` po
   przeładowaniu w innym kierunku = tylko elementy bieżącego kierunku.
5. Mobile 375×812 — ta sama choreografia (różni się tylko wysokość masek
   filmowych — poza zakresem).
6. Diff z baseline tam, gdzie task obiecuje brak zmian wizualnych.

## 7. Twarde zasady (bez wyjątków)

1. Nie usuwać ani nie spłycać signature momentu (pióro piszące COSGRAL/agency).
   Jedyny dozwolony wariant: C5 wyłącza odcinki literowe pióra świadomie.
2. Konwergencja (2.2–3.1) i maski filmowe (3.0–4.0) — nietykalne.
3. Scrub-safe wszędzie: zero `setInterval`, zero `Math.random()` w budowie
   i onUpdate; determinizm przez `decodePseudoRandom`.
4. Archiwum = przeniesienie, nie kasacja. `index_stable.html` i `styles.css`
   nie dotykać (nieużywane przez index.html).
5. Kolejność ładowania CSS/JS bez zmian.
6. Edycje `index.html` wyłącznie Pythonem (body = jedna linia).
7. Task niedomknięty, dopóki jego akceptacja nie jest spełniona; po 2 nieudanych
   podejściach do tego samego tasku — STOP i raport dla człowieka.

## 8. Definition of Done

- [ ] Switcher: 11 przycisków, jeden wymiar (`heroDirection`), tylko z `?dev=1`.
- [ ] 5 kierunków z kuracji dopracowane wg B1–B5, zero regresji vs baseline
      poza zamierzonymi zmianami.
- [ ] 6 nowych kierunków z C1–C6 wdrożone, każdy przechodzi §6.
- [ ] Archiwum w `archive/hero-modes-archive.js`, nieładowane.
- [ ] Legacy klucze localStorage migrowane i czyszczone.
- [ ] Reduced-motion → zawsze `signature`.
- [ ] Rejestry technik zaktualizowane (D2), bramki QA bez FAIL (D3).
