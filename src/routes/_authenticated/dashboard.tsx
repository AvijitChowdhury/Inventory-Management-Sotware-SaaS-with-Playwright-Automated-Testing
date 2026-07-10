import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Truck,
  Users,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganizations } from "@/hooks/use-organizations";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { currentOrg } = useOrganizations();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome${currentOrg ? `, ${currentOrg.name}` : ""}`}
        description="Your inventory at a glance."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Stock value" value="—" icon={DollarSign} hint="Set up products to see" />
        <KpiCard title="Low stock items" value="0" icon={AlertTriangle} hint="No alerts" />
        <KpiCard title="Open POs" value="0" icon={ClipboardList} hint="No draft orders" />
        <KpiCard title="Sales this month" value="—" icon={ShoppingCart} hint="No sales yet" />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Get started</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ChecklistItem
            title="Add your first product"
            body="Create a product with SKU, cost, and selling price."
            to="/products"
          />
          <ChecklistItem
            title="Add a supplier"
            body="You'll need at least one supplier to create purchase orders."
            to="/suppliers"
          />
          <ChecklistItem
            title="Invite a teammate"
            body="Add your operations team as managers or staff."
            to="/settings"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({
  title,
  body,
  to,
}: {
  title: string;
  body: string;
  to: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-4">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
      <Button variant="outline" asChild>
        <Link to={to}>
          Open
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

// suppress unused imports warning
void Package;
void Truck;
void Users;
