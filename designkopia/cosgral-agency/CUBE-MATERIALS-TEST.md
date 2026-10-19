# Szkło → chrom + Bezwładność — rewizja 3

Baza strony: `a24c43d37b64f3634826977c829a486b120fdc8d`.
Gałąź: `test/cube-chrome-magnetic` (zachowana nazwa istniejącej gałęzi).
Źródła: `designkopia/cosgral-agency`.

## Bieżący zakres

Użytkownik wybrał dalszą pracę wyłącznie nad szkłem → chromem.
Aktualna strona nie pokazuje przełącznika ani montażu magnetycznego i nie ładuje
modułu cieczy, Workera, pola 96³ ani geometrii fragmentów. Ich wcześniejsze
pliki i commity pozostają historią eksperymentu.

Podgląd: `http://127.0.0.1:8796/?forceMotion=1&cube=chrome&rev=3`.
Osobne laboratorium odniesienia: `http://127.0.0.1:8797/?v=5` (materiał),
`http://127.0.0.1:8797/?v=1` (ruch). Źródło odniesienia: `outputs/cube-lab/lab.js`
z rozmowy, poza repozytorium.

## Ruch z wariantu 01

Stała wysokość: 30% ekranu desktop / 31% mobile. Bez starego lotu w dół przez
runway ani uciekania poza ekran. Ten sam początkowy rozmiar w pikselach co na
stronie bazowej. Bazowe kąty 0,48 / -0,67; obrót Y `smoothstep(p) * PI * 1,15`,
kołysanie X `sin(p * PI) * 0,22`, bank Z `-sin(p * PI) * 0,12`.
Skala oddycha o maks. 12%. Przesunięcie poziome 0,16 wysokości świata,
zmniejszone do 0,075 na telefonie. Dryf `sin(time * 0,52) * 0,025` oraz reakcja
na kursor 0,07 / 0,12. Tłumienie progress i kursora: `1 - exp(-dt * 8)`.

Oś trwa 86% wysokości viewportu przewinięcia od góry. Zanik pozostaje zależny
od faktycznej odległości do sekcji usług i zaczyna się także przy 76% osi.
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

## Stan

Implementacja na gałęzi testowej. Brak publikacji na produkcję.
Nie uruchamiano zestawów testów. Ocena wizualna wymaga dostępnej przeglądarki;
w trakcie implementacji narzędzie nadal zgłaszało wyłączone lokalne sterowanie
w Work, mimo deklaracji użytkownika, że je włączy.
