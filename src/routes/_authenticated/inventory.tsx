import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpDown } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useOrganizations } from "@/hooks/use-organizations";
import {
  listInventory,
  listLocations,
  adjustInventory,
  listInventoryTransactions,
} from "@/lib/inventory.functions";
import { listProducts } from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: () => (
    <AppShell>
      <InventoryPage />
    </AppShell>
  ),
});

type InvRow = {
  id: string;
  product_id: string;
  location_id: string;
  sku: string;
  product_name: string;
  cost_price: number;
  reorder_point: number;
  location_name: string;
  location_code: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
};

function InventoryPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const currency = currentOrg?.currency ?? "USD";

  const listInv = useServerFn(listInventory);
  const listLoc = useServerFn(listLocations);
  const listProd = useServerFn(listProducts);
  const listTx = useServerFn(listInventoryTransactions);
  const adjust = useServerFn(adjustInventory);
  const qc = useQueryClient();

  const { data: inv = [], isLoading } = useQuery({
    queryKey: ["inventory", orgId],
    queryFn: () => listInv({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: () => listLoc({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: () => listProd({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["inv-tx", orgId],
    queryFn: () => listTx({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [delta, setDelta] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const openAdjust = () => {
    setProductId((products as any[])[0]?.id ?? "");
    setLocationId((locations as any[])[0]?.id ?? "");
    setDelta(0);
    setNotes("");
    setOpen(true);
  };

  const submit = useMutation({
    mutationFn: () =>
      adjust({
        data: {
          organizationId: orgId!,
          product_id: productId,
          location_id: locationId,
          quantity_change: delta,
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Inventory adjusted");
      qc.invalidateQueries({ queryKey: ["inventory", orgId] });
      qc.invalidateQueries({ queryKey: ["inv-tx", orgId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invRows = inv as InvRow[];
  const stats = useMemo(() => {
    const totalValue = invRows.reduce((a, r) => a + r.cost_price * r.quantity_on_hand, 0);
    const totalUnits = invRows.reduce((a, r) => a + r.quantity_on_hand, 0);
    const low = invRows.filter((r) => r.quantity_on_hand <= (r.reorder_point ?? 0)).length;
    return { totalValue, totalUnits, low };
  }, [invRows]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Inventory"
        description="Per-location stock and adjustments ledger."
        action={
          <Button onClick={openAdjust}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Adjust stock
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Stock value" value={formatMoney(stats.totalValue, currency)} />
        <Stat label="Total units on hand" value={String(stats.totalUnits)} />
        <Stat label="Low-stock slots" value={String(stats.low)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Stock by location</h2>
        <DataTable<InvRow>
          isLoading={isLoading}
          rows={invRows}
          columns={[
            { key: "sku", label: "SKU" },
            { key: "product_name", label: "Product" },
            { key: "location_name", label: "Location" },
            { key: "quantity_on_hand", label: "On hand" },
            { key: "quantity_reserved", label: "Reserved" },
            { key: "quantity_available", label: "Available" },
            {
              key: "status",
              label: "Status",
              render: (r) =>
                r.quantity_on_hand <= (r.reorder_point ?? 0) ? (
                  <Badge variant="destructive">Low</Badge>
                ) : (
                  <Badge>OK</Badge>
                ),
            },
          ]}
          emptyLabel="No stock yet. Adjust inventory or receive a purchase order."
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent transactions</h2>
        <DataTable
          rows={transactions as any[]}
          columns={[
            {
              key: "created_at",
              label: "When",
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
            { key: "transaction_type", label: "Type" },
            { key: "sku", label: "SKU" },
            { key: "product_name", label: "Product" },
            { key: "location_name", label: "Location" },
            { key: "quantity_change", label: "Qty" },
            { key: "notes", label: "Notes", render: (r) => r.notes ?? "—" },
          ]}
          emptyLabel="No inventory transactions yet."
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {(products as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {(locations as any[]).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity change (+/-)</Label>
              <Input
                type="number"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={submit.isPending || !productId || !locationId || delta === 0}>
                {submit.isPending ? "Saving…" : "Apply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
