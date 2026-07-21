#!/usr/bin/env python3
"""Składa snippet CSS/JS do plików landing według layout-plan.snippet_ids."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNIPPETS = ROOT / "references" / "interactions" / "snippets"
MANIFEST = SNIPPETS / "manifest.yaml"

JS_INIT = {
    "keyboard-slides": "DesignSnippets.initKeyboardSlides();",
    "index-overlay": "DesignSnippets.initIndexOverlay();",
    "expandable-plus": "DesignSnippets.initExpandablePlus();",
    "scroll-reveal": "DesignSnippets.initScrollReveal();",
    "origin-button": "DesignSnippets.initOriginButtons();",
    "stacked-cards": "DesignSnippets.initStackedCards();",
    "marquee-logos": "DesignSnippets.initMarqueeLogos();",
    "webgl-noise-ambient": "DesignSnippets.initWebglNoiseAmbient();",
    "project-index-fan": "DesignSnippets.initProjectIndexFan();",
}


def load_snippet_ids(plan_path: Path) -> list[str]:
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    ids = plan.get("snippet_ids") or []
    if not ids and plan.get("layout_archetype"):
        # fallback: read from layout-archetypes is manual; plan should have snippet_ids
        pass
    return ids


def read_files(snippet_id: str) -> tuple[list[str], list[str]]:
    css_parts: list[str] = []
    js_parts: list[str] = []
    folder = SNIPPETS / snippet_id
    if not folder.is_dir():
        return css_parts, js_parts
    for f in sorted(folder.glob("*.css")):
        css_parts.append(f"/* --- {snippet_id}: {f.name} --- */\n" + f.read_text(encoding="utf-8"))
    for f in sorted(folder.glob("*.js")):
        js_parts.append(f"/* --- {snippet_id}: {f.name} --- */\n" + f.read_text(encoding="utf-8"))
    return css_parts, js_parts


def compose(plan_path: Path, out_dir: Path) -> None:
    snippet_ids = load_snippet_ids(plan_path)
    if not snippet_ids:
        print("No snippet_ids in layout-plan — skip compose", file=sys.stderr)
        return

    all_css: list[str] = []
    all_js: list[str] = []
    inits: list[str] = []

    for sid in snippet_ids:
        css, js = read_files(sid)
        all_css.extend(css)
        all_js.extend(js)
        if sid in JS_INIT:
            inits.append(JS_INIT[sid])

    styles_path = out_dir / "snippets.css"
    styles_path.write_text("\n\n".join(all_css), encoding="utf-8")

    bootstrap = """/* AUTO-COMPOSED — do not edit; regenerate with scripts/compose-interactions.py */
document.addEventListener('DOMContentLoaded', function () {
  if (!window.DesignSnippets) return;
"""
    bootstrap += "\n  ".join(inits) + "\n});\n"

    interactions_path = out_dir / "snippets.js"
    interactions_path.write_text(
        "\n\n".join(all_js) + "\n\n" + bootstrap,
        encoding="utf-8",
    )
    print(f"Wrote {styles_path} + {interactions_path} ({len(snippet_ids)} snippets)")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: compose-interactions.py <layout-plan.json> [output-dir]")
        sys.exit(1)
    plan_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else plan_path.parent
    compose(plan_path, out_dir)


if __name__ == "__main__":
    main()
