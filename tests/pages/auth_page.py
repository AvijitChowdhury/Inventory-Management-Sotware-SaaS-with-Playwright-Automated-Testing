from .base_page import BasePage


class AuthPage(BasePage):
    path = "/auth"

    async def sign_in(self, email: str, password: str) -> None:
        await self.page.locator("#email").fill(email)
        await self.page.locator("#password").fill(password)
        await self.page.get_by_role("button", name="Sign in", exact=True).click()

    async def wait_until_signed_in(self, timeout: int = 12000) -> None:
        await self.page.wait_for_url("**/dashboard**", timeout=timeout)
