import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/sales-orders")({
  component: () => (
    <ComingSoon
      title="Sales Orders"
      description="Draft, confirm, and fulfill sales orders for your customers."
      phase={6}
    />
  ),
});
