# HERO-EFFECTS-BLUEPRINT — sekcja 1 (`.section_hero` / hero stack)

> Wykonywalny plan pracy nad efektami SEKCJI 1 strony `cosgral-agency/index.html`.
> Adresat: model AI-wykonawca (Claude/Cursor/inny agent) pracujący w tym repo.
> Autor planu: audyt z 2026-07-17 (kod + sonda DOM w działającej przeglądarce).
> Zakres: WYŁĄCZNIE sekcja 1 = `.hero_stack_wrapper` (hero + napis korzeniem
> COSGRAL/agency + maski filmowe). Innych sekcji NIE dotykać.

---

## 0. Kontekst — co to za strona i co jest sekcją 1

`index.html` to klon voyeurverite.com (Webflow) przebrandowany na COSGRAL (lane
SPLICE z `profiles/site-clone-registry.yaml`). Sekcja 1 to przypięty (pin) blok
`.hero_stack_wrapper` scrubowany przez ~900% wysokości viewportu, w którym kolejno:

1. **Hero** — zdjęcie tła `.hero_bg` (skala 1.05→1), nagłówek H1
   `[data-hero-heading="main"]` „THE CRAFT OF DIGITAL", overlay mix-blend.
2. **Zwinięcie hero** — `.section_hero` → `opacity:0, scaleX:0.05, scaleY:0.94`.
3. **Signature moment: „korzeń"** — czerwona linia SVG (`.hero_root_line`, 5 ścieżek:
   `rl-lead`, `rl-w1`, `rl-mid`, `rl-w2`, `rl-tail`) rysuje piórem napisy
   **COSGRAL** i **agency** z prawdziwych konturów glifów (JSON `#root-line-glyphs`,
   fontTools), dokładnie w miejscu, gdzie stoją realne nagłówki `[data-vv="1"] h2`
   i `[data-vv="2"] h2`; po narysowaniu litery są podmieniane na solidny tekst
   (clip-path wipe albo jeden z 16 trybów efektów).
4. **Konwergencja** — oba napisy zjeżdżają elastycznie do środka (spotykają się).
5. **Maski filmowe** — `[data-film="1"]` (od dołu) i `[data-film="2"]` (od góry)
   otwierają się clip-pathem na pełny ekran.

To jest signature moment projektu w rozumieniu `profiles/signature-craft.yaml` —
**nie wolno go usunąć ani spłycić**, można go tylko stabilizować i podnosić jakość.

---

## 1. Mapa plików (kto czym steruje)

| Plik | Rola w sekcji 1 |
|------|-----------------|
| `index.html` | CAŁA logika hero siedzi w **inline** skryptach (body = jedna zminifikowana linia 355!). Kluczowy jest inline skrypt #10 (~47 kB, zaczyna się od `window.Webflow.push(() => { const lockHeading = ...`) — DOM cache, budowa root-line, timeline desktop + mobile, 16 trybów efektów. Ponadto: #3 (podmiana labeli VV przed pomiarem), #4/#42 (switcher trybów, localStorage `effectMode`), #5 (`#root-line-glyphs` JSON), #7 (ScrollSmoother 0.45 + `smootherReady`), #15 (SplitText `[data-heading]`), #20 (preloader z licznikiem), #21 (`ScrollTrigger.sort()/refresh()`). |
| `cosgral-brand.css` | m.in. `.hero_decor { display:none !important }` (L78), stabilizacja fontów, style `.hero_root_line` (stroke #e82323, 2.5px). |
| `cosgral-layout-fix.css` | poprawki layoutu po splice. |
| `cosgral-hero-fix.js` | podmiana labeli na COSGRAL/agency, ukrycie decor, `fixVvConvergence()` — **nadpisuje x tweenów konwergencji własnym wzorem** (patrz: problem P4). |
| `cosgral-tuning.js` | kill kursorów, ScrollSmoother→0.45, `tuneHeroReadability()` ustawia `st.end = start + innerHeight*9`. |
| `cosgral-splice.js` | tylko sekcja parhouse — NIE dotyczy hero. |
| `styles.css` | **UWAGA-PUŁAPKA: NIE jest podlinkowany w `index.html`** (należy do starszego wariantu / `index_stable.html`). Edycja tego pliku nic nie zmieni w sekcji 1. |
| `index_stable.html` | zamrożona kopia zapasowa — nie ruszać, służy jako punkt odniesienia. |

Kolejność ładowania warstw (twarda zasada z `site-clone-registry.yaml`):
`webflow shared CSS → cosgral-splice.css → cosgral-brand.css → cosgral-layout-fix.css`,
JS: `gsap+pluginy → webflow.js → cosgral-splice.js → cosgral-tuning.js → cosgral-hero-fix.js → …`.
**Nie zmieniać tej kolejności.**

GSAP 3.15 + ScrollTrigger + ScrollSmoother + MorphSVG + SplitText + ScrollToPlugin
ładowane z CDN webflow. Timeline hero: `scrub: 1.6`, `pin: true`, `end: '+=900%'`.

---

## 2. Oś czasu hero (pozycje w timeline `tl`, desktop)

| Pozycja | Co się dzieje |
|---------|---------------|
| 0 → 1 | `.hero_bg` skala →1; przy 0.62 fade-out H1 + (martwe) tweeny `.hero_decor` |
| 1 → 1.3 | `.section_hero` zwija się (`scaleX:0.05`); `rl-lead` rysuje się, potem cofa |
| 1.3 → 1.6 | `rl-w1` (litery COSGRAL) rysuje się; reveal słowa 1 (classic: clip-path wipe @1.3; tryby custom: @1.6) |
| 1.6 → 1.9 | `rl-w1` znika (0.1s), decor+opis słowa 1 fade-in @1.65, `rl-mid` rysuje się |
| 1.9 → 2.2 | `rl-w2` (litery agency) rysuje się; reveal słowa 2 |
| 2.2 → 3.1 | konwergencja `v1`/`v2` (elastic 0.9s) do `getVvMeetTargets()`; `rl-tail` rysuje i cofa; @3.1 fade `rl-mid`+`rl-w2` |
| 3.0 → 4.0 | maski filmowe otwierają się (desktop: `h → innerHeight+10`; mobile: `innerHeight/2+1`) |
| 4.0 → 5.0 | hold pin; `pointerEvents:auto` na filmach |

`onUpdate` timeline woła co klatkę: `updateAllMasks()` (throttle 48 ms),
`updateScrambleGlobal()` (aktywny tylko w trybie `decode`), `updateDynamicPaths()`
(przelicza getBoundingClientRect + przepisuje `d` wszystkich ścieżek — ZAWSZE).

---

## 3. Matryca 16 trybów efektów (switcher, `localStorage.effectMode`)

Panel `#design-switcher` (fixed, prawy dół) przełącza tryb i robi `location.reload()`.

| # | Tryb | Stan | Decyzja |
|---|------|------|---------|
| 1 | `classic` | działa (clip-path wipe zsynchronizowany z korzeniem) | **domyślny — zostaje** |
| 2 | `liquid` | **BRAK JAKIEJKOLWIEK IMPLEMENTACJI** — przycisk jest, w JS nie ma ani jednej gałęzi `liquid`; zachowuje się jak classic | zaimplementować (TASK-05) albo usunąć przycisk |
| 3 | `spark` (Neon/Lens) | szczątkowy — tylko `blur(10px)→0` nałożony na classic | wzmocnić (TASK-06) |
| 4 | `kinetic` | działa (rotationX -90, back.out per litera) | zostaje |
| 5 | `glitch` | działa (scaleY 4, skew, cyan/red textShadow) | zostaje |
| 6 | `ink` | **ZEPSUTY** — ustawia `filter: url(#smoke-melt)`, ale filtr `#smoke-melt` NIE ISTNIEJE w DOM (sonda: `querySelectorAll('#smoke-melt').length === 0`); tween celuje w `#smoke-melt feDisplacementMap` = null | naprawić (TASK-04) |
| 7 | `particles` | działa (random rozsypka → skupienie) | zostaje |
| 8 | `slanted` | działa | zostaje |
| 9 | `strobe` | działa, ale migotanie = ryzyko WCAG 2.3.1 (fotosensytywność) | ograniczyć/oflagować (TASK-08) |
| 10 | `matrix` | działa | zostaje |
| 11 | `vortex` | działa | zostaje |
| 12 | `slingshot` | działa | zostaje |
| 13 | `decode` | działa, ale **niedeterministyczny** — `Math.random()` w `updateScrambleGlobal` na każdy update; scrub w tył daje inny obraz niż w przód; hardcode koloru `#ee3335` | naprawić deterministycznie (TASK-07) |
| 14 | `zoom` | działa | zostaje |
| 15 | `flip` | działa | zostaje |
| — | (brak przycisku 16) | lista `isCustomTextAnim` zawiera 12 trybów; `liquid`/`spark` poza nią | uporządkować |

---

## 4. Audyt — problemy do naprawienia (priorytety)

### P0 — funkcjonalnie zepsute
- **P0-a `ink`:** brak `<filter id="smoke-melt">` w DOM. Nagłówki dostają
  `filter: url(#smoke-melt)` + w gałęzi ink `opacity:0→1`; odwołanie do
  nieistniejącego filtra w Chrome potrafi w ogóle nie namalować elementu, a tween
  `#smoke-melt feDisplacementMap` jest no-opem. Efekt: tryb 6 = puste/niepewne renderowanie.
- **P0-b `liquid`:** przycisk bez implementacji (mylący dla klienta przy demo).
- **P0-c martwy `<link href="/ccss/aa144e753af61db346eb39d9c1be5c07.css">`** —
  404 (katalogu `/ccss` nie ma w repo). Usunąć link albo przywrócić plik;
  przed usunięciem zrobić diff wizualny (screenshot przed/po).

### P1 — konflikty i dług architektoniczny
- **P1-a Duplikacja timeline:** gałęzie desktop i mobile w skrypcie #10 to ~95%
  copy-paste (~500 linii ×2, w tym 16 trybów ×2). Każda zmiana efektu wymaga
  edycji w DWÓCH miejscach; już się rozjechały (maski: `innerHeight+10` vs
  `innerHeight/2+1` — to akurat celowe, ale reszta nie).
- **P1-b Dwie konkurencyjne formuły konwergencji:** inline `getVvMeetTargets()`
  (środek ekranu, gap 1.5rem) vs `cosgral-hero-fix.js: fixVvConvergence()`
  (szerokość okna minus 8rem, gap 1.35rem), która po 1200 ms NADPISUJE
  `tween.vars.x`. Wynik zależy od wyścigu timeoutów; przy resize możliwy
  „przeskok" punktu spotkania COSGRAL/agency.
- **P1-c Martwe tweeny:** `.hero_decor` jest ukryty na trzy sposoby (CSS
  `!important`, JS `display:none`, a mimo to timeline animuje go @0.62).
  Analogicznie `splitLetters()` wołany wielokrotnie (idempotentny, ale szum).
- **P1-d `updateDynamicPaths()` co klatkę przez CAŁY scrub 900%vh** — 2×
  `getBoundingClientRect` + budowa stringów `d` (setki segmentów, pętla 60
  punktów supła) + 5× `setAttribute` na każdy update, nawet gdy nic się nie
  rusza. Layout thrash; realny koszt na słabszych maszynach.
- **P1-e ResizeObserver na nagłówkach VV** woła `buildRootLinePath()` +
  `ScrollTrigger.refresh()` (43 triggery!) bez sprawdzenia, czy rozmiar
  faktycznie się zmienił — ryzyko burzy refreshów (clip-path/char-spany
  potrafią zmieniać box).
- **P1-f Throttle masek 48 ms** (`_cgMaskTs`) — otwieranie masek filmowych
  renderuje się ~20 fps, widocznie skokowo przy scrubie.

### P2 — jakość / dostępność / higiena
- **P2-a ZERO obsługi `prefers-reduced-motion`** w całym hero (grep: 0 trafień
  w index.html i wszystkich css/js). `accessibility-steward` da FAIL.
- **P2-b `strobe`** — migotanie opacity bez limitu częstotliwości (WCAG 2.3.1).
- **P2-c Switcher w produkcie:** panel inline w HTML + pełny reload przy
  przełączeniu; do delivery musi zniknąć albo chować się za flagą (np. `?dev=1`).
- **P2-d Hacki `lockHeading`** (defineProperty na innerHTML/textContent) —
  zostawić, ale udokumentować; łatwo o zaskoczenie przy refaktorze.
- **P2-e Preloader:** pierwszy wjazd blokuje scroll do końca animacji licznika;
  `sessionStorage.hasVisited` — przy testach trzeba czyścić.

---

## 5. Plan działań — etapy i zadania

Wykonuj po kolei. Po KAŻDYM tasku: procedura weryfikacji z sekcji 6 + commit
(jeśli repo git; ten folder obecnie nie jest repo — wtedy kopia zapasowa pliku
przed edycją, wzorem `index_stable.html`).

### ETAP 0 — przygotowanie i baseline (bez zmian w kodzie)

**TASK-00: środowisko + zrzuty odniesienia.**
1. Serwer: `cd <root>/cosgral-main && python -m http.server 8931` — serwować z
   `cosgral-main` (obrazy hero są pod `cosgral-main/images/...`, strona pod
   `http://127.0.0.1:8931/designkopia/cosgral-agency/index.html`).
2. W konsoli przeglądarki przed testem: `sessionStorage.clear()` (preloader),
   `localStorage.setItem('effectMode','classic')`.
3. Zrzuty baseline: dla trybów `classic`, `kinetic`, `decode` po 9 punktów
   progresu pinu: p ∈ {0, .12, .2, .3, .45, .6, .75, .9, 1}. Sterowanie scrollem
   programowo (scrub-safe):
   ```js
   const wrap = document.querySelector('.hero_stack_wrapper');
   const st = ScrollTrigger.getAll().find(s => s.trigger === wrap && s.animation);
   const go = p => { st.scroll(st.start + (st.end - st.start) * p); ScrollTrigger.update(); };
   ```
4. Zapisać zrzuty do `test-output/hero-baseline/<mode>/p<NN>.png` (wzorzec
   skryptu: `test_mitosis_scan.py` — ten sam mechanizm, inny trigger).

**Akceptacja:** komplet zrzutów; brak błędów w konsoli poza znanym 404 `/ccss/...`.

### ETAP 1 — refaktor bez zmian wizualnych (fundament pod dalszą pracę)

**TASK-01: wynieś inline skrypt #10 do `cosgral-hero-effects.js`.**
- Wytnij CAŁY blok inline zaczynający się od `window.Webflow = window.Webflow || [];
  window.Webflow.push(() => { const lockHeading = ...` (ten ~47 kB) i zapisz 1:1
  do nowego pliku `cosgral-hero-effects.js`; w `index.html` w TYM SAMYM miejscu
  wstaw `<script src="cosgral-hero-effects.js"></script>`.
- Uwaga: body to jedna linia — do chirurgii używaj Pythona (regex po
  `</script>`), NIE ręcznej edycji. Zachowaj kolejność względem pozostałych
  `Webflow.push` (kolejność pushów = kolejność wykonania).
- **Akceptacja:** zrzuty p-punktów identyczne z baseline (diff pikselowy ≈ 0).

**TASK-02: jedna funkcja budująca timeline.**
- W `cosgral-hero-effects.js` zamień dwie gałęzie matchMedia na
  `buildHeroTimeline({ isDesktop })`, sparametryzowaną JEDYNĄ realną różnicą:
  wysokość otwarcia masek (`innerHeight+10` vs `innerHeight/2+1`) oraz configiem
  scrollTriggera (desktop ma dodatkowo `onRefresh: self => self.animation.progress(self.progress)`).
- Wyodrębnij katalog trybów do mapy:
  `const WORD_REVEALS = { glitch: (tl, chars, at) => {...}, kinetic: ..., ... }` —
  wywoływanej raz dla słowa 1 (@1.6/@1.3) i raz dla słowa 2 (@2.2/@1.9). Custom
  tryby nie mogą się już nigdy rozjechać między desktop/mobile.
- Usuń martwe tweeny `.hero_decor` (jest `display:none !important`).
- **Akceptacja:** diff zrzutów = 0 dla min. 4 trybów (classic, kinetic, glitch, flip),
  desktop (1280×800) i mobile (375×812).

**TASK-03: jedno źródło prawdy dla konwergencji.**
- Zostaw formułę inline `getVvMeetTargets()` (środek ekranu + gap 1.5rem).
- Z `cosgral-hero-fix.js` USUŃ `fixVvConvergence()`, `vvMeetTargets()`,
  `vvInnerHalfWidth()` i ich wywołania (boot/load/resize). Zostaw: podmianę
  labeli, `stabilizeHeroText`, `fixHeroBgPosition`, footer.
- Sprawdź, że labeli COSGRAL/agency i tak podmienia wcześniej inline skrypt #3
  (capture na DOMContentLoaded) — ma podmieniać PRZED pomiarem GSAP.
- **Akceptacja:** przy p=0.5 napisy spotykają się symetrycznie z przerwą ~1.5rem,
  bez nachodzenia; po resize okna (1280→900→1280 przy p=0.5) punkt spotkania
  wraca na środek bez przeskoku.

### ETAP 2 — naprawa zepsutych trybów

**TASK-04: napraw `ink` (Organic Ink).**
- Do `index.html` (tuż po `<div id="smooth-wrapper">` albo przed `</body>`) dodaj:
  ```html
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="smoke-melt" x="-30%" y="-30%" width="160%" height="160%"
            color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.015 0.04"
                    numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="80"
                         xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </svg>
  ```
- Istniejące tweeny `attr:{scale:80→0}` na `#smoke-melt feDisplacementMap`
  zaczną działać bez zmian.
- Po zakończeniu reveal (scale=0) zdejmij filtr (`filter:'none'`) — filtr SVG na
  dużym tekście kosztuje na GPU.
- **Akceptacja:** w trybie ink słowa „wypływają z dymu" i są w 100% czytelne po
  reveal; scrub w tył odtwarza rozmycie; FPS przy reveal ≥ 50 na desktopie.

**TASK-05: zaimplementuj `liquid` ALBO usuń przycisk (decyzja: implementuj).**
- Reveal per litera, scrub-safe, bez randomu: fala płynięcia
  ```js
  liquid: (tl, chars, at) => tl.fromTo(chars,
    { y: 90, scaleY: 1.6, scaleX: 0.85, opacity: 0, filter: 'blur(6px)' },
    { y: 0, scaleY: 1, scaleX: 1, opacity: 1, filter: 'blur(0px)',
      duration: 0.6, stagger: { each: 0.045, ease: 'sine.inOut' },
      ease: 'elastic.out(1, 0.55)' }, at)
  ```
- Dodaj `liquid` do listy `isCustomTextAnim` (w obu miejscach, których po
  TASK-02 będzie już tylko jedno).
- **Akceptacja:** tryb 2 wyraźnie różny od classic i kinetic; scrub odwracalny.

**TASK-06: wzmocnij `spark` (Neon/Lens).**
- Zamiast samego blur: krótki neonowy flash per litera —
  `textShadow: '0 0 24px #ee3335, 0 0 60px #ee3335'` → gaśnie do zera ze
  staggerem, plus chromatyczna aberracja na 0.2s (dwa cienie cyan/red 2px).
  Trzymać się scrub-safe (`fromTo` w timeline, bez setInterval).
- **Akceptacja:** różnica widoczna na zrzutach p=.2–.3; brak migotania < 3 Hz.

**TASK-07: deterministyczny `decode`.**
- W `updateScrambleGlobal` wywal `Math.random()`. Deterministyczny pseudorandom
  od (indeks znaku, skwantowany czas):
  ```js
  const rnd = (i, step) => { const x = Math.sin(i * 127.1 + step * 311.7) * 43758.5453; return x - Math.floor(x); };
  const step = Math.floor(time * 30); // kubełki 1/30 s
  // znak podmieniany gdy rnd(i, step) < 0.3; symbol = symbols[Math.floor(rnd(i, step+7) * symbols.length)]
  ```
- Kolory: zamiast hardcode `#ee3335` użyj custom property (`var(--red-hot)` /
  stała w jednym miejscu pliku).
- **Akceptacja:** dwa przejazdy scrolla przez ten sam zakres dają IDENTYCZNE
  klatki (porównaj zrzuty p=.25 z przejazdu w przód i w tył).

### ETAP 3 — wydajność

**TASK-08: gate'owanie `updateDynamicPaths()`.**
- Licz i przepisuj ścieżki TYLKO gdy: (a) `tl.time()` w oknie konwergencji
  [2.15, 3.2] (fazy, w których `v1`/`v2` się ruszają), LUB (b) flaga `dirty`
  ustawiona przez ResizeObserver. Poza oknem — return.
- Cache: porównuj nowy string `d` z poprzednim; `setAttribute` tylko przy zmianie.
- **Akceptacja:** w DevTools Performance przy scrubie poza oknem konwergencji
  brak wpisów Recalculate Style/Layout pochodzących z `updateDynamicPaths`.

**TASK-09: maski filmowe płynne.**
- Usuń throttle 48 ms (`_cgMaskTs`) — zapis stringa clip-path jest tani; tween
  i tak tyka raz na klatkę. Ewentualnie zostaw guard `=== lastValue`.
- **Akceptacja:** otwieranie masek bez widocznych skoków (wideo-porównanie lub
  ocena wizualna przy wolnym scrollu).

**TASK-10: ResizeObserver z bezpiecznikiem.**
- Zapamiętuj ostatnie `contentRect.width/height`; jeśli delta < 1 px → return.
- Debounce 150 ms; `ScrollTrigger.refresh()` maks. raz na burst.
- **Akceptacja:** licznik wywołań `buildRootLinePath` podczas 10 s bezczynności = 0;
  podczas resize okna ≤ 3.

**TASK-11: budżet perf.**
- Po TASK-08..10 przejrzyj `profiles/performance-budget.yaml` i odpal (jeśli
  dostępny w pipeline) `performance-warden`; ręcznie: Lighthouse na
  `index.html` (desktop + mobile). Progi twarde: LCP < 4 s, CLS < 0.25.
  `hero_bg` ma `loading="eager" fetchpriority="high"` — zostaw.
- **Akceptacja:** `perf-report.json` bez FAIL (albo raport Lighthouse w
  `test-output/hero-perf/`).

### ETAP 4 — dostępność

**TASK-12: `prefers-reduced-motion`.**
- Na początku `cosgral-hero-effects.js`:
  ```js
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ```
- Gdy `REDUCED`: (a) wymuś tryb `classic` niezależnie od localStorage,
  (b) pomiń elastic/scramble/glitch — reveal przez sam clip-path bez staggerów,
  (c) skróć pin z 900% do np. 300% (`end: '+=300%'`), (d) wyłącz cofanie się
  ścieżek dekoracyjnych (rysuj bez retract).
- CSS fallback w `cosgral-brand.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .hero-scroll-down svg { animation: none; }
  }
  ```
- **Akceptacja:** z emulacją reduced motion w DevTools strona przechodzi całą
  sekcję 1 bez elastic bounce i scramble; treść w 100% dostępna.

**TASK-13: `strobe` pod WCAG 2.3.1.**
- Ogranicz liczbę błysków: maks. 3 zmiany opacity/s w czasie rzeczywistym
  (pamiętaj: to scrub — częstotliwość zależy od prędkości scrolla; policz
  worst-case i zmniejsz liczbę keyframe'ów flickera do ≤ 6 na słowo).
  Jeśli nie da się zagwarantować — usuń tryb z panelu.
- **Akceptacja:** analiza keyframe'ów udokumentowana w komentarzu przy trybie.

**TASK-14: semantyka/ARIA sekcji 1.**
- `.hero_root_line svg` → `aria-hidden="true"`.
- `[data-vv] h2` to realne nagłówki — mają zostać w drzewie dostępności.
- Zweryfikuj fokusowalność linków/przycisków w hero przy `pointer-events`
  żonglerce (maski dostają `pointerEvents:auto` dopiero @4.0).
- **Akceptacja:** przejście tabem przez sekcję 1 nie wpada w pułapkę; axe-core
  bez błędów krytycznych na sekcji.

### ETAP 5 — kuracja i delivery

**TASK-15: switcher tylko dla dev.**
- Panel `#design-switcher` renderuj wyłącznie gdy `location.search` zawiera
  `dev=1` (albo wytnij z produkcyjnego HTML i trzymaj w osobnym pliku
  `dev-switcher.js` doładowywanym warunkowo).
- Usuń martwy link `/ccss/aa144e753af61db346eb39d9c1be5c07.css` (po diffie
  wizualnym z TASK-00; jeśli diff ≠ 0 — odtwórz plik z capture zamiast usuwać).
- **Akceptacja:** czysty widok bez panelu; z `?dev=1` panel wraca i działa.

**TASK-16: finalna kuracja trybów.**
- Rekomendacja: domyślny `classic`; w panelu dev zostają wszystkie naprawione;
  do ewentualnej prezentacji klientowi shortlist: `classic`, `kinetic`,
  `liquid` (po TASK-05), `ink` (po TASK-04), `decode` (po TASK-07).
- **Akceptacja:** `localStorage` pusty → classic; każdy tryb z shortlisty
  przechodzi pełny przejazd p=0→1→0 bez artefaktów.

**TASK-17: bramki QA (pełna brama delivery wg CLAUDE.md).**
- Odpal agentów: `style-qa`, `concept-guardian` (sekcja 1 = signature moment —
  musi bronić się w rubryce `signature-craft.yaml`), `performance-warden`,
  `accessibility-steward`, `awwwards-juror` (cel ≥ 7.5/10).
- **Akceptacja:** komplet raportów bez FAIL; werdykt jurora zapisany.

---

## 6. Procedura weryfikacji (po każdym tasku)

1. `sessionStorage.clear(); localStorage.setItem('effectMode', '<tryb>')` → reload.
2. Przejazd programowy po p-punktach (snippet z TASK-00) + zrzuty.
3. Diff ze zrzutami baseline (piksele lub ocena wizualna — zapisz wynik).
4. Konsola: zero nowych błędów/warningów GSAP („target not found" = regres).
5. Scrub w tył (p=1→0) — stan musi wracać do wyjściowego (żadnych „duchów"
  czerwonych linii, opacity, transformów).
6. Mobile: powtórz w viewporcie 375×812 (matchMedia < 992px to ODRĘBNA gałąź,
  dopóki TASK-02 jej nie scali).

**Pułapki środowiska testowego (sprawdzone w tym audycie):**
- W podglądzie agentowym karta bywa `document.hidden === true` → rAF nie tyka →
  **preloader wisi na „001" i nic się nie animuje. To NIE jest bug strony.**
  Testować w realnej, widocznej karcie przeglądarki (albo wymusić widoczność).
- `index.html` ma body w JEDNEJ linii (355) — `grep -o` z kontekstem potrafi
  kłamać/nic nie zwrócić; do analizy i edycji używać Pythona (`re`), nie sed/grep.
- `lockHeading` blokuje zapisy `innerHTML`/`textContent` na nagłówkach VV —
  podmiany tekstu robić PRZED splitem albo przez `char-span`y.
- Po podmianie tekstu nagłówków każdy pomiar szerokości jest ważny dopiero po
  `document.fonts.ready`.

---

## 7. Twarde zasady (nie łamać)

1. **Nie usuwać ani nie spłycać signature momentu** (korzeń piszący COSGRAL/agency).
2. **Nie zmieniać kolejności ładowania warstw** CSS/JS (sekcja 1 tego planu).
3. **Nie edytować `index_stable.html`** (backup) ani `styles.css` (nieużywany
   przez index.html — zmiany tam to fałszywe poczucie postępu).
4. Wszystkie efekty w timeline muszą być **scrub-safe i odwracalne**: żadnych
   `setInterval`, `Math.random()` w onUpdate, one-shotów zależnych od kierunku.
5. Mobile (< 992 px) ma te same efekty co desktop poza wysokością masek.
6. Zmiany w innych sekcjach (vv/films/about/pillars/parhouse/history/footer) —
   POZA ZAKRESEM. Jeśli coś tam pęka od zmian w hero, cofnij zmianę i zgłoś.
7. Faza niedomknięta, dopóki akceptacja tasku nie jest spełniona — nie obchodzić
   weryfikacji (duch `run-pipeline.py`: max 2 retry, potem STOP i eskalacja).

## 8. Definition of Done całości

- [ ] 15 przycisków switchera = 15 działających, wyraźnie różnych trybów
      (albo przyciski usunięte dla trybów odrzuconych).
- [ ] Zero martwych tweenów i podwójnych formuł konwergencji.
- [ ] Timeline desktop/mobile z jednego buildera.
- [ ] `prefers-reduced-motion` obsłużone; strobe zgodny z WCAG albo usunięty.
- [ ] Brak 404 w network; brak warningów GSAP w konsoli.
- [ ] Raporty bramek QA (TASK-17) bez FAIL, juror ≥ 7.5/10.
- [ ] Zaktualizowany wpis technik w `profiles/site-clone-registry.yaml`
      (sekcja `techniques`), jeśli powstały nowe nazwane efekty
      (np. `cosgral-ink-melt`, `cosgral-liquid-reveal`) + ewentualny wpis do
      `references/site-dna/effects-library.yaml`.
