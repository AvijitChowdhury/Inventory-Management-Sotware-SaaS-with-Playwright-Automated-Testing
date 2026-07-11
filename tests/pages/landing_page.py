from .base_page import BasePage


class LandingPage(BasePage):
    path = "/"

    async def go_to_sign_in(self) -> None:
        await self.page.get_by_role("link", name="Sign in", exact=False).first.click()
