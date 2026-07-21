#!/usr/bin/env python3
"""Przygotowanie filmów hero z inspo/ — usunięcie watermarków preview."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INSPO = ROOT / "inspo"
OUT = ROOT / "images" / "cosgral-agency" / "hero-video-tests"


def run(cmd: list[str]) -> None:
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)

    cubes_src = INSPO / "1000_Cubes_Structure_preview_2918509.mp4"
    ice_src = INSPO / "Detailed_Ice_Cube_Close_Up_Rotates_preview_238535.mp4"

    if not cubes_src.exists() or not ice_src.exists():
        print("Brak plików w inspo/", file=sys.stderr)
        return 1

    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(cubes_src),
            "-vf",
            "delogo=x=520:y=470:w=880:h=130,format=yuv420p",
            "-c:v",
            "libx264",
            "-crf",
            "22",
            "-preset",
            "medium",
            "-movflags",
            "+faststart",
            str(OUT / "cubes-structure-hero.mp4"),
        ]
    )

    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(ice_src),
            "-t",
            "10",
            "-vf",
            "delogo=x=40:y=500:w=1840:h=90,"
            "crop=iw*0.92:ih*0.92:iw*0.04:ih*0.04,"
            "scale=1920:1080,format=yuv420p",
            "-c:v",
            "libx264",
            "-crf",
            "26",
            "-preset",
            "medium",
            "-movflags",
            "+faststart",
            str(OUT / "ice-cube-hero.mp4"),
        ]
    )

    print("Gotowe:", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
