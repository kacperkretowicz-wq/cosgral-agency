#!/usr/bin/env python3
"""Plan brand atmosphere shots from layout + mockup — tła, kafelki, sceny.

Usage:
  python scripts/plan-brand-shots.py --job <slug> --json
  python scripts/plan-brand-shots.py --job <slug> --write-shot-plan
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"
PRODUCTS = ROOT / "products"
ROLES_YAML = ROOT / "profiles" / "job-types" / "brand-atmosphere-shots.yaml"


def load_yaml(path: Path) -> dict:
    if not yaml or not path.is_file():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def brand_name(job: str) -> str:
    p = PRODUCTS / job / "product.yaml"
    if p.is_file():
        data = load_yaml(p)
        return str(data.get("brand") or job)
    plan = load_json(PAGES / job / "layout-plan.json")
    if plan:
        return str(plan.get("brand_name") or job)
    return job


def palette_family(job: str) -> str:
    lock = load_json(PAGES / job / "palette-lock.json")
    if lock and lock.get("palette_family"):
        return str(lock["palette_family"])
    p = PRODUCTS / job / "product.yaml"
    if p.is_file():
        data = load_yaml(p)
        return str(data.get("job_palette") or data.get("palette_family") or "warm_organic")
    return "warm_organic"


def photo_grade_ref(job: str) -> str:
    ref = load_json(PAGES / job / "photo-grade-ref.json")
    if ref and ref.get("photo_grade_ref"):
        return str(ref["photo_grade_ref"])
    plan = load_json(PAGES / job / "layout-plan.json")
    if plan and plan.get("layout_ref"):
        return str(plan["layout_ref"])
    return ""


def pick_roles_for_sections(section_plan: list[dict], mapping: dict) -> list[str]:
    roles: list[str] = []
    default = mapping.get("default") or ["brand_tile", "lifestyle_scene"]
    for sec in section_plan:
        key = str(sec.get("section_key") or sec.get("id") or "").split("-")[-1]
        key = key.replace("section--", "").strip()
        for pattern, mapped in mapping.items():
            if pattern == "default":
                continue
            if pattern in key.lower():
                for r in mapped:
                    if r not in roles:
                        roles.append(r)
    if len(roles) < 2:
        for r in default:
            if r not in roles:
                roles.append(r)
    return roles[:5]


def build_shots(job: str, roles_cfg: dict) -> list[dict]:
    plan = load_json(PAGES / job / "layout-plan.json") or {}
    section_plan = plan.get("section_plan") or []
    mapping = roles_cfg.get("section_mapping") or {}
    role_defs = {r["id"]: r for r in roles_cfg.get("shot_roles") or [] if isinstance(r, dict)}

    picked = pick_roles_for_sections(section_plan, mapping)
    brand = brand_name(job)
    palette = palette_family(job)
    grade_ref = photo_grade_ref(job)
    layout_ref = plan.get("layout_ref") or grade_ref

    shots: list[dict] = []
    for i, role_id in enumerate(picked, start=1):
        rd = role_defs.get(role_id, {})
        hint_tpl = rd.get("subject_hint_template") or "Editorial brand scene for {brand}"
        hint = hint_tpl.format(brand=brand, palette_family=palette).strip()
        shots.append(
            {
                "order": i,
                "file": f"atmo-{i:02d}-{role_id.replace('_', '-')}.png",
                "role": role_id,
                "shot_type": "atmosphere",
                "product_presence": rd.get("product_presence", "none"),
                "ui_use": rd.get("ui_use", []),
                "aspect": rd.get("aspect", "4:5"),
                "subject_hint": hint,
                "photo_grade_ref": grade_ref,
                "style_ref": grade_ref or "references/style-dna/",
                "style_dimensions": rd.get("composition_from_mockup", []),
                "layout_ref": layout_ref,
                "shot_rationale": f"Brand atmosphere from mockup composition - {role_id} for page sections",
                "palette_family": palette,
                "derived_from_anchor": False,
                "product_lock": False,
            }
        )
    return shots


def merge_shot_plan(job: str, atmosphere_shots: list[dict]) -> dict:
    path = PAGES / job / "shot-plan.json"
    existing = load_json(path) or {
        "job_type": "product_brand",
        "anchor": {"file": "00-anchor-packshot.png", "role": "anchor", "gate": True},
        "shots": [],
    }
    product_shots = [
        s
        for s in existing.get("shots") or []
        if isinstance(s, dict) and s.get("shot_type") != "atmosphere"
    ]
    existing["shots"] = product_shots + atmosphere_shots
    existing["atmosphere_shots"] = atmosphere_shots
    existing["atmosphere_count"] = len(atmosphere_shots)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return existing


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--write-shot-plan", action="store_true")
    args = parser.parse_args()

    roles_cfg = load_yaml(ROLES_YAML)
    shots = build_shots(args.job, roles_cfg)
    result = {
        "job_slug": args.job,
        "brand_atmosphere_plan": shots,
        "count": len(shots),
        "rules": "profiles/job-types/brand-atmosphere-shots.yaml",
        "min_required": roles_cfg.get("required_per_product_job", {}).get("min_atmosphere_shots", 2),
    }

    out = PAGES / args.job / "brand-atmosphere-plan.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.write_shot_plan:
        merge_shot_plan(args.job, shots)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"Wrote {out.relative_to(ROOT)} ({len(shots)} atmosphere shots)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
