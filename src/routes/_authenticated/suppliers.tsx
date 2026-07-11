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
import { useOrganizations } from "@/hooks/use-organizations";
import { listSuppliers, upsertSupplier, deleteSupplier } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: () => (
    <AppShell>
      <SuppliersPage />
    </AppShell>
  ),
});

type Row = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
};

function SuppliersPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const list = useServerFn(listSuppliers);
  const upsert = useServerFn(upsertSupplier);
  const del = useServerFn(deleteSupplier);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: () => list({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", contact_name: "", email: "", phone: "", address: "", notes: "", is_active: true });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      name: r.name,
      contact_name: r.contact_name ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      address: r.address ?? "",
      notes: "",
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
      toast.success(editing ? "Supplier updated" : "Supplier added");
      qc.invalidateQueries({ queryKey: ["suppliers", orgId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Supplier deleted");
      qc.invalidateQueries({ queryKey: ["suppliers", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Suppliers"
        description="Supplier directory and purchase contacts."
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New supplier
          </Button>
        }
      />

      <DataTable<Row>
        isLoading={isLoading}
        rows={data as Row[]}
        columns={[
          { key: "name", label: "Name" },
          { key: "contact_name", label: "Contact", render: (r) => r.contact_name ?? "—" },
          { key: "email", label: "Email", render: (r) => r.email ?? "—" },
          { key: "phone", label: "Phone", render: (r) => r.phone ?? "—" },
          {
            key: "is_active",
            label: "Status",
            render: (r) =>
              r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
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
        emptyLabel="No suppliers yet."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Company name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
