# Szkło → chrom — refrakcja napisów i wspólny kontakt z cieczą, rewizja 9

Baza: `a24c43d37b64f3634826977c829a486b120fdc8d`.
Gałąź: `test/cube-chrome-magnetic` (zachowana nazwa).
Źródła: `designkopia/cosgral-agency`.
Podgląd: `http://127.0.0.1:8796/?forceMotion=1&cube=chrome&rev=9`.
Przeładowanie istniejącej karty pobiera nowe moduły; adres otrzymuje rev=9.

Zakres: szkło → chrom i przejście do usług. Laboratorium odniesienia
pozostaje na porcie 8797: wariant 5 — materiał; wariant 1 — bezwładność.

## Napis COSGRAL za szkłem

Rzeczywiste położenie słów z DOM jest odtwarzane w teksturze tła używanej
przez fizyczny pass transmisji Three.js. Litery przechodzą przez tę samą
refrakcję i dyspersję co reszta tła; nie są nakładką na powierzchni modelu.

Tekstura obejmuje okolicę bieżącego kafla renderera, z marginesem 32 px.
Jej maksymalny wymiar to 1280 px, DPR maksymalnie 2. Geometria słów
pochodzi z Range, a linia bazowa z metryk wybranej czcionki. Zachowane są
odstępy liter, kolor, wielkość liter, podziały wierszy i opacity przodków.

Aktualizacja następuje synchronicznie przed renderowaniem kostki.
Usunięto osobny rAF/limit 30 Hz przechwytywania napisów. Pusty lub
niezmieniony obszar nie jest ponownie wysyłany do GPU; pełny chrom nie
potrzebuje tekstury napisów. Buforowanie układu jest unieważniane po
zmianie fontów, języka, rozmiaru ekranu i rzeczywistej zmianie koloru tekstu.

Gdy obwiednia kostki nakłada się na COSGRAL, metalness wynosi 0, a
transmission 1. Odległość od napisu tworzy płynną strefę przejścia również
przy przewijaniu wstecz. Po opuszczeniu napisu metalizacja ma zakres
34–62% osi scrolla; mikroziarno dochodzi w zakresie 59–76%. Materiał
pozostaje chromowany podczas kontaktu, wyporu i dalszego wyjścia nad ekran.

## Jedna powierzchnia przyklejona do modelu

Poprzednie mocowanie używało współrzędnej X wybranej z prostokątnej
obwiedni oraz niezależnej współrzędnej Y. Zaokrąglony model nie dochodzi
do narożników tej obwiedni, co dodatkowo otwierało szczelinę.

Rewizja 9 wybiera niewielką obwiednię z rzeczywistych wierzchołków GLB,
próbkując 162 kierunki raz po wczytaniu. W każdej klatce projektuje te
punkty i płynnie wybiera podporę na dolnej krawędzi. Obie współrzędne
mocowania pochodzą z tego samego miejsca na modelu.

Przy pełnym kontakcie zachodzi:

`surface(anchorX) = anchorY - 0.006 * viewportHeight`.

Niewielka zakładka chowa początek szyjki wewnątrz sylwetki kostki.
Wąska część konturu jest związana z podporą; szersze ramiona reagują
z opóźnieniem. Ich suma w punkcie mocowania pozostaje dokładna, więc
opóźnienie sprężyny nie otwiera przerwy pomiędzy modelem a cieczą.

Powierzchnia przyjmuje wychylenie w obu kierunkach: najpierw obniża się
pod kostką, a podczas unoszenia może przejść w ciemny grzbiet podążający
za jej spodem. Nie ma osobnej soczewki, kropli ani znikającej kropki.
Usunięto CSS clip-path zasłaniający model. Opacity kostki pozostaje 1.

Gdy model jest gotowy, rysowanie tła wywołuje pętla kostki bezpośrednio
przed jej renderem. Oba obrazy korzystają z tych samych współczynników
konturu i tego samego położenia. Pozostałe strony bez kostki zachowują
samodzielną pętlę tła; wraca ona także po utracie kontekstu modelu.

## Ruch i zakończenie

Zachowano początkowy rozmiar, wysokość 30% desktop / 31% mobile, bazowe
kąty 0,48 / -0,67, boczny łuk i powolny obrót Y o 75,6°.
Runway ma 72svh. Oś kończy się względem rzeczywistej pozycji usług:
`scrollSpan = sectionTop - viewportHeight * 0.24`.

Przy 76% osi zaczyna się miękki wypór, kontynuowany po zatrzymaniu scrolla.
Sprężyna ma sztywność 36 i tłumienie 8,4; daje jedno niewielkie
przeregulowanie. Powrót poniżej 64% ponownie osadza kostkę. Amplituda
jest ograniczona rzeczywistym miejscem nad projekcją całego modelu.

Dalszy scroll, od 22vh przed końcem osi, wynosi cały model ponad ekran.
Dopiero po wyjściu jego podpory ponad viewport mocowanie domyka się
wykładniczo. Tło zachowuje ciągłość z usługami (#080909), a granica jest
ograniczona względem pierwszej linii treści. Nie ma niezależnego zaniku
kostki ani odcinania jej przez drugą sekcję.

## Koszt renderowania

- Jeden renderer kostki; pełny chrom ma transmission 0 i nie uruchamia
  dodatkowego passu transmisji. Warianty szkła i metalu są kompilowane wcześniej.
- DPR modelu respektuje urządzenie i limit 1,5; spada wraz z poziomem
  istniejącego regulatora cosgral-perf. Najniższy poziom ogranicza aktywne
  rysowanie obu warstw do około 30 Hz.
- Pozostaje analityczna normalna konturu, wczesne pomijanie jednolitych
  regionów i brak proceduralnych fal pod całkowicie jasnym tłem.
- Tło ma limity 1440/780 × 900 i zachowuje proporcje viewportu.
- Po domknięciu przejścia renderowanie jest pomijane. Fonty i obwiednia
  modelu nie są ponownie analizowane w każdej klatce.

## Stan i ograniczenia

Implementacja na gałęzi testowej, bez publikacji produkcyjnej.
Kontrola składni sześciu zmienionych modułów zakończona poprawnie.
Lokalny serwer zwraca HTTP 200 i znacznik rewizji 9.
Nie uruchamiano zestawów testów. Brak oceny w przeglądarce, zrzutu
rzeczywistego materiału i pomiaru FPS: lokalne sterowanie przeglądarką
jest nadal wyłączone w ustawieniach Work. Dokładna refrakcja i odbiór
choreografii wymagają obejrzenia w działającej przeglądarce.
