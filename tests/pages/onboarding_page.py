from .base_page import BasePage


class OnboardingPage(BasePage):
    path = "/onboarding"

    async def is_visible(self) -> bool:
        return "/onboarding" in self.page.url

    async def create_org(self, name: str, slug: str) -> None:
        await self.page.locator("#name").fill(name)
        await self.page.locator("#slug").fill(slug)
        await self.page.get_by_role("button", name="Create organization", exact=True).click()
        await self.page.wait_for_url("**/dashboard**", timeout=15000)
