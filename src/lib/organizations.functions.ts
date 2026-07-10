import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Types.ts is generated later — cast to any for now so the app builds against a fresh schema.
type AnyClient = { from: (t: string) => any; rpc: (name: string, args?: any) => any };

export const getMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = context.supabase as unknown as AnyClient;
    const { data, error } = await client
      .from("organization_members")
      .select("role, status, organizations(id, name, slug, logo_url, currency)")
      .eq("user_id", context.userId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[])
      .map((row) => {
        const org = row.organizations as
          | { id: string; name: string; slug: string; logo_url: string | null; currency: string }
          | null;
        if (!org) return null;
        return { ...org, role: row.role as string };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(2).max(100),
        slug: z
          .string()
          .min(2)
          .max(60)
          .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const client = context.supabase as unknown as AnyClient;
    const { data: orgId, error } = await client.rpc("create_organization_with_owner", {
      org_name: data.name,
      org_slug: data.slug,
    });
    if (error) throw new Error(error.message);
    return { organizationId: orgId as string };
  });
