"""Skan wielu punktów scrolla — wykrywa skoki progressu i robi zrzuty."""
import asyncio
import base64
import json
from pathlib import Path

from browser_use import Browser

URL = "http://localhost:8766/index.html"
OUT = Path(__file__).parent / "test-output" / "scan"
OUT.mkdir(parents=True, exist_ok=True)


async def sample_state(page) -> dict:
    raw = await page.evaluate(
        """() => {
      const mitosis = window.cosgralTeamMitosis;
      return JSON.stringify({
        mitosisProgress: mitosis?.getProgress?.() ?? null,
        pinProgress: ScrollTrigger.getById('history-mitosis-pin')?.progress ?? null,
      });
    }"""
    )
    return json.loads(raw)


async def scroll_history(page, progress: float) -> None:
    await page.evaluate(
        """(progress) => {
      const ht = ScrollTrigger.getById('history-mitosis-pin');
      const smoother = ScrollSmoother.get();
      smoother.scrollTo(ht.start + progress * (ht.end - ht.start), true);
    }""",
        progress,
    )


async def main() -> None:
    browser = Browser(headless=True)
    steps = 24
    report = {"samples": [], "issues": []}

    try:
        await browser.start()
        page = await browser.new_page(URL)
        await page.set_viewport_size(1920, 1080)
        await asyncio.sleep(8)

        prev = None
        for i in range(steps + 1):
            p = i / steps
            await scroll_history(page, p)
            await asyncio.sleep(0.55)
            s = await sample_state(page)
            s["target"] = p
            s["i"] = i
            report["samples"].append(s)

            if prev and s["mitosisProgress"] is not None:
                jump = abs(s["mitosisProgress"] - prev)
                if jump > 0.12:
                    report["issues"].append(f"jump {prev:.3f}->{s['mitosisProgress']:.3f} at target {p:.2f}")
                    b64 = await page.screenshot()
                    (OUT / f"jump-{i:02d}-p{int(p*100)}.png").write_bytes(base64.b64decode(b64))

            if p >= 0.55:
                b64 = await page.screenshot()
                (OUT / f"frame-{i:02d}-p{int(p*100)}.png").write_bytes(base64.b64decode(b64))

            prev = s["mitosisProgress"]

        (OUT / "scan-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"ok": len(report["issues"]) == 0, "issues": report["issues"]}, indent=2))
    finally:
        await browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
