#!/usr/bin/env python3
"""check-agents.py — anti-drift: pliki agentów vs AGENT-MAP vs pipeline.yaml.

Pilnuje, by nie wróciły rozjazdy z audytu (V3-DEAD-02/05):
  * każdy plik w .cursor/agents/ jest ujęty w AGENT-MAP.md (brak „agentów-widmo”),
  * każdy agent z profiles/pipeline.yaml istnieje jako plik i NIE jest aliasem (DEPRECATED),
  * pliki-aliasy faktycznie są oznaczone DEPRECATED.

Usage: python scripts/check-agents.py
Exit 0 = OK, 1 = drift.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
# Definicje agentów: natywne dla Claude Code (.claude/agents/) ORAZ legacy Cursor (.cursor/agents/).
# Sprawdzamy obie lokalizacje — który katalog istnieje, ten dostarcza pliki.
AGENT_DIRS = [ROOT / ".claude" / "agents", ROOT / ".cursor" / "agents"]
MAP = ROOT / "profiles" / "AGENT-MAP.md"
PIPELINE = ROOT / "profiles" / "pipeline.yaml"


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    files: dict[str, Path] = {}
    for d in AGENT_DIRS:
        if d.is_dir():
            for p in d.glob("*.md"):
                files.setdefault(p.stem, p)  # pierwszy katalog (.claude) wygrywa przy duplikacie
    map_text = MAP.read_text(encoding="utf-8") if MAP.is_file() else ""
    if not map_text:
        print("ERROR: brak profiles/AGENT-MAP.md")
        return 1

    # alias = plik z dystynktywnym markerem w nagłówku/frontmatterze (nie samo słowo "DEPRECATED")
    def _is_alias(text: str) -> bool:
        return ("DEPRECATED — alias" in text) or ("DEPRECATED (alias)" in text)
    aliases = {stem for stem, p in files.items() if _is_alias(p.read_text(encoding="utf-8"))}

    # 1) każdy plik ujęty w mapie
    for stem in sorted(files):
        if stem not in map_text:
            errors.append(f"plik agenta '{stem}.md' NIE jest ujęty w AGENT-MAP.md (agent-widmo)")

    # 2) agenci z pipeline.yaml istnieją i nie są aliasami
    spec = yaml.safe_load(PIPELINE.read_text(encoding="utf-8")) or {}
    phases = spec.get("phases") or {}
    pipeline_agents: set[str] = set()
    for pid, pdef in phases.items():
        for a in (pdef.get("agents") or []):
            pipeline_agents.add(a)
    for a in sorted(pipeline_agents):
        if a not in files:
            errors.append(f"pipeline.yaml odwołuje się do agenta '{a}', który NIE istnieje jako plik")
        elif a in aliases:
            errors.append(f"pipeline.yaml odwołuje się do ALIASU '{a}' (DEPRECATED) — użyj kanonu")

    # 3) raport aliasów (informacyjnie)
    for stem in sorted(aliases):
        if stem not in map_text:
            warnings.append(f"alias '{stem}' nie wymieniony w sekcji Alias mapy")

    for w in warnings:
        print(f"  WARN: {w}")

    print(f"\n  agentów: {len(files)}  |  active+optional: {len(files) - len(aliases)}  |  alias: {len(aliases)}")
    print(f"  pipeline.yaml używa {len(pipeline_agents)} agentów")

    if errors:
        print("\nCHECK-AGENTS FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("\nCHECK-AGENTS OK — pliki/mapa/pipeline spójne")
    return 0


if __name__ == "__main__":
    sys.exit(main())
