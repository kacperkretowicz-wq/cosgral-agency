#!/usr/bin/env python3
"""Assemble HTML section from template partial + variables.

Usage:
  python scripts/assemble-section.py <template_id> <section_type> --vars '{"heading":"..."}'
  python scripts/assemble-section.py kirk project-index --vars-file vars.json
  python scripts/assemble-section.py --list spector

Reads references/templates/partials/manifest.yaml for partial path.
"""

from __future__ import annotations

import argparse
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
PARTIALS = ROOT / "references" / "templates" / "partials"
MANIFEST = PARTIALS / "manifest.yaml"

CONDITIONAL_RE = re.compile(r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}", re.DOTALL)


def load_manifest() -> dict:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return data


def resolve_partial(template_id: str, section_type: str) -> Path | None:
    manifest = load_manifest()
    partials = manifest.get("partials") or {}
    tpl = partials.get(template_id) or {}
    rel = tpl.get(section_type)
    if rel:
        path = PARTIALS / rel
        if path.is_file():
            return path
    fallback = (manifest.get("fallback") or {}).get("default", "_shared/section-shell.html")
    path = PARTIALS / fallback
    return path if path.is_file() else None


def render_template(html: str, vars_map: dict) -> str:
    out = html
    for key, value in vars_map.items():
        out = out.replace("{{" + key + "}}", str(value))

    def sub_conditional(match: re.Match) -> str:
        key = match.group(1)
        body = match.group(2)
        val = vars_map.get(key)
        if val and str(val).lower() not in ("", "false", "0", "none"):
            return render_template(body, vars_map)
        return ""

    out = CONDITIONAL_RE.sub(sub_conditional, out)
    out = re.sub(r"\{\{[^}]+\}\}", "", out)
    return out


def assemble(template_id: str, section_type: str, vars_map: dict) -> str:
    path = resolve_partial(template_id, section_type)
    if not path:
        raise FileNotFoundError(f"No partial for {template_id}/{section_type}")
    html = path.read_text(encoding="utf-8")
    merged = {
        "template_id": template_id,
        "section_id": vars_map.get("section_id", section_type),
        "extra_class": vars_map.get("extra_class", ""),
        "object_position": vars_map.get("object_position", "center center"),
        "cta_href": vars_map.get("cta_href", "#"),
        "cta_label": vars_map.get("cta_label", "Learn more"),
        **vars_map,
    }
    return render_template(html, merged)


def list_types(template_id: str) -> None:
    manifest = load_manifest()
    partials = (manifest.get("partials") or {}).get(template_id) or {}
    if not partials:
        print(f"No partials registered for template '{template_id}'")
        return
    for section_type, rel in partials.items():
        print(f"  {section_type}: {rel}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Assemble section HTML from template partial")
    parser.add_argument("template_id", nargs="?", help="e.g. spector, kirk, ordina")
    parser.add_argument("section_type", nargs="?", help="e.g. hero, portfolio")
    parser.add_argument("--vars", default="{}", help="JSON object of placeholders")
    parser.add_argument("--vars-file", help="Path to JSON file")
    parser.add_argument("--list", action="store_true", help="List section types for template")
    parser.add_argument("-o", "--output", help="Write to file instead of stdout")
    args = parser.parse_args()

    if args.list:
        if not args.template_id:
            print("Usage: assemble-section.py --list <template_id>")
            return 1
        list_types(args.template_id)
        return 0

    if not args.template_id or not args.section_type:
        parser.print_help()
        return 1

    vars_map: dict = {}
    if args.vars_file:
        vars_map = json.loads(Path(args.vars_file).read_text(encoding="utf-8"))
    else:
        vars_map = json.loads(args.vars)

    try:
        html = assemble(args.template_id, args.section_type, vars_map)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}")
        return 1

    if args.output:
        Path(args.output).write_text(html, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(html)
    return 0


if __name__ == "__main__":
    sys.exit(main())
