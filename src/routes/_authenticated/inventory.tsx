import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: () => (
    <ComingSoon
      title="Inventory"
      description="Per-location stock, adjustments, transfers, and full ledger."
      phase={4}
    />
  ),
});
