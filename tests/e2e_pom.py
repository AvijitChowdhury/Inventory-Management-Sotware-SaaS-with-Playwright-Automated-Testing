"""
End-to-end Playwright suite for StockFlow using the Page Object Model.

Runs headless Chromium against http://localhost:8080, exercises the full
signed-in surface (auth → onboarding-or-dashboard → every module route),
captures screenshots into docs/screenshots/, and prints a per-step
JSON summary that the runner uses to update the README/Allure report.

Usage:
    python tests/e2e_pom.py
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Callable, Awaitable

from playwright.async_api import async_playwright, Page, BrowserContext

sys.path.insert(0, str(Path(__file__).parent))
from pages.base_page import BASE_URL
from pages.landing_page import LandingPage
from pages.auth_page import AuthPage
from pages.onboarding_page import OnboardingPage
from pages.module_page import ModulePage


ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"
RESULTS = ROOT / "tests" / "results"
RESULTS.mkdir(parents=True, exist_ok=True)

EMAIL = os.environ.get("E2E_EMAIL", "abhichy30@gmail.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "12345678")

MODULES = [
    ("/dashboard",        "Dashboard",       "10_route_dashboard.png"),
    ("/products",         "Products",        "10_route_products.png"),
    ("/categories",       "Categories",      "10_route_categories.png"),
    ("/inventory",        "Inventory",       "10_route_inventory.png"),
    ("/purchase-orders",  "Purchase orders", "10_route_purchase_orders.png"),
    ("/sales-orders",     "Sales orders",    "10_route_sales_orders.png"),
    ("/customers",        "Customers",       "10_route_customers.png"),
    ("/suppliers",        "Suppliers",       "10_route_suppliers.png"),
    ("/reports",          "Reports",         "10_route_reports.png"),
    ("/settings",         "Settings",        "10_route_settings.png"),
]


@dataclass
class StepResult:
    name: str
    status: str            # passed | failed | skipped
    duration_ms: int = 0
    screenshot: str | None = None
    detail: str = ""


@dataclass
class Report:
    steps: list[StepResult] = field(default_factory=list)
    console_errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "steps": [asdict(s) for s in self.steps],
            "console_errors": self.console_errors[:50],
            "passed": sum(1 for s in self.steps if s.status == "passed"),
            "failed": sum(1 for s in self.steps if s.status == "failed"),
            "total": len(self.steps),
        }


async def run_step(
    report: Report,
    name: str,
    fn: Callable[[], Awaitable[str | None]],
) -> bool:
    t0 = time.monotonic()
    try:
        shot = await fn()
        dur = int((time.monotonic() - t0) * 1000)
        report.steps.append(StepResult(name, "passed", dur, shot))
        print(f"  ✓ {name} ({dur}ms)")
        return True
    except Exception as e:  # noqa: BLE001
        dur = int((time.monotonic() - t0) * 1000)
        report.steps.append(StepResult(name, "failed", dur, None, str(e)[:400]))
        print(f"  ✗ {name} — {e}")
        return False


async def main() -> int:
    report = Report()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context: BrowserContext = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
        )
        page: Page = await context.new_page()

        page.on("console", lambda msg: (
            report.console_errors.append(f"[{msg.type}] {msg.text}")
            if msg.type == "error" else None
        ))

        landing = LandingPage(page, SHOTS)
        auth = AuthPage(page, SHOTS)
        onboarding = OnboardingPage(page, SHOTS)

        print("→ Public routes")

        async def _landing():
            await landing.goto()
            return str(await landing.screenshot("01_landing.png"))
        await run_step(report, "Landing page loads", _landing)

        async def _auth_empty():
            await auth.goto()
            return str(await auth.screenshot("02_auth.png"))
        await run_step(report, "Auth page renders", _auth_empty)

        print("→ Sign in")

        async def _fill_auth():
            await page.locator("#email").fill(EMAIL)
            await page.locator("#password").fill(PASSWORD)
            return str(await auth.screenshot("03_auth_filled.png"))
        await run_step(report, "Fill sign-in form", _fill_auth)

        async def _submit():
            await page.get_by_role("button", name="Sign in", exact=True).click()
            await page.wait_for_url("**/dashboard**", timeout=20000)
            return str(await page.screenshot(path=str(SHOTS / "04_after_signin.png")))
        signed_in = await run_step(report, "Submit credentials → dashboard", _submit)

        if not signed_in:
            with open(RESULTS / "report.json", "w") as f:
                json.dump(report.as_dict(), f, indent=2)
            await browser.close()
            return 1

        # Skip onboarding path only if we're actually there
        if "/onboarding" in page.url:
            async def _onboard():
                await onboarding.create_org("StockFlow QA", f"stockflow-qa-{int(time.time())}")
                return str(await page.screenshot(path=str(SHOTS / "06_onboarding_filled.png")))
            await run_step(report, "Onboarding — create workspace", _onboard)

        async def _dashboard_shot():
            await page.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle", timeout=10000)
            return str(await page.screenshot(path=str(SHOTS / "07_dashboard.png")))
        await run_step(report, "Dashboard renders", _dashboard_shot)

        print("→ Authenticated modules")
        for path, title, shot_name in MODULES:
            async def _visit(p=path, t=title, s=shot_name):
                mod = ModulePage(page, SHOTS, p, t)
                await mod.goto()
                await asyncio.sleep(0.8)  # let query settle
                return str(await page.screenshot(path=str(SHOTS / s)))
            await run_step(report, f"Module: {title}", _visit)

        print("→ Sign out")

        async def _signout():
            # Sign out via Supabase then reload
            await page.evaluate("async () => { try { const { supabase } = await import('/src/integrations/supabase/client.ts'); await supabase.auth.signOut(); } catch(_){} localStorage.clear(); }")
            await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
            return str(await page.screenshot(path=str(SHOTS / "20_signed_out.png")))
        await run_step(report, "Sign out and land on public home", _signout)

        await browser.close()

    out = report.as_dict()
    (RESULTS / "report.json").write_text(json.dumps(out, indent=2))
    print(f"\nSummary: {out['passed']}/{out['total']} passed, {out['failed']} failed")
    return 0 if out["failed"] == 0 else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
