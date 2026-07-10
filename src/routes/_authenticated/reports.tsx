import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => (
    <ComingSoon
      title="Reports"
      description="Low-stock, inventory valuation, sales summary, top products."
      phase={7}
    />
  ),
});
