# Szkło → chrom — sprężysty lejek bez kropki, rewizja 6

Baza strony: `a24c43d37b64f3634826977c829a486b120fdc8d`.
Gałąź: `test/cube-chrome-magnetic` (zachowana nazwa istniejącej gałęzi).
Źródła: `designkopia/cosgral-agency`.

## Bieżący zakres

Użytkownik wybrał dalszą pracę wyłącznie nad szkłem → chromem.
Aktualna strona nie pokazuje przełącznika ani montażu magnetycznego i nie ładuje
modułu cieczy, Workera, pola 96³ ani geometrii fragmentów. Ich wcześniejsze
pliki i commity pozostają historią eksperymentu.

Podgląd: `http://127.0.0.1:8796/?forceMotion=1&cube=chrome&rev=6`.
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
## Wybrane przejście — lejek przy kostce

Użytkownik wybrał asymetryczny lejek z porównania kierunków i poprosił
o dopracowanie odłączenia. `home-chrome-funnel.js` zawiera wspólny shader
oraz odpowiednik pola konturu w JavaScript do doboru koloru tekstu.
Ten sam shader obsługuje tło i bufor transmisji kostki.

Kontur jest jedną ciągłą powierzchnią. Usunięto osobną soczewkę i sumowanie
pól, które zostawiały po odłączeniu jasną kropkę. Jasna powierzchnia zwęża
się przy kostce i cofa do wspólnej krawędzi bez odrywania kolejnego obiektu.

Przed odłączeniem lejek naciąga się w stronę dolnej krawędzi kostki.
Przy 63,5% osi scrolla przestaje być ciągnięty i oddaje zgromadzoną energię:
odbicie w przeciwną stronę, mniejszy powrót i wygaszenie. Ruch korzysta
z analitycznie integrowanej sprężyny (swobodnie: sztywność 100, tłumienie 6,2),
więc trwa także po zatrzymaniu scrolla. Szersza część powierzchni reaguje
z opóźnieniem, przenosząc odkształcenie na boki jak napięta membrana.
Wąska szyjka rozszerza się w czasie odbicia. Oscylacje wygasają w ok. 1,5 s;
to czas działania sprężyny, niezależny od prędkości przewijania.

Przewinięcie w górę poniżej 56% ponownie mocuje lejek; histereza zapobiega
wielokrotnemu szarpnięciu przy drobnych ruchach wokół punktu puszczenia.
Odtworzenie strony poniżej tego punktu nie uruchamia sztucznego odbicia.
Preferencja ograniczonego ruchu wyłącza oscylacje. Menu i przejście poza hero
zerują stan sprężyny. Nie dodano nowej pętli animacji; istniejąca pętla kostki
przekazuje dt, a oba shadery odczytują ten sam stan sprężystości.

Punkt zaczepienia przechodzi ze środka kostki ku jej tylnej, dolnej krawędzi,
wyznaczanej z projekcji oryginalnego modelu. Odłączenie pozostaje dzięki temu
widoczne obok chromowanej ściany. Hermite remap zwalnia fazę naciągnięcia.
Obrót i boczny łuk kostki pozostają z rewizji 4.

Kontur ma antyaliasing zależny od rozdzielczości, wąski metaliczny menisk,
subtelne załamanie smug tła i mały akcent odbić w momencie naprężenia.
Jasna powierzchnia ma własne domknięcie — opacity kostki nie ucina odbicia.
Poniżej całego konturu shader osiąga dokładnie
`#080909` przed fizyczną krawędzią sekcji usług. Nie ma poziomego odcięcia maski.

Podwyższona rozdzielczość tła obowiązuje tylko stronę z aktywnym lejkiem;
pozostałe podstrony korzystają z dotychczasowej wersji. W wyższych progach
obciążenia zachowane są niższe rozdzielczości. Nie ma nowego kontekstu WebGL
ani dodatkowego renderera dla przejścia.

## Stan

Implementacja na gałęzi testowej. Brak publikacji na produkcję.
Nie uruchamiano zestawów testów. Wykonano schemat faz konturu obliczany
z aktualnego kodu; nie jest zrzutem strony ani potwierdzeniem wyglądu animacji.
Podgląd strony pozostaje nieobejrzany: narzędzie zgłasza wyłączone lokalne
sterowanie przeglądarką w Work.
