# Kostka — materiały na oryginalnej stronie

Baza: `a24c43d37b64f3634826977c829a486b120fdc8d`.
Gałąź: `test/cube-chrome-magnetic`.
Źródła: `designkopia/cosgral-agency`.

## Podgląd

Uruchom serwer HTTP z katalogu źródeł, np. `python -m http.server 8798 --bind 127.0.0.1`.

- `/?forceMotion=1&cube=chrome` — szkło → chrom (domyślny).
- `/?forceMotion=1&cube=magnetic` — magnetyczny montaż.
- `/?forceMotion=1&cube=original` — oryginał do porównania.

Przełącznik w lewym dolnym rogu działa bez przeładowania i bez resetowania scrolla.

## Zakres

Zachowane są oryginalne `heroSize`, `screenScale`, `updatePath`,
`buildScrollPose`, intro i reakcja na kursor z commita bazowego.
Nie przeniesiono osobnej choreografii ani tła z laboratorium.

## Rewizja 2 — matowy chrom i ciecz bez grawitacji

Obie historie materiałowe kończą się przy 29% dotychczasowej osi scrolla,
zanim tor kostki zbliży się do drugiej sekcji. Nie wydłużają ruchu głównej grupy.

Szkło → chrom: najpierw odbijający metal, potem matowe srebro o chropowatości
0,43, drobnej losowej strukturze chropowatości i normalnych, zmniejszonej
warstwie lakieru oraz subtelnym monochromatycznym szumie 5 Hz na obiekcie.
Ustawienie ograniczonego ruchu zatrzymuje szum.

Magnetyczny montaż: osiem miękkich, asymetrycznie rozmieszczonych skupisk
dryfuje w trzech osiach. Ich pole gęstości tworzy jedną ciągłą powierzchnię,
więc przy zbliżaniu faktycznie powstają szyjki i połączenia między kroplami.
Z postępem scrolla pole przechodzi w pole odległości oryginalnego znaku.
Nie jest to sfera z nałożonym logo. Docelowe pole 96³ jest wypiekane z GLB
przez `scripts/generate-cube-field.py` (numpy/scipy). Generowanie powierzchni:
Three.js r170 MarchingCubes, 80³ desktop / 64³ mobile, maksymalnie 30 aktualizacji
geometrii na sekundę, w osobnym Web Workerze. Bufory są przekazywane i używane
ponownie; scroll i render nie czekają na obliczenia geometrii. Ostatnie 10% przejścia odsłania oryginalny GLB przez
komplementarną maskę ditheringu, aby zachować jego szczegóły i uniknąć podwójnej
przezroczystości. Scroll wstecz odtwarza rozdzielenie w odwrotnej kolejności.

Wygaszanie: projekcja ośmiu narożników kostki wyznacza jej dolną krawędź
w ekranie. Kostka oraz optyczny ślad zanikają, gdy odstęp od sekcji `#uslugi`
maleje z 20% do 2,5% wysokości ekranu. Warstwa kostki jest nad sekcją usług,
co chroni przed jej ostrym odcięciem podczas szybkiego scrolla. Fade pozostaje
odwracalny. Materiały kończą transformację przed tą granicą.

W menu oba efekty wracają do pełnego szklanego obiektu, aby zachować powierzchnię
z linkami. Odtworzenie kontekstu WebGL odbudowuje także fragmenty.

Pliki: `home-cube-materials.js`, `home-cube-fluid.js`, `home-cube-fluid-worker.js`, pole
`assets/glass-cube/logo-field-96.bin`, vendor MarchingCubes, integracja
w `home-hero-3d.js` i zmiana wersji modułu w `index.html`.

Implementacja na gałęzi testowej. Bez publikacji na produkcję.
Nie uruchamiano testów. Podgląd przeglądarki nie był dostępny w tej sesji:
lokalne sterowanie przeglądarką jest wyłączone w ustawieniach Work.
