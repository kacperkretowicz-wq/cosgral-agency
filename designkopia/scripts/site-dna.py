#!/usr/bin/env python3
"""SITE-DNA — pelna forensyka strony z URL: stack, biblioteki, fonty, kolory, efekty.

Krok 1 skilla /site-dna. Pobiera HTML + CSS + JS strony, wykrywa technologie
i heurystyki efektow, mapuje je na technique_id z profiles/effects-stack.yaml
oraz komponenty web/lib/effects/, i zapisuje kapsule dowodowa dla Claude'a,
ktory na jej bazie pisze REBUILD-BLUEPRINT.md i zasila effects-library.yaml.

Usage:
  python scripts/site-dna.py https://voyeurverite.com
  python scripts/site-dna.py https://letsplayfight.com --slug playfight
  python scripts/site-dna.py <url> --max-js 12 --max-css 12

Output: references/site-dna/<slug>/
  site-dna.json    - pelny raport maszynowy
  capture/         - index.html + pobrane CSS/JS (dowody dla Claude'a)
"""

from __future__ import annotations

import gzip
import io
import json
import re
import sys
import zlib
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = ROOT / "references" / "site-dna"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

MAX_CSS_FILES = 10
MAX_JS_FILES = 10
MAX_FILE_BYTES = 900_000
FETCH_TIMEOUT = 25

# JS-y analityczne itp. — nie warto ich pobierac
SKIP_JS = re.compile(
    r"googletagmanager|google-analytics|gtag|fbevents|hotjar|clarity\.ms|"
    r"plausible|fathom|segment|intercom|crisp|hubspot|klaviyo|mailchimp|"
    r"recaptcha|cookiebot|onetrust|usercentrics|sentry|newrelic",
    re.I,
)

# ── SYGNATURY ─────────────────────────────────────────────────────────────
BUILDERS = {
    "Webflow": r"data-wf-page|data-wf-site|webflow\.[a-z0-9]*\.?js|w-mod-|\.w-nav\b",
    "Framer": r"framerusercontent\.com|data-framer-name|__framer|framer\.website",
    "Readymag": r"readymag",
    "Wix": r"static\.wixstatic|wix-code|_wixCIDX",
    "Squarespace": r"static1\.squarespace|squarespace\.com/static",
    "WordPress": r"wp-content|wp-includes",
    "Elementor": r"elementor",
    "Shopify": r"cdn\.shopify\.com|Shopify\.theme",
    "Cargo": r"cargo\.site|cargocollective",
    "Semplice": r"semplice",
}

FRAMEWORKS = {
    "Next.js": r"__NEXT_DATA__|/_next/static|id=\"__next\"",
    "Nuxt": r"__NUXT__|/_nuxt/",
    "Gatsby": r"___gatsby|gatsby-focus-wrapper",
    "Astro": r"astro-island|data-astro-",
    "SvelteKit": r"__sveltekit|data-sveltekit",
    "Remix": r"__remixContext",
    "React": r"data-reactroot|react-dom|__REACT_DEVTOOLS|\breact\.production",
    "Vue": r"data-v-app|__vue_app__|vue(\.runtime)?(\.global)?(\.prod)?(\.min)?\.js",
    "Angular": r"ng-version=",
    "Alpine.js": r"alpinejs|x-data=",
    "htmx": r"\bhtmx(\.min)?\.js",
    "jQuery": r"jquery[.-]",
}

ANIMATION_LIBS = {
    "gsap": r"gsap(\.min)?\.js|\bgsap\.(to|from|timeline|registerPlugin)\b",
    "gsap/ScrollTrigger": r"ScrollTrigger",
    "gsap/ScrollSmoother": r"ScrollSmoother",
    "gsap/SplitText": r"SplitText",
    "gsap/Flip": r"\bFlip\.(from|getState)|gsap.*Flip(\.min)?\.js",
    "gsap/Draggable": r"\bDraggable\.(create|get)|gsap.*Draggable",
    "gsap/MorphSVG": r"MorphSVG",
    "gsap/DrawSVG": r"DrawSVG",
    "gsap/MotionPath": r"MotionPathPlugin",
    "gsap/ScrollTo": r"ScrollToPlugin",
    "gsap/Observer": r"\bObserver\.create",
    "gsap/CustomEase": r"CustomEase",
    "lenis": r"\blenis\b|@studio-freight",
    "locomotive-scroll": r"locomotive-scroll|data-scroll-container",
    "framer-motion": r"framer-motion|framerMotion",
    "anime.js": r"\banime(\.min)?\.js|\banimejs\b",
    "AOS": r"\baos(\.min)?\.(js|css)|data-aos=",
    "ScrollReveal": r"scrollreveal",
    "rellax": r"\brellax\b",
    "barba.js": r"\bbarba\b",
    "swup": r"\bswup\b",
    "split-type": r"split-type|SplitType",
    "splitting.js": r"\bsplitting(\.min)?\.(js|css)|data-splitting",
    "typed.js": r"\btyped(\.min)?\.js|new Typed\(",
    "vanilla-tilt": r"vanilla-tilt",
    "fullpage.js": r"fullpage(\.min)?\.js",
    "matter.js": r"\bmatter(\.min)?\.js|Matter\.Engine",
    "lottie": r"\blottie\b|bodymovin",
    "rive": r"@rive-app|rive(\.min)?\.js|\.riv\b",
}

WEBGL_LIBS = {
    "three.js": r"\bthree(\.min|\.module)?\.js|\bTHREE\.[A-Z]|three/examples",
    "react-three-fiber": r"@react-three|react-three-fiber",
    "ogl": r"[\"'/]ogl[\"'/.]|ogl(\.min)?\.js",
    "curtains.js": r"curtainsjs|curtains(\.min)?\.js",
    "pixi.js": r"\bpixi(\.min)?\.js|\bPIXI\.",
    "p5.js": r"\bp5(\.min)?\.js",
    "spline": r"spline\.design|@splinetool",
    "shery.js": r"\bshery\b",
}

UI_LIBS = {
    "swiper": r"\bswiper\b",
    "embla-carousel": r"\bembla\b",
    "splide": r"\bsplide\b",
    "flickity": r"flickity",
    "slick": r"slick(\.min)?\.(js|css)|slick-carousel",
    "isotope": r"isotope",
    "masonry": r"\bmasonry\b",
    "plyr": r"\bplyr\b",
    "video.js": r"video-js|videojs",
    "tailwindcss": r"--tw-|tailwindcss",
    "bootstrap": r"bootstrap(\.bundle)?(\.min)?\.(js|css)",
}

SERVICES = {
    "Google Analytics / GTM": r"googletagmanager|gtag\(|google-analytics",
    "Meta Pixel": r"fbevents|facebook\.net/.*pixel",
    "Hotjar": r"hotjar",
    "Plausible": r"plausible\.io",
    "Vercel": r"vercel\.(app|com)|x-vercel",
    "Netlify": r"netlify",
    "Cloudflare": r"cdn-cgi|cloudflare",
    "Typekit/Adobe Fonts": r"use\.typekit\.net",
    "Google Fonts": r"fonts\.googleapis\.com|fonts\.gstatic\.com",
    "hCaptcha/reCAPTCHA": r"hcaptcha|recaptcha",
}

CSS_FEATURES = {
    "mix-blend-mode": r"mix-blend-mode",
    "clip-path": r"clip-path",
    "backdrop-filter": r"backdrop-filter",
    "mask-image": r"(-webkit-)?mask(-image)?\s*:",
    "position-sticky": r"position\s*:\s*sticky",
    "scroll-snap": r"scroll-snap",
    "css-scroll-driven-anim": r"view-timeline|animation-timeline|scroll\(\)",
    "text-stroke": r"-webkit-text-stroke",
    "filter-blur": r"filter\s*:\s*[^;]*blur",
    "css-grid": r"display\s*:\s*grid",
    "container-queries": r"@container",
    "aspect-ratio": r"aspect-ratio",
    "custom-properties": r"--[a-z][\w-]*\s*:",
    "keyframes": r"@keyframes",
}

# heurystyka efektu -> (technique_id, react_equiv, wzorzec, gdzie szukac)
EFFECT_RULES = [
    ("smooth-scroll", "SmoothScroll.tsx",
     r"\blenis\b|locomotive-scroll|ScrollSmoother", "js"),
    ("pinned-scroll-sequence", "PinnedSequence.tsx / HorizontalScrollPin.tsx",
     r"\bpin\s*:\s*(true|[\"'])|pinSpacing", "js"),
    ("scroll-scrub", "PinnedSequence.tsx (scrub)",
     r"scrub\s*:\s*(true|[\d.])", "js"),
    ("text-split-reveal", "SplitText.tsx",
     r"SplitText|SplitType|data-splitting|\bsplitting\(", "js"),
    ("masked-image-reveal", "MaskedReveal.tsx",
     r"clip-path\s*:\s*inset|clipPath\s*:", "any"),
    ("parallax-layers", "ParallaxLayer.tsx",
     r"data-(scroll-)?speed|\brellax\b|parallax", "any"),
    ("marquee-logos", "Marquee.tsx",
     r"marquee", "any"),
    ("custom-cursor", "CustomCursor.tsx",
     r"cursor\s*:\s*none|custom-?cursor|\.cursor[\s{,.\"']", "any"),
    ("magnetic-button", "MagneticButton.tsx",
     r"magnetic", "any"),
    ("webgl-image-distortion", "WebGLImageDistortion.tsx",
     r"\bTHREE\.|\bogl\b|curtains|\bPIXI\.|fragmentShader|u_?[Tt]ime", "js"),
    ("shader-gradient-bg", "ShaderGradientBg.tsx",
     r"gl_FragColor|fragColor|shader-?gradient", "js"),
    ("page-transition", "(Framer AnimatePresence / next-view-transitions)",
     r"\bbarba\b|\bswup\b|AnimatePresence|startViewTransition", "js"),
    ("preloader-counter", "(GSAP timeline — wzor voyeur-preloader-001)",
     r"preloader|data-preload|\bloader__|loading-screen", "any"),
    ("typewriter", "TextScramble.tsx (pokrewny)",
     r"new Typed\(|typewrit|typing-effect", "js"),
    ("image-trail", "(playfight-stacked-trail — caution: laggy)",
     r"image[-_]?trail|data-stacked-trail", "any"),
    ("number-count-up", "CountUp.tsx",
     r"count-?up|counter__|data-count", "any"),
    ("moving-shapes-physics", "MovingShapes.tsx",
     r"Matter\.Engine|matter(\.min)?\.js|rapier", "js"),
    ("grain-overlay", "GrainOverlay.tsx",
     r"grain|noise\.(png|gif|webp)|film-?grain", "any"),
    ("horizontal-scroll", "HorizontalScrollPin.tsx",
     r"horizontal-?scroll|xPercent\s*:\s*-", "js"),
    ("scroll-reveal-stagger", "Reveal.tsx",
     r"data-aos=|scrollreveal|whileInView|stagger", "any"),
    ("sticky-collapse-nav", "(CSS sticky + ScrollTrigger)",
     r"nav[-_]?(hide|hidden|scrolled)|headroom", "any"),
]

# wykryta biblioteka -> paczki npm w stacku docelowym (Next.js)
NPM_MAP = {
    "gsap": ["gsap", "@gsap/react"],
    "lenis": ["lenis"],
    "locomotive-scroll": ["lenis  # zamiennik locomotive w stacku docelowym"],
    "framer-motion": ["framer-motion"],
    "three.js": ["three", "@react-three/fiber", "@react-three/drei"],
    "react-three-fiber": ["three", "@react-three/fiber", "@react-three/drei"],
    "ogl": ["ogl"],
    "curtains.js": ["ogl  # curtains -> OGL w stacku docelowym"],
    "split-type": ["split-type"],
    "gsap/SplitText": ["split-type  # SplitText (Club GSAP) -> split-type"],
    "splitting.js": ["split-type"],
    "swiper": ["embla-carousel-react  # swiper -> Embla w stacku docelowym"],
    "embla-carousel": ["embla-carousel-react"],
    "splide": ["embla-carousel-react"],
    "matter.js": ["matter-js"],
    "lottie": ["lottie-react"],
    "rive": ["@rive-app/react-canvas"],
    "spline": ["@splinetool/react-spline"],
    "barba.js": ["next-view-transitions  # barba -> view transitions"],
    "typed.js": ["# typewriter: własny hook / TextScramble.tsx"],
}


def eprint(*a):
    print(*a, file=sys.stderr)


def fetch(url: str, max_bytes: int = MAX_FILE_BYTES) -> str:
    req = Request(url, headers={
        "User-Agent": UA,
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US,en;q=0.9,pl;q=0.8",
    })
    with urlopen(req, timeout=FETCH_TIMEOUT) as resp:
        raw = resp.read(max_bytes)
        enc = (resp.headers.get("Content-Encoding") or "").lower()
    if enc == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read(max_bytes)
        except OSError:
            pass
    elif enc == "deflate":
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            pass
    return raw.decode("utf-8", errors="replace")


def slugify(url: str) -> str:
    host = urlparse(url).netloc.replace("www.", "")
    return re.sub(r"[^a-z0-9-]", "-", host.lower()).strip("-")


def detect(sigs: dict[str, str], text: str) -> list[str]:
    return [name for name, pat in sigs.items() if re.search(pat, text, re.I)]


def extract_assets(html: str, base_url: str) -> tuple[list[str], list[str]]:
    """Zwraca (css_urls, js_urls) w kolejnosci wystapienia, zaabsolutyzowane."""
    css, js = [], []
    for m in re.finditer(
            r'<link[^>]+rel=["\'][^"\']*stylesheet[^"\']*["\'][^>]*>', html, re.I):
        href = re.search(r'href=["\']([^"\']+)["\']', m.group(0))
        if href:
            css.append(urljoin(base_url, href.group(1)))
    for m in re.finditer(r'<script[^>]+src=["\']([^"\']+)["\']', html, re.I):
        u = urljoin(base_url, m.group(1))
        if not SKIP_JS.search(u):
            js.append(u)
    # dedup z zachowaniem kolejnosci
    return list(dict.fromkeys(css)), list(dict.fromkeys(js))


def discover_dynamic_urls(text: str, base_url: str, known: set[str]) -> tuple[list[str], list[str]]:
    """Drugi przebieg: URL-e .js/.css ukryte w stringach inline JS (dynamiczne wstrzykiwanie).
    Tak Webflow-owe strony laduja wlasne bundle (np. playfight -> main.js na Vercelu)."""
    css, js = [], []
    for m in re.finditer(
            r'(?:https?:)?//[a-z0-9.-]+/[^"\'`\s<>()]*?\.(js|css)(?:\?[^"\'`\s<>()]*)?(?=["\'`\s<>()])',
            text, re.I):
        u = urljoin(base_url, m.group(0))
        if u in known or SKIP_JS.search(u):
            continue
        known.add(u)
        (js if m.group(1).lower() == "js" else css).append(u)
    return css, js


def google_fonts_families(text: str) -> list[str]:
    fams = []
    for m in re.finditer(r'fonts\.googleapis\.com/css2?\?([^"\'\s>]+)', text):
        qs = parse_qs(m.group(1).replace("&amp;", "&"))
        for fam in qs.get("family", []):
            fams.append(fam.split(":")[0].replace("+", " "))
    return sorted(set(fams))


def font_faces(css: str) -> list[str]:
    fams = re.findall(
        r'@font-face\s*{[^}]*font-family\s*:\s*["\']?([^;"\'}]+)', css, re.I)
    return sorted({f.strip() for f in fams})


def families_used(css: str) -> list[str]:
    counts: Counter[str] = Counter()
    for m in re.finditer(r'font-family\s*:\s*([^;}]+)', css, re.I):
        first = m.group(1).split(",")[0].strip().strip("\"'")
        if first and not first.startswith("var(") and first.lower() not in (
                "inherit", "sans-serif", "serif", "monospace"):
            counts[first] += 1
    return [f for f, _ in counts.most_common(8)]


def top_colors(css: str, n: int = 14) -> list[dict]:
    counts: Counter[str] = Counter()
    for m in re.finditer(r'#(?:[0-9a-fA-F]{3}){1,2}\b', css):
        h = m.group(0).lower()
        if len(h) == 4:
            h = "#" + "".join(c * 2 for c in h[1:])
        counts[h] += 1
    return [{"hex": h, "count": c} for h, c in counts.most_common(n)]


def dom_stats(html: str) -> dict:
    def cnt(tag: str) -> int:
        return len(re.findall(rf"<{tag}[\s>]", html, re.I))

    headings = [re.sub(r"<[^>]+>", " ", h).strip()[:90]
                for h in re.findall(r"<h[12][^>]*>(.*?)</h[12]>", html, re.I | re.S)]
    sections = []
    for m in re.finditer(r'<section[^>]*(?:id=["\']([^"\']+)["\'])?[^>]*'
                         r'(?:class=["\']([^"\']+)["\'])?[^>]*>', html, re.I):
        label = m.group(1) or (m.group(2) or "").split()[0] if (m.group(1) or m.group(2)) else ""
        sections.append(label or "(bez id/class)")
    data_attrs = Counter(re.findall(r'\s(data-[\w-]+)=', html))
    class_tokens = Counter(
        t for m in re.finditer(r'class=["\']([^"\']+)["\']', html)
        for t in m.group(1).split() if len(t) > 3)
    nav_links = list(dict.fromkeys(
        re.sub(r"<[^>]+>", "", a).strip()
        for a in re.findall(r"<a[^>]*>(.*?)</a>", html, re.I | re.S)
        if 1 < len(re.sub(r"<[^>]+>", "", a).strip()) < 40))[:25]

    return {
        "counts": {t: cnt(t) for t in
                   ("section", "header", "footer", "nav", "canvas", "video",
                    "svg", "iframe", "picture", "form")},
        "headings_h1_h2": [h for h in headings if h][:20],
        "sections_order": sections[:30],
        "nav_links": nav_links,
        "top_data_attrs": dict(data_attrs.most_common(15)),
        "top_class_tokens": [t for t, _ in class_tokens.most_common(25)],
    }


def detect_effects(html: str, css: str, js: str) -> list[dict]:
    buckets = {"html": html, "css": css, "js": js,
               "any": html + "\n" + css + "\n" + js}
    found = []
    for tid, react_equiv, pat, where in EFFECT_RULES:
        text = buckets["js" if where == "js" else "any"] if where != "css" else css
        if where == "js":
            text = js + "\n" + html  # inline skrypty siedza w html
        m = re.search(pat, text, re.I)
        if m:
            start = max(0, m.start() - 60)
            found.append({
                "technique_id": tid,
                "react_equiv": react_equiv,
                "evidence": re.sub(r"\s+", " ", text[start:m.end() + 60]).strip()[:150],
            })
    return found


def npm_recommendations(all_libs: list[str]) -> list[str]:
    pkgs: list[str] = []
    for lib in all_libs:
        for p in NPM_MAP.get(lib, []):
            if p not in pkgs:
                pkgs.append(p)
    return pkgs


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 1
    url = args[0]
    if not url.startswith("http"):
        url = "https://" + url

    def opt(name: str, default):
        if name in sys.argv:
            i = sys.argv.index(name)
            if i + 1 < len(sys.argv):
                return sys.argv[i + 1]
        return default

    slug = opt("--slug", slugify(url))
    max_css = int(opt("--max-css", MAX_CSS_FILES))
    max_js = int(opt("--max-js", MAX_JS_FILES))

    out_dir = OUT_ROOT / slug
    cap_dir = out_dir / "capture"
    cap_dir.mkdir(parents=True, exist_ok=True)

    print(f"SITE-DNA: {url} -> references/site-dna/{slug}/")
    try:
        html = fetch(url, max_bytes=2_000_000)
    except Exception as e:  # noqa: BLE001
        print(f"FAIL: nie moge pobrac {url}: {e}")
        return 2
    (cap_dir / "index.html").write_text(html, encoding="utf-8")

    css_urls, js_urls = extract_assets(html, url)
    # inline zasoby
    inline_css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.I | re.S))
    inline_js = "\n".join(re.findall(
        r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.I | re.S))

    css_text, js_text = inline_css, inline_js
    captured = ["capture/index.html"]

    for i, u in enumerate(css_urls[:max_css]):
        try:
            body = fetch(u)
        except Exception as e:  # noqa: BLE001
            eprint(f"  WARN css skip {u}: {e}")
            continue
        name = f"capture/{i:02d}-{Path(urlparse(u).path).name or 'style.css'}"[:120]
        (out_dir / name).write_text(f"/* source: {u} */\n" + body, encoding="utf-8")
        captured.append(name)
        css_text += "\n" + body

    for i, u in enumerate(js_urls[:max_js]):
        try:
            body = fetch(u)
        except Exception as e:  # noqa: BLE001
            eprint(f"  WARN js skip {u}: {e}")
            continue
        name = f"capture/{i:02d}-{Path(urlparse(u).path).name or 'script.js'}"[:120]
        (out_dir / name).write_text(f"/* source: {u} */\n" + body, encoding="utf-8")
        captured.append(name)
        js_text += "\n" + body

    # ── drugi przebieg: zasoby wstrzykiwane dynamicznie (stringi URL w JS) ──
    known = set(css_urls) | set(js_urls)
    dyn_css, dyn_js = discover_dynamic_urls(html + "\n" + js_text, url, known)
    for kind, urls_extra, cap in (("css", dyn_css, 4), ("js", dyn_js, 8)):
        for i, u in enumerate(urls_extra[:cap]):
            try:
                body = fetch(u)
            except Exception as e:  # noqa: BLE001
                eprint(f"  WARN dyn-{kind} skip {u}: {e}")
                continue
            name = f"capture/dyn{i:02d}-{Path(urlparse(u).path).name or f'x.{kind}'}"[:120]
            (out_dir / name).write_text(f"/* source: {u} */\n" + body, encoding="utf-8")
            captured.append(name)
            if kind == "css":
                css_text += "\n" + body
                css_urls.append(u)
            else:
                js_text += "\n" + body
                js_urls.append(u)

    everything = html + "\n" + css_text + "\n" + js_text

    title = (re.search(r"<title[^>]*>([^<]+)</title>", html, re.I) or [None, ""])[1]
    desc_m = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', html, re.I)

    anim = detect(ANIMATION_LIBS, everything)
    webgl = detect(WEBGL_LIBS, everything)
    ui = detect(UI_LIBS, everything)

    report = {
        "url": url,
        "slug": slug,
        "captured_at": date.today().isoformat(),
        "title": (title or "").strip(),
        "meta_description": desc_m.group(1).strip() if desc_m else "",
        "stack": {
            "builder": detect(BUILDERS, everything),
            "frameworks": detect(FRAMEWORKS, everything),
            "services": detect(SERVICES, everything),
        },
        "libs": {"animation": anim, "webgl": webgl, "ui": ui},
        "fonts": {
            "google": google_fonts_families(everything),
            "font_faces": font_faces(css_text),
            "families_used": families_used(css_text),
        },
        "colors_top": top_colors(css_text),
        "css_features": detect(CSS_FEATURES, css_text + inline_css),
        "dom": dom_stats(html),
        "effects_detected": detect_effects(html, css_text, js_text),
        "npm_install": npm_recommendations(anim + webgl + ui),
        "assets": {
            "css_urls": css_urls[:max_css],
            "js_urls": js_urls[:max_js],
            "css_total_found": len(css_urls),
            "js_total_found": len(js_urls),
        },
        "files_captured": captured,
        "next_steps": [
            "Claude: przeczytaj capture/ i poglebij analize (choreografia, layout).",
            "Claude: napisz REBUILD-BLUEPRINT.md wg .claude/skills/site-dna/SKILL.md.",
            "Claude: dopisz nowe techniki do references/site-dna/effects-library.yaml.",
        ],
    }

    (out_dir / "site-dna.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"  builder:    {', '.join(report['stack']['builder']) or '-'}")
    print(f"  framework:  {', '.join(report['stack']['frameworks']) or '-'}")
    print(f"  animation:  {', '.join(anim) or '-'}")
    print(f"  webgl:      {', '.join(webgl) or '-'}")
    print(f"  ui:         {', '.join(ui) or '-'}")
    print(f"  fonts:      {', '.join((report['fonts']['google'] + report['fonts']['font_faces'])[:6]) or '-'}")
    print(f"  effects:    {', '.join(e['technique_id'] for e in report['effects_detected']) or '-'}")
    print(f"  captured:   {len(captured)} plikow -> references/site-dna/{slug}/capture/")
    print(f"  report:     references/site-dna/{slug}/site-dna.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
