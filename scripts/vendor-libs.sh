#!/usr/bin/env bash
#
# Sciaga zewnetrzne biblioteki na wlasny hosting i przestawia strone na sciezki
# lokalne. Uruchom raz, potem commituj katalog vendor/.
#
# Po co: dzis gsap, ScrollTrigger, lenis i three.js leca z cudzych CDN-ow.
# To trzy dodatkowe polaczenia TLS przed pierwszym malowaniem i trzy punkty,
# w ktorych strona moze stanac, gdy ktorys CDN zwolni albo padnie.
#
#   ./scripts/vendor-libs.sh          # pobierz i przestaw strone na vendor/
#   ./scripts/vendor-libs.sh --check  # tylko sprawdz, co jest do zrobienia
#
set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/designkopia/cosgral-agency"
VENDOR_DIR="$SITE_DIR/vendor"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

# nazwa_pliku|adres zrodlowy|minimalny rozmiar w bajtach (kontrola zdrowia)
LIBS=(
  "three.module.js|https://unpkg.com/three@0.170.0/build/three.module.js|400000"
  "gsap.min.js|https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js|40000"
  "ScrollTrigger.min.js|https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js|30000"
  "lenis.min.js|https://unpkg.com/lenis@1.1.18/dist/lenis.min.js|8000"
)

PAGES=(index.html o-nas.html portfolio.html portfolio-grafiki.html
       portfolio-montaz.html uslugi/_template.html
       uslugi/grafika-i-montaz-wideo.html uslugi/pozycjonowanie-seo-geo.html
       uslugi/projektowanie-aplikacji.html uslugi/systemy-crm.html
       uslugi/tworzenie-stron-internetowych.html uslugi/wdrazanie-automatyzacji.html)

if [ "$CHECK_ONLY" = 1 ]; then
  echo "Do pobrania do $VENDOR_DIR:"
  for entry in "${LIBS[@]}"; do
    IFS='|' read -r name url _ <<< "$entry"
    if [ -f "$VENDOR_DIR/$name" ]; then
      echo "  [jest]  $name"
    else
      echo "  [brak]  $name  <- $url"
    fi
  done
  exit 0
fi

mkdir -p "$VENDOR_DIR"
for entry in "${LIBS[@]}"; do
  IFS='|' read -r name url minsize <<< "$entry"
  target="$VENDOR_DIR/$name"
  if [ -f "$target" ]; then
    echo "pomijam (juz jest): $name"
    continue
  fi
  echo "pobieram: $name"
  curl -fsSL --retry 3 --retry-delay 2 -o "$target.tmp" "$url"
  size=$(wc -c < "$target.tmp")
  if [ "$size" -lt "$minsize" ]; then
    rm -f "$target.tmp"
    echo "BLAD: $name ma tylko $size bajtow (spodziewane >= $minsize). Przerywam." >&2
    exit 1
  fi
  mv "$target.tmp" "$target"
  echo "  zapisane, $size bajtow"
done

echo
echo "przestawiam strony na sciezki lokalne..."
cd "$SITE_DIR"
for page in "${PAGES[@]}"; do
  [ -f "$page" ] || continue
  before=$(md5sum "$page" | cut -d' ' -f1)
  # import map three.js
  sed -i 's#"three":"https://unpkg.com/three@0.170.0/build/three.module.js"#"three":"/vendor/three.module.js"#g' "$page"
  # klasyczne tagi <script>
  sed -i 's#https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js#/vendor/gsap.min.js#g' "$page"
  sed -i 's#https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js#/vendor/ScrollTrigger.min.js#g' "$page"
  sed -i 's#https://unpkg.com/lenis@1.1.18/dist/lenis.min.js#/vendor/lenis.min.js#g' "$page"
  # preconnecty do CDN-ow przestaja byc potrzebne
  sed -i '/<link rel="preconnect" href="https:\/\/unpkg.com" crossorigin \/>/d' "$page"
  after=$(md5sum "$page" | cut -d' ' -f1)
  [ "$before" != "$after" ] && echo "  przestawione: $page"
done

echo
echo "Gotowe. Sprawdz strone lokalnie, potem: git add vendor && git commit"
