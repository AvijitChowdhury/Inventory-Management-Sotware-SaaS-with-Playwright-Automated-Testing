import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/products")({
  component: () => (
    <ComingSoon title="Products" description="Manage your catalog and product images." phase={2} />
  ),
});
