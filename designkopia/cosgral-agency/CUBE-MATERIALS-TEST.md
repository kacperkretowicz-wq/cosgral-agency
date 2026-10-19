# Szkło → chrom — lepka ciecz, zanurzenie i wydajność, rewizja 7

Baza: `a24c43d37b64f3634826977c829a486b120fdc8d`.
Gałąź: `test/cube-chrome-magnetic` (zachowana nazwa).
Źródła: `designkopia/cosgral-agency`.
Podgląd: `http://127.0.0.1:8796/?forceMotion=1&cube=chrome&rev=7`.

Zakres: tylko szkło → chrom i przejście do usług. Laboratorium odniesienia
pozostaje na porcie 8797: wariant 5 — materiał; wariant 1 — bezwładność.

## Choreografia

Początkowy rozmiar modelu, wysokość 30% desktop / 31% mobile i bazowe kąty
0,48 / -0,67 pozostają zachowane. Spokojny łuk w prawo i obrót Y o 75,6°
dochodzą do pozycji chromowanej kostki. W końcowej fazie dochodzi reakcja na
naciągniętą powierzchnię: opór w bok, pionowe ugięcie i mały przechył.
Odbicie sprężyny oddziałuje na model także po zatrzymaniu scrolla.

Runway ma teraz 72svh zamiast 32vh desktop / 28vh mobile. Koniec osi wynika
z rzeczywistej pozycji usług: `scrollSpan = sectionTop - viewportHeight * .24`.
Przy hero 100svh daje to ok. 148vh przewinięcia zamiast 86vh.

Metalność i jasne tło dochodzą do pełnej wartości do 43% osi; mikroziarno
do 54%. Następnie materiał pozostaje chromowany przez kontakt z cieczą,
naciągnięcie i odbicie. Zachowano roughness 0,035 → ok. 0,175, światło studia,
dyspersję, irydescencję i model z wariantu laboratoryjnego.

## Duży lejek związany z kostką

Kontur pozostaje jedną ciągłą powierzchnią, bez odrywanej soczewki/kropki.
Szyjka jest kilka razy szersza niż w rewizji 6; rozmiar wynika z projekcji
modelu. Szerokie ramiona cieczy reagują z opóźnieniem, a punkt zaczepienia
znajduje się bliżej środka kostki. Powierzchnia ma charakter gęstej cieczy.

Przy 80% osi sprężyna puszcza (swobodnie: sztywność 70, tłumienie 5,6).
Powrót poniżej 69% ponownie mocuje powierzchnię. Momentum i odbicie są
przekazywane do pozycji i przechyłu kostki, z ograniczoną amplitudą.
Począwszy od 88% osi model kieruje się w dół i lekko do środka lejka.

Usunięto wcześniejszy fade opacity i fade zależny od dystansu do sekcji.
Model ma opacity 1. Zamiast zaniku jego obraz zasłania maska będąca tym
samym konturem co tło: kostka zanurza się za meniskiem. Maska jest liczona
w 57 punktach na CPU i przekazywana jako polygon clip-path na portal kostki.
Ograniczenie do części konturu działa również przy scrollowaniu wstecz.

Tło usług jest przezroczyste, a shader pod nim daje identyczny #080909.
Pozwala to cieczy wejść w górny margines drugiej sekcji; zabezpieczenie
kończy kontur przed pierwszą linią treści zamiast ucinać go na granicy sekcji.
Menu zachowuje swoje transformacje i wraca do szkła; jego maska jest wyłączana.

## Zmiany kosztu renderowania

- Usunięto pusty renderer i pełnoekranowy canvas optical wake, którego fade
  był stale równy zero. Pozostaje jeden renderer kostki.
- Zakończony chrom ma transmission 0, więc Three.js pomija dodatkowy pass
  szkła. Poprzednie 0,0001 utrzymywało ten pass mimo nieprzezroczystego chromu.
  Oba warianty materiału kompilowane są przed rozpoczęciem animacji.
- DPR respektuje urządzenie i ograniczenie 1,5, zamiast wymuszać 2 na zwykłym
  monitorze 1x. Dołączono istniejący cosgral-perf.js i podłączono jego poziomy
  do DPR kostki oraz rozdzielczości tła.
- Normalna konturu jest analityczna: jedna ocena zamiast pięciu przy krawędzi.
  Współczynniki profilu są obliczane raz na CPU, zamiast w każdym pikselu.
- Jednolite regiony shader pomija wcześnie; przy pełnej jasności nie liczy
  proceduralnych fal. Po domknięciu przejścia tło nie renderuje kolejnych klatek.
- Bazowa skala tła: desktop 0,60, mobile 0,75, z niższymi poziomami obciążenia.
  Bufor zachowuje proporcje viewportu i ma limity 1440/780 × 900.
- Tekstura napisów działa tylko, gdy szkło faktycznie może ją pokazać.
  Maks. 1536 × 1024, najwyżej ok. 30 aktualizacji/s; przy chromie brak uploadów.
  Jednorazowy obserwator gotowości jest odłączany.
- Pozycja usług i początek treści są buforowane przy zmianie układu; brak
  getBoundingClientRect sekcji w każdej klatce. Po wyjściu z hero pomijane są
  obliczenia modelu i materiału. Dobór koloru tekstu jest rzadszy i ma histerezę.

## Stan

Implementacja na gałęzi testowej, bez publikacji na produkcję.
Nie uruchamiano zestawów testów. Obejrzano schemat faz generowany z aktualnego
kodu konturu i sprężyny; nie jest zrzutem strony ani renderem materiału.
Nie ma pomiaru FPS ani potwierdzenia płynności w przeglądarce: narzędzie
nadal zgłasza wyłączone lokalne sterowanie przeglądarką w ustawieniach Work.
