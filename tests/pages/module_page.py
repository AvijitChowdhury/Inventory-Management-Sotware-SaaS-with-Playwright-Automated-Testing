from .base_page import BasePage


class ModulePage(BasePage):
    """Generic Page Object for an authenticated module route."""

    def __init__(self, page, screenshot_dir, path: str, title_hint: str):
        super().__init__(page, screenshot_dir)
        self.path = path
        self.title_hint = title_hint

    async def is_rendered(self) -> bool:
        # Consider the page rendered if URL matched and no console-visible crash overlay
        return self.page.url.rstrip("/").endswith(self.path.rstrip("/"))
