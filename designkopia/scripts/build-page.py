#!/usr/bin/env python3
"""build-page.py — most pipeline → web/. Artefakty joba → page-spec dla renderera.

Czyta outputs/pages/<job>/ (layout-plan, palette-lock, typography-lock, motion-plan, copy-draft)
+ products/<job>/product.yaml + obrazy, i emituje:
  * web/generated/<job>.json   — page-spec (renderuje trasa /g/<job>)
  * web/public/g/<job>/*.png   — skopiowane obrazy
  * outputs/pages/<job>/build.json — manifest builda (kontrakt fazy build w pipeline.yaml)

Usage:
  python scripts/build-page.py <job>
  python scripts/build-page.py <job> --tier experimental   # wymuś tier
Exit 0 = OK, 1 = brak layout-plan / błąd.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"
IMAGES = ROOT / "outputs" / "images"
WEB = ROOT / "web"
GEN = WEB / "generated"
PUB = WEB / "public" / "g"

DEFAULT_TOKENS = {
    "bg": "#0b0b0c", "fg": "#f2f0ec", "muted": "#9a978f",
    "accent": "#e8482a", "surface": "#141416",
    "fontHeading": '"Inter", system-ui, sans-serif',
    "fontBody": '"Inter", system-ui, sans-serif',
    "fontMono": '"JetBrains Mono", ui-monospace, monospace',
}

TIER_BY_ARCHETYPE = {
    "studio-manifesto": "experimental",
    "lumera-commercial": "editorial_motion",
    "product-editorial": "editorial_motion",
    "product-serial": "editorial_motion",
    "readymag-slides": "experimental",
    "masonry-portfolio": "editorial_motion",
    "portfolio-index": "content",
    "case-study-long": "editorial_motion",
}


def jload(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def yload(p: Path):
    if not (yaml and p.is_file()):
        return {}
    try:
        return yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", str(s)).replace("  ", " ").strip()


def base_id(section_id: str) -> str:
    # "01-hero" -> "hero"
    return re.sub(r"^\d+[-_]?", "", str(section_id)).strip().lower()


def font_stack(name: str | None, fallback: str) -> str:
    if not name:
        return fallback
    return f'"{name}", {fallback.split(", ", 1)[-1] if ", " in fallback else "sans-serif"}'


def build_tokens(palette: dict | None, typo: dict | None) -> dict:
    t = dict(DEFAULT_TOKENS)
    cv = (palette or {}).get("css_vars") or (palette or {}).get("css_vars_proposed") or {}
    if cv:
        t["bg"] = cv.get("--bg", t["bg"])
        t["fg"] = cv.get("--fg") or cv.get("--text") or t["fg"]
        t["accent"] = cv.get("--accent", t["accent"])
        t["muted"] = cv.get("--muted", t["muted"])
        t["surface"] = cv.get("--surface", t["surface"])
    if typo:
        t["fontHeading"] = font_stack(typo.get("heading_font"), DEFAULT_TOKENS["fontHeading"])
        t["fontBody"] = font_stack(typo.get("body_font"), DEFAULT_TOKENS["fontBody"])
        t["fontMono"] = font_stack(typo.get("mono_font"), DEFAULT_TOKENS["fontMono"])
        if typo.get("google_fonts_url"):
            t["googleFontsUrl"] = typo["google_fonts_url"]
    return t


def infer_tier(motion: dict | None, archetype: str | None, override: str | None) -> str:
    if override:
        return override
    if motion and motion.get("tier"):
        return motion["tier"]
    return TIER_BY_ARCHETYPE.get(str(archetype), "editorial_motion")


def copy_images(job: str) -> list[str]:
    """Kopiuje obrazy joba do web/public/g/<job>/ i zwraca ścieżki webowe (/g/<job>/..)."""
    srcs: list[Path] = []
    d1 = IMAGES / job
    if d1.is_dir():
        srcs += sorted(d1.glob("*.png"))
    d2 = PAGES / job / "images"
    if d2.is_dir():
        srcs += sorted(d2.glob("*.png"))
    if not srcs:
        return []
    dst = PUB / job
    dst.mkdir(parents=True, exist_ok=True)
    web_paths = []
    seen = set()
    for s in srcs:
        if s.name in seen:
            continue
        seen.add(s.name)
        shutil.copy2(s, dst / s.name)
        web_paths.append(f"/g/{job}/{s.name}")
    return web_paths


def pick_hero_image(imgs: list[str]) -> str | None:
    for kw in ("anchor", "hero", "00-", "01-"):
        for i in imgs:
            if kw in i.lower():
                return i
    return imgs[0] if imgs else None


def build_sections(layout: dict, copy: dict, product: dict, tier: str, imgs: list[str]) -> list[dict]:
    sections: list[dict] = []
    copy_secs = (copy or {}).get("sections") or {}
    brand = layout.get("brand_name") or product.get("name") or layout.get("job_slug") or "STUDIO"

    hero_img = pick_hero_image(imgs)
    gallery_imgs = [i for i in imgs if i != hero_img]

    plan = layout.get("section_plan") or []
    used_gallery = False

    def find_copy(b: str) -> dict:
        if b in copy_secs:
            return copy_secs[b]
        for k, v in copy_secs.items():
            if b in k or k in b:
                return v
        return {}

    for sec in plan:
        sid = sec.get("id") if isinstance(sec, dict) else str(sec)
        b = base_id(sid)
        c = find_copy(b)

        if "hero" in b:
            bg = "image" if hero_img else ("shader" if tier == "experimental" else "plain")
            sections.append({
                "type": "hero",
                "eyebrow": c.get("eyebrow") or product.get("subheadline"),
                "title": strip_html(c.get("h1") or c.get("h2") or product.get("headline") or brand),
                "lead": strip_html(c.get("lead") or product.get("subheadline") or ""),
                "cta": (copy_secs.get("cta") or {}).get("cta") or product.get("cta") or "Zobacz",
                "bg": bg,
                "image": hero_img,
            })
        elif any(k in b for k in ("gallery", "still", "campaign", "crystal", "macro")) and gallery_imgs and not used_gallery:
            used_gallery = True
            sections.append({
                "type": "gallery",
                "tag": c.get("eyebrow"),
                "heading": strip_html(c.get("h2") or "Kadry"),
                "images": gallery_imgs[:4],
            })
        elif any(k in b for k in ("note", "spec", "faq")):
            items = c.get("items") or []
            faq = []
            for it in items:
                it = str(it)
                if ":" in it:
                    q, a = it.split(":", 1)
                    faq.append({"q": q.strip(), "a": a.strip()})
                else:
                    faq.append({"q": it, "a": ""})
            if not faq:
                faq = [{"q": strip_html(c.get("h2") or "Szczegóły"), "a": strip_html(c.get("lead") or "")}]
            sections.append({"type": "faq", "tag": c.get("eyebrow"), "heading": strip_html(c.get("h2") or ""), "items": faq})
        elif any(k in b for k in ("story", "about", "ritual")):
            sections.append({
                "type": "split",
                "tag": c.get("eyebrow"),
                "heading": strip_html(c.get("h2") or ""),
                "body": strip_html(c.get("lead") or ""),
                "image": gallery_imgs[len(sections) % max(len(gallery_imgs), 1)] if gallery_imgs else None,
                "reverse": len(sections) % 2 == 0,
            })
        elif any(k in b for k in ("cta", "shop", "contact")):
            sections.append({
                "type": "cta",
                "title": strip_html(c.get("h2") or product.get("headline") or "Zbudujmy to."),
                "cta": c.get("cta") or product.get("cta") or "Kup teraz",
                "meta": strip_html(c.get("eyebrow") or ""),
            })
        elif any(k in b for k in ("stat", "why")):
            sections.append({
                "type": "stats",
                "items": [{"value": 100, "suffix": "%", "label": "jakość"}, {"value": 24, "suffix": "h", "label": "wsparcie"}],
            })
        else:
            # nieznana sekcja: split z dostępnym obrazem (lepsze niż pominięcie)
            sections.append({
                "type": "split",
                "tag": c.get("eyebrow"),
                "heading": strip_html(c.get("h2") or sid),
                "body": strip_html(c.get("lead") or ""),
                "image": gallery_imgs[len(sections) % max(len(gallery_imgs), 1)] if gallery_imgs else None,
                "reverse": len(sections) % 2 == 1,
            })

    # gwarancje minimum
    if not any(s["type"] == "hero" for s in sections):
        sections.insert(0, {"type": "hero", "title": brand, "bg": "plain", "cta": "Zobacz"})
    if not any(s["type"] == "footer" for s in sections):
        sections.append({"type": "footer", "brand": str(brand).upper(), "credit": "cosgral.design"})
    return sections


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("--tier", default="")
    args = ap.parse_args()
    job = args.job.strip().strip("/")

    pdir = PAGES / job
    layout = jload(pdir / "layout-plan.json")
    if not layout:
        print(f"ERROR: brak/niepoprawny outputs/pages/{job}/layout-plan.json — najpierw faza layout_assembly")
        return 1

    palette = jload(pdir / "palette-lock.json")
    typo = jload(pdir / "typography-lock.json")
    motion = jload(pdir / "motion-plan.json")
    copy = jload(pdir / "copy-draft.json") or {}
    product = yload(ROOT / "products" / job / "product.yaml")

    archetype = layout.get("layout_archetype")
    tier = infer_tier(motion, archetype, args.tier or None)
    tokens = build_tokens(palette, typo)
    imgs = copy_images(job)
    brand = layout.get("brand_name") or product.get("name") or job
    sections = build_sections(layout, copy, product, tier, imgs)

    spec = {"job": job, "brand": brand, "tier": tier, "tokens": tokens, "sections": sections}

    GEN.mkdir(parents=True, exist_ok=True)
    (GEN / f"{job}.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "job": job, "route": f"/g/{job}", "spec": f"web/generated/{job}.json",
        "tier": tier, "archetype": archetype, "sections": len(sections), "images_copied": len(imgs),
        "stack": "next-react-framer",
    }
    (pdir / "build.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"BUILD OK: {job}")
    print(f"  tier: {tier}  archetype: {archetype}  sekcje: {len(sections)}  obrazy: {len(imgs)}")
    print(f"  spec: web/generated/{job}.json")
    print(f"  podgląd: cd web && npm run dev  ->  http://localhost:3000/g/{job}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
