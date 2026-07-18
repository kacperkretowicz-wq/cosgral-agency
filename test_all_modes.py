import asyncio
import json
import os
import subprocess
import time
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://localhost:8931/designkopia/cosgral-agency/index.html"
OUT = Path(__file__).parent / "test-output" / "all-modes-audit"
OUT.mkdir(parents=True, exist_ok=True)

async def audit_mode(name: str) -> dict:
    print(f"Auditing mode: {name}")
    logs = []
    page_errors = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="no-preference"
        )
        page = await context.new_page()
        
        page.on("console", lambda msg: logs.append(f"{msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        
        await page.goto(URL)
        
        # Set localStorage and sessionStorage on the page and reload to apply them
        await page.evaluate(f"""() => {{
            localStorage.setItem('heroDirection', '{name}');
            sessionStorage.setItem('hasVisited', 'true');
            location.reload();
        }}""")
        
        await page.wait_for_load_state("networkidle")
        
        # Bypass the preloader and unlock scroll manually if needed
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
        
        # Give a short delay to stabilize
        await page.wait_for_timeout(100)
        
        mode_dir = OUT / name
        mode_dir.mkdir(parents=True, exist_ok=True)
        
        # Capture screenshots at progress 0.0, 0.25, 0.45, 0.7
        progress_points = [0.0, 0.25, 0.45, 0.7]
        for p_val in progress_points:
            await page.evaluate(f"""(progressValue) => {{
                const wrap = document.querySelector('.hero_stack_wrapper');
                const st = ScrollTrigger.getAll().find(s => s.trigger === wrap && s.animation && s.animation.duration() === 5);
                if (st) {{
                    st.scroll(st.start + (st.end - st.start) * progressValue);
                    ScrollTrigger.update();
                }}
            }}""", p_val)
            await page.wait_for_timeout(200)
            await page.screenshot(path=str(mode_dir / f"p_{int(p_val*100)}.png"))
            
        await browser.close()
        
    return {
        "mode": name,
        "logs": logs,
        "page_errors": page_errors,
        "gsap_warnings": [l for l in logs if "warn" in l.lower() or "gsap" in l.lower() or "invalid" in l.lower()]
    }

async def main():
    # Start server
    server_process = subprocess.Popen(
        ["python", "-m", "http.server", "8931"],
        cwd=str(Path(__file__).parent.parent.parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1.5) # Wait for server to start
    
    modes = [
        "signature", "ink-melt", "kinetic-portal", "decode-grid", "editorial-slice",
        "letter-portal", "darkroom", "outline-fill", "editorial-tear",
        "chromatic-dive", "slit-drip",
    ]
    
    results = []
    try:
        for m in modes:
            res = await audit_mode(m)
            results.append(res)
    finally:
        server_process.terminate()
        
    # Write audit report
    report_path = OUT / "audit-report.json"
    report_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nAudit complete! Report written to {report_path}")
    
    # Print summary of warnings/errors
    has_issues = False
    for r in results:
        if r["page_errors"]:
            print(f"ERROR in mode {r['mode']}: {r['page_errors']}")
            has_issues = True
        if r["gsap_warnings"]:
            print(f"GSAP Warning in mode {r['mode']}: {r['gsap_warnings']}")
            has_issues = True
            
    if not has_issues:
        print(f"\nALL {len(modes)} DIRECTIONS PASSED AUDIT WITH NO ERRORS OR WARNINGS!")

if __name__ == "__main__":
    asyncio.run(main())
