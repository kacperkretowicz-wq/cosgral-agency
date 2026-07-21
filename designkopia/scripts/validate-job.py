#!/usr/bin/env python3
"""Validate outputs/pages/<job-slug>/layout-plan.json before image-gen or export.

Usage:
  python scripts/validate-job.py <job-slug>
  python scripts/validate-job.py outputs/pages/<job-slug>/layout-plan.json

Exit 0 = OK, 1 = FAIL (blocks pipeline per generation-process.yaml).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"
TEMPLATES_DIR = ROOT / "profiles" / "templates"
INTERACTION_SETS = ROOT / "profiles" / "interaction-sets.yaml"
SNIPPETS_MANIFEST = ROOT / "references" / "interactions" / "snippets" / "manifest.yaml"
ARCHETYPES = ROOT / "profiles" / "layout-archetypes.yaml"

SCROLL_MODES = {"vertical", "viewport-sections", "case-study-long"}
MIN_SECTIONS = 6
MIN_SECTIONS_COMMERCIAL = 8
MIN_TEMPLATES = 3
MIN_SNIPPETS = 2
MAX_SNIPPETS = 5
DEPRECATED_BUNDLE = {"scroll-reveal", "origin-button", "letter-hover"}
COMMERCIAL_ARCHETYPES = {"lumera-commercial", "product-editorial", "product-serial"}
GENERIC_PRODUCT_BUNDLE = {"scroll-reveal", "origin-button", "scroll-snap-vertical"}


def load_json(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception as exc:
        print(f"ERROR: cannot read {path}: {exc}")
        return None


def load_yaml(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data if isinstance(data, dict) else None
    except Exception as exc:
        print(f"ERROR: cannot read {path}: {exc}")
        return None


def resolve_plan_path(arg: str) -> Path | None:
    p = Path(arg)
    if p.is_file() and p.name == "layout-plan.json":
        return p.resolve()
    slug = arg.strip().strip("/")
    candidate = PAGES / slug / "layout-plan.json"
    if candidate.is_file():
        return candidate
    print(f"ERROR: layout-plan not found for '{arg}'")
    print(f"  Expected: {candidate}")
    return None


def template_ids() -> set[str]:
    ids: set[str] = set()
    for path in TEMPLATES_DIR.glob("*.yaml"):
        data = load_yaml(path)
        if data and "id" in data:
            ids.add(str(data["id"]))
        else:
            ids.add(path.stem)
    return ids


def archetype_ids() -> set[str]:
    data = load_yaml(ARCHETYPES)
    if not data:
        return set()
    arch = data.get("archetypes") or {}
    return {str(k) for k in arch.keys()}


def interaction_set_ids() -> set[str]:
    data = load_yaml(INTERACTION_SETS)
    if not data:
        return set()
    sets = data.get("sets") or {}
    return {str(k) for k in sets.keys()}


def snippet_ids() -> set[str]:
    data = load_yaml(SNIPPETS_MANIFEST)
    if not data:
        return set()
    snippets = data.get("snippets") or {}
    return {str(k) for k in snippets.keys()}


def validate_plan(plan: dict, plan_path: Path) -> list[str]:
    errors: list[str] = []
    warnings: list[str] = []

    slug = plan.get("job_slug") or plan_path.parent.name
    valid_templates = template_ids()
    valid_archetypes = archetype_ids()
    valid_sets = interaction_set_ids()
    valid_snippets = snippet_ids()

    archetype = plan.get("layout_archetype") or plan.get("layout_mode")
    if not archetype:
        errors.append("missing layout_archetype (or legacy layout_mode)")
    elif str(archetype) not in valid_archetypes:
        errors.append(f"unknown layout_archetype '{archetype}'")

    scroll_mode = plan.get("scroll_mode")
    if not scroll_mode:
        errors.append("missing scroll_mode")
    elif scroll_mode not in SCROLL_MODES:
        errors.append(f"invalid scroll_mode '{scroll_mode}' (expected one of {sorted(SCROLL_MODES)})")

    template_mix = plan.get("template_mix")
    if not isinstance(template_mix, list):
        errors.append("template_mix must be a list")
        template_mix = []
    unique_mix = list(dict.fromkeys(str(t) for t in template_mix))
    if len(unique_mix) < MIN_TEMPLATES:
        errors.append(f"template_mix needs >= {MIN_TEMPLATES} unique templates, got {len(unique_mix)}")
    for tid in unique_mix:
        if tid not in valid_templates:
            errors.append(f"template_mix references unknown template '{tid}'")

    section_plan = plan.get("section_plan")
    if not isinstance(section_plan, list):
        errors.append("section_plan must be a list")
        section_plan = []
    if len(section_plan) < MIN_SECTIONS:
        errors.append(f"section_plan needs >= {MIN_SECTIONS} sections, got {len(section_plan)}")
    if str(archetype) in COMMERCIAL_ARCHETYPES and len(section_plan) < MIN_SECTIONS_COMMERCIAL:
        errors.append(
            f"{archetype} requires >= {MIN_SECTIONS_COMMERCIAL} sections for non-MVP depth, got {len(section_plan)}"
        )

    for i, sec in enumerate(section_plan):
        if not isinstance(sec, dict):
            errors.append(f"section_plan[{i}] must be an object")
            continue
        src = sec.get("template_source")
        if not src:
            errors.append(f"section_plan[{i}] missing template_source")
        else:
            base = str(src).split("/")[0].split("+")[0].strip()
            if base not in valid_templates:
                warnings.append(f"section_plan[{i}] template_source '{src}' not in profiles/templates/")

    interaction_set = plan.get("interaction_set")
    if not interaction_set:
        errors.append("missing interaction_set")
    elif str(interaction_set) not in valid_sets:
        errors.append(f"unknown interaction_set '{interaction_set}'")

    snippet_list = plan.get("snippet_ids")
    if not isinstance(snippet_list, list):
        errors.append("snippet_ids must be a list")
        snippet_list = []
    if not (MIN_SNIPPETS <= len(snippet_list) <= MAX_SNIPPETS):
        errors.append(
            f"snippet_ids count must be {MIN_SNIPPETS}–{MAX_SNIPPETS}, got {len(snippet_list)}"
        )
    for sid in snippet_list:
        if str(sid) not in valid_snippets:
            errors.append(f"unknown snippet_id '{sid}'")

    snippet_set = {str(s) for s in snippet_list}
    if DEPRECATED_BUNDLE.issubset(snippet_set):
        errors.append(
            "deprecated interaction bundle (scroll-reveal + origin-button + letter-hover) — "
            "rotate interaction_set per profiles/interaction-sets.yaml"
        )
    if str(archetype) == "product-editorial" and snippet_set == GENERIC_PRODUCT_BUNDLE:
        errors.append(
            "generic product-editorial snippet bundle detected (scroll-reveal + origin-button + scroll-snap-vertical) — "
            "replace at least one snippet with a non-default option from profiles/interaction-sets.yaml"
        )

    typography = plan.get("typography_map")
    if not isinstance(typography, dict):
        errors.append("missing typography_map object")
    else:
        has_pairing = bool(typography.get("pairing_id"))
        has_fonts = bool(typography.get("heading_font")) and bool(typography.get("body_font"))
        if not (has_pairing or has_fonts):
            errors.append("typography_map needs pairing_id or heading_font + body_font")

    inspiration = plan.get("inspiration_map")
    if not isinstance(inspiration, list) or len(inspiration) == 0:
        errors.append("inspiration_map must be a non-empty list")
    else:
        for i, item in enumerate(inspiration):
            if not isinstance(item, dict):
                errors.append(f"inspiration_map[{i}] must be an object")
                continue
            if not item.get("inspiration_ref"):
                errors.append(f"inspiration_map[{i}] missing inspiration_ref")
            if not item.get("shot_rationale") and not item.get("shot_id"):
                warnings.append(f"inspiration_map[{i}] missing shot_rationale")

    export_contract = plan.get("export_contract")
    if not isinstance(export_contract, dict):
        warnings.append("missing export_contract (page-exporter needs section_classes)")

    index_html = plan_path.parent / "index.html"
    if index_html.is_file() and not archetype:
        warnings.append("index.html exists but plan incomplete — retrofit recommended")

    for w in warnings:
        print(f"  WARN: {w}")

    return errors


def agency_gate_errors(slug: str) -> list[str]:
    product_path = ROOT / "products" / slug / "product.yaml"
    if not product_path.is_file():
        return []
    try:
        with product_path.open(encoding="utf-8") as f:
            product = yaml.safe_load(f) or {}
    except Exception:
        return []
    job_type = str(product.get("job_type") or product.get("type") or "")
    if job_type not in ("agency_portfolio",):
        return []
    script = ROOT / "scripts" / "check-agency-shots.py"
    if not script.is_file():
        return []
    proc = subprocess.run(
        [sys.executable, str(script), str(product_path)],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if proc.returncode == 0:
        return []
    lines = (proc.stdout or proc.stderr or "").splitlines()
    return [ln.strip().lstrip("- ").strip() for ln in lines if ln.strip().startswith("-")]


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/validate-job.py <job-slug|layout-plan.json>")
        return 1

    plan_path = resolve_plan_path(sys.argv[1])
    if not plan_path:
        return 1

    plan = load_json(plan_path)
    if plan is None:
        return 1

    errors = validate_plan(plan, plan_path)
    slug = plan.get("job_slug") or plan_path.parent.name
    errors.extend(agency_gate_errors(str(slug)))

    if errors:
        print(f"VALIDATE JOB FAILED: {slug}")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"VALIDATE JOB OK: {slug}")
    print(f"  plan: {plan_path.relative_to(ROOT)}")
    archetype = plan.get("layout_archetype") or plan.get("layout_mode")
    print(f"  archetype: {archetype}")
    print(f"  sections: {len(plan.get('section_plan') or [])}")
    print(f"  templates: {', '.join(plan.get('template_mix') or [])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
