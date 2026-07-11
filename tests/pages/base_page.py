"""Base Page Object — common Playwright interactions."""
from __future__ import annotations

from pathlib import Path
from playwright.async_api import Page

BASE_URL = "http://localhost:8080"


class BasePage:
    """Root Page Object. All pages extend this."""

    path: str = "/"

    def __init__(self, page: Page, screenshot_dir: Path):
        self.page = page
        self.screenshot_dir = screenshot_dir
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

    @property
    def url(self) -> str:
        return f"{BASE_URL}{self.path}"

    async def goto(self, wait: str = "networkidle") -> None:
        await self.page.goto(self.url, wait_until="domcontentloaded")
        try:
            await self.page.wait_for_load_state(wait, timeout=8000)
        except Exception:
            pass

    async def screenshot(self, name: str) -> Path:
        target = self.screenshot_dir / name
        await self.page.screenshot(path=str(target))
        return target

    async def current_url(self) -> str:
        return self.page.url

    async def has_text(self, text: str, timeout: int = 5000) -> bool:
        try:
            await self.page.get_by_text(text, exact=False).first.wait_for(timeout=timeout)
            return True
        except Exception:
            return False
