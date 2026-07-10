import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/categories")({
  component: () => (
    <ComingSoon title="Categories" description="Organize your catalog into hierarchies." phase={2} />
  ),
});
