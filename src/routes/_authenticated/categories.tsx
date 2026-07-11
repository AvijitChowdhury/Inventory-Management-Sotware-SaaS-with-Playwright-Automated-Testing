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
import { useOrganizations } from "@/hooks/use-organizations";
import { listCategories, upsertCategory, deleteCategory } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/categories")({
  component: () => (
    <AppShell>
      <CategoriesPage />
    </AppShell>
  ),
});

type Cat = { id: string; name: string; description: string | null; parent_id: string | null; created_at: string };

function CategoriesPage() {
  const { currentOrg } = useOrganizations();
  const orgId = currentOrg?.id;
  const list = useServerFn(listCategories);
  const upsert = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: () => list({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };
  const openEdit = (row: Cat) => {
    setEditing(row);
    setName(row.name);
    setDescription(row.description ?? "");
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          organizationId: orgId!,
          id: editing?.id,
          name,
          description: description || null,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category added");
      qc.invalidateQueries({ queryKey: ["categories", orgId] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Categories"
        description="Organize your catalog into hierarchies."
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New category
          </Button>
        }
      />

      <DataTable<Cat>
        isLoading={isLoading}
        rows={data as Cat[]}
        columns={[
          { key: "name", label: "Name" },
          { key: "description", label: "Description", render: (r) => r.description ?? <span className="text-muted-foreground">—</span> },
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
        emptyLabel="No categories yet. Create your first one."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter>
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
