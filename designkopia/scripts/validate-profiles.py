#!/usr/bin/env python3
"""Validate profiles/style-profile.yaml and profiles/templates/*.yaml."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Install: pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
PROFILES = ROOT / "profiles"
STYLE_PROFILE = PROFILES / "style-profile.yaml"
CONCEPT_PROFILE = PROFILES / "concept-profile.yaml"
REFERENCE_PATTERNS = PROFILES / "reference-patterns.yaml"
TEMPLATES_DIR = PROFILES / "templates"

STYLE_REQUIRED = [
    "version",
    "updated_at",
    "reference_count",
    "lighting",
    "background",
    "camera",
    "color_grade",
    "realism_level",
    "props_and_composition",
    "negative_prompts",
    "prompt_prefix",
    "prompt_suffix",
]

TEMPLATE_REQUIRED = [
    "id",
    "name",
    "source_image",
    "tags",
    "sections",
    "typography",
    "spacing",
    "color_tokens",
    "mixable_with",
]

CAMERA_REQUIRED = ["angle", "focal_feel", "depth_of_field"]
COLOR_GRADE_REQUIRED = ["temperature", "contrast", "saturation"]
COLOR_TOKENS_REQUIRED = ["background", "accent", "text", "muted"]

CONCEPT_REQUIRED = [
    "version",
    "updated_at",
    "golden_pages",
    "user_vision",
    "anti_patterns",
    "variability_matrix",
    "creativity_rules",
    "scoring",
    "gates",
]


def load_yaml(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            return None
        return data
    except Exception as exc:
        print(f"ERROR {path}: {exc}")
        return None


def check_keys(data: dict, required: list[str], label: str) -> list[str]:
    errors = []
    for key in required:
        if key not in data or data[key] is None:
            errors.append(f"{label}: missing required field '{key}'")
    return errors


def validate_style_profile() -> list[str]:
    errors: list[str] = []
    if not STYLE_PROFILE.exists():
        return ["profiles/style-profile.yaml not found"]

    data = load_yaml(STYLE_PROFILE)
    if data is None:
        return ["profiles/style-profile.yaml: invalid YAML or not an object"]

    errors.extend(check_keys(data, STYLE_REQUIRED, "style-profile"))

    if "camera" in data and isinstance(data["camera"], dict):
        errors.extend(
            check_keys(data["camera"], CAMERA_REQUIRED, "style-profile.camera")
        )
    if "color_grade" in data and isinstance(data["color_grade"], dict):
        errors.extend(
            check_keys(data["color_grade"], COLOR_GRADE_REQUIRED, "style-profile.color_grade")
        )
    if "negative_prompts" in data and not isinstance(data["negative_prompts"], list):
        errors.append("style-profile: negative_prompts must be a list")

    return errors


def validate_concept_profile() -> list[str]:
    errors: list[str] = []
    if not CONCEPT_PROFILE.exists():
        return ["profiles/concept-profile.yaml not found"]

    data = load_yaml(CONCEPT_PROFILE)
    if data is None:
        return ["profiles/concept-profile.yaml: invalid YAML or not an object"]

    errors.extend(check_keys(data, CONCEPT_REQUIRED, "concept-profile"))

    if "golden_pages" in data and isinstance(data["golden_pages"], dict):
        if "tier_s" not in data["golden_pages"]:
            errors.append("concept-profile.golden_pages: missing tier_s")
    if "scoring" in data and isinstance(data["scoring"], dict):
        for key in ("pass", "warn", "fail_below"):
            if key not in data["scoring"]:
                errors.append(f"concept-profile.scoring: missing '{key}'")

    return errors


def validate_reference_patterns() -> list[str]:
    errors: list[str] = []
    if not REFERENCE_PATTERNS.exists():
        return ["profiles/reference-patterns.yaml not found"]

    data = load_yaml(REFERENCE_PATTERNS)
    if data is None:
        return ["profiles/reference-patterns.yaml: invalid YAML"]

    for key in ("version", "patterns", "lanes", "lookup"):
        if key not in data:
            errors.append(f"reference-patterns: missing '{key}'")

    patterns = data.get("patterns") or {}
    if not isinstance(patterns, dict) or len(patterns) < 3:
        errors.append("reference-patterns: patterns must have at least 3 entries")

    return errors


def validate_templates() -> list[str]:
    errors: list[str] = []
    if not TEMPLATES_DIR.exists():
        return ["profiles/templates/ directory not found"]

    yaml_files = sorted(TEMPLATES_DIR.glob("*.yaml"))
    if not yaml_files:
        return ["profiles/templates/: no template YAML files found"]

    ids: list[str] = []
    for path in yaml_files:
        data = load_yaml(path)
        if data is None:
            errors.append(f"{path.name}: invalid YAML")
            continue

        label = f"template:{path.stem}"
        errors.extend(check_keys(data, TEMPLATE_REQUIRED, label))

        if "tags" in data:
            if not isinstance(data["tags"], list) or len(data["tags"]) == 0:
                errors.append(f"{label}: tags must be a non-empty list")

        if "sections" in data:
            if not isinstance(data["sections"], list) or len(data["sections"]) == 0:
                errors.append(f"{label}: sections must be a non-empty list")

        if "color_tokens" in data and isinstance(data["color_tokens"], dict):
            errors.extend(
                check_keys(data["color_tokens"], COLOR_TOKENS_REQUIRED, f"{label}.color_tokens")
            )

        if "id" in data:
            ids.append(str(data["id"]))

    # Validate mixable_with references
    id_set = set(ids)
    for path in yaml_files:
        data = load_yaml(path)
        if not data or "mixable_with" not in data:
            continue
        for ref in data.get("mixable_with", []):
            if ref not in id_set:
                errors.append(
                    f"template:{path.stem}: mixable_with references unknown id '{ref}'"
                )

    return errors


def main() -> int:
    errors = (
        validate_style_profile()
        + validate_concept_profile()
        + validate_reference_patterns()
        + validate_templates()
    )

    if errors:
        print("VALIDATION FAILED")
        for err in errors:
            print(f"  - {err}")
        return 1

    template_count = len(list(TEMPLATES_DIR.glob("*.yaml")))
    print("VALIDATION OK")
    print(f"  style-profile.yaml: OK")
    if CONCEPT_PROFILE.exists():
        print(f"  concept-profile.yaml: OK")
    if REFERENCE_PATTERNS.exists():
        print(f"  reference-patterns.yaml: OK")
    print(f"  templates: {template_count} file(s) OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
