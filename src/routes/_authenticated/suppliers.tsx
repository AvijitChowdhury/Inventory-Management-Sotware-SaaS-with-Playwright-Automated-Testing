import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: () => (
    <ComingSoon title="Suppliers" description="Supplier directory and purchase history." phase={3} />
  ),
});
