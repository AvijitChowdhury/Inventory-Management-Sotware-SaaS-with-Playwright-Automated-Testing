import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => (
    <ComingSoon
      title="Settings"
      description="Team, roles, locations, org profile, and preferences."
      phase={8}
    />
  ),
});
