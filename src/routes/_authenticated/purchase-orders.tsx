import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  component: () => (
    <ComingSoon
      title="Purchase Orders"
      description="Draft, submit, and receive purchase orders."
      phase={5}
    />
  ),
});
