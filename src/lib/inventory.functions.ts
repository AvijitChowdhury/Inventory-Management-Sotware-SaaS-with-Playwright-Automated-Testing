import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnyClient = { from: (t: string) => any; rpc: (n: string, a?: any) => any };
const orgOnly = z.object({ organizationId: z.string().uuid() });

export const listLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("locations")
      .select("id, name, code, address_line1, city, state, is_default, is_active")
      .eq("organization_id", data.organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows as any[];
  });

export const upsertLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organizationId: z.string().uuid(),
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        code: z.string().min(1).max(20),
        address_line1: z.string().max(200).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        state: z.string().max(100).optional().nullable(),
        is_default: z.boolean().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      code: data.code,
      address_line1: data.address_line1 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      is_default: data.is_default ?? false,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await c.from("locations").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await c.from("locations").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (ins as any).id as string };
  });

export const listInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("inventory")
      .select(
        "id, quantity_on_hand, quantity_reserved, quantity_available, product_id, location_id, products(sku, name, cost_price, reorder_point), locations(name, code)"
      )
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return (rows as any[]).map((r) => ({
      id: r.id,
      product_id: r.product_id,
      location_id: r.location_id,
      sku: r.products?.sku,
      product_name: r.products?.name,
      cost_price: Number(r.products?.cost_price ?? 0),
      reorder_point: r.products?.reorder_point ?? 0,
      location_name: r.locations?.name,
      location_code: r.locations?.code,
      quantity_on_hand: r.quantity_on_hand,
      quantity_reserved: r.quantity_reserved,
      quantity_available: r.quantity_available,
    }));
  });

export const listInventoryTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("inventory_transactions")
      .select(
        "id, transaction_type, quantity_change, unit_cost, reference_type, notes, created_at, products(sku, name), locations(name)"
      )
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows as any[]).map((r) => ({
      id: r.id,
      transaction_type: r.transaction_type,
      quantity_change: r.quantity_change,
      unit_cost: r.unit_cost,
      reference_type: r.reference_type,
      notes: r.notes,
      created_at: r.created_at,
      sku: r.products?.sku,
      product_name: r.products?.name,
      location_name: r.locations?.name,
    }));
  });

export const adjustInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organizationId: z.string().uuid(),
        product_id: z.string().uuid(),
        location_id: z.string().uuid(),
        quantity_change: z.number().int(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("inventory_transactions").insert({
      organization_id: data.organizationId,
      product_id: data.product_id,
      location_id: data.location_id,
      transaction_type: "adjustment",
      quantity_change: data.quantity_change,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
