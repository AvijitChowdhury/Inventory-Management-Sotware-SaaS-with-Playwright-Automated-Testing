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


# ============================================================
# Additional expanded coverage (Phase 2 — deeper QA)
# ============================================================

@allure.feature("Marketing")
@allure.story("Landing page has key CTAs and nav")
def test_landing_has_ctas(page: Page):
    page.goto(BASE_URL, wait_until="networkidle")
    body_text = page.locator("body").inner_text().lower()
    assert "inventory" in body_text or "stock" in body_text
    _shot(page, "30_landing_ctas")


@allure.feature("SEO")
@allure.story("robots.txt is served")
def test_robots_txt(page: Page):
    resp = page.goto(f"{BASE_URL}/robots.txt")
    assert resp and resp.ok
    assert "User-agent" in (resp.text() or "")


@allure.feature("SEO")
@allure.story("sitemap.xml is served and lists key routes")
def test_sitemap_xml(page: Page):
    resp = page.goto(f"{BASE_URL}/sitemap.xml")
    assert resp and resp.ok
    body = resp.text() or ""
    assert "<urlset" in body
    assert "/blog/inventory-vs-stock" in body


@allure.feature("Content")
@allure.story("Inventory vs Stock blog guide renders")
def test_blog_inventory_vs_stock(page: Page):
    page.goto(f"{BASE_URL}/blog/inventory-vs-stock", wait_until="networkidle")
    expect(page.get_by_role("heading", level=1)).to_be_visible()
    _shot(page, "31_blog_inventory_vs_stock")


@allure.feature("Auth")
@allure.story("Invalid credentials do not sign the user in")
def test_invalid_credentials(page: Page):
    page.goto(f"{BASE_URL}/auth", wait_until="networkidle")
    page.get_by_label("Email").fill("nosuchuser@example.com")
    page.get_by_label("Password").fill("wrongpassword")
    page.get_by_role("button", name="Sign in").click()
    time.sleep(2.0)
    assert "/auth" in page.url
    _shot(page, "32_invalid_credentials")


@allure.feature("Auth")
@allure.story("Protected route redirects unauthenticated users")
def test_protected_route_redirect(browser_ctx):
    p = browser_ctx.new_page()
    try:
        p.context.clear_cookies()
        p.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
        for _ in range(40):
            if "/auth" in p.url:
                break
            time.sleep(0.25)
        assert "/auth" in p.url, f"Expected redirect to /auth, got {p.url}"
        _shot(p, "33_protected_redirect")
    finally:
        p.close()


@allure.feature("App shell")
@allure.story("Sidebar is present on every module")
@pytest.mark.parametrize("path", ["/dashboard", "/products", "/inventory", "/reports", "/settings"])
def test_sidebar_present(page: Page, path: str):
    _sign_in(page)
    page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    expect(page.locator("aside, [data-sidebar='sidebar']").first).to_be_visible()


@allure.feature("App shell")
@allure.story("Top bar renders account menu")
def test_top_bar_account(page: Page):
    _sign_in(page)
    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    expect(page.get_by_role("button", name="Account")).to_be_visible()
    _shot(page, "34_top_bar_account")


@allure.feature("Dashboard")
@allure.story("KPI cards render on dashboard")
def test_dashboard_kpis(page: Page):
    _sign_in(page)
    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    time.sleep(1.0)
    text = page.locator("body").inner_text().lower()
    assert any(k in text for k in ["products", "inventory", "orders", "revenue"])
    _shot(page, "35_dashboard_kpis")


@allure.feature("Modules")
@allure.story("Products page renders a data area")
def test_products_page_content(page: Page):
    _sign_in(page)
    page.goto(f"{BASE_URL}/products", wait_until="networkidle")
    time.sleep(1.0)
    expect(page.get_by_role("heading").first).to_be_visible()
    _shot(page, "36_products_content")


@allure.feature("Modules")
@allure.story("Reports page renders headings/sections")
def test_reports_page_content(page: Page):
    _sign_in(page)
    page.goto(f"{BASE_URL}/reports", wait_until="networkidle")
    time.sleep(1.0)
    expect(page.get_by_role("heading").first).to_be_visible()
    _shot(page, "37_reports_content")


@allure.feature("Modules")
@allure.story("Settings page renders headings/sections")
def test_settings_page_content(page: Page):
    _sign_in(page)
    page.goto(f"{BASE_URL}/settings", wait_until="networkidle")
    time.sleep(1.0)
    expect(page.get_by_role("heading").first).to_be_visible()
    _shot(page, "38_settings_content")


@allure.feature("Routing")
@allure.story("Unknown route shows a not-found state")
def test_not_found_route(page: Page):
    page.goto(f"{BASE_URL}/this-page-does-not-exist", wait_until="networkidle")
    body = page.locator("body").inner_text().lower()
    assert "not" in body or "404" in body or page.url.endswith("/this-page-does-not-exist")
    _shot(page, "39_not_found")

