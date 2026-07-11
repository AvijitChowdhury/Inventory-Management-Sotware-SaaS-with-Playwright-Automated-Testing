import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, PackageCheck } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizations } from "@/hooks/use-organizations";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
} from "@/lib/orders.functions";
import { listSuppliers, listProducts } from "@/lib/catalog.functions";
import { listLocations } from "@/lib/inventory.functions";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  component: () => (
    <AppShell>
      <POPage />
    </AppShell>
  ),
});

type Line = { product_id: string; quantity: number; unit_price: number; tax_rate: number };

function POPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const currency = currentOrg?.currency ?? "USD";

  const list = useServerFn(listPurchaseOrders);
  const create = useServerFn(createPurchaseOrder);
  const receive = useServerFn(receivePurchaseOrder);
  const del = useServerFn(deletePurchaseOrder);
  const listSup = useServerFn(listSuppliers);
  const listLoc = useServerFn(listLocations);
  const listProd = useServerFn(listProducts);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["po", orgId],
    queryFn: () => list({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: () => listSup({ data: { organizationId: orgId! } }),
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

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const openNew = () => {
    setSupplierId((suppliers as any[])[0]?.id ?? "");
    setLocationId((locations as any[])[0]?.id ?? "");
    setPoNumber(`PO-${Date.now().toString().slice(-6)}`);
    setLines([]);
    setOpen(true);
  };

  const addLine = () => {
    const p = (products as any[])[0];
    if (!p) {
      toast.error("Add products first");
      return;
    }
    setLines([...lines, { product_id: p.id, quantity: 1, unit_price: Number(p.cost_price ?? 0), tax_rate: Number(p.tax_rate ?? 0) }]);
  };

  const submit = useMutation({
    mutationFn: () =>
      create({
        data: {
          organizationId: orgId!,
          supplier_id: supplierId,
          location_id: locationId,
          po_number: poNumber,
          items: lines,
        },
      }),
    onSuccess: () => {
      toast.success("Purchase order created");
      qc.invalidateQueries({ queryKey: ["po", orgId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receiveM = useMutation({
    mutationFn: (id: string) => receive({ data: { id } }),
    onSuccess: () => {
      toast.success("PO received; stock updated");
      qc.invalidateQueries({ queryKey: ["po", orgId] });
      qc.invalidateQueries({ queryKey: ["inventory", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Draft PO deleted");
      qc.invalidateQueries({ queryKey: ["po", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Purchase orders"
        description="Order stock from suppliers and record receipts."
        action={
          <Button onClick={openNew} disabled={(suppliers as any[]).length === 0 || (locations as any[]).length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        }
      />

      <DataTable<any>
        isLoading={isLoading}
        rows={rows as any[]}
        columns={[
          { key: "po_number", label: "PO #" },
          { key: "supplier_name", label: "Supplier" },
          { key: "location_name", label: "Location" },
          { key: "order_date", label: "Ordered" },
          {
            key: "status",
            label: "Status",
            render: (r: any) => (
              <Badge variant={r.status === "received" ? "default" : "secondary"}>{r.status}</Badge>
            ),
          },
          { key: "total", label: "Total", render: (r: any) => formatMoney(Number(r.total ?? 0), currency) },
        ]}
        actions={(row: any) => (
          <div className="flex justify-end gap-2">
            {row.status === "draft" && (
              <>
                <Button size="sm" onClick={() => receiveM.mutate(row.id)}>
                  <PackageCheck className="mr-1 h-4 w-4" /> Receive
                </Button>
                <Button size="sm" variant="ghost" onClick={() => confirm("Delete draft?") && removeM.mutate(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
        emptyLabel="No purchase orders yet."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (lines.length === 0) {
                toast.error("Add at least one line");
                return;
              }
              submit.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>PO number</Label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(suppliers as any[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ship to</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(locations as any[]).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-1 h-4 w-4" /> Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.length === 0 && (
                  <p className="text-sm text-muted-foreground">No lines. Click "Add line".</p>
                )}
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-6">
                      <Select
                        value={line.product_id}
                        onValueChange={(v) => {
                          const p = (products as any[]).find((x) => x.id === v);
                          const next = [...lines];
                          next[i] = { ...line, product_id: v, unit_price: Number(p?.cost_price ?? line.unit_price) };
                          setLines(next);
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(products as any[]).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min={1}
                        value={line.quantity}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i] = { ...line, quantity: Number(e.target.value) };
                          setLines(next);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number" step="0.01" min={0}
                        value={line.unit_price}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i] = { ...line, unit_price: Number(e.target.value) };
                          setLines(next);
                        }}
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submit.isPending || !supplierId || !locationId}>
                {submit.isPending ? "Creating…" : "Create PO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
