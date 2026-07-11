"""End-to-end Playwright test suite for StockFlow.

Runs against the local Vite dev server at http://localhost:8080 and
captures a screenshot per step. Screenshots are copied into
`docs/screenshots/` and are also embedded into the Allure report.

Usage:
    pytest tests/test_e2e.py --alluredir=allure-results
    allure generate allure-results -o allure-report --clean
"""
from __future__ import annotations

import os
import time
import uuid
from pathlib import Path

import allure
import pytest
from playwright.sync_api import Page, expect, sync_playwright

BASE_URL = os.environ.get("STOCKFLOW_BASE_URL", "http://localhost:8080")
ADMIN_EMAIL = "abhichy30@gmail.com"
ADMIN_PASSWORD = "12345678"

SCREENSHOT_DIR = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def _shot(page: Page, name: str) -> Path:
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path))
    allure.attach.file(str(path), name=name, attachment_type=allure.attachment_type.PNG)
    return path


@pytest.fixture(scope="session")
def browser_ctx():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1600})
        yield context
        context.close()
        browser.close()


@pytest.fixture()
def page(browser_ctx):
    page = browser_ctx.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    yield page
    if errors:
        allure.attach("\n".join(errors), name="page-errors", attachment_type=allure.attachment_type.TEXT)
    page.close()


@allure.feature("Marketing")
@allure.story("Landing page renders")
def test_landing_page(page: Page):
    page.goto(BASE_URL, wait_until="networkidle")
    expect(page.get_by_role("heading", level=1)).to_be_visible()
    _shot(page, "01_landing")


@allure.feature("Auth")
@allure.story("Sign-in form renders")
def test_auth_page(page: Page):
    page.goto(f"{BASE_URL}/auth", wait_until="networkidle")
    expect(page.get_by_role("tab", name="Sign in")).to_be_visible()
    expect(page.get_by_role("tab", name="Sign up")).to_be_visible()
    _shot(page, "02_auth")


@allure.feature("Auth")
@allure.story("Admin can sign in with email + password")
def test_admin_sign_in(page: Page):
    page.goto(f"{BASE_URL}/auth", wait_until="networkidle")
    page.get_by_label("Email").fill(ADMIN_EMAIL)
    page.get_by_label("Password").fill(ADMIN_PASSWORD)
    _shot(page, "03_auth_filled")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(lambda u: "/auth" not in u, timeout=15000)
    _shot(page, "04_after_signin")


@allure.feature("Onboarding")
@allure.story("Signed-in user reaches onboarding or dashboard")
def test_post_signin_flow(page: Page):
    _sign_in(page)
    # After sign-in we should either land on /onboarding or /dashboard
    page.wait_for_load_state("networkidle")
    url = page.url
    assert "/onboarding" in url or "/dashboard" in url, f"Unexpected url {url}"
    _shot(page, "05_post_signin_route")

    if "/onboarding" in url:
        org_name = f"Acme QA {uuid.uuid4().hex[:6]}"
        page.get_by_label("Company name").fill(org_name)
        _shot(page, "06_onboarding_filled")
        page.get_by_role("button", name="Create organization").click()
        page.wait_for_url("**/dashboard", timeout=15000)

    expect(page).to_have_url(f"{BASE_URL}/dashboard")
    _shot(page, "07_dashboard")


@allure.feature("App shell")
@allure.story("All primary navigation routes render")
@pytest.mark.parametrize(
    "path,label",
    [
        ("/dashboard", "dashboard"),
        ("/products", "products"),
        ("/inventory", "inventory"),
        ("/categories", "categories"),
        ("/suppliers", "suppliers"),
        ("/customers", "customers"),
        ("/purchase-orders", "purchase_orders"),
        ("/sales-orders", "sales_orders"),
        ("/reports", "reports"),
        ("/settings", "settings"),
    ],
)
def test_navigation(page: Page, path: str, label: str):
    _sign_in(page)
    page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    # Sidebar should be visible on every authed route
    expect(page.locator("aside, [data-sidebar='sidebar']").first).to_be_visible()
    _shot(page, f"10_route_{label}")


@allure.feature("Auth")
@allure.story("Sign out clears session and returns to /auth")
def test_sign_out(page: Page):
    _sign_in(page)
    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    page.get_by_role("button", name="Account").click()
    page.get_by_role("menuitem", name="Sign out").click()
    page.wait_for_url("**/auth", timeout=10000)
    _shot(page, "20_signed_out")


# ----------------------- helpers -----------------------

def _sign_in(page: Page) -> None:
    page.goto(f"{BASE_URL}/auth", wait_until="networkidle")
    if "/auth" not in page.url:
        return
    page.get_by_label("Email").fill(ADMIN_EMAIL)
    page.get_by_label("Password").fill(ADMIN_PASSWORD)
    page.get_by_role("button", name="Sign in").click()
    for _ in range(60):
        if "/auth" not in page.url:
            break
        time.sleep(0.25)
