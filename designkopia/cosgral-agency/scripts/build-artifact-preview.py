#!/usr/bin/env python3
"""Sklada strone glowna w JEDEN plik HTML do opublikowania jako Artifact.

Artifact to pojedynczy dokument bez wlasnego serwera i z CSP, ktore przepuszcza
skrypty tylko z kilku CDN-ow. Wiec: wszystkie style i skrypty ida inline, moduly
ES przez blob URL (bo inline'owe moduly nie moga sie nawzajem importowac),
copy.json jako data URI, a obrazy jako data URI. Wideo pomijamy — same filmy to
ok. 17 MB, a limit strony to 16 MB.

Wynik jest FRAGMENTEM dokumentu — publikacja dokleja wokol niego
<!doctype html><html><head>...</head><body>. Otwarty lokalnie bez tego
opakowania trafia w tryb quirks, gdzie document.scrollingElement to <body>
i Lenis nie przewija. Testujac lokalnie, dolej wlasny doctype.

Uzycie:  python3 scripts/build-artifact-preview.py <plik-wyjsciowy.html>
"""
from __future__ import annotations

import base64
import mimetypes
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Biblioteki, ktorych CSP artefaktu nie wpusci z ich CDN-ow (website-files, unpkg).
VENDOR = "/tmp/claude-0/-home-user-cosgral-agency/92f978a7-e62b-5f05-b170-655eb9316333/scratchpad/node_modules"
CDN_LOCAL = {
    "gsap.min.js": f"{VENDOR}/gsap/dist/gsap.min.js",
    "ScrollTrigger.min.js": f"{VENDOR}/gsap/dist/ScrollTrigger.min.js",
    "lenis.min.js": f"{VENDOR}/lenis/dist/lenis.min.js",
}
THREE = f"{VENDOR}/three/build/three.module.js"
# Moduly ES strony — ladowane przez blob URL, nie zwyklym <script>.
ES_MODULES = {"home-hero-3d.js", "cube-shape.js"}
SKIP = {"site-cache-bust.js"}


def read(path: str) -> str:
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def data_uri(path: str) -> str:
    full = os.path.join(ROOT, path)
    mime = mimetypes.guess_type(full)[0] or "application/octet-stream"
    with open(full, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def bare(src: str) -> str:
    return src.split("?")[0].split("/")[-1]


def main() -> int:
    out_path = sys.argv[1] if len(sys.argv) > 1 else "podglad.html"
    html = read("index.html")

    # 1. Zdejmij powloke dokumentu — Artifact dostarcza wlasny <html>/<head>/<body>.
    body = html.split("<body", 1)[1].split(">", 1)[1].rsplit("</body>", 1)[0]
    head = html.split("<head>", 1)[1].split("</head>", 1)[0]

    parts: list[str] = []
    parts.append("<title>Podglad COSGRAL — strona glowna</title>")
    # body.home-page niesie caly arkusz strony glownej, wiec musi byc ustawione recznie.
    parts.append("""<script>
(function () {
  var r = document.documentElement;
  r.lang = "pl";
  r.setAttribute("data-i18n-meta", "meta");
  var ustaw = function () { if (document.body) document.body.className = "home-page"; };
  ustaw();
  document.addEventListener("DOMContentLoaded", ustaw);
})();
</script>""")

    # 2. Z <head> bierzemy tylko arkusze i skrypty; favicony/manifest nie maja
    #    sensu w artefakcie (nie ma tam tych plikow).
    def inline_assets(fragment: str) -> str:
        def css(m: re.Match) -> str:
            name = bare(m.group(1))
            if not os.path.isfile(os.path.join(ROOT, name)):
                return ""
            return f"<style>\n/* {name} */\n{read(name)}\n</style>"

        fragment = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css, fragment)

        def js(m: re.Match) -> str:
            src = m.group(1)
            name = bare(src)
            if name in SKIP:
                return f"<!-- pominiete w podgladzie: {name} -->"
            if name in CDN_LOCAL:
                with open(CDN_LOCAL[name], encoding="utf-8") as f:
                    return f"<script>\n/* {name} (lokalna kopia — CSP artefaktu nie wpuszcza tego CDN-u) */\n{f.read()}\n</script>"
            if name in ES_MODULES:
                return ""  # skladane osobno, nizej
            if os.path.isfile(os.path.join(ROOT, name)):
                return f"<script>\n/* {name} */\n{read(name)}\n</script>"
            return f"<!-- brak lokalnie: {src} -->"

        return re.sub(r'<script[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>', js, fragment)

    head_keep = re.sub(r'<link[^>]*rel="(icon|apple-touch-icon|manifest)"[^>]*>', "", head)
    parts.append(inline_assets(head_keep))

    # 3. Obrazy w tresci -> data URI (jest ich kilka, wszystkie male).
    def img(m: re.Match) -> str:
        path = m.group(2)
        if path.startswith(("data:", "http")):
            return m.group(0)
        full = os.path.join(ROOT, path.split("?")[0])
        if not os.path.isfile(full):
            return m.group(0)
        return f'{m.group(1)}="{data_uri(path.split("?")[0])}"'

    body = re.sub(r'\b(src|href)="((?:images|assets)/[^"]+\.(?:png|jpg|jpeg|svg|webp))"', img, body)
    parts.append(inline_assets(body))

    # 4. Moduly ES: three + cube-shape + home-hero-3d jako text/plain,
    #    zlozone w blob URL-e z przepisanymi specyfikatorami importu.
    with open(THREE, encoding="utf-8") as f:
        three_src = f.read()
    cube_src = read("cube-shape.js")
    hero_src = read("home-hero-3d.js")
    imp = r'from\s*["\'][^"\']*three\.module\.js["\']'
    cube_src = re.sub(imp, 'from "three"', cube_src)
    hero_src = re.sub(imp, 'from "three"', hero_src)

    def plain(el_id: str, src: str) -> str:
        # </script> w tresci rozbilby tag nosnika
        return f'<script type="text/plain" id="{el_id}">' + src.replace("</script>", "<\\/script>") + "</script>"

    parts.append(plain("src-three", three_src))
    parts.append(plain("src-cube", cube_src))
    parts.append(plain("src-hero", hero_src))
    parts.append("""<script>
/* Inline'owe moduly nie moga sie nawzajem importowac, wiec kazde zrodlo
   zamieniamy w blob URL i przepisujemy w nim specyfikatory na te URL-e. */
(function () {
  var tekst = function (id) { return document.getElementById(id).textContent; };
  var blob = function (src) {
    return URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  };
  try {
    var three = blob(tekst("src-three"));
    var cube = blob(tekst("src-cube").replace(/from\\s*["']three["']/g, 'from "' + three + '"'));
    var hero = blob(
      tekst("src-hero")
        .replace(/from\\s*["']three["']/g, 'from "' + three + '"')
        .replace(/from\\s*["']\\.\\/cube-shape\\.js["']/g, 'from "' + cube + '"')
    );
    if (
      document.getElementById("hero-3d") &&
      !document.documentElement.classList.contains("reduce-motion")
    ) {
      import(hero).catch(function (e) { console.warn("[podglad] scena 3D:", e); });
    }
  } catch (e) {
    console.warn("[podglad] nie udalo sie zlozyc modulow 3D:", e);
  }
})();
</script>""")

    doc = "\n".join(p for p in parts if p.strip())

    # 5. i18n czyta copy.json fetchem — w artefakcie nie ma czego pobrac,
    #    wiec podstawiamy ten sam JSON jako data URI.
    copy_uri = data_uri("i18n/copy.json")
    doc = doc.replace(
        'return src.replace(/i18n\\.js(\\?.*)?$/, "i18n/copy.json$1");',
        f'return "{copy_uri}";',
    ).replace('return "i18n/copy.json";', f'return "{copy_uri}";')

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(doc)

    print(f"{out_path}  —  {os.path.getsize(out_path) / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
