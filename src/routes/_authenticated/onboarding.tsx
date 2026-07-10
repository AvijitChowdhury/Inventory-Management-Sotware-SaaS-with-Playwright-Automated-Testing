import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Boxes } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  OrganizationProvider,
  useOrganizations,
} from "@/hooks/use-organizations";
import { createOrganization } from "@/lib/organizations.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingRoute,
});

function OnboardingRoute() {
  return (
    <OrganizationProvider>
      <OnboardingInner />
    </OrganizationProvider>
  );
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function OnboardingInner() {
  const { organizations, isLoading, refetch } = useOrganizations();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!isLoading && organizations.length > 0) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, organizations, navigate]);

  const create = useServerFn(createOrganization);
  const mutation = useMutation({
    mutationFn: (input: { name: string; slug: string }) => create({ data: input }),
    onSuccess: () => {
      toast.success("Organization created");
      refetch();
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight">StockFlow</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              This is your workspace. You'll be the owner and can invite teammates later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ name: name.trim(), slug: slug.trim() });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Company name</Label>
                <Input
                  id="name"
                  value={name}
                  required
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Acme Supplies"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Workspace URL</Label>
                <div className="flex overflow-hidden rounded-md border border-input">
                  <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground">
                    stockflow.app/
                  </span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    required
                    className="border-0 focus-visible:ring-0"
                    placeholder="acme-supplies"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create organization"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
