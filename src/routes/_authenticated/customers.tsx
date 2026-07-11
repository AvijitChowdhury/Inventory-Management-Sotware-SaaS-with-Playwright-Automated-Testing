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
import { listCustomers, upsertCustomer, deleteCustomer } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/customers")({
  component: () => (
    <AppShell>
      <CustomersPage />
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
  customer_type: string;
  is_active: boolean;
};

function CustomersPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const list = useServerFn(listCustomers);
  const upsert = useServerFn(upsertCustomer);
  const del = useServerFn(deleteCustomer);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["customers", orgId],
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
    customer_type: "retail" as "retail" | "wholesale",
    is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      customer_type: "retail",
      is_active: true,
    });
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
      customer_type: (r.customer_type as "retail" | "wholesale") ?? "retail",
      is_active: r.is_active,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      upsert({ data: { organizationId: orgId!, id: editing?.id, ...form } }),
    onSuccess: () => {
      toast.success(editing ? "Customer updated" : "Customer added");
      qc.invalidateQueries({ queryKey: ["customers", orgId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Customers"
        description="Customer directory and sales history."
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New customer
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
            key: "customer_type",
            label: "Type",
            render: (r) => <Badge variant="secondary">{r.customer_type}</Badge>,
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
        emptyLabel="No customers yet."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.customer_type}
                onValueChange={(v) => setForm({ ...form, customer_type: v as "retail" | "wholesale" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
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
