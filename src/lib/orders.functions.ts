import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnyClient = { from: (t: string) => any; rpc: (n: string, a?: any) => any };
const orgOnly = z.object({ organizationId: z.string().uuid() });

const lineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).max(100).default(0),
});

/* ---------------- Purchase Orders ---------------- */
export const listPurchaseOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("purchase_orders")
      .select(
        "id, po_number, status, order_date, expected_date, subtotal, tax_total, total, suppliers(name), locations(name)"
      )
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows as any[]).map((r) => ({
      ...r,
      supplier_name: r.suppliers?.name,
      location_name: r.locations?.name,
    }));
  });

export const getPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: header, error } = await c
      .from("purchase_orders")
      .select("*, suppliers(name), locations(name)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: items } = await c
      .from("purchase_order_items")
      .select("*, products(sku, name)")
      .eq("purchase_order_id", data.id);
    return { header, items: (items ?? []) as any[] };
  });

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organizationId: z.string().uuid(),
        supplier_id: z.string().uuid(),
        location_id: z.string().uuid(),
        po_number: z.string().min(1).max(40),
        expected_date: z.string().nullable().optional(),
        notes: z.string().max(1000).optional().nullable(),
        items: z.array(lineSchema).min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: po, error } = await c
      .from("purchase_orders")
      .insert({
        organization_id: data.organizationId,
        supplier_id: data.supplier_id,
        location_id: data.location_id,
        po_number: data.po_number,
        expected_date: data.expected_date || null,
        notes: data.notes ?? null,
        status: "draft",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const poId = (po as any).id as string;
    const { error: itemsErr } = await c.from("purchase_order_items").insert(
      data.items.map((it) => ({
        purchase_order_id: poId,
        product_id: it.product_id,
        quantity_ordered: it.quantity,
        unit_cost: it.unit_price,
        tax_rate: it.tax_rate,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);
    return { id: poId };
  });

export const receivePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: po, error } = await c
      .from("purchase_orders")
      .select("id, organization_id, location_id, status")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if ((po as any).status === "received") throw new Error("Already received");
    const { data: items, error: iErr } = await c
      .from("purchase_order_items")
      .select("id, product_id, quantity_ordered, unit_cost")
      .eq("purchase_order_id", data.id);
    if (iErr) throw new Error(iErr.message);
    // Insert inventory transactions (positive). Trigger updates inventory.
    for (const it of items as any[]) {
      const { error: txErr } = await c.from("inventory_transactions").insert({
        organization_id: (po as any).organization_id,
        product_id: it.product_id,
        location_id: (po as any).location_id,
        transaction_type: "purchase_receipt",
        quantity_change: it.quantity_ordered,
        unit_cost: it.unit_cost,
        reference_type: "purchase_order",
        reference_id: data.id,
        created_by: context.userId,
      });
      if (txErr) throw new Error(txErr.message);
      await c
        .from("purchase_order_items")
        .update({ quantity_received: it.quantity_ordered })
        .eq("id", it.id);
    }
    const { error: updErr } = await c
      .from("purchase_orders")
      .update({ status: "received" })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const deletePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("purchase_orders").delete().eq("id", data.id).eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Sales Orders ---------------- */
export const listSalesOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: rows, error } = await c
      .from("sales_orders")
      .select(
        "id, so_number, status, order_date, subtotal, tax_total, total, customers(name), locations(name)"
      )
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows as any[]).map((r) => ({
      ...r,
      customer_name: r.customers?.name,
      location_name: r.locations?.name,
    }));
  });

export const createSalesOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organizationId: z.string().uuid(),
        customer_id: z.string().uuid(),
        location_id: z.string().uuid(),
        so_number: z.string().min(1).max(40),
        notes: z.string().max(1000).optional().nullable(),
        items: z.array(lineSchema).min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: so, error } = await c
      .from("sales_orders")
      .insert({
        organization_id: data.organizationId,
        customer_id: data.customer_id,
        location_id: data.location_id,
        so_number: data.so_number,
        notes: data.notes ?? null,
        status: "draft",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const soId = (so as any).id as string;
    const { error: itemsErr } = await c.from("sales_order_items").insert(
      data.items.map((it) => ({
        sales_order_id: soId,
        product_id: it.product_id,
        quantity_ordered: it.quantity,
        unit_price: it.unit_price,
        tax_rate: it.tax_rate,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);
    return { id: soId };
  });

export const fulfillSalesOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { data: so, error } = await c
      .from("sales_orders")
      .select("id, organization_id, location_id, status")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if ((so as any).status === "fulfilled") throw new Error("Already fulfilled");
    const { data: items, error: iErr } = await c
      .from("sales_order_items")
      .select("id, product_id, quantity_ordered, unit_price")
      .eq("sales_order_id", data.id);
    if (iErr) throw new Error(iErr.message);
    for (const it of items as any[]) {
      const { error: txErr } = await c.from("inventory_transactions").insert({
        organization_id: (so as any).organization_id,
        product_id: it.product_id,
        location_id: (so as any).location_id,
        transaction_type: "sale_fulfillment",
        quantity_change: -it.quantity_ordered,
        unit_cost: it.unit_price,
        reference_type: "sales_order",
        reference_id: data.id,
        created_by: context.userId,
      });
      if (txErr) throw new Error(txErr.message);
      await c
        .from("sales_order_items")
        .update({ quantity_fulfilled: it.quantity_ordered })
        .eq("id", it.id);
    }
    const { error: updErr } = await c
      .from("sales_orders")
      .update({ status: "fulfilled" })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const deleteSalesOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;
    const { error } = await c.from("sales_orders").delete().eq("id", data.id).eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
