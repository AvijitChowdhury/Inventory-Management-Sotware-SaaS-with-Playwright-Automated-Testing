import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnyClient = { from: (t: string) => any; rpc: (n: string, a?: any) => any };

const orgOnly = z.object({ organizationId: z.string().uuid() });

/* ---------------- Categories ---------------- */
export const listCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("categories")
      .select("id, name, description, parent_id, created_at")
      .eq("organization_id", data.organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows as { id: string; name: string; description: string | null; parent_id: string | null; created_at: string }[];
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organizationId: z.string().uuid(),
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional().nullable(),
        parent_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      description: data.description ?? null,
      parent_id: data.parent_id ?? null,
    };
    if (data.id) {
      const { error } = await c.from("categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await c.from("categories").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id as string };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Suppliers ---------------- */
const contactShape = {
  organizationId: z.string().uuid(),
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  contact_name: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
};

export const listSuppliers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("suppliers")
      .select("id, name, contact_name, email, phone, address, is_active, created_at")
      .eq("organization_id", data.organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows as any[];
  });

export const upsertSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object(contactShape).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      contact_name: data.contact_name ?? null,
      email: data.email || null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await c.from("suppliers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await c.from("suppliers").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id as string };
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("suppliers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Customers ---------------- */
export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("customers")
      .select("id, name, contact_name, email, phone, address, customer_type, is_active, created_at")
      .eq("organization_id", data.organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows as any[];
  });

export const upsertCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        ...contactShape,
        customer_type: z.enum(["retail", "wholesale"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      contact_name: data.contact_name ?? null,
      email: data.email || null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      customer_type: data.customer_type ?? "retail",
      notes: data.notes ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await c.from("customers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await c.from("customers").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id as string };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Products ---------------- */
export const listProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("products")
      .select(
        "id, sku, name, description, unit_of_measure, cost_price, selling_price, tax_rate, reorder_point, reorder_quantity, is_active, category_id, categories(name)"
      )
      .eq("organization_id", data.organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows as any[]).map((r) => ({
      ...r,
      category_name: r.categories?.name ?? null,
    }));
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organizationId: z.string().uuid(),
        id: z.string().uuid().optional(),
        sku: z.string().min(1).max(60),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        unit_of_measure: z.string().max(20).default("each"),
        cost_price: z.number().min(0).default(0),
        selling_price: z.number().min(0).default(0),
        tax_rate: z.number().min(0).max(100).default(0),
        reorder_point: z.number().int().min(0).default(0),
        reorder_quantity: z.number().int().min(0).default(0),
        category_id: z.string().uuid().nullable().optional(),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const payload = {
      organization_id: data.organizationId,
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      unit_of_measure: data.unit_of_measure,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      tax_rate: data.tax_rate,
      reorder_point: data.reorder_point,
      reorder_quantity: data.reorder_quantity,
      category_id: data.category_id ?? null,
      is_active: data.is_active,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await c.from("products").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await c.from("products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
