"""Playwright — gęsty skan faz mitozy."""
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

URL = "http://localhost:8766/index.html"
OUT = Path(__file__).parent / "test-output" / "playwright-jelly"
OUT.mkdir(parents=True, exist_ok=True)


async def main() -> None:
    logs: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        page.on("console", lambda msg: logs.append(f"{msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: logs.append(f"pageerror: {err}"))

        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_timeout(8000)

        frames = [0.04, 0.08, 0.12, 0.16, 0.20, 0.24, 0.28, 0.32, 0.36, 0.40, 0.44, 0.48, 0.52, 0.58, 0.65, 0.72, 0.80, 0.88, 0.95, 1.0]
        report = []

        for i, progress in enumerate(frames):
            await page.evaluate(
                """(progress) => {
              const ht = ScrollTrigger.getById('history-mitosis-pin');
              ScrollSmoother.get().scrollTo(ht.start + progress * (ht.end - ht.start), true);
            }""",
                progress,
            )
            await page.wait_for_timeout(700)
            state = await page.evaluate(
                """() => ({
              p: window.cosgralTeamMitosis?.getProgress?.(),
              pin: ScrollTrigger.getById('history-mitosis-pin')?.progress,
              canvas: !!document.querySelector('.history_mitosis_renderer')
            })"""
            )
            state["target"] = progress
            report.append(state)
            await page.screenshot(path=str(OUT / f"jelly-{i:02d}-p{int(progress*100)}.png"))

        result = {"frames": report, "logs": [l for l in logs if "pageerror" in l or "Shader" in l]}
        (OUT / "report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        await browser.close()
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
