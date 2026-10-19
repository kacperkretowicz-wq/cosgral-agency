# Szkło → chrom — wolniejszy łuk i płynne przejście, rewizja 4

Baza strony: `a24c43d37b64f3634826977c829a486b120fdc8d`.
Gałąź: `test/cube-chrome-magnetic` (zachowana nazwa istniejącej gałęzi).
Źródła: `designkopia/cosgral-agency`.

## Bieżący zakres

Użytkownik wybrał dalszą pracę wyłącznie nad szkłem → chromem.
Aktualna strona nie pokazuje przełącznika ani montażu magnetycznego i nie ładuje
modułu cieczy, Workera, pola 96³ ani geometrii fragmentów. Ich wcześniejsze
pliki i commity pozostają historią eksperymentu.

Podgląd: `http://127.0.0.1:8796/?forceMotion=1&cube=chrome&rev=4`.
Osobne laboratorium odniesienia: `http://127.0.0.1:8797/?v=5` (materiał),
`http://127.0.0.1:8797/?v=1` (ruch). Źródło odniesienia: `outputs/cube-lab/lab.js`
z rozmowy, poza repozytorium.

## Spokojniejsza interpretacja wariantu 01

Początkowa wysokość: 30% ekranu desktop / 31% mobile. Łagodny łuk w prawo,
lekko wznoszący się w środku ruchu, z końcem na wysokości 25,5% / 27,5%.
Ten sam początkowy rozmiar w pikselach co na stronie bazowej.
Bazowe kąty 0,48 / -0,67; obrót Y zmniejszony z 207° do 75,6°.
Kołysanie X ograniczone do 0,075 rad, bank Z do 0,045 rad.
Skala oddycha o maks. 5%. Tor i obrót używają quintic smootherstep, dającego
zerową prędkość i przyspieszenie na końcach. Wyznaczenie bezpiecznego ruchu
w bok uwzględnia projekcję ośmiu narożników aktualnie obróconej kostki, więc
na węższym ekranie pozostaje margines zamiast odcinania modelu.
Dryf `sin(time * 0,34) * 0,012`; reakcja kursora 0,045 / 0,075.
Tłumienie progress i kursora: `1 - exp(-dt * 8)`.

Oś trwa 86% wysokości viewportu przewinięcia od góry. Zanik pozostaje zależny
od faktycznej odległości do sekcji usług i zaczyna się także przy 75% osi.
Kostka nie jest przycinana granicą sekcji. Menu zachowuje swoje istniejące
transformacje i wraca do szkła.

## Materiał z wariantu 05

Krzywe `metal = smoothstep(0,15; 0,80; p)` i
`paper = smoothstep(0,12; 0,82; p)`, dopasowane do widocznego fragmentu hero
przez `p = progress / 0,80`. Roughness 0,035 → 0,12, transmission 1 → 0,0001,
metalness 0 → 1. Intensywność środowiska jak w laboratorium:
`lerp(1,15 + paper * 0,3; 1,6; metal)`. Parametry studia, dyspersji,
irydescencji i krawędzi odtworzone z wersji laboratoryjnej.

Końcowe mikroziarno zmienia normalne i chropowatość (do ok. 0,175),
nie dopisuje losowych pikseli do gotowego koloru. Brak migotania i nakładki TV.
Światło tła rozjaśnia górną część hero i przechodzi w istniejące ciemne tło
poniżej. Ten sam kolor jest używany w buforze transmisji, z uwzględnieniem
zaciemniającej warstwy strony. Kolor tekstu hero dostosowuje się do oświetlenia.
Nowy parametr `uChromeBoundary` śledzi rzeczywistą pozycję początku usług.
Ostatnie 26% wysokości viewportu przed sekcją przechodzi w jej dokładny kolor
`#080909`, osiągając go 2,5% wysokości przed krawędzią. Gradient obejmuje także
oryginalne smugi ambientu, a nie tylko jasną warstwę chromu. Pozwala to uniknąć
widocznej poziomej granicy pokazanej przez użytkownika na screenie.

## Stan

Implementacja na gałęzi testowej. Brak publikacji na produkcję.
Nie uruchamiano zestawów testów. Ocena wizualna wymaga dostępnej przeglądarki;
w trakcie implementacji narzędzie nadal zgłaszało wyłączone lokalne sterowanie
w Work, mimo deklaracji użytkownika, że je włączy.
