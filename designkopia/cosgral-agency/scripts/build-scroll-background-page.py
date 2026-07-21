#!/usr/bin/env python3
"""
Mockupy 10–12: tło POD stronę COSGRAL.

Inspo = smak (tekstura, światło, materiał) — NIE kolaż obiektów.
"""

from __future__ import annotations

import importlib.util
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INSPO = ROOT / "inspo"
OUT = ROOT / "images" / "cosgral-agency" / "background-mockups"

_spec = importlib.util.spec_from_file_location(
    "dsg", Path(__file__).parent / "build-scroll-background-designer.py"
)
dsg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dsg)

W, H = dsg.W, dsg.H
BG, INK, ACCENT, WARM = dsg.BG, dsg.INK, dsg.ACCENT, dsg.WARM


def abstract_texture(name: str, w: int, h: int, seed: int, blur: int, opacity: float, darken: float) -> Image.Image:
    rng = random.Random(seed)
    src = Image.open(INSPO / name).convert("RGB")
    sw, sh = src.size
    cw, ch = int(sw * rng.uniform(0.35, 0.75)), int(sh * rng.uniform(0.35, 0.75))
    x0, y0 = rng.randint(0, max(0, sw - cw)), rng.randint(0, max(0, sh - ch))
    crop = ImageOps.fit(src.crop((x0, y0, x0 + cw, y0 + ch)), (w, h), Image.Resampling.LANCZOS)
    crop = crop.filter(ImageFilter.GaussianBlur(blur))
    crop = ImageEnhance.Brightness(crop).enhance(darken)
    crop = ImageEnhance.Color(crop).enhance(0.35).convert("RGBA")
    crop.putalpha(int(255 * opacity))
    return crop


def procedural_halftone(w: int, h: int, opacity: float = 0.06) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    step = 5
    for y in range(0, h, step):
        for x in range(0, w, step):
            n = (math.sin(x * 0.018) * math.cos(y * 0.012) + 1) * 0.5
            if n > 0.62:
                r = int(step * n * 0.45)
                draw.ellipse([x - r, y - r, x + r, y + r], fill=(*INK, int(255 * opacity * n)))
    return layer.filter(ImageFilter.GaussianBlur(1.2))


def chrome_blobs(w: int, h: int, seed: int, count: int = 5) -> Image.Image:
    rng = random.Random(seed)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for _ in range(count):
        cx, cy = rng.uniform(w * 0.1, w * 0.9), rng.uniform(h * 0.05, h * 0.95)
        rx, ry = rng.uniform(w * 0.08, w * 0.22), rng.uniform(h * 0.04, h * 0.12)
        col, a = rng.randint(180, 230), rng.randint(8, 22)
        draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(col, col, col + 5, a))
        draw.arc([cx - rx, cy - ry, cx + rx, cy + ry], 200, 340, fill=(255, 255, 255, a + 12), width=3)
    return layer.filter(ImageFilter.GaussianBlur(28))


def zone_ramp(w: int, h: int, y0: float, y1: float, peak: float) -> Image.Image:
    mask = Image.new("L", (1, h), 0)
    px, ys, ye, feather = mask.load(), int(h * y0), int(h * y1), int(h * 0.05)
    for y in range(h):
        if y < ys - feather or y > ye + feather:
            v = 0
        elif y < ys:
            v = int(255 * peak * (y - (ys - feather)) / feather)
        elif y > ye:
            v = int(255 * peak * ((ye + feather) - y) / feather)
        else:
            v = int(255 * peak)
        px[0, y] = v
    layer = Image.new("RGBA", (w, h), (*INK, 0))
    layer.putalpha(mask.resize((w, h)))
    return layer


def build(cfg: dict) -> None:
    random.seed(cfg["seed"])
    canvas = Image.new("RGBA", (W, H), (*BG, 255))

    for i, (fname, blur, op, dark) in enumerate(cfg["textures"]):
        canvas = Image.alpha_composite(canvas, abstract_texture(fname, W, H, cfg["seed"] + i * 17, blur, op, dark))

    if cfg.get("halftone"):
        canvas = Image.alpha_composite(canvas, procedural_halftone(W, H, cfg.get("halftone_op", 0.05)))
    if cfg.get("chrome"):
        canvas = Image.alpha_composite(canvas, chrome_blobs(W, H, cfg["seed"] + 99, cfg.get("chrome_n", 6)))

    canvas = Image.alpha_composite(canvas, dsg.radial_glow(W, H, W * 0.28, H * 0.11, W * 0.45, H * 0.16, WARM, 0.16))
    glow2 = (180, 188, 198) if cfg.get("glow_cool_only") else ACCENT
    glow3 = (196, 202, 210) if cfg.get("glow_cool_only") else ACCENT
    canvas = Image.alpha_composite(canvas, dsg.radial_glow(W, H, W * 0.72, H * 0.32, W * 0.3, H * 0.1, glow2, 0.07))
    canvas = Image.alpha_composite(canvas, dsg.radial_glow(W, H, W * 0.55, H * 0.88, W * 0.38, H * 0.14, glow3, 0.12))

    for z in cfg.get("ramps", []):
        canvas = Image.alpha_composite(canvas, zone_ramp(W, H, z["y0"], z["y1"], z["p"]))

    pts = dsg.thread_path(W, H, cfg["seed"], cfg["amp"], cfg["freq"], cfg.get("tx", 0.52), cfg.get("phase", 0))
    canvas = Image.alpha_composite(
        canvas,
        dsg.draw_thread(W, H, pts, cfg.get("tcolor", ACCENT), cfg["tw"], cfg["tblur"], cfg["top"],
                        double=cfg.get("double", True), offset=cfg.get("toff", 16)),
    )
    if cfg.get("white_thread"):
        pts2 = dsg.thread_path(W, H, cfg["seed"] + 3, cfg["amp"] * 0.5, cfg["freq"] * 1.3, 0.4, 0.5)
        canvas = Image.alpha_composite(canvas, dsg.draw_thread(W, H, pts2, INK, 3, 20, 0.07, double=False))

    canvas = Image.alpha_composite(canvas, dsg.diagonal_falloff(W, H))
    canvas = Image.alpha_composite(canvas, dsg.ribbed_overlay(W, H, cfg.get("rib", 0.032)))
    canvas = Image.alpha_composite(canvas, dsg.grain_overlay(W, H, cfg.get("grain", 0.085)))

    rgb = canvas.convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    clean = OUT / f"{cfg['name']}.jpg"
    preview = OUT / f"{cfg['name']}-preview.jpg"
    rgb.save(clean, quality=93, optimize=True)
    pv = rgb.copy()
    pd = ImageDraw.Draw(pv)
    for label, y in [("HERO", 0), ("USŁUGI", 0.38), ("PROCES", 0.58), ("FAQ", 0.73), ("ZESPÓŁ", 0.84), ("STOPKA", 0.94)]:
        yy = int(H * y)
        pd.line([(0, yy), (W, yy)], fill=(180, 188, 198), width=1)
        pd.text((14, yy + 5), label, fill=INK)
    pv.save(preview, quality=88, optimize=True)


VARIANTS = [
    {
        "name": "scroll-mockup-10-agency-signal",
        "seed": 100,
        "textures": [
            ("pobrane (10).jfif", 90, 0.14, 0.5),
            ("pobrane (7).jfif", 110, 0.10, 0.45),
        ],
        "amp": 185, "freq": 2.5, "tw": 7, "tblur": 26, "top": 0.52,
        "ramps": [{"y0": 0.36, "y1": 0.58, "p": 0.04}],
        "grain": 0.09,
    },
    {
        "name": "scroll-mockup-11-editorial-current",
        "seed": 111,
        "textures": [
            ("pobrane (5).jfif", 70, 0.11, 0.55),
            ("pobrane (11).jfif", 85, 0.09, 0.48),
            ("pobrane (1).jfif", 100, 0.07, 0.4),
        ],
        "halftone": True, "halftone_op": 0.045, "chrome": True, "chrome_n": 7,
        "amp": 210, "freq": 2.2, "tw": 8, "tblur": 24, "top": 0.45,
        "tcolor": (200, 205, 215), "white_thread": True, "rib": 0.038,
        "glow_cool_only": True,
    },
    {
        "name": "scroll-mockup-12-glass-depth",
        "seed": 122,
        "textures": [
            ("Oppo Reno 14 wallpaper.jfif", 95, 0.10, 0.52),
            ("pobrane (10).jfif", 80, 0.12, 0.5),
        ],
        "amp": 165, "freq": 2.8, "tw": 6, "tblur": 30, "top": 0.48,
        "phase": 0.25, "double": True, "toff": 12,
        "ramps": [{"y0": 0.70, "y1": 0.86, "p": 0.05}],
        "rib": 0.055, "grain": 0.075,
    },
]


if __name__ == "__main__":
    print("Page-fit mockupy 10-12...")
    for cfg in VARIANTS:
        build(cfg)
        print(f"  OK {cfg['name']}")
