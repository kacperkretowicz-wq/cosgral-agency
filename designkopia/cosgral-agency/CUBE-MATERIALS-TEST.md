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
`buildScrollPose`, intro, reakcja na kursor i zanikanie z commita bazowego.
Nie przeniesiono osobnej choreografii ani tła z laboratorium.

Szkło → chrom zmienia transmisję, metaliczność, chropowatość i odbicia
w zakresie 15–80% istniejącej osi scrolla. Tło strony pozostaje oryginalne.

Magnetyczny montaż wykorzystuje osiem rzeczywistych, domkniętych przekrojów
oryginalnego GLB. Fragmenty przemieszczają się wewnątrz istniejącego obrysu
i kolejno składają w zakresie 2–49,5% osi scrolla. Złożoną geometrię zastępuje
oryginalny model przy 50%, żeby uniknąć szczelin i nakładania powierzchni.
Scroll wstecz rozkłada fragmenty. Transformacje głównej grupy nie są zmieniane.

W menu oba efekty wracają do pełnego szklanego obiektu, aby zachować powierzchnię
z linkami. Odtworzenie kontekstu WebGL odbudowuje także fragmenty.

Pliki: `home-cube-materials.js`, `home-cube-fragments.js`, integracja
w `home-hero-3d.js` i zmiana wersji modułu w `index.html`.

Implementacja na gałęzi testowej. Bez publikacji na produkcję.
Nie uruchamiano testów. Podgląd przeglądarki nie był dostępny w tej sesji:
lokalne sterowanie przeglądarką jest wyłączone w ustawieniach Work.
