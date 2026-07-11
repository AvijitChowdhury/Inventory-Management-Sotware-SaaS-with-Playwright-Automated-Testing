import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, Package, AlertTriangle, ShoppingCart, ClipboardList, TrendingUp } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { useOrganizations } from "@/hooks/use-organizations";
import { getReportSummary } from "@/lib/reports.functions";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => (
    <AppShell>
      <ReportsPage />
    </AppShell>
  ),
});

function ReportsPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const currency = currentOrg?.currency ?? "USD";
  const summary = useServerFn(getReportSummary);
  const { data, isLoading } = useQuery({
    queryKey: ["report-summary", orgId],
    queryFn: () => summary({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Reports"
        description="Inventory value, low stock, and order performance at a glance."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title="Stock value"
          value={data ? formatMoney(data.stockValue, currency) : "—"}
          hint={data ? `${data.totalUnits} units on hand` : ""}
          icon={DollarSign}
        />
        <Kpi
          title="Products"
          value={data ? String(data.productCount) : "—"}
          hint="Active SKUs"
          icon={Package}
        />
        <Kpi
          title="Low-stock alerts"
          value={data ? String(data.lowStock) : "—"}
          hint="At or below reorder point"
          icon={AlertTriangle}
        />
        <Kpi
          title="Open POs"
          value={data ? String(data.openPOs) : "—"}
          hint={data ? formatMoney(data.poValue, currency) + " lifetime" : ""}
          icon={ClipboardList}
        />
        <Kpi
          title="Sales this month"
          value={data ? formatMoney(data.salesThisMonth, currency) : "—"}
          hint={data ? formatMoney(data.salesValue, currency) + " lifetime" : ""}
          icon={ShoppingCart}
        />
        <Kpi
          title="Turnover indicator"
          value={
            data && data.stockValue > 0
              ? `${(data.salesValue / data.stockValue).toFixed(2)}x`
              : "—"
          }
          hint="Lifetime sales ÷ stock value"
          icon={TrendingUp}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Top products by stock value</h2>
        <DataTable<any>
          isLoading={isLoading}
          rows={((data?.topProducts ?? []) as any[]).map((p, i) => ({ ...p, id: String(i) }))}
          columns={[
            { key: "sku", label: "SKU" },
            { key: "name", label: "Product" },
            { key: "qty", label: "On hand" },
            {
              key: "value",
              label: "Stock value",
              render: (r) => formatMoney(Number(r.value), currency),
            },
          ]}
          emptyLabel="No inventory yet."
        />
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
