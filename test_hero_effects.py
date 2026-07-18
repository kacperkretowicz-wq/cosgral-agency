import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://localhost:8931/designkopia/cosgral-agency/index.html"
OUT = Path(__file__).parent / "test-output" / "hero-tests"
OUT.mkdir(parents=True, exist_ok=True)

async def run_test(name: str, prefers_reduced_motion: str, hero_direction: str) -> dict:
    print(f"Running test: {name} (reduced-motion: {prefers_reduced_motion}, direction: {hero_direction})")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="reduce" if prefers_reduced_motion == "reduce" else "no-preference"
        )
        page = await context.new_page()
        await page.goto(URL)

        await page.evaluate(f"""() => {{
            localStorage.setItem('heroDirection', '{hero_direction}');
            sessionStorage.setItem('hasVisited', 'true');
            location.reload();
        }}""")
        
        await page.wait_for_load_state("networkidle")
        
        await page.evaluate("""() => {
            document.getElementById('scroll-lock')?.remove();
            if (typeof smoother !== 'undefined') {
                smoother.paused(false);
            }
            const preloader = document.querySelector('.u-preloader');
            if (preloader) {
                preloader.style.display = 'none';
            }
        }""")
        
        body_class_initial = await page.evaluate("() => document.body.className")
        
        await page.evaluate("""() => {
            const wrap = document.querySelector('.hero_stack_wrapper');
            const st = ScrollTrigger.getAll().find(s => s.trigger === wrap && s.animation && s.animation.duration() === 5);
            if (st) {
                st.scroll(st.start + (st.end - st.start) * 0.25);
                ScrollTrigger.update();
            }
        }""")
        
        await page.wait_for_timeout(200)
        
        state = await page.evaluate("""() => {
            const wrap = document.querySelector('.hero_stack_wrapper');
            const st = ScrollTrigger.getAll().find(s => s.trigger === wrap && s.animation && s.animation.duration() === 5);
            const h1 = document.querySelector('[data-vv="1"] h2');
            const chars = h1 ? Array.from(h1.querySelectorAll('.char-span')) : [];
            
            return {
                bodyClass: document.body.className,
                scroll: window.scrollY,
                triggerProgress: st ? st.progress : null,
                h1Text: h1 ? h1.innerText : null,
                h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
                h1ClipPath: h1 ? getComputedStyle(h1).clipPath : null,
                charSpansCount: chars.length,
                charSpansStyles: chars.map(c => ({
                    char: c.innerText,
                    opacity: getComputedStyle(c).opacity,
                    display: getComputedStyle(c).display
                }))
            };
        }""")
        
        screenshot_path = OUT / f"{name}.png"
        await page.screenshot(path=str(screenshot_path))
        print(f"  Screenshot saved to {screenshot_path}")
        
        await browser.close()
        
        state["bodyClassInitial"] = body_class_initial
        state["screenshot"] = str(screenshot_path)
        return state

async def main():
    results = {}
    
    results["reduced_motion_reduce_kinetic"] = await run_test(
        name="reduce_motion_reduce_kinetic",
        prefers_reduced_motion="reduce",
        hero_direction="kinetic-portal"
    )

    results["reduced_motion_no_preference_kinetic"] = await run_test(
        name="reduced_motion_no_preference_kinetic",
        prefers_reduced_motion="no-preference",
        hero_direction="kinetic-portal"
    )

    print("\n--- RESULTS ANALYSIS ---")

    t1 = results["reduced_motion_reduce_kinetic"]
    print(f"Test 1 (reduced_motion_reduce_kinetic):")
    print(f"  Initial Body Class: {t1['bodyClassInitial']}")
    print(f"  Final Body Class: {t1['bodyClass']}")
    print(f"  Heading 1 Text: {t1['h1Text']}")
    print(f"  Heading 1 Opacity: {t1['h1Opacity']}")
    print(f"  Heading 1 ClipPath: {t1['h1ClipPath']}")
    print(f"  Char Spans Count: {t1['charSpansCount']}")
    if t1['charSpansCount'] > 0:
        opacities = [float(c['opacity']) for c in t1['charSpansStyles']]
        print(f"  Char Spans Opacities: min={min(opacities)}, max={max(opacities)}")
        if min(opacities) > 0.9:
            print("  SUCCESS: Char spans are visible under reduced-motion (opacity ~ 1).")
        else:
            print("  WARNING: Char spans have low opacity under reduced-motion!")
    else:
        print("  Char spans not created.")
        
    t2 = results["reduced_motion_no_preference_kinetic"]
    print(f"\nTest 2 (reduced_motion_no_preference_kinetic):")
    print(f"  Initial Body Class: {t2['bodyClassInitial']}")
    print(f"  Final Body Class: {t2['bodyClass']}")
    print(f"  Heading 1 Text: {t2['h1Text']}")
    print(f"  Heading 1 Opacity: {t2['h1Opacity']}")
    print(f"  Char Spans Count: {t2['charSpansCount']}")
    if t2['charSpansCount'] > 0:
        opacities = [float(c['opacity']) for c in t2['charSpansStyles']]
        print(f"  Char Spans Opacities: min={min(opacities)}, max={max(opacities)}")
    else:
        print("  Char spans not created.")

    report_path = OUT / "test-report.json"
    report_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nFull report written to {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
