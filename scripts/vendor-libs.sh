#!/usr/bin/env bash
#
# Sciaga zewnetrzne biblioteki na wlasny hosting i przestawia strone na sciezki
# lokalne. Uruchom raz, potem zacommituj katalog vendor/.
#
# Po co: gsap, ScrollTrigger, lenis i three.js leca dzis z dwoch cudzych CDN-ow.
# To dodatkowe polaczenia TLS przed pierwszym malowaniem i punkty, w ktorych
# strona moze stanac, gdy ktorys CDN zwolni albo padnie.
#
# Zrodlem jest rejestr npm, a nie adresy CDN: wersje sa tam przypiete dokladnie
# takie same, jakich strona uzywa teraz, wiec podmiana niczego nie zmienia poza
# miejscem, z ktorego plik sie pobiera.
#
#   ./scripts/vendor-libs.sh           # pobierz i przestaw strone na vendor/
#   ./scripts/vendor-libs.sh --check   # pokaz plan, nie ruszaj plikow
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="$ROOT/designkopia/cosgral-agency"
VENDOR_DIR="$SITE_DIR/vendor"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

# pakiet npm | wersja | sciezka w paczce | nazwa docelowa | min. rozmiar (kontrola zdrowia)
LIBS=(
  "three|0.170.0|build/three.module.js|three.module.js|400000"
  "gsap|3.15.0|dist/gsap.min.js|gsap.min.js|40000"
  "gsap|3.15.0|dist/ScrollTrigger.min.js|ScrollTrigger.min.js|30000"
  "lenis|1.1.18|dist/lenis.min.js|lenis.min.js|8000"
)

PAGES=(index.html o-nas.html portfolio.html portfolio-grafiki.html
       portfolio-montaz.html uslugi/_template.html
       uslugi/grafika-i-montaz-wideo.html uslugi/pozycjonowanie-seo-geo.html
       uslugi/projektowanie-aplikacji.html uslugi/systemy-crm.html
       uslugi/tworzenie-stron-internetowych.html uslugi/wdrazanie-automatyzacji.html)

if [ "$CHECK_ONLY" = 1 ]; then
  echo "Do pobrania do $VENDOR_DIR:"
  for entry in "${LIBS[@]}"; do
    IFS='|' read -r pkg ver path name _ <<< "$entry"
    if [ -f "$VENDOR_DIR/$name" ]; then
      echo "  [jest]  $name"
    else
      echo "  [brak]  $name  <- npm:$pkg@$ver/$path"
    fi
  done
  exit 0
fi

command -v npm >/dev/null || { echo "BLAD: potrzebny npm." >&2; exit 1; }

mkdir -p "$VENDOR_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for entry in "${LIBS[@]}"; do
  IFS='|' read -r pkg ver path name minsize <<< "$entry"
  target="$VENDOR_DIR/$name"
  if [ -f "$target" ]; then
    echo "pomijam (juz jest): $name"
    continue
  fi

  pkgdir="$TMP/$pkg-$ver"
  if [ ! -d "$pkgdir" ]; then
    echo "pobieram paczke $pkg@$ver ..."
    ( cd "$TMP" && npm pack "$pkg@$ver" --silent >/dev/null )
    mkdir -p "$pkgdir"
    tar xzf "$TMP/${pkg}-${ver}.tgz" -C "$pkgdir" --strip-components=1
  fi

  [ -f "$pkgdir/$path" ] || { echo "BLAD: w $pkg@$ver nie ma $path" >&2; exit 1; }
  size=$(wc -c < "$pkgdir/$path")
  if [ "$size" -lt "$minsize" ]; then
    echo "BLAD: $name ma $size bajtow (spodziewane >= $minsize). Przerywam." >&2
    exit 1
  fi
  cp "$pkgdir/$path" "$target"
  echo "  $name — $size bajtow"
done

echo
echo "przestawiam strony na sciezki lokalne..."
cd "$SITE_DIR"
for page in "${PAGES[@]}"; do
  [ -f "$page" ] || continue
  before=$(md5sum "$page" | cut -d' ' -f1)
  sed -i 's#"three":"https://unpkg.com/three@0.170.0/build/three.module.js"#"three":"/vendor/three.module.js"#g' "$page"
  sed -i 's#https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js#/vendor/gsap.min.js#g' "$page"
  sed -i 's#https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js#/vendor/ScrollTrigger.min.js#g' "$page"
  sed -i 's#https://unpkg.com/lenis@1.1.18/dist/lenis.min.js#/vendor/lenis.min.js#g' "$page"
  sed -i '/<link rel="preconnect" href="https:\/\/unpkg.com" crossorigin \/>/d' "$page"
  after=$(md5sum "$page" | cut -d' ' -f1)
  [ "$before" != "$after" ] && echo "  przestawione: $page"
done

echo
echo "Gotowe. Sprawdz strone lokalnie, potem: git add vendor && git commit"
