#!/usr/bin/env python3
"""Scroll mockupy 07–09: obrazowe focal points z inspo + designerski thread."""

from __future__ import annotations

import importlib.util
import math
import random
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location(
    "dsg", Path(__file__).parent / "build-scroll-background-designer.py"
)
dsg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dsg)

ACCENT = dsg.ACCENT
BG = dsg.BG
H = dsg.H
INK = dsg.INK
INSPO = dsg.INSPO
OUT = dsg.OUT
W = dsg.W
WARM = dsg.WARM
atmospheric_layer = dsg.atmospheric_layer
diagonal_falloff = dsg.diagonal_falloff
draw_thread = dsg.draw_thread
grain_overlay = dsg.grain_overlay
load = dsg.load
radial_glow = dsg.radial_glow
ribbed_overlay = dsg.ribbed_overlay
thread_path = dsg.thread_path

dsg.VIDEO_MAP["__scifi__"] = INSPO / "Flashing_Sci-Fi_Box_VJ_Loop_preview_1561737.mp4"

W2, H2 = W, H


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    return ImageOps.fit(img, (w, h), Image.Resampling.LANCZOS)


def feather_ellipse_mask(w: int, h: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([w * 0.05, h * 0.05, w * 0.95, h * 0.95], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(min(w, h) // 5))


def focal(
    canvas: Image.Image,
    img_path: str,
    y_center: float,
    height_ratio: float = 0.22,
    x_center: float = 0.5,
    opacity: float = 0.62,
    blur: int = 0,
    darken: float = 0.72,
) -> Image.Image:
    fh = int(H2 * height_ratio)
    fw = int(W2 * 0.92)
    src = load(img_path)
    piece = cover(src, fw, fh)
    if blur:
        piece = piece.filter(ImageFilter.GaussianBlur(blur))
    piece = ImageEnhance.Brightness(piece).enhance(darken)
    mask = feather_ellipse_mask(fw, fh)
    piece = piece.convert("RGBA")
    piece.putalpha(mask.point(lambda p: int(p * opacity)))

    layer = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    x = int(W2 * x_center - fw / 2)
    y = int(H2 * y_center - fh / 2)
    layer.paste(piece, (x, y), piece)
    return Image.alpha_composite(canvas, layer)


def build(cfg: dict) -> tuple[Path, Path]:
    random.seed(cfg["seed"])
    canvas = Image.new("RGBA", (W2, H2), (*BG, 255))

    # ciągła mgła bazowa
    canvas = Image.alpha_composite(canvas, atmospheric_layer(load("pobrane (10).jfif"), W2, H2, 0.14, blur=70))
    canvas = Image.alpha_composite(canvas, atmospheric_layer(load("pobrane (7).jfif"), W2, H2, 0.10, blur=80))

    # focal points — rozpoznawalne obiekty z inspo
    for fp in cfg["focals"]:
        canvas = focal(
            canvas,
            fp["src"],
            fp["y"],
            fp.get("h", 0.20),
            fp.get("x", 0.5),
            fp.get("op", 0.58),
            fp.get("blur", 0),
            fp.get("dark", 0.7),
        )

    # brand glows
    canvas = Image.alpha_composite(canvas, radial_glow(W2, H2, W2 * 0.25, H2 * 0.10, W2 * 0.4, H2 * 0.14, WARM, 0.12))
    canvas = Image.alpha_composite(canvas, radial_glow(W2, H2, W2 * 0.7, H2 * 0.85, W2 * 0.35, H2 * 0.12, ACCENT, 0.10))

    # linia przewodnia
    pts = thread_path(W2, H2, cfg["seed"], cfg.get("amp", 190), cfg.get("freq", 2.4), cfg.get("tx", 0.54))
    thread = draw_thread(W2, H2, pts, cfg.get("tcolor", ACCENT), 7, 24, 0.5, double=True)
    canvas = Image.alpha_composite(canvas, thread)

    canvas = Image.alpha_composite(canvas, diagonal_falloff(W2, H2))
    canvas = Image.alpha_composite(canvas, ribbed_overlay(W2, H2, 0.03))
    canvas = Image.alpha_composite(canvas, grain_overlay(W2, H2, 0.09))

    rgb = canvas.convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    clean = OUT / f"{cfg['name']}.jpg"
    preview = OUT / f"{cfg['name']}-preview.jpg"
    rgb.save(clean, quality=93, optimize=True)

    pv = rgb.copy()
    pd = ImageDraw.Draw(pv)
    for label, y in cfg.get("labels", []):
        yy = int(H2 * y)
        pd.line([(0, yy), (W2, yy)], fill=ACCENT, width=1)
        pd.text((16, yy + 6), label, fill=INK)
    pv.save(preview, quality=88, optimize=True)
    return clean, preview


VARIANTS = [
    {
        "name": "scroll-mockup-07-chrome-anatomy",
        "seed": 71,
        "focals": [
            {"src": "pobrane (1).jfif", "y": 0.10, "h": 0.24, "x": 0.55, "op": 0.65},  # hero: liquid chrome
            {"src": "pobrane (5).jfif", "y": 0.46, "h": 0.18, "x": 0.48, "op": 0.52},  # usługi: halftone
            {"src": "pobrane (11).jfif", "y": 0.64, "h": 0.20, "x": 0.52, "op": 0.55},  # proces: silk metal
            {"src": "Diffusion ᴬᴿᵀ  ɱαʂƚҽɾ Screensavers 『R®.jfif", "y": 0.78, "h": 0.18, "x": 0.45, "op": 0.50},  # faq
            {"src": "pobrane (3).jfif", "y": 0.90, "h": 0.22, "x": 0.5, "op": 0.58},  # zespół: keycaps
        ],
        "labels": [("HERO · chrome", 0.0), ("USŁUGI · halftone", 0.38), ("PROCES · metal", 0.58), ("FAQ · ribbed", 0.73), ("ZESPÓŁ · keys", 0.84)],
    },
    {
        "name": "scroll-mockup-08-tech-objects",
        "seed": 82,
        "amp": 210,
        "focals": [
            {"src": "pobrane (2).jfif", "y": 0.12, "h": 0.20, "x": 0.5, "op": 0.68, "dark": 0.75},  # ESC glass key
            {"src": "Artz Now _ 2052697601753968644.jfif", "y": 0.44, "h": 0.16, "x": 0.5, "op": 0.60},  # hot & sweet keys
            {"src": "__waves__", "y": 0.63, "h": 0.19, "x": 0.5, "op": 0.45, "blur": 8},  # proces waves
            {"src": "pobrane (7).jfif", "y": 0.77, "h": 0.17, "x": 0.48, "op": 0.48},  # faq grain
            {"src": "Oppo Reno 14 wallpaper.jfif", "y": 0.91, "h": 0.20, "x": 0.52, "op": 0.52, "blur": 2},  # zespół sculpt
        ],
        "labels": [("HERO · ESC key", 0.0), ("USŁUGI · keycaps", 0.38), ("PROCES · waves", 0.58), ("FAQ · grain", 0.73), ("ZESPÓŁ · sculpt", 0.84)],
    },
    {
        "name": "scroll-mockup-09-cinematic-story",
        "seed": 93,
        "tcolor": (210, 210, 220),
        "focals": [
            {"src": "__waves__", "y": 0.14, "h": 0.26, "x": 0.5, "op": 0.50, "blur": 4},
            {"src": "pobrane (12).jfif", "y": 0.40, "h": 0.16, "x": 0.46, "op": 0.42, "blur": 3},
            {"src": "__scifi__", "y": 0.62, "h": 0.18, "x": 0.54, "op": 0.48, "blur": 6},
            {"src": "Diffusion ᴬᴿᵀ  ɱαʂƚҽɾ Screensavers 『R®.jfif", "y": 0.76, "h": 0.17, "x": 0.42, "op": 0.52},
            {"src": "pobrane (1).jfif", "y": 0.92, "h": 0.20, "x": 0.56, "op": 0.55},
        ],
        "labels": [("HERO · cinematic", 0.0), ("USŁUGI · haze", 0.38), ("PROCES · sci-fi", 0.58), ("FAQ · glass", 0.73), ("KONTAKT · chrome", 0.88)],
    },
]

def main() -> None:
    print("Obrazowe scroll mockupy 07-09...")
    for cfg in VARIANTS:
        clean, preview = build(cfg)
        print(f"  OK {cfg['name']}")
        print(f"    {clean.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
