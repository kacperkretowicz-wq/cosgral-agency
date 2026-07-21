#!/usr/bin/env python3
"""Gate: agency_portfolio jobs must not use beauty/skincare subjects as inspiration.

Usage:
  python scripts/check-agency-shots.py <job-slug>
  python scripts/check-agency-shots.py outputs/images/forma-agency/manifest.json
  python scripts/check-agency-shots.py products/forma-agency/product.yaml

Exit 0 = OK, 1 = FAIL.
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
AGENCY_TYPE = ROOT / "profiles" / "job-types" / "agency-portfolio.yaml"
STYLE_MANIFEST = ROOT / "references" / "style-dna" / "manifest.yaml"

BANNED_PATH_FRAGMENTS = [
    "beauty-skincare-macro",
    "dewy-wet-look-macro",
    "gloss-peach-macro",
    "warm-playful-macro-freckles",
    "clean-marble-lifestyle-grade",
    "clinical-flatlay-grey-grid",
    "water-droplets",
    "lip-gloss",
    "skincare-bottles",
]

BANNED_SUBJECT_KEYWORDS = [
    "skincare macro",
    "water droplets face",
    "lip gloss",
    "beauty macro",
    "dewy skin",
]


def load_yaml(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def load_json(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def is_agency_job(product: dict) -> bool:
    t = str(product.get("job_type") or product.get("type") or "")
    return t in ("agency_portfolio", "agency_portfolio")


def check_ref(path_str: str, field: str, errors: list[str]) -> None:
    if not path_str:
        return
    low = path_str.replace("\\", "/").lower()
    for frag in BANNED_PATH_FRAGMENTS:
        if frag.lower() in low:
            errors.append(f"{field} uses banned beauty/skincare path: {path_str}")
            return
    # style-dna grade/composition with forbidden_for — warn if used as subject_ref
    if "subject_ref" in field or field.endswith("subject"):
        if "/style-dna/grade/" in low or "dewy" in low or "gloss-peach" in low:
            errors.append(f"{field} must not point to style-dna/grade as subject: {path_str}")


def check_text(text: str, field: str, errors: list[str]) -> None:
    if not text:
        return
    low = text.lower()
    for kw in BANNED_SUBJECT_KEYWORDS:
        if kw in low and f"not {kw}" not in low:
            errors.append(f"{field} contains banned subject keyword '{kw}': {text[:80]}")


def check_product_yaml(path: Path) -> list[str]:
    errors: list[str] = []
    data = load_yaml(path)
    if not data:
        return [f"cannot read {path}"]
    if not is_agency_job(data):
        return []

    narrative = data.get("image_narrative") or []
    if not narrative:
        errors.append("agency_portfolio product.yaml missing image_narrative shot list")
    for i, shot in enumerate(narrative):
        if not isinstance(shot, dict):
            continue
        check_ref(str(shot.get("subject_ref") or ""), f"image_narrative[{i}].subject_ref", errors)
        check_ref(str(shot.get("inspiration_ref") or ""), f"image_narrative[{i}].inspiration_ref", errors)
        check_text(str(shot.get("subject_hint") or ""), f"image_narrative[{i}].subject_hint", errors)
        if shot.get("style_ref"):
            pass  # style refs OK from style-dna
        elif shot.get("inspiration_ref") and "agency-content" not in str(shot.get("inspiration_ref")):
            errors.append(
                f"image_narrative[{i}]: use subject_ref (agency-content) + style_ref (style-dna), "
                "not legacy inspiration_ref alone"
            )

    roles = {str(s.get("shot_id") or s.get("role")) for s in narrative if isinstance(s, dict)}
    agency_type = load_yaml(AGENCY_TYPE) or {}
    required = agency_type.get("required_shot_roles") or {}
    min_count = int(required.get("min_count") or 0)
    if min_count and len(roles) < min_count:
        errors.append(f"image_narrative has {len(roles)} shots, need min {min_count} for agency_portfolio")

    return errors


def check_image_manifest(path: Path) -> list[str]:
    errors: list[str] = []
    data = load_json(path)
    if not data:
        return [f"cannot read {path}"]
    job_slug = str(data.get("job_slug") or path.parent.name)
    product_path = ROOT / "products" / job_slug / "product.yaml"
    product = load_yaml(product_path) if product_path.is_file() else {}
    if product and not is_agency_job(product):
        return []

    for i, img in enumerate(data.get("images") or []):
        if not isinstance(img, dict):
            continue
        for key in ("inspiration_ref", "subject_ref", "style_ref"):
            check_ref(str(img.get(key) or ""), f"images[{i}].{key}", errors)
        check_text(str(img.get("shot_rationale") or ""), f"images[{i}].shot_rationale", errors)
        role = str(img.get("role") or "")
        if role in ("macro", "packshot") and "agency" in job_slug:
            errors.append(f"images[{i}].role '{role}' unusual for agency_portfolio — use campaign/branding roles")

    return errors


def check_layout_plan(path: Path) -> list[str]:
    errors: list[str] = []
    data = load_json(path)
    if not data:
        return []
    slug = str(data.get("job_slug") or path.parent.name)
    product_path = ROOT / "products" / slug / "product.yaml"
    product = load_yaml(product_path) if product_path.is_file() else {}
    if product and not is_agency_job(product):
        return []

    for i, item in enumerate(data.get("inspiration_map") or []):
        if not isinstance(item, dict):
            continue
        ref = str(item.get("inspiration_ref") or item.get("style_ref") or "")
        sub = str(item.get("subject_ref") or "")
        check_ref(ref, f"inspiration_map[{i}].inspiration_ref", errors)
        check_ref(sub, f"inspiration_map[{i}].subject_ref", errors)
        if ref and "agency-content" in ref and not sub:
            pass  # legacy OK if subject in ref name
        elif ref and "beauty-skincare" in ref:
            errors.append(f"inspiration_map[{i}] legacy beauty path")

    return errors


def resolve_input(arg: str) -> tuple[str, Path]:
    p = Path(arg)
    if not p.is_absolute():
        p = ROOT / arg
    if p.is_file():
        if p.name == "product.yaml":
            return "product", p
        if p.name == "manifest.json":
            return "manifest", p
        if p.name == "layout-plan.json":
            return "plan", p
    candidate = ROOT / "products" / arg / "product.yaml"
    if candidate.is_file():
        return "product", candidate
    candidate = ROOT / "outputs" / "images" / arg / "manifest.json"
    if candidate.is_file():
        return "manifest", candidate
    candidate = ROOT / "outputs" / "pages" / arg / "layout-plan.json"
    if candidate.is_file():
        return "plan", candidate
    raise FileNotFoundError(arg)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-agency-shots.py <job-slug|manifest|product|layout-plan>")
        return 1

    try:
        kind, path = resolve_input(sys.argv[1])
    except FileNotFoundError as e:
        print(f"ERROR: not found: {e}")
        return 1

    if kind == "product":
        errors = check_product_yaml(path)
    elif kind == "manifest":
        errors = check_image_manifest(path)
    else:
        errors = check_layout_plan(path)

    if not errors:
        print(f"AGENCY SHOTS OK: {path.relative_to(ROOT)}")
        return 0

    print(f"AGENCY SHOTS FAILED: {path.relative_to(ROOT)}")
    for err in errors:
        print(f"  - {err}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
