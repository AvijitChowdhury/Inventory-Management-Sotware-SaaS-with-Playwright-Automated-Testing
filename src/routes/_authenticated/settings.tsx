import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganizations } from "@/hooks/use-organizations";
import { getOrganization, updateOrganization, listMembers } from "@/lib/settings.functions";
import { listLocations, upsertLocation } from "@/lib/inventory.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

function SettingsPage() {
  const { currentOrg, refetch } = useOrganizations();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const getOrg = useServerFn(getOrganization);
  const updateOrg = useServerFn(updateOrganization);
  const listMem = useServerFn(listMembers);
  const listLoc = useServerFn(listLocations);
  const upsertLoc = useServerFn(upsertLocation);

  const { data: org } = useQuery({
    queryKey: ["org", orgId],
    queryFn: () => getOrg({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => listMem({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: () => listLoc({ data: { organizationId: orgId! } }),
    enabled: !!orgId,
  });

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    if (org) {
      setName(org.name);
      setCurrency(org.currency ?? "USD");
    }
  }, [org]);

  const saveOrg = useMutation({
    mutationFn: () => updateOrg({ data: { id: orgId!, name, currency } }),
    onSuccess: () => {
      toast.success("Workspace updated");
      qc.invalidateQueries({ queryKey: ["org", orgId] });
      qc.invalidateQueries({ queryKey: ["my-organizations"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [locOpen, setLocOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<any>(null);
  const [locForm, setLocForm] = useState({
    name: "",
    code: "",
    address_line1: "",
    city: "",
    state: "",
    is_default: false,
    is_active: true,
  });
  const openNewLoc = () => {
    setEditLoc(null);
    setLocForm({ name: "", code: "", address_line1: "", city: "", state: "", is_default: false, is_active: true });
    setLocOpen(true);
  };
  const openEditLoc = (l: any) => {
    setEditLoc(l);
    setLocForm({
      name: l.name,
      code: l.code,
      address_line1: l.address_line1 ?? "",
      city: l.city ?? "",
      state: l.state ?? "",
      is_default: l.is_default,
      is_active: l.is_active,
    });
    setLocOpen(true);
  };
  const saveLoc = useMutation({
    mutationFn: () =>
      upsertLoc({ data: { organizationId: orgId!, id: editLoc?.id, ...locForm } }),
    onSuccess: () => {
      toast.success(editLoc ? "Location updated" : "Location added");
      qc.invalidateQueries({ queryKey: ["locations", orgId] });
      setLocOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Workspace, locations, and team." />

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveOrg.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={4} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saveOrg.isPending}>
                {saveOrg.isPending ? "Saving…" : "Save workspace"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Locations</CardTitle>
          <Button size="sm" onClick={openNewLoc}>
            <Plus className="mr-2 h-4 w-4" />
            New location
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable<any>
            rows={locations as any[]}
            columns={[
              { key: "name", label: "Name" },
              { key: "code", label: "Code" },
              { key: "city", label: "City", render: (r) => r.city ?? "—" },
              {
                key: "is_default",
                label: "Default",
                render: (r) => (r.is_default ? <Badge>Default</Badge> : "—"),
              },
              {
                key: "is_active",
                label: "Status",
                render: (r) => (r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>),
              },
            ]}
            actions={(l) => (
              <Button size="sm" variant="ghost" onClick={() => openEditLoc(l)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            emptyLabel="No locations yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<any>
            rows={(members as any[]).map((m) => ({ ...m, id: m.id }))}
            columns={[
              { key: "full_name", label: "Name", render: (r) => r.full_name ?? "—" },
              { key: "email", label: "Email", render: (r) => r.email ?? "—" },
              {
                key: "role",
                label: "Role",
                render: (r) => <Badge variant="secondary">{r.role}</Badge>,
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge>{r.status}</Badge>,
              },
            ]}
            emptyLabel="No members."
          />
        </CardContent>
      </Card>

      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editLoc ? "Edit location" : "New location"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveLoc.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input required value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input required value={locForm.code} onChange={(e) => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input value={locForm.address_line1} onChange={(e) => setLocForm({ ...locForm, address_line1: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={locForm.city} onChange={(e) => setLocForm({ ...locForm, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={locForm.state} onChange={(e) => setLocForm({ ...locForm, state: e.target.value })} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={saveLoc.isPending}>
                {saveLoc.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
