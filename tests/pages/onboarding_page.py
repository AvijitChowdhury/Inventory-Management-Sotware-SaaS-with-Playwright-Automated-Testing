from .base_page import BasePage


class OnboardingPage(BasePage):
    path = "/onboarding"

    async def create_org(self, name: str, slug: str) -> None:
        # Onboarding form uses text-labelled inputs
        name_input = self.page.get_by_label("Organization name", exact=False)
        slug_input = self.page.get_by_label("Slug", exact=False)
        await name_input.fill(name)
        await slug_input.fill(slug)
        await self.page.get_by_role("button", name="Create workspace", exact=False).click()
