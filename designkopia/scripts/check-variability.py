#!/usr/bin/env python3
"""Check layout-plan diversity vs recent jobs (concept-profile variability_matrix).

Usage:
  python scripts/check-variability.py <job-slug>
  python scripts/check-variability.py <job-slug> --warn-only

Exit 0 = OK (or warnings only with --warn-only), 1 = FAIL.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"
CONCEPT_PROFILE = ROOT / "profiles" / "concept-profile.yaml"
INTERACTION_SETS = ROOT / "profiles" / "interaction-sets.yaml"
LEGACY_JOBS = ROOT / "profiles" / "legacy-jobs.yaml"

BANNED_TEMPLATE_TRIPLET = {"spector", "kirk", "portfolite"}

# Snippets that became the new "default bundle" — warn if 3+ overlap with previous job
OVERUSED_SNIPPETS = {
    "webgl-noise-ambient",
    "origin-button",
    "expandable-plus",
    "project-index-row",
    "project-index-fan",
    "masonry-grid",
}
COMMERCIAL_ARCHETYPES = {"lumera-commercial", "product-editorial", "product-serial"}


def normalized_section_keys(plan: dict) -> tuple[str, ...]:
    sections = plan.get("section_plan") or []
    out: list[str] = []
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        raw = str(sec.get("section_key") or sec.get("id") or "").strip().lower()
        key = raw
        if "-" in key:
            key = key.split("-", 1)[-1]
        if key:
            out.append(key)
    return tuple(out)


def legacy_exclude_slugs() -> set[str]:
    data = load_yaml(LEGACY_JOBS)
    if not data:
        return set()
    out: set[str] = set()
    for bucket in ("legacy", "planned"):
        for item in data.get(bucket) or []:
            if isinstance(item, dict) and item.get("exclude_from_variability"):
                out.add(str(item["slug"]))
    return out


def load_json(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def load_yaml(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def resolve_plan_path(arg: str) -> Path | None:
    p = Path(arg)
    if p.is_file() and p.name == "layout-plan.json":
        return p.resolve()
    candidate = PAGES / arg.strip().strip("/") / "layout-plan.json"
    if candidate.is_file():
        return candidate
    print(f"ERROR: layout-plan not found for '{arg}'")
    return None


def plan_slug(plan: dict, path: Path) -> str:
    return str(plan.get("job_slug") or path.parent.name)


def archetype_of(plan: dict) -> str | None:
    v = plan.get("layout_archetype") or plan.get("layout_mode")
    return str(v) if v else None


def typography_key(plan: dict) -> str | None:
    t = plan.get("typography_map") or {}
    if t.get("pairing_id"):
        return str(t["pairing_id"])
    h = t.get("heading_font")
    b = t.get("body_font")
    if h and b:
        return f"{h}+{b}"
    return None


def template_set(plan: dict) -> set[str]:
    mix = plan.get("template_mix") or []
    return {str(x) for x in mix}


def section_signature(plan: dict) -> tuple[str, ...]:
    sections = plan.get("section_plan") or []
    sig: list[str] = []
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        sid = sec.get("id") or sec.get("section_key") or "?"
        src = sec.get("template_source") or "?"
        sig.append(f"{sid}:{src}")
    return tuple(sig)


def recent_plans(exclude_slug: str, lookback: int) -> list[tuple[str, dict, Path]]:
    items: list[tuple[str, dict, Path]] = []
    for path in PAGES.glob("*/layout-plan.json"):
        plan = load_json(path)
        if not plan:
            continue
        slug = plan_slug(plan, path)
        if slug == exclude_slug or slug in legacy_exclude_slugs():
            continue
        items.append((slug, plan, path))
    items.sort(key=lambda x: x[2].stat().st_mtime, reverse=True)
    return items[:lookback]


def snippet_set(plan: dict) -> set[str]:
    ids = plan.get("snippet_ids") or []
    return {str(x) for x in ids}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def html_fingerprint(page_dir: Path) -> dict:
    html = read_text(page_dir / "index.html")
    if not html:
        return {}
    section_ids = re.findall(r'<section[^>]*\sid="([^"]+)"', html, flags=re.I)
    nav_links = len(re.findall(r'<li>\s*<a\s+href="#', html, flags=re.I))
    return {
        "section_ids": section_ids,
        "section_count": len(section_ids),
        "nav_links": nav_links,
        "has_faq": "id=\"faq\"" in html.lower(),
    }


def css_fingerprint(page_dir: Path) -> dict:
    css = read_text(page_dir / "styles.css")
    if not css:
        return {}

    def pick(pattern: str) -> str:
        m = re.search(pattern, css, flags=re.I | re.S)
        return (m.group(1).strip().lower() if m else "")

    return {
        "font_heading": pick(r"--font-heading:\s*([^;]+);"),
        "font_body": pick(r"--font-body:\s*([^;]+);"),
        "font_mono": pick(r"--mono:\s*([^;]+);"),
        "h1_scale": pick(r"h1\s*\{[^}]*font-size:\s*([^;]+);"),
        "h2_scale": pick(r"h2\s*\{[^}]*font-size:\s*([^;]+);"),
        "body_lh": pick(r"body\s*\{[^}]*line-height:\s*([^;]+);"),
    }


def check_variability(current: dict, current_path: Path, warn_only: bool) -> int:
    concept = load_yaml(CONCEPT_PROFILE) or {}
    matrix = concept.get("variability_matrix") or {}
    lookback = int(matrix.get("lookback_jobs") or 3)
    current_slug = plan_slug(current, current_path)

    errors: list[str] = []
    warnings: list[str] = []

    recent = recent_plans(current_slug, lookback)
    if not recent:
        print(f"VARIABILITY OK: {current_slug} (no prior plans to compare)")
        return 0

    cur_arch = archetype_of(current)
    cur_typo = typography_key(current)
    cur_templates = template_set(current)
    cur_set = current.get("interaction_set")
    cur_scroll = current.get("scroll_mode")
    cur_sig = section_signature(current)
    cur_section_keys = normalized_section_keys(current)
    cur_snippets = snippet_set(current)

    prev_slugs = [s for s, _, _ in recent]
    print(f"Comparing {current_slug} vs recent: {', '.join(prev_slugs)}")

    # Archetype: must differ from last 2
    recent_arch = [archetype_of(p) for _, p, _ in recent[:2]]
    if cur_arch and cur_arch in recent_arch:
        errors.append(
            f"layout_archetype '{cur_arch}' repeats within last 2 jobs "
            f"(found in {[s for s, p, _ in recent[:2] if archetype_of(p) == cur_arch]})"
        )
    if cur_arch in COMMERCIAL_ARCHETYPES and len(current.get("section_plan") or []) < 8:
        errors.append(
            f"{cur_arch} with <8 sections is considered shallow/generic for delivery"
        )

    # Typography: no 2x in a row (compare to most recent only)
    if recent and cur_typo:
        last_typo = typography_key(recent[0][1])
        if last_typo and cur_typo == last_typo:
            errors.append(f"typography '{cur_typo}' same as previous job '{recent[0][0]}'")
        if len(recent) >= 2:
            t0 = typography_key(recent[0][1])
            t1 = typography_key(recent[1][1])
            if cur_typo and t0 and t1 and cur_typo == t0 == t1:
                errors.append(
                    f"typography '{cur_typo}' used in 3 consecutive jobs — rotate pairing_id"
                )

    # Snippet overuse vs previous job
    if recent and cur_snippets:
        prev_snippets = snippet_set(recent[0][1])
        if cur_snippets == prev_snippets:
            errors.append(
                f"snippet_ids identical to previous job '{recent[0][0]}' — rotate interaction signature"
            )
        overlap = cur_snippets & prev_snippets & OVERUSED_SNIPPETS
        if len(overlap) >= 3:
            errors.append(
                f"snippet overlap with '{recent[0][0]}' on overused effects: {sorted(overlap)}"
            )

    # Template mix overlap with previous job
    if recent and cur_templates:
        prev_templates = template_set(recent[0][1])
        overlap = cur_templates & prev_templates
        max_overlap = int((matrix.get("template_mix") or {}).get("overlap_max_with_previous") or 2)
        if len(overlap) > max_overlap:
            errors.append(
                f"template_mix overlap {len(overlap)} with '{recent[0][0]}' "
                f"(max {max_overlap}): {sorted(overlap)}"
            )
        # Require at least one new template if pool is large enough
        new_templates = cur_templates - prev_templates
        if len(cur_templates) >= 3 and not new_templates:
            warnings.append(
                f"no new template in mix vs '{recent[0][0]}' — add unused template from profiles/templates/"
            )

    # Banned triplet — block only when CURRENT job uses all three
    if BANNED_TEMPLATE_TRIPLET.issubset(cur_templates):
        errors.append(
            "current job uses banned template triplet spector+kirk+portfolite"
        )
    else:
        triplet_jobs = [
            slug
            for slug, plan, _ in recent
            if BANNED_TEMPLATE_TRIPLET.issubset(template_set(plan))
        ]
        if len(triplet_jobs) >= 2:
            warnings.append(
                f"historical overuse of spector+kirk+portfolite in {len(triplet_jobs)} recent jobs: "
                f"{triplet_jobs[:4]}"
            )

    # Interaction set: max 1x in lookback window (excluding current)
    if cur_set:
        same_set = [s for s, p, _ in recent if p.get("interaction_set") == cur_set]
        if len(same_set) >= 1:
            errors.append(
                f"interaction_set '{cur_set}' already used in lookback: {same_set}"
            )

    # Section recipe identical to last 2
    recent_sigs = [section_signature(p) for _, p, _ in recent[:2]]
    if cur_sig and cur_sig in recent_sigs:
        dup = [s for s, p, _ in recent[:2] if section_signature(p) == cur_sig]
        errors.append(f"section_plan sequence identical to: {dup}")
    if recent and cur_section_keys:
        prev_keys = set(normalized_section_keys(recent[0][1]))
        cur_keys = set(cur_section_keys)
        if cur_keys and prev_keys:
            overlap_ratio = len(cur_keys & prev_keys) / max(len(cur_keys), 1)
            if overlap_ratio >= 0.8:
                errors.append(
                    f"section_key overlap {overlap_ratio:.0%} with previous job '{recent[0][0]}' — too close to same recipe"
                )

    # HTML/CSS fingerprint guard: catch visual sameness beyond JSON plan
    if recent:
        prev_slug, _prev_plan, prev_path = recent[0]
        cur_html = html_fingerprint(current_path.parent)
        prev_html = html_fingerprint(prev_path.parent)
        cur_css = css_fingerprint(current_path.parent)
        prev_css = css_fingerprint(prev_path.parent)
        if cur_html and prev_html and cur_css and prev_css:
            same_fonts = (
                cur_css.get("font_heading") == prev_css.get("font_heading")
                and cur_css.get("font_body") == prev_css.get("font_body")
                and cur_css.get("font_mono") == prev_css.get("font_mono")
            )
            same_type_scale = (
                cur_css.get("h1_scale") == prev_css.get("h1_scale")
                and cur_css.get("h2_scale") == prev_css.get("h2_scale")
                and cur_css.get("body_lh") == prev_css.get("body_lh")
            )
            cur_first4 = tuple(cur_html.get("section_ids", [])[:4])
            prev_first4 = tuple(prev_html.get("section_ids", [])[:4])
            same_top_structure = bool(cur_first4) and cur_first4 == prev_first4
            close_section_count = abs(int(cur_html.get("section_count", 0)) - int(prev_html.get("section_count", 0))) <= 1
            same_nav_density = cur_html.get("nav_links") == prev_html.get("nav_links")

            if same_fonts and same_type_scale and same_top_structure and close_section_count and same_nav_density:
                errors.append(
                    f"HTML/CSS fingerprint too close to previous job '{prev_slug}' "
                    "(fonts + type scale + top section structure + nav density)"
                )

    # Scroll mode rotation (warn)
    if recent and cur_scroll:
        recent_scrolls = [p.get("scroll_mode") for _, p, _ in recent[:2]]
        if recent_scrolls.count(cur_scroll) >= 2:
            warnings.append(
                f"scroll_mode '{cur_scroll}' used in 2+ recent jobs — consider rotation"
            )

    for w in warnings:
        print(f"  WARN: {w}")

    if errors:
        print(f"VARIABILITY FAILED: {current_slug}")
        for err in errors:
            print(f"  - {err}")
        if warn_only:
            print("  (--warn-only: exiting 0)")
            return 0
        return 1

    print(f"VARIABILITY OK: {current_slug}")
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-variability.py <job-slug> [--warn-only]")
        return 1

    warn_only = "--warn-only" in sys.argv
    slug = next(a for a in sys.argv[1:] if not a.startswith("-"))

    plan_path = resolve_plan_path(slug)
    if not plan_path:
        return 1

    plan = load_json(plan_path)
    if not plan:
        print(f"ERROR: invalid JSON at {plan_path}")
        return 1

    return check_variability(plan, plan_path, warn_only)


if __name__ == "__main__":
    sys.exit(main())
