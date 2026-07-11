import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnyClient = { from: (t: string) => any };
const orgOnly = z.object({ organizationId: z.string().uuid() });

export const getOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: row, error } = await c
      .from("organizations")
      .select("id, name, slug, currency, logo_url")
      .eq("id", data.organizationId)
      .single();
    if (error) throw new Error(error.message);
    return row as any;
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(2).max(100),
        currency: z.string().min(3).max(6),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c
      .from("organizations")
      .update({ name: data.name, currency: data.currency })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("organization_members")
      .select("id, role, status, user_id, created_at, profiles!organization_members_user_id_fkey(email, full_name)")
      .eq("organization_id", data.organizationId);
    if (error) {
      // profiles FK may not exist, fall back
      const { data: rows2, error: e2 } = await c
        .from("organization_members")
        .select("id, role, status, user_id, created_at")
        .eq("organization_id", data.organizationId);
      if (e2) throw new Error(e2.message);
      return (rows2 as any[]).map((r) => ({
        ...r,
        email: null,
        full_name: null,
      }));
    }
    return (rows as any[]).map((r) => ({
      ...r,
      email: r.profiles?.email ?? null,
      full_name: r.profiles?.full_name ?? null,
    }));
  });
