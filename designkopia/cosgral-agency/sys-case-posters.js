/* Systemy i automatyzacje — the case that unfolds under the fan after
 * "Zobacz więcej". The copy is rewritten for reading (not for the clickable
 * demos on the standalone case pages), and every module is drawn as a poster
 * in the language of the automation tiles: one ground, one graphic and one
 * loud line of type.
 */
(function () {
  "use strict";

  /* Graphics the fan tiles don't have; the rest come from the fan itself */
  var EXTRA = {
    kpi: '<div class="sys-art__kpi"></div>',
    timeline: '<svg class="sys-art__line" viewBox="0 0 400 160" fill="none"><path d="M10 96H390" stroke="currentColor" stroke-opacity=".35"/><path d="M10 96H262" stroke="currentColor" stroke-width="3"/><g stroke="currentColor"><path d="M10 82v28M136 86v20M262 86v20M390 82v28" stroke-opacity=".5"/></g><circle cx="10" cy="96" r="8" fill="currentColor"/><circle cx="136" cy="96" r="8" fill="currentColor"/><circle cx="262" cy="96" r="13" class="sys-art__acc"/><circle cx="390" cy="96" r="8" stroke="currentColor" stroke-width="2"/></svg>',
    gauge: '<svg class="sys-art__gauge" viewBox="0 0 400 230" fill="none"><path d="M40 210A160 160 0 0 1 360 210" stroke="currentColor" stroke-opacity=".18" stroke-width="34"/><path d="M40 210A160 160 0 0 1 300 90" stroke="currentColor" stroke-width="34"/><path d="M200 210L318 104" stroke="currentColor" stroke-width="3"/><circle cx="318" cy="104" r="15" class="sys-art__acc"/><circle cx="200" cy="210" r="9" fill="currentColor"/></svg>',
    alerts: '<div class="sys-art__alerts"><i></i><i></i><i></i><i></i></div>',
    pipe: '<div class="sys-art__pipe"><i><b></b><b></b><b></b></i><i><b></b><b></b></i><i><b></b><b></b><b></b></i><i><b></b></i></div>'
  };

  var COPY = {
    "portfolio-telforceone-crm.html": {
      pl: {
        lede: "Handlowcy TelForceOne planowali trasy w Excelu, a notatki z wizyt trzymali w telefonie. Zbudowaliśmy CRM, w którym klient, mapa i raport dnia są w jednym miejscu.",
        story: [
          "Baza klientów, plan wizyt i notatki z terenu żyły w trzech osobnych miejscach. Kierownik nie wiedział, kto u kogo był, a handlowiec przed każdym wyjazdem składał trasę ręcznie.",
          "Aplikacja łączy kartotekę klientów z mapą. Handlowiec widzi swoich klientów w terenie, układa z nich trasę, a po wizycie zapisuje ustalenia prosto w karcie klienta.",
          "Planowanie dnia zajmuje minuty, a biuro widzi pracę zespołu na bieżąco — bez dzwonienia do handlowców i zbierania raportów pod koniec tygodnia."
        ],
        tiles: [
          ["Baza klientów", "Jedna kartoteka dla całego zespołu: dane firmy, osoby kontaktowe, historia wizyt i otwarte tematy.", "Jedna<br>baza."],
          ["Klienci na mapie", "Każdy klient tam, gdzie naprawdę jest. Od razu widać, kto jest po drodze i kogo dawno nikt nie odwiedził.", "Mapa.<br>Trasa.<br>Raport."],
          ["Plan trasy", "Trasa dnia ułożona z kolejnych wizyt — start, przystanki i powrót w kolejności, która ma sens na drodze.", "Start →<br>powrót."],
          ["Notatka z wizyty", "Ustalenia z rozmowy trafiają do karty klienta zaraz po wyjściu ze sklepu, razem z przypomnieniem o następnym kroku.", "Zapisane<br><em>od razu.</em>"],
          ["Obciążenie rejonów", "Porównanie rejonów pokazuje, gdzie handlowiec ma za dużo wizyt, a gdzie klienci czekają za długo.", "Równy<br><em>teren.</em>"],
          ["Teren i biuro", "To, co handlowiec zapisze w terenie, biuro widzi w tej samej chwili. Mapa, CRM i raport korzystają z tych samych danych.", "Teren<br>= biuro."],
          ["Raport dnia", "Raport składa się sam z wizyt i notatek. Kierownik dostaje podsumowanie zamiast arkusza do uzupełnienia.", "Raport<br><em>sam się pisze.</em>"]
        ]
      },
      en: {
        lede: "TelForceOne’s sales reps planned routes in Excel and kept visit notes on their phones. We built a CRM where the client, the map and the daily report live in one place.",
        story: [
          "The client base, visit plans and field notes lived in three separate places. Managers didn’t know who had visited whom, and reps put each day’s route together by hand.",
          "The app connects the client records with a map. Reps see their clients on the ground, build a route from them and log what was agreed straight into the client card after each visit.",
          "Planning a day takes minutes, and the office follows the team’s work as it happens — no phone calls to reps and no reports gathered at the end of the week."
        ],
        tiles: [
          ["Client base", "One record for the whole team: company details, contacts, visit history and open topics.", "One<br>base."],
          ["Clients on the map", "Every client where they really are. You can see at once who is on the way and who hasn’t been visited for a while.", "Map.<br>Route.<br>Report."],
          ["Route plan", "The day’s route built from the visits — start, stops and return in an order that makes sense on the road.", "Start →<br>return."],
          ["Visit note", "What was agreed goes into the client card right after the visit, with a reminder of the next step.", "Logged<br><em>at once.</em>"],
          ["Territory load", "Comparing regions shows where a rep has too many visits and where clients wait too long.", "Even<br><em>ground.</em>"],
          ["Field and office", "What a rep logs in the field, the office sees the same moment. Map, CRM and report run on the same data.", "Field<br>= office."],
          ["Daily report", "The report assembles itself from visits and notes. Managers get a summary instead of a sheet to fill in.", "The report<br><em>writes itself.</em>"]
        ]
      },
      art: [["ink", "kpi"], ["carbon", "map"], ["stone", "timeline"], ["carbon", "chat"], ["steel", "bars"], ["ink", "graph"], ["hot", "gauge"]]
    },

    "portfolio-telforceone-code39.html": {
      pl: {
        lede: "Etykiety w magazynie TelForceOne powstawały w kilku programach i nie zawsze dawały się zeskanować. Generator Code 39 robi poprawną etykietę z podglądem i wysyła ją prosto do druku.",
        story: [
          "Każdy kod składano ręcznie w innym narzędziu. Literówka albo zły rozmiar wychodziły dopiero przy skanerze, kiedy towar leżał już na półce.",
          "Jedno narzędzie w przeglądarce: wpisujesz SKU, widzisz gotowy kod, sprawdzasz format etykiety i drukujesz pojedynczo albo całą serią.",
          "Oznaczenie produktu trwa sekundy, a etykiety czytają się za pierwszym razem. Magazyn nie poprawia już kodów po fakcie."
        ],
        tiles: [
          ["Podgląd kodu", "Kod rysuje się na żywo podczas wpisywania SKU, więc błąd widać, zanim etykieta trafi do drukarki.", "*SKU<br>039*"],
          ["Sprawdzenie poprawności", "Generator pilnuje dozwolonych znaków, sumy kontrolnej i marginesów, żeby skaner nie miał wątpliwości.", "Bez<br><em>błędów.</em>"],
          ["Format etykiety", "Wymiary i rozdzielczość dopasowane do drukarki magazynowej — etykieta wychodzi w tej samej skali za każdym razem.", "48 × 22<br>mm."],
          ["Druk seryjny", "Całą dostawę można oznaczyć jedną serią zamiast drukować kody pojedynczo.", "Cała<br><em>dostawa.</em>"],
          ["Od kodu do półki", "Generowanie, kolejka i druk w jednym przebiegu. Etykieta jest gotowa, zanim towar zejdzie z palety.", "Kod →<br>półka."],
          ["Kontrola jakości", "Słaby kontrast albo nieudany wydruk wracają od razu jako komunikat, z możliwością ponowienia.", "Skan<br>OK."],
          ["Pokrycie asortymentu", "Widać, jaka część produktów ma już poprawne etykiety, a których jeszcze brakuje.", "Każdy<br>SKU."]
        ]
      },
      en: {
        lede: "Labels in TelForceOne’s warehouse were made in several programs and didn’t always scan. The Code 39 generator makes a correct label with a preview and sends it straight to print.",
        story: [
          "Every code was put together by hand in a different tool. A typo or the wrong size only showed up at the scanner, when the stock was already on the shelf.",
          "One tool in the browser: type the SKU, see the finished code, check the label format and print one at a time or as a batch.",
          "Labelling a product takes seconds and labels scan first time. The warehouse no longer fixes codes after the fact."
        ],
        tiles: [
          ["Code preview", "The code draws live as you type the SKU, so a mistake shows before the label reaches the printer.", "*SKU<br>039*"],
          ["Validity check", "The generator watches allowed characters, the checksum and margins so the scanner has no doubts.", "No<br><em>errors.</em>"],
          ["Label format", "Size and resolution matched to the warehouse printer — the label comes out at the same scale every time.", "48 × 22<br>mm."],
          ["Batch printing", "A whole delivery can be labelled in one batch instead of printing codes one by one.", "The whole<br><em>delivery.</em>"],
          ["From code to shelf", "Generating, queueing and printing in one pass. The label is ready before the stock leaves the pallet.", "Code →<br>shelf."],
          ["Quality control", "Low contrast or a failed print comes straight back as a message, with a retry.", "Scan<br>OK."],
          ["Range coverage", "You can see which products already have correct labels and which are still missing.", "Every<br>SKU."]
        ]
      },
      art: [["paper", "barcode"], ["stone", "sheets"], ["carbon", "kpi"], ["steel", "bars"], ["ink", "timeline"], ["hot", "alerts"], ["paper", "gauge"]]
    },

    "portfolio-telforceone-forecast.html": {
      pl: {
        lede: "Zakupy w TelForceOne opierały się na wyczuciu: raz brakowało towaru, raz leżał miesiącami. Panel stanów i prognoz podpowiada, co i kiedy dokupić.",
        story: [
          "Stany sprawdzano w eksportach z systemu, a decyzję o zamówieniu podejmowano z pamięci. Braki wychodziły dopiero wtedy, gdy klient pytał o produkt.",
          "Panel łączy stany magazynowe z tempem sprzedaży i liczy, na ile dni wystarczy każdego produktu. Gdy zapas spada poniżej progu, pojawia się alert i gotowy szkic zamówienia.",
          "Zakupy reagują, zanim półka opustoszeje, a gotówka nie zamraża się w towarze, który się nie rusza."
        ],
        tiles: [
          ["Stan w liczbach", "Liczba produktów, pozycje poniżej minimum i zapas w dniach — obraz magazynu w jednym rzucie oka.", "Stan<br>na dziś."],
          ["Trend sprzedaży", "Krzywa sprzedaży pokazuje sezonowość i przyspieszenia, które arkusz chował w wierszach.", "Trend<br><em>widać.</em>"],
          ["Rotacja", "Produkty uszeregowane według tempa sprzedaży: co schodzi szybko, a co zalega na regale.", "Zanim<br><em>zabraknie.</em>"],
          ["Alerty braków", "Alert pojawia się kilka dni przed brakiem, z informacją, ile dni zapasu zostało.", "4 dni<br>zapasu."],
          ["Szkic zamówienia", "Z alertu powstaje propozycja zamówienia: ilość, dostawca i dokument do zatwierdzenia.", "Alert →<br>zamówienie."],
          ["Jedno źródło danych", "Stany, prognoza i zakupy liczą się z tych samych danych, więc zakupy i magazyn mówią jednym głosem.", "Jedne<br>dane."],
          ["Pewność prognozy", "Każda prognoza ma wskaźnik pewności — wiadomo, kiedy zaufać liczbom, a kiedy sprawdzić je ręcznie.", "Pewna<br><em>prognoza.</em>"]
        ]
      },
      en: {
        lede: "Purchasing at TelForceOne ran on gut feeling: one month stock ran out, the next it sat for months. The stock and forecast panel shows what to reorder and when.",
        story: [
          "Stock was checked in system exports and reorders were decided from memory. Shortages only surfaced when a customer asked for the product.",
          "The panel combines stock levels with the pace of sales and works out how many days each product will last. When stock drops below the threshold, an alert appears with a draft order ready.",
          "Purchasing reacts before the shelf empties, and cash doesn’t freeze in goods that don’t move."
        ],
        tiles: [
          ["Stock in numbers", "Product count, items below minimum and days of cover — the warehouse at a glance.", "Stock<br>today."],
          ["Sales trend", "The sales curve shows seasonality and spikes the spreadsheet hid in its rows.", "The trend<br><em>shows.</em>"],
          ["Turnover", "Products ranked by how fast they sell: what moves quickly and what sits on the rack.", "Before<br><em>it runs out.</em>"],
          ["Shortage alerts", "An alert comes days before a shortage, saying how many days of stock are left.", "4 days<br>left."],
          ["Draft order", "The alert turns into a proposed order: quantity, supplier and a document to approve.", "Alert →<br>order."],
          ["One source of data", "Stock, forecast and purchasing count from the same data, so buyers and the warehouse speak with one voice.", "One<br>dataset."],
          ["Forecast confidence", "Every forecast carries a confidence score — you know when to trust the numbers and when to check by hand.", "A sure<br><em>forecast.</em>"]
        ]
      },
      art: [["carbon", "kpi"], ["steel", "spark"], ["stone", "bars"], ["hot", "alerts"], ["paper", "sheets"], ["ink", "graph"], ["stone", "gauge"]]
    },

    "portfolio-trove-panel.html": {
      pl: {
        lede: "Trove sprzedaje vintage luxury we własnym sklepie i na marketplace’ach. Ceny i stany sprawdzano w arkuszach, więc spadki marży wychodziły po fakcie. Panel pilnuje tego w jednym widoku.",
        story: [
          "Każdy kanał miał inną cenę i inny stan, a porównanie wymagało ręcznego przeklejania danych. Gdy konkurencja obniżała cenę, Trove dowiadywało się o tym po kilku dniach.",
          "Panel zbiera stany i ceny ze sklepu i marketplace’ów, porównuje je z rynkiem i wysyła alert, gdy oferta wypada z gry albo marża spada poniżej progu.",
          "Zespół reaguje na zmianę ceny tego samego dnia, a decyzje o przecenach opiera na liczbach, nie na przeczuciu."
        ],
        tiles: [
          ["Pulpit sklepu", "Dostępność produktów, liczba alertów i marża w jednym kadrze — od razu widać, gdzie sklep traci tempo.", "Sklep<br>na dziś."],
          ["Stany magazynowe", "Braki i nadwyżki odczytane w kilka sekund, bez otwierania arkusza.", "Co<br><em>zostało.</em>"],
          ["Ceny w kanałach", "Cena w sklepie, na Allegro i u konkurencji obok siebie. Różnice widać od razu.", "Cena<br>pod<br>kontrolą."],
          ["Alerty przecen", "Powiadomienie, gdy konkurent schodzi z ceną albo produkt znika z oferty.", "−8%<br>Allegro."],
          ["Synchronizacja kanałów", "Stany i ceny ze wszystkich kanałów spływają do jednego źródła prawdy.", "Jeden<br>stan."],
          ["Strażnik marży", "Każdy produkt ma bezpieczny zakres marży. Panel ostrzega, zanim przecena zacznie kosztować.", "Marża<br><em>bez strat.</em>"],
          ["Czas reakcji", "Droga od wykrycia zmiany ceny do poprawionej oferty skraca się z dni do godzin.", "Dni →<br>godziny."]
        ]
      },
      en: {
        lede: "Trove sells vintage luxury in its own store and on marketplaces. Prices and stock were checked in spreadsheets, so margin drops surfaced after the fact. The panel watches it all in one view.",
        story: [
          "Every channel had a different price and a different stock level, and comparing them meant pasting data by hand. When competitors cut prices, Trove found out days later.",
          "The panel gathers stock and prices from the store and the marketplaces, compares them with the market and sends an alert when a listing falls out of the race or margin drops below the threshold.",
          "The team reacts to a price change the same day and bases markdowns on numbers, not hunches."
        ],
        tiles: [
          ["Store dashboard", "Availability, alerts and margin in one frame — you can see at once where the store loses pace.", "The store<br>today."],
          ["Stock levels", "Shortages and surplus read in seconds, without opening a spreadsheet.", "What’s<br><em>left.</em>"],
          ["Prices across channels", "The price in the store, on Allegro and at competitors side by side. Differences show at once.", "Price<br>under<br>control."],
          ["Markdown alerts", "A notification when a competitor cuts the price or a product drops off the listing.", "−8%<br>Allegro."],
          ["Channel sync", "Stock and prices from every channel flow into one source of truth.", "One<br>stock."],
          ["Margin guard", "Each product has a safe margin range. The panel warns before a markdown starts to cost money.", "Margin<br><em>intact.</em>"],
          ["Reaction time", "The path from spotting a price change to a corrected listing shrinks from days to hours.", "Days →<br>hours."]
        ]
      },
      art: [["carbon", "kpi"], ["steel", "bars"], ["hot", "price"], ["paper", "alerts"], ["ink", "graph"], ["stone", "gauge"], ["carbon", "timeline"]]
    },

    "portfolio-trove-workflow.html": {
      pl: {
        lede: "Po każdym zamówieniu w Trove ktoś ręcznie wystawiał fakturę, zmieniał status i pisał do klienta. Teraz zamówienie samo uruchamia cały ten łańcuch.",
        story: [
          "Dane z zamówienia przepisywano do faktury, status zmieniano w drugim narzędziu, a wiadomość do klienta szła osobno. Im więcej zamówień, tym więcej pomyłek i opóźnień.",
          "Automatyczny przepływ od checkoutu: faktura, przekazanie do magazynu i kuriera, numer śledzenia i wiadomość do klienta. Człowiek włącza się tylko przy wyjątkach.",
          "Obsługa zamówienia nie wymaga już klikania w trzech systemach. Klient dostaje spójne informacje, a zespół zajmuje się tylko nietypowymi sprawami."
        ],
        tiles: [
          ["Nowe zamówienie", "Zamówienie ze sklepu uruchamia cały proces bez udziału człowieka.", "Zamówienie.<br>Start."],
          ["Faktura", "Dane zamówienia trafiają do faktury i eksportu księgowego bez przepisywania.", "Faktura<br><em>sama.</em>"],
          ["Pakowanie", "Magazyn widzi kolejkę zamówień do spakowania i rozkład pracy w ciągu dnia.", "Fala<br><em>paczek.</em>"],
          ["Przekazanie kurierowi", "Paczka trafia do kuriera przez API, a numer przesyłki wraca do zamówienia automatycznie.", "Magazyn<br>→ kurier."],
          ["Status przesyłki", "Nadanie, sortownia i doręczenie zapisują się w zamówieniu na bieżąco.", "Nadana.<br>Doręczona."],
          ["Wiadomość do klienta", "Klient dostaje informację o nadaniu i doręczeniu we właściwym momencie — nikt nie pisze tych maili ręcznie.", "Paczka<br><em>w drodze.</em>"],
          ["Bez ręcznej pracy", "Większość zamówień przechodzi cały proces bez jednego kliknięcia zespołu.", "Zero<br>kliknięć."]
        ]
      },
      en: {
        lede: "After every Trove order someone issued the invoice by hand, changed the status and wrote to the customer. Now the order sets off that whole chain on its own.",
        story: [
          "Order data was retyped into the invoice, the status was changed in another tool and the customer message went out separately. The more orders, the more mistakes and delays.",
          "An automated flow from checkout: invoice, hand-off to the warehouse and courier, tracking number and a message to the customer. A person steps in only for exceptions.",
          "Handling an order no longer means clicking through three systems. Customers get consistent updates and the team only deals with the unusual cases."
        ],
        tiles: [
          ["New order", "An order from the store starts the whole process with no one involved.", "Order.<br>Go."],
          ["Invoice", "Order data flows into the invoice and the accounting export without retyping.", "Invoice<br><em>done.</em>"],
          ["Packing", "The warehouse sees the queue of orders to pack and how work spreads through the day.", "A wave<br><em>of parcels.</em>"],
          ["Courier hand-off", "The parcel goes to the courier through the API, and the tracking number comes back to the order automatically.", "Warehouse<br>→ courier."],
          ["Shipment status", "Dispatch, sorting and delivery are recorded on the order as they happen.", "Shipped.<br>Delivered."],
          ["Customer message", "The customer hears about dispatch and delivery at the right moment — no one writes those emails by hand.", "Parcel<br><em>on its way.</em>"],
          ["No manual work", "Most orders go through the whole process without a single click from the team.", "Zero<br>clicks."]
        ]
      },
      art: [["hot", "kpi"], ["paper", "sheets"], ["steel", "bars"], ["ink", "graph"], ["stone", "timeline"], ["carbon", "chat"], ["hot", "gauge"]]
    },

    "portfolio-crm-leady.html": {
      pl: {
        lede: "Lead bez właściciela i bez follow-upu to stracona sprzedaż. Ten CRM prowadzi każde zapytanie od pierwszego kontaktu do podpisanej umowy.",
        story: [
          "Zapytania przychodziły mailem, przez formularz i na czacie, a ustalenia zapisywano na kartkach. Część leadów nie dostawała odpowiedzi, a follow-upy się spóźniały.",
          "Wszystkie źródła trafiają do jednej kolejki. Każdy lead ma właściciela, etap w lejku, historię kontaktu i przypomnienie o kolejnym kroku.",
          "Żaden lead nie ginie między skrzynkami, a zespół widzi, które deale wymagają uwagi dziś, zanim ostygną."
        ],
        tiles: [
          ["Zbieranie leadów", "Formularze, maile i czaty trafiają do jednej kolejki, razem z czasem pierwszej odpowiedzi.", "Lead.<br>Deal.<br>Done."],
          ["Kwalifikacja", "Każde zapytanie przechodzi te same etapy, więc od razu wiadomo, które warto rozwijać.", "Lead →<br>klient."],
          ["Lejek sprzedaży", "Deale ułożone w kolumnach etapów — widać, co stoi w miejscu, a co zbliża się do zamknięcia.", "Lejek<br><em>w ruchu.</em>"],
          ["Karta deala", "Przypomnienie o follow-upie, zbliżającym się terminie albo dealu, który za długo stoi w miejscu.", "Nie<br>ostygnie."],
          ["Historia kontaktu", "Rozmowy, maile i spotkania na jednej osi — każdy w zespole wie, na czym skończyła się ostatnia rozmowa.", "Kontakt<br>→ umowa."],
          ["Plan dnia", "Zadania handlowca na dziś ułożone według pilności, bez szukania po kalendarzu.", "Dziś<br><em>do zrobienia.</em>"],
          ["Skuteczność", "Odsetek dealów zamykanych w terminie pokazuje, gdzie lejek działa, a gdzie trzeba go poprawić.", "Win<br>rate."]
        ]
      },
      en: {
        lede: "A lead with no owner and no follow-up is a lost sale. This CRM takes every enquiry from first contact to a signed contract.",
        story: [
          "Enquiries came in by email, form and chat, and agreements were jotted on scraps of paper. Some leads never got a reply and follow-ups ran late.",
          "Every source lands in one queue. Each lead has an owner, a stage in the funnel, a contact history and a reminder of the next step.",
          "No lead gets lost between inboxes, and the team sees which deals need attention today, before they go cold."
        ],
        tiles: [
          ["Lead capture", "Forms, emails and chats land in one queue, with the time to first reply.", "Lead.<br>Deal.<br>Done."],
          ["Qualification", "Every enquiry goes through the same stages, so it’s clear at once which are worth pursuing.", "Lead →<br>client."],
          ["Sales funnel", "Deals laid out in stage columns — you can see what’s stuck and what’s about to close.", "A funnel<br><em>in motion.</em>"],
          ["Deal card", "A reminder about a follow-up, an upcoming deadline or a deal that has stood still too long.", "It won’t<br>go cold."],
          ["Contact history", "Calls, emails and meetings on one timeline — everyone knows where the last conversation ended.", "Contact<br>→ contract."],
          ["Daily plan", "A rep’s tasks for today ordered by urgency, without digging through the calendar.", "Today<br><em>to do.</em>"],
          ["Win rate", "The share of deals closed on time shows where the funnel works and where it needs fixing.", "Win<br>rate."]
        ]
      },
      art: [["carbon", "kpi"], ["paper", "sheets"], ["steel", "pipe"], ["hot", "alerts"], ["ink", "timeline"], ["stone", "bars"], ["paper", "gauge"]]
    },

    "portfolio-chatbot-ai.html": {
      pl: {
        lede: "Klienci piszą wieczorami te same pytania, a zespół odpisywał rano. Bot odpowiada od razu, zbiera szczegóły i trudniejsze sprawy przekazuje konsultantowi z pełnym kontekstem.",
        story: [
          "Instagram, Messenger, strona i mail zasypywały zespół powtarzalnymi pytaniami. Odpowiedź przychodziła po kilku godzinach, a część klientów w tym czasie wybierała konkurencję.",
          "Wiadomości ze wszystkich kanałów trafiają do jednej skrzynki. Bot rozpoznaje, o co chodzi, odpowiada na pytania z FAQ, rezerwuje terminy i zbiera brief do wyceny.",
          "Klient dostaje odpowiedź o każdej porze, a konsultant przejmuje tylko te rozmowy, w których jest naprawdę potrzebny — od razu z historią i zebranymi danymi."
        ],
        tiles: [
          ["Jedna skrzynka", "Instagram, Facebook, strona i mail spływają do jednego miejsca.", "Wszystkie<br>kanały."],
          ["O co chodzi klientowi", "Bot sprawdza, czy to pytanie, prośba o wycenę czy reklamacja, zanim odpowie.", "O co<br><em>chodzi?</em>"],
          ["Rezerwacja terminu", "Klient pyta o wolny termin, bot proponuje godziny i potwierdza rezerwację mailem.", "Sobota,<br>15:30."],
          ["Brief do wyceny", "Przed rozmową z handlowcem bot zbiera zakres i budżet, więc wycena zaczyna się od konkretów.", "Zakres.<br>Budżet."],
          ["Przekazanie konsultantowi", "Gdy bot nie jest pewny odpowiedzi, rozmowa trafia do człowieka razem z całą historią.", "Bot →<br>człowiek."],
          ["Ciągłość rozmowy", "Od pierwszego pytania do odpowiedzi konsultanta klient nie musi niczego powtarzać.", "Bez<br><em>powtarzania.</em>"],
          ["Odpowiedź o każdej porze", "Większość pytań zadanych w nocy bot zamyka sam, zanim zespół zacznie pracę.", "24/7."]
        ]
      },
      en: {
        lede: "Customers send the same questions in the evening, and the team replied the next morning. The bot answers at once, gathers the details and hands harder cases to a consultant with the full context.",
        story: [
          "Instagram, Messenger, the website and email buried the team in repeat questions. Replies came hours later, and some customers chose a competitor in the meantime.",
          "Messages from every channel land in one inbox. The bot works out what the customer wants, answers FAQ questions, books appointments and gathers a brief for a quote.",
          "Customers get an answer at any hour, and a consultant only takes the conversations where they’re really needed — with the history and the details already collected."
        ],
        tiles: [
          ["One inbox", "Instagram, Facebook, the website and email flow into one place.", "Every<br>channel."],
          ["What the customer wants", "The bot checks whether it’s a question, a quote request or a complaint before it replies.", "What’s<br><em>it about?</em>"],
          ["Booking", "A customer asks for a free slot, the bot suggests times and confirms the booking by email.", "Saturday,<br>3:30 pm."],
          ["Brief for a quote", "Before the sales call the bot collects scope and budget, so the quote starts from specifics.", "Scope.<br>Budget."],
          ["Hand-off to a consultant", "When the bot isn’t sure of the answer, the conversation goes to a person with its whole history.", "Bot →<br>human."],
          ["One conversation", "From the first question to the consultant’s reply, the customer never has to repeat themselves.", "No<br><em>repeating.</em>"],
          ["Answers at any hour", "The bot closes most questions asked at night on its own, before the team starts work.", "24/7."]
        ]
      },
      art: [["ink", "graph"], ["paper", "sheets"], ["carbon", "chat"], ["ink", "chat"], ["stone", "pipe"], ["steel", "timeline"], ["hot", "gauge"]]
    }
  };

  function lang() {
    var i = window.cosgralI18n;
    var l = (i && i.getLang && i.getLang()) || document.documentElement.lang || "pl";
    return String(l).toLowerCase().indexOf("en") === 0 ? "en" : "pl";
  }
  function decor(kind) {
    if (EXTRA[kind]) return EXTRA[kind];
    var art = window.CosgralSysArt && window.CosgralSysArt.decor;
    return (art && art[kind]) || "";
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function apply(body, href) {
    var key = String(href || "").split("#")[0].split("/").pop();
    var data = COPY[key];
    if (!body || !data) return false;
    var L = lang(), copy = data[L] || data.pl;
    body.classList.add("sys-case--posters");

    var lede = body.querySelector(".case-study__lede");
    if (lede) lede.textContent = copy.lede;

    var story = body.querySelector(".sys-fan__case-story");
    if (story) {
      story.textContent = "";
      var labels = L === "en" ? ["Problem", "Solution", "Result"] : ["Problem", "Rozwiązanie", "Efekt"];
      copy.story.forEach(function (text, i) {
        var p = el("p", "sys-case__beat");
        p.appendChild(el("span", "sys-case__beat-label", "0" + (i + 1) + " — " + labels[i]));
        p.appendChild(el("span", null, text));
        story.appendChild(p);
      });
    }

    /* The module index at the top names the same modules as the posters */
    Array.prototype.forEach.call(body.querySelectorAll(".case-viz-intro__index a"), function (a, i) {
      if (!copy.tiles[i]) return;
      a.textContent = "";
      a.appendChild(el("span", null, (i < 9 ? "0" : "") + (i + 1)));
      a.appendChild(el("span", null, copy.tiles[i][0]));
    });

    var client = (body.querySelector(".case-study__client") || {}).textContent || "COSGRAL";
    Array.prototype.forEach.call(body.querySelectorAll(".case-viz-tile"), function (tile, i) {
      var row = copy.tiles[i], art = data.art[i];
      if (!row || !art) return;
      var title = tile.querySelector(".case-viz-tile__title");
      var text = tile.querySelector(".case-viz-tile__text");
      var hint = tile.querySelector(".case-viz-tile__hint");
      if (title) title.textContent = row[0];
      if (text) text.textContent = row[1];
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      var stage = tile.querySelector(".case-viz-tile__stage");
      if (!stage) return;
      stage.className = "case-viz-tile__stage sys-poster sys-poster--" + art[0];
      stage.removeAttribute("tabindex");
      stage.setAttribute("aria-hidden", "true");
      stage.innerHTML =
        '<div class="sys-tile__top"><span>' + (i < 9 ? "0" : "") + (i + 1) + " / " + (L === "en" ? "Module" : "Moduł") + "</span><span></span></div>" +
        '<div class="sys-art sys-art--' + art[1] + '">' + decor(art[1]) + '<strong class="sys-art__type">' + row[2] + "</strong></div>";
      stage.querySelector(".sys-tile__top span:last-child").textContent = client.trim();
    });
    return true;
  }

  window.CosgralSysPosters = { apply: apply };
})();
