"""Scroll-test sekcji mitozy przez browser-use (Browser API + Playwright)."""
import asyncio
import base64
import json
from pathlib import Path

from browser_use import Browser

URL = "http://localhost:8766/index.html"
OUT = Path(__file__).parent / "test-output"
OUT.mkdir(exist_ok=True)


async def sample_state(page) -> dict:
    raw = await page.evaluate(
        """() => {
      const canvas = document.getElementById('history-mitosis-canvas');
      const renderer = canvas?.querySelector('canvas');
      const ht = window.ScrollTrigger?.getById?.('history-mitosis-pin');
      const smoother = window.ScrollSmoother?.get?.();
      const wrap = document.querySelector('.history_mitosis_wrap');
      const imgs = document.querySelector('.history_imgs_v1');
      const panels = document.querySelectorAll('.history_step_v1').length;
      const nav = document.querySelector('.history_steps_nav');
      const blocks = document.querySelector('.history_team_blocks');
      const mitosis = window.cosgralTeamMitosis;
      return JSON.stringify({
        mitosisReady: !!mitosis,
        mitosisProgress: mitosis?.getProgress?.() ?? null,
        pinProgress: ht?.progress ?? null,
        pinActive: ht?.isActive ?? null,
        pinStart: ht?.start ?? null,
        pinEnd: ht?.end ?? null,
        scrollTop: smoother?.scrollTop?.() ?? window.scrollY,
        canvasOpacity: canvas ? getComputedStyle(canvas).opacity : null,
        wrapSize: wrap ? { w: wrap.clientWidth, h: wrap.clientHeight } : null,
        imgsSize: imgs ? { w: imgs.clientWidth, h: imgs.clientHeight } : null,
        rendererSize: renderer ? { w: renderer.width, h: renderer.height, cssW: renderer.clientWidth, cssH: renderer.clientHeight } : null,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        textPanels: panels,
        navVisible: nav ? getComputedStyle(nav).display !== 'none' && parseFloat(getComputedStyle(nav).opacity) > 0.05 : false,
        htmlBlocksVisible: blocks ? parseFloat(getComputedStyle(blocks).opacity) > 0.05 : false,
        triggerCount: window.ScrollTrigger?.getAll?.().filter(t => t.vars?.id === 'history-mitosis-pin').length ?? 0,
        stageTop: document.querySelector('.history_steps_v1')?.getBoundingClientRect?.().top ?? null,
      });
    }"""
    )
    return json.loads(raw)


async def save_shot(page, name: str) -> None:
    b64 = await page.screenshot()
    path = OUT / f"{name}.png"
    path.write_bytes(base64.b64decode(b64))
    print(f"screenshot: {path}")


async def scroll_history(page, progress: float) -> None:
    await page.evaluate(
        """(progress) => {
      const ht = ScrollTrigger.getById('history-mitosis-pin');
      const smoother = ScrollSmoother.get();
      if (!ht) return;
      const y = ht.start + progress * (ht.end - ht.start);
      smoother.scrollTo(y, true);
    }""",
        progress,
    )


async def main() -> None:
    browser = Browser(headless=True)
    report = {"url": URL, "samples": [], "issues": []}

    try:
        await browser.start()
        page = await browser.new_page(URL)
        await page.set_viewport_size(1920, 1080)
        await asyncio.sleep(8)

        await save_shot(page, "01-loaded")

        state0 = await sample_state(page)
        report["initial"] = state0

        if not state0["mitosisReady"]:
            report["issues"].append("cosgralTeamMitosis not ready after 8s")
        if state0["triggerCount"] != 1:
            report["issues"].append(f"expected 1 history pin trigger, got {state0['triggerCount']}")
        if state0["textPanels"] > 0:
            report["issues"].append(f"text panels still in DOM: {state0['textPanels']}")
        if state0["navVisible"]:
            report["issues"].append("nav dots visible")

        for label, p in [
            ("start", 0.0),
            ("mid", 0.5),
            ("late", 0.85),
            ("end", 1.0),
        ]:
            await scroll_history(page, p)
            await asyncio.sleep(1.5)
            s = await sample_state(page)
            s["label"] = label
            report["samples"].append(s)
            await save_shot(page, f"02-history-{label}")

        end = report["samples"][-1]
        vw = end["viewport"]["w"]
        if end["wrapSize"] and end["wrapSize"]["w"] < vw * 0.95:
            report["issues"].append(
                f"effect width constrained: {end['wrapSize']['w']}px vs viewport {vw}px"
            )
        if end["htmlBlocksVisible"]:
            report["issues"].append("HTML placeholder blocks visible at end (should be WebGL only)")
        if (end["mitosisProgress"] or 0) < 0.9:
            report["issues"].append(f"mitosis progress too low at end: {end['mitosisProgress']}")

        report["ok"] = len(report["issues"]) == 0
        out_json = OUT / "report.json"
        out_json.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))

    finally:
        await browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
