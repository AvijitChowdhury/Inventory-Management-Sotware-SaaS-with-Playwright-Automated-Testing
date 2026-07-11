"""CRUD end-to-end coverage — create/verify/delete against real UI.

Each test signs in as the admin, opens a module, creates a row with a
unique suffix, asserts it appears in the table, deletes it, and asserts
it's gone. Native browser confirm() dialogs are auto-accepted.
"""
from __future__ import annotations

import time
import uuid
from pathlib import Path

import allure
import pytest
from playwright.sync_api import Page, expect, sync_playwright

BASE_URL = "http://localhost:8080"
ADMIN_EMAIL = "abhichy30@gmail.com"
ADMIN_PASSWORD = "12345678"

SHOTS = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)


def _shot(page: Page, name: str) -> None:
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path))
    allure.attach.file(str(path), name=name, attachment_type=allure.attachment_type.PNG)


@pytest.fixture(scope="module")
def ctx():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        c = browser.new_context(viewport={"width": 1280, "height": 1600})
        # auto-accept native confirm() dialogs
        c.on("page", lambda pg: pg.on("dialog", lambda d: d.accept()))
        yield c
        c.close()
        browser.close()


@pytest.fixture()
def page(ctx):
    pg = ctx.new_page()
    _sign_in(pg)
    yield pg
    pg.close()


def _sign_in(page: Page) -> None:
    page.goto(f"{BASE_URL}/auth", wait_until="networkidle")
    if "/auth" not in page.url:
        return
    page.get_by_label("Email").fill(ADMIN_EMAIL)
    page.get_by_label("Password").fill(ADMIN_PASSWORD)
    page.get_by_role("button", name="Sign in", exact=True).click()
    for _ in range(60):
        if "/auth" not in page.url:
            break
        time.sleep(0.25)


def _open_module(page: Page, path: str) -> None:
    page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    page.wait_for_load_state("networkidle", timeout=8000)


def _wait_dialog_closed(page: Page) -> None:
    for _ in range(40):
        if page.get_by_role("dialog").count() == 0:
            return
        time.sleep(0.1)


def _delete_row(page: Page, name: str) -> None:
    """Find the row containing `name` and click its trash button."""
    row = page.locator("tr", has_text=name).first
    row.wait_for(state="visible", timeout=5000)
    # Trash button is the last icon-button in the row's action cell
    buttons = row.locator("button")
    buttons.nth(buttons.count() - 1).click()
    time.sleep(1.0)


# --------------------------- CATEGORIES ---------------------------

@allure.feature("CRUD")
@allure.story("Categories: create and delete")
def test_categories_crud(page: Page):
    suffix = uuid.uuid4().hex[:6]
    name = f"QA-Category-{suffix}"
    _open_module(page, "/categories")

    page.get_by_role("button", name="New category").click()
    dlg = page.get_by_role("dialog")
    dlg.get_by_label("Name").fill(name)
    _shot(page, f"40_categories_created_form_{suffix}")
    dlg.get_by_role("button", name="Save").click()
    _wait_dialog_closed(page)

    expect(page.get_by_text(name).first).to_be_visible(timeout=6000)
    _shot(page, f"40_categories_created_{suffix}")

    _delete_row(page, name)
    time.sleep(1.0)
    expect(page.get_by_text(name)).to_have_count(0)
    _shot(page, f"41_categories_deleted_{suffix}")


# --------------------------- SUPPLIERS ---------------------------

@allure.feature("CRUD")
@allure.story("Suppliers: create and delete")
def test_suppliers_crud(page: Page):
    suffix = uuid.uuid4().hex[:6]
    name = f"QA-Supplier-{suffix}"
    _open_module(page, "/suppliers")

    page.get_by_role("button", name="New supplier").click()
    dlg = page.get_by_role("dialog")
    dlg.get_by_label("Company name").fill(name)
    _shot(page, f"42_suppliers_form_{suffix}")
    dlg.get_by_role("button", name="Save").click()
    _wait_dialog_closed(page)

    expect(page.get_by_text(name).first).to_be_visible(timeout=6000)
    _shot(page, f"42_suppliers_created_{suffix}")

    _delete_row(page, name)
    expect(page.get_by_text(name)).to_have_count(0)
    _shot(page, f"43_suppliers_deleted_{suffix}")


# --------------------------- CUSTOMERS ---------------------------

@allure.feature("CRUD")
@allure.story("Customers: create and delete")
def test_customers_crud(page: Page):
    suffix = uuid.uuid4().hex[:6]
    name = f"QA-Customer-{suffix}"
    _open_module(page, "/customers")

    page.get_by_role("button", name="New customer").click()
    dlg = page.get_by_role("dialog")
    dlg.get_by_label("Name").first.fill(name)
    _shot(page, f"44_customers_form_{suffix}")
    dlg.get_by_role("button", name="Save").click()
    _wait_dialog_closed(page)

    expect(page.get_by_text(name).first).to_be_visible(timeout=6000)
    _shot(page, f"44_customers_created_{suffix}")

    _delete_row(page, name)
    expect(page.get_by_text(name)).to_have_count(0)
    _shot(page, f"45_customers_deleted_{suffix}")


# --------------------------- PRODUCTS ---------------------------

@allure.feature("CRUD")
@allure.story("Products: create with SKU + name and delete")
def test_products_crud(page: Page):
    suffix = uuid.uuid4().hex[:6]
    sku = f"QA-SKU-{suffix}"
    name = f"QA-Product-{suffix}"
    _open_module(page, "/products")

    page.get_by_role("button", name="New product").click()
    dlg = page.get_by_role("dialog")
    dlg.get_by_label("SKU").fill(sku)
    dlg.get_by_label("Name").fill(name)
    _shot(page, f"46_products_form_{suffix}")
    dlg.get_by_role("button", name="Save").click()
    _wait_dialog_closed(page)

    expect(page.get_by_text(name).first).to_be_visible(timeout=6000)
    _shot(page, f"46_products_created_{suffix}")

    _delete_row(page, name)
    expect(page.get_by_text(name)).to_have_count(0)
    _shot(page, f"47_products_deleted_{suffix}")


# --------------------------- SETTINGS ---------------------------

@allure.feature("CRUD")
@allure.story("Settings: organization name field is editable and persists")
def test_settings_org_name(page: Page):
    _open_module(page, "/settings")
    org_field = page.get_by_label("Organization name")
    expect(org_field).to_be_visible()
    original = org_field.input_value()
    suffix = uuid.uuid4().hex[:4]
    new_name = f"{original.split(' [QA')[0]} [QA {suffix}]"
    org_field.fill(new_name)
    _shot(page, f"48_settings_edit_{suffix}")
    page.get_by_role("button", name="Save changes").click()
    time.sleep(1.5)

    page.reload(wait_until="networkidle")
    expect(page.get_by_label("Organization name")).to_have_value(new_name, timeout=6000)
    _shot(page, f"48_settings_persisted_{suffix}")

    # restore
    page.get_by_label("Organization name").fill(original)
    page.get_by_role("button", name="Save changes").click()
    time.sleep(1.0)


# --------------------------- REPORTS / INVENTORY smoke ---------------------------

@allure.feature("CRUD")
@allure.story("Inventory page shows adjust-stock control")
def test_inventory_has_adjust(page: Page):
    _open_module(page, "/inventory")
    # Any button whose label mentions "Adjust" or "Stock"
    btns = page.get_by_role("button")
    labels = [btns.nth(i).inner_text() for i in range(btns.count())]
    assert any("adjust" in b.lower() or "stock" in b.lower() for b in labels), labels
    _shot(page, "49_inventory_controls")


@allure.feature("CRUD")
@allure.story("Reports page renders KPI section headings")
def test_reports_sections(page: Page):
    _open_module(page, "/reports")
    body = page.locator("body").inner_text().lower()
    assert any(k in body for k in ["revenue", "orders", "inventory", "stock", "top", "kpi"])
    _shot(page, "49_reports_sections")
