# HERO-CLEAN-INTRO-PLAN — jedno czyste intro zamiast 11 efektów

> Plan wykonawczy dla modelu-wykonawcy. ZASTĘPUJE `HERO-DIRECTIONS-PLAN.md`
> (tamten kierunek — 11 przełączalnych efektów — został wykonany, obejrzany
> i ODRZUCONY przez właściciela: „żaden z tych efektów nie jest dobry").
> Nowa decyzja: **jedno** intro — proste, funkcjonalne, clean, designerskie.
> Zero trybów, zero filtrów, zero gadżetów. Jakość przez dyscyplinę, nie ilość.
> Zakres: preloader + sekcja 1 (`.hero_stack_wrapper`). Reszty strony nie dotykać.

---

## 0. Diagnoza — dlaczego obecny stan wygląda źle (nie powtarzać tych błędów)

1. **11 konkurujących efektów** = brak punktu widzenia. Różnorodność czyta się
   jako niezdecydowanie, nie kunszt. Premium studia mają JEDEN język ruchu.
2. **Filtry SVG** (blur, displacement, chromatic) na dużym tekście/zdjęciu
   renderują się tanio i tną FPS. W finalnej wersji: zero filtrów.
3. **Elastic/bounce easing** czyta się zabawkowo. Premium = expo, nic więcej.
4. **Pin 900% vh** — przejście ciągnie się w nieskończoność; użytkownik scrolluje
   i scrolluje wewnątrz jednej sekcji. Nuda zabija efekt.
5. **Wejście po preloaderze to płaski fade** — obecny kod robi
   `autoAlpha 0→1` na navbar + wszystkich dzieciach hero naraz (stagger 0.05).
   Pierwsze 3 sekundy strony — moment, w którym agencja ocenia agencję —
   nie mają żadnej choreografii. To jest główna dziura do załatania.
6. Cała energia szła w scroll, a pierwszy paint był ignorowany.

## 1. System ruchu (obowiązuje KAŻDY tween w tym planie — bez wyjątków)

| Reguła | Wartość |
|---|---|
| Motyw przewodni | wszystko porusza się w PIONIE, przez maski/kurtyny. Preloader wyjeżdża w górę → linie nagłówka wynurzają się z masek → przy scrollu wyjeżdżają w górę → ciemna kurtyna nasuwa się na zdjęcie → pióro pisze → maski filmowe otwierają się pionowo. Jeden język. |
| Easing | wejścia: `expo.out` · przejścia/wyjścia: `expo.inOut` · mikro-fade: `power2.out`. ZAKAZANE: elastic, bounce, back > 1.2, wszystkie „fun" easingi. |
| Czasy | tylko z drabinki: 0.3 / 0.6 / 0.9 / 1.2 / 1.6 s. Stagger: 0.08 (linie), 0.05 (meta). |
| Kolor | #1a1614 (ciemny), #f5f2ed (krem). Czerwień #ee3335 WYŁĄCZNIE jako cienkie linie: pióro 2.5px, pasek postępu 1px, licznik. Żadnych czerwonych płaszczyzn, ram, cieni. |
| Filtry | zero `filter:` (CSS i SVG) w całej sekcji 1. |
| Typografia | na loadzie animują się LINIE (maski), nigdy pojedyncze litery. Jedyny moment literowy = pióro piszące COSGRAL/agency (to jest signature i zostaje). |
| Scrub-safe | jak dotąd: zero setInterval, zero Math.random, wszystko odwracalne. |

## 2. Storyboard — pierwsze ~5 sekund + scroll (intencja dla wykonawcy)

```
0.0s  Czarny ekran #1a1614. Dół: 1px czerwona linia postępu rośnie 0→100%.
      Lewy dół: "cosgral.agency" (mały, krem). Prawy dół: licznik mono 001→100.
1.5s  Licznik dochodzi do 100. Tekst i licznik gasną (0.3s).
1.8s  CAŁA ciemna płaszczyzna unosi się jak kurtyna (yPercent -100, 0.9s,
      expo.inOut). Pod nią hero już skomponowane i załadowane (img eager).
2.2s  (kurtyna w ~40% drogi — OVERLAP, nie sekwencja) zaczyna się wejście hero:
      • zdjęcie osiada: scale 1.08→1.0, 1.6s expo.out
      • "THE CRAFT OF" / "DIGITAL" — dwie linie wynurzają się z masek
        (yPercent 110→0, 0.9s, stagger 0.08, expo.out)
      • na końcu meta: navbar, labelki Creative/Studio, scroll-hint
        (autoAlpha + y 12→0, 0.6s, stagger 0.05)
3.6s  Spokój. Strona stoi. Scroll należy do użytkownika.

SCROLL (pin skrócony do 400%):
  faza 1: zdjęcie lekko paralaksuje; linie H1 wyjeżdżają W GÓRĘ przez swoje
          maski (lustro wejścia — symetria = dyscyplina).
  faza 2: ciemna kurtyna (#1a1614) nasuwa się od dołu na zdjęcie (echo
          preloadera — TEN SAM gest). Zero blur, zero fade na zdjęciu.
  faza 3: na ciemnej scenie pióro rysuje COSGRAL → agency (istniejący
          signature: czerwona linia + clip-wipe zsynchronizowany).
  faza 4: konwergencja słów do środka — expo.inOut zamiast elastic (bez
          gumowego odbicia). Maski filmowe otwierają się jak dotąd.
```

---

## 3. Zadania (wykonywać po kolei; po każdym — weryfikacja z §4)

### TASK-0: przygotowanie
1. Serwer: `cd <root>/cosgral-main && python -m http.server 8931`, strona
   `http://127.0.0.1:8931/designkopia/cosgral-agency/index.html`.
2. Zrzut baseline pełnego przejazdu (p ∈ {0,.2,.3,.4,.5,.7,1}) obecnego
   `signature` do `test-output/clean-intro-baseline/`.
3. Testy w przeglądarce: `sessionStorage.clear()` przed każdym testem
   pierwszej wizyty; karta musi być WIDOCZNA (ukryta karta = rAF stoi =
   preloader wisi na 001 — to nie bug).

### TASK-1: wyburzenie maszynerii 11 kierunków
1. Skopiuj obecny `cosgral-hero-effects.js` do
   `archive/cosgral-hero-effects-directions.js` (archiwum, NIE podpinane).
2. W produkcyjnym `cosgral-hero-effects.js` zostaw wyłącznie ścieżkę
   `signature` (classic wipe + pióro). Usuń: `HERO_DIRECTIONS`,
   `getDirectionId`, wszystkie funkcje `bg*`/`*Words`/`prep*` poza
   `prepClassic`, `updateScrambleGlobal` + jego wywołanie w onUpdate,
   `decodePseudoRandom`, `ensurePortalSvg`, `scrambleTextEffect`,
   `LEGACY_DIRECTION_MAP`. Przy starcie: `localStorage.removeItem('heroDirection')`
   (i stare `effectMode`/`bgTransitionMode` — jednorazowe sprzątanie).
3. Z `index.html` usuń (Pythonem — body to jedna linia!):
   - cały panel `#design-switcher` + skrypt podświetlania + `setDirection`,
   - blok `<style>` z klasami `body.direction-*` i skrypt dodający
     `direction-*` do body; zamiast tego zostaw minimalny strażnik FOUC:
     `<style>[data-vv="1"] h2, [data-vv="2"] h2 { clip-path: inset(0 100% 0 0); }</style>`
     (JS i tak nadpisze gsap-em; to tylko stan przed JS),
   - nieużywane defs SVG: `#smoke-melt-1`, `#smoke-melt-2`, `#hero-grain`,
     `#liquid-chromatic` (z `#lc-*`), `#blob-clip`/`#blob-path`.
4. **Akceptacja:** strona działa identycznie jak baseline `signature` z TASK-0
   (diff zrzutów ≈ 0); w konsoli zero błędów; grep po `heroDirection|HERO_DIRECTIONS|
   design-switcher|smoke-melt` w plikach ładowanych przez HTML = 0 trafień.

### TASK-2: preloader — restyling i wyjście-kurtyna
Markup zostaje (`.u-preloader`, `[data-counter]`, `.preloader_loader_fill`,
`.preloader_bg`); zmienia się wygląd i wyjście. Logika `hasVisited` /
`shouldScrollToFilms` / pauzowanie smoothera — bez zmian.
1. Styl (nadpisz w `cosgral-brand.css`):
   - `.preloader_bg`: **usuń** obecny clip-path z „dziurką" (keyhole) —
     pełna płaszczyzna `#1a1614`, inset 0.
   - `.preloader_loader`: przypnij do dołu ekranu (left 0, bottom 0,
     width 100vw, height 1px, bez rotacji/transformów startowych);
     `.preloader_loader_fill`: height 1px, background `#ee3335`.
   - `.preloader_content`: licznik mono w prawym dolnym rogu (padding 2rem),
     „cosgral.agency" w lewym dolnym. Usuń tekst „Loading…" (zostaw sam
     licznik `001`).
2. Timeline pierwszej wizyty (przebuduj istniejący):
   - 0–1.5s: licznik 001→100 (zostaje), fill width 0→100% (zostaje),
     `ease: 'none'` na fill (pasek postępu nie powinien „przyspieszać").
   - 1.5s: `[data-preloader-text]` → `autoAlpha 0`, 0.3s, power2.out.
   - 1.7s: **kurtyna**: cały `.u-preloader` → `yPercent: -100`, 0.9s,
     `expo.inOut`. Usuń obecne tweeny „rozjazdu" bg (width/height/clip-path
     morph) — wyjeżdża jedna płaszczyzna, koniec.
   - `onComplete` jak dotąd (scroll-lock off, smoother unpause, refresh,
     hasVisited). `display:none` na preloaderze po zjeździe.
3. Wejście hero (TASK-3) startuje w momencie 40% kurtyny — pozycja `1.7 + 0.36`
   w tym samym timeline (overlap; NIE sekwencyjnie po onComplete).
4. Wizyta powtórna (`hasVisited`): preloader od razu `display:none` (jak jest),
   ale wejście hero z TASK-3 gra w wersji przyspieszonej ×0.7.
5. **Akceptacja:** pierwsza wizyta = storyboard z §2 (zrzuty w 0.5s/1.6s/2.0s/
   2.6s/3.6s od loadu); od 100 na liczniku do pełnego hero < 1.6s; brak
   mignięcia niezaładowanego zdjęcia (img jest `loading="eager"
   fetchpriority="high"` — zostaje).

### TASK-3: choreografia wejścia hero (load, nie scroll)
Nowa funkcja `playHeroEntrance({ fast })` w `cosgral-hero-effects.js`,
wołana z timeline preloadera (pierwsza wizyta) lub bezpośrednio (powtórna,
`fast: true` → wszystkie duration ×0.7, bez opóźnień startowych).
1. **Maski linii H1.** Markup H1: `<span.hero_heading_first>THE</span>
   <span.hero_heading_second>CRAFT</span> <span.hero_heading_third>OF</span>
   <span.hero_heading_bottom>DIGITAL</span>` — wizualnie 2 linie
   („THE CRAFT OF" / „DIGITAL"). W JS owiń każdą wizualną linię we wrapper
   `overflow:hidden; display:block` (linia 1 = trzy pierwsze spany w jednym
   wrapperze inline-blocków; linia 2 = `.hero_heading_bottom`). UWAGA:
   zrób to PRZED `buildRootLinePath()` i przed pomiarami GSAP; H1 nie jest
   nagłówkiem VV, więc `lockHeading` nie blokuje — ale sprawdź, że
   `[data-hero-heading="main"]` nadal łapie się w DOM cache.
2. Sekwencja (pozycje względem startu wejścia):
   - 0.0: `.hero_bg` `scale 1.08 → 1`, 1.6s, expo.out (transformOrigin 50% 50%).
   - 0.1: linie H1 `yPercent 110 → 0`, 0.9s, stagger 0.08, expo.out.
   - 0.7: meta — `.u-navbar`, `.hero_decor` (labelki Creative/Studio),
     scroll-hint: `autoAlpha 0→1, y 12→0`, 0.6s, stagger 0.05, power2.out.
3. USUŃ z timeline preloadera obecny płaski fade
   `.to([DOM.navbar, DOM.heroChildren], { autoAlpha: 1 … })` — zastępuje go
   ta choreografia. Stany startowe (`autoAlpha 0` na meta, `yPercent 110`
   na liniach, `scale 1.08` na bg) ustawiaj gsap.set-em na starcie skryptu,
   żeby nic nie mignęło.
4. **Interakcja ze scrollem:** scroll jest zablokowany do końca kurtyny
   (scroll-lock istnieje) — wejście nie może się gryźć z pin-timeline.
   Timeline scrollowy (TASK-4) animuje linie H1 od `yPercent 0`, więc po
   wejściu stany się zgadzają. `invalidateOnRefresh` zostaje.
5. **Akceptacja:** wejście gra raz, nie odpala się ponownie przy resize;
   scrub w dół zaraz po wejściu płynnie przejmuje linie (bez skoku);
   wizyta powtórna: szybka wersja bez preloadera; reduced-motion: linie
   pojawiają się bez przesuwu (sam autoAlpha 0.3s), zdjęcie bez skali.

### TASK-4: faza scroll — skrócenie i kurtyna zamiast blur/fade
W `buildHeroTimeline`:
1. **Pin:** `end: '+=900%'` → `'+=400%'` (reduced-motion zostaje `'+=300%'`).
   **Scrub:** `1.6` → `1`. Pozycje t=0..5 w timeline zostają — po prostu
   przelicznik scrolla jest krótszy.
2. **Wyjście H1 (t 0.3→0.9):** linie H1 `yPercent 0 → -110` przez maski
   (lustro wejścia), expo.inOut; labelki/meta `autoAlpha → 0`, 0.3, power2.out.
   ZASTĘPUJE obecne tweeny `opacity 0` na headingMain/First/Third @0.62.
3. **Kurtyna (t 1.0→1.6):** nowy div `.hero_takeover` w `.section_hero`
   (position absolute, inset 0, background `#1a1614`, `yPercent: 100`,
   z-index nad zdjęciem i overlayem, tworzony raz w JS z klasą `js-hero-fx`):
   `yPercent 100 → 0`, expo.inOut. USUŃ `bgLensBlur` (blur/grayscale/fade
   na zdjęciu) — zdjęcie zostaje nietknięte pod kurtyną; @1.7 `set` na
   `.hero_bg` `visibility hidden` (oszczędność kompozycji), odwracalny.
4. **Pióro + wipe (t 1.0→2.2):** bez zmian mechaniki (rysowanie rl-lead/w1/
   mid/w2 + clip-wipe @1.3/@1.9 + fade obrysu tuż przed końcem wipe — fix
   już wdrożony). Pióro rysuje na tle kurtyny — sprawdź z-index:
   `.hero_root_line` i `.vv_wrapper` muszą być NAD `.hero_takeover`
   (są rodzeństwem `.section_hero`, więc wystarczy, że kurtyna siedzi
   wewnątrz section_hero).
5. **Konwergencja (t 2.2→3.1):** `ease: 'elastic.out(1.1, 0.4)'` →
   `'expo.inOut'`, duration 0.9 zostaje. (Reduced-motion: bez zmian.)
6. **Maski filmowe (t 3.0→4.0):** bez zmian.
7. **Akceptacja:** pełny przejazd scrolla przez sekcję 1 zajmuje ~4 ekrany
   zamiast 9; na żadnej klatce zdjęcie nie jest rozmyte/odbarwione — znika
   wyłącznie pod kurtyną; scrub w tył: kurtyna zjeżdża, linie wracają
   z masek, zero duchów; konwergencja bez odbicia.

### TASK-5: higiena i testy
1. `test_all_modes.py` → przemianuj mentalnie na test jednego flow: lista
   trybów = `["default"]` (bez ustawiania localStorage); dodaj drugi
   przebieg z `reduced_motion="reduce"`. `test_hero_effects.py`: usuń
   ustawianie `heroDirection`; testuje default + reduced-motion + powtórną
   wizytę (`hasVisited=true` → brak preloadera, szybkie wejście).
2. Konsola czysta na: pierwszej wizycie, powtórnej, mobile 375×812,
   reduced-motion. Zero odwołań do usuniętych id/klas.
3. Perf sanity: w DevTools Performance przejazd scrolla bez long-tasków
   > 50ms pochodzących z hero (filtry wycięte, więc głównym kosztem zostaje
   `updateDynamicPaths` — jest już gate'owany do okna konwergencji).
4. **Akceptacja:** oba skrypty przechodzą; zrzuty flow w
   `test-output/clean-intro/`.

---

## 4. Procedura weryfikacji (po każdym tasku)

1. Pierwsza wizyta: `sessionStorage.clear()` → reload w WIDOCZNEJ karcie →
   obejrzyj/zrzuć storyboard (0.5/1.6/2.0/2.6/3.6s).
2. Scroll: przejazd programowy po p ∈ {0,.1,.2,.3,.4,.5,.6,.8,1} — zrzuty;
   scrub w tył p=1→0 — stan wraca (kurtyna w dół, linie z masek, zero duchów).
3. Konsola: zero błędów i warningów GSAP.
4. Mobile 375×812: ta sama choreografia (maski filmowe mają swoją wysokość —
   bez zmian).
5. Reduced-motion: bez przesuwów linii i skali zdjęcia; treść w 100% dostępna.

## 5. Twarde zasady

1. Signature (pióro piszące COSGRAL/agency + clip-wipe) — NIETYKALNE poza
   opisanymi zmianami otoczenia.
2. Konwergencja i maski filmowe — tylko zmiana easingu konwergencji (TASK-4.5).
3. Każdy tween wg systemu z §1 (easing/czasy/kolor/zero filtrów). Jeśli
   czegoś nie da się zrobić w tych ramach — nie rób, zgłoś.
4. Edycje `index.html` wyłącznie Pythonem. `index_stable.html`, `styles.css`,
   `.backup-pre-hero-refactor/` — nie dotykać.
5. Kolejność ładowania CSS/JS bez zmian.
6. Po 2 nieudanych podejściach do tasku — STOP, raport dla człowieka.

## 6. Definition of Done

- [ ] Zero przełączników, zero trybów; jeden flow opisany w §2.
- [ ] Pierwsza wizyta: preloader-kurtyna → choreografia wejścia (nie fade).
- [ ] Scroll: pin 400%, kurtyna zamiast blur/fade, konwergencja bez elastic.
- [ ] Zero `filter:` w sekcji 1; zero elastic/bounce w całym pliku.
- [ ] Archiwum 11 kierunków w `archive/`, produkcyjny JS odchudzony.
- [ ] Testy zaktualizowane i zielone; konsola czysta; reduced-motion działa.
