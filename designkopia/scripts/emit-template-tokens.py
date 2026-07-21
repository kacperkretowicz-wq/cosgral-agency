#!/usr/bin/env python3
"""Emit CSS custom properties from profiles/templates/<id>.yaml color_tokens.

Usage:
  python scripts/emit-template-tokens.py salient kirk --output tokens-job.css
  python scripts/emit-template-tokens.py --all --output references/templates/partials/_generated/all-tokens.css
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "profiles" / "templates"


def tokens_for(template_id: str) -> str:
    path = TEMPLATES / f"{template_id}.yaml"
    if not path.is_file():
        return f"/* missing template: {template_id} */\n"
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    ct = data.get("color_tokens") or {}
    lines = [f"/* {template_id} from profiles/templates/{template_id}.yaml */"]
    lines.append(f'[data-template="{template_id}"] {{')
    mapping = {
        "background": "--tpl-bg",
        "text": "--tpl-text",
        "muted": "--tpl-muted",
        "accent": "--tpl-accent",
    }
    for key, var in mapping.items():
        if key in ct:
            lines.append(f"  {var}: {ct[key]};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("templates", nargs="*", help="template ids")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("-o", "--output", help="output css file")
    args = parser.parse_args()

    ids = args.templates
    if args.all:
        ids = [p.stem for p in sorted(TEMPLATES.glob("*.yaml"))]

    if not ids:
        parser.print_help()
        return 1

    css = "/* AUTO-GENERATED — emit-template-tokens.py */\n\n"
    css += (ROOT / "references/templates/partials/_shared/tokens.css").read_text(encoding="utf-8")
    css += "\n\n/* Per-template overrides */\n"
    for tid in ids:
        css += tokens_for(tid) + "\n"

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(css, encoding="utf-8")
        print(f"Wrote {out}")
    else:
        print(css)
    return 0


if __name__ == "__main__":
    sys.exit(main())
