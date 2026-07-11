import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizations } from "@/hooks/use-organizations";
import {
  listProducts,
  upsertProduct,
  deleteProduct,
  listCategories,
} from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  component: () => (
    <AppShell>
      <ProductsPage />
    </AppShell>
  ),
});

type Row = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  reorder_point: number;
  reorder_quantity: number;
  is_active: boolean;
  category_id: string | null;
  category_name: string | null;
};

function ProductsPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const currency = currentOrg?.currency ?? "USD";

  const list = useServerFn(listProducts);
  const listCats = useServerFn(listCategories);
  const upsert = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["products", orgId],
    queryFn: () => list({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: () => listCats({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    unit_of_measure: "each",
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    reorder_point: 0,
    reorder_quantity: 0,
    category_id: null as string | null,
    is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      sku: "",
      name: "",
      description: "",
      unit_of_measure: "each",
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      reorder_point: 0,
      reorder_quantity: 0,
      category_id: null,
      is_active: true,
    });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      sku: r.sku,
      name: r.name,
      description: r.description ?? "",
      unit_of_measure: r.unit_of_measure,
      cost_price: Number(r.cost_price),
      selling_price: Number(r.selling_price),
      tax_rate: Number(r.tax_rate),
      reorder_point: r.reorder_point,
      reorder_quantity: r.reorder_quantity,
      category_id: r.category_id,
      is_active: r.is_active,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          organizationId: orgId!,
          id: editing?.id,
          ...form,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      qc.invalidateQueries({ queryKey: ["products", orgId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Products"
        description="Your catalog with SKU, pricing, and reorder thresholds."
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Button>
        }
      />

      <DataTable<Row>
        isLoading={isLoading}
        rows={data as Row[]}
        columns={[
          { key: "sku", label: "SKU" },
          { key: "name", label: "Name" },
          { key: "category_name", label: "Category", render: (r) => r.category_name ?? "—" },
          { key: "cost_price", label: "Cost", render: (r) => formatMoney(Number(r.cost_price), currency) },
          { key: "selling_price", label: "Price", render: (r) => formatMoney(Number(r.selling_price), currency) },
          { key: "reorder_point", label: "Reorder pt", render: (r) => r.reorder_point },
          {
            key: "is_active",
            label: "Status",
            render: (r) => (r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>),
          },
        ]}
        actions={(row) => (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete ${row.name}?`)) remove.mutate(row.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        emptyLabel="No products yet. Add your first SKU."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {(categories as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit of measure</Label>
              <Input value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cost price</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling price</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax rate (%)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder point</Label>
              <Input
                type="number" min="0"
                value={form.reorder_point}
                onChange={(e) => setForm({ ...form, reorder_point: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder quantity</Label>
              <Input
                type="number" min="0"
                value={form.reorder_quantity}
                onChange={(e) => setForm({ ...form, reorder_quantity: Number(e.target.value) })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
