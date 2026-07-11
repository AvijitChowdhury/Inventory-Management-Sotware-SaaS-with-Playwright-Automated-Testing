import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnyClient = { from: (t: string) => any };
const orgOnly = z.object({ organizationId: z.string().uuid() });

export const getReportSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => orgOnly.parse(d))
  .handler(async ({ context, data }) => {
    const c = context.supabase as unknown as AnyClient;

    const [invRes, poRes, soRes, prodRes] = await Promise.all([
      c
        .from("inventory")
        .select("quantity_on_hand, products(cost_price, reorder_point, name, sku)")
        .eq("organization_id", data.organizationId),
      c
        .from("purchase_orders")
        .select("total, status")
        .eq("organization_id", data.organizationId),
      c
        .from("sales_orders")
        .select("total, status, order_date")
        .eq("organization_id", data.organizationId),
      c.from("products").select("id").eq("organization_id", data.organizationId),
    ]);

    if (invRes.error) throw new Error(invRes.error.message);
    if (poRes.error) throw new Error(poRes.error.message);
    if (soRes.error) throw new Error(soRes.error.message);

    const inv = (invRes.data ?? []) as any[];
    const stockValue = inv.reduce(
      (acc, r) => acc + Number(r.products?.cost_price ?? 0) * Number(r.quantity_on_hand ?? 0),
      0,
    );
    const totalUnits = inv.reduce((acc, r) => acc + Number(r.quantity_on_hand ?? 0), 0);
    const lowStock = inv.filter(
      (r) => Number(r.quantity_on_hand ?? 0) <= Number(r.products?.reorder_point ?? 0),
    ).length;

    const po = (poRes.data ?? []) as any[];
    const so = (soRes.data ?? []) as any[];
    const openPOs = po.filter((p) => ["draft", "submitted", "partially_received"].includes(p.status)).length;
    const poValue = po.reduce((a, p) => a + Number(p.total ?? 0), 0);
    const salesValue = so.reduce((a, p) => a + Number(p.total ?? 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const salesThisMonth = so
      .filter((s) => s.order_date && new Date(s.order_date) >= monthStart)
      .reduce((a, s) => a + Number(s.total ?? 0), 0);

    // Top 5 products by stock value
    const byValue = inv
      .map((r) => ({
        name: r.products?.name ?? "—",
        sku: r.products?.sku ?? "",
        qty: r.quantity_on_hand,
        value: Number(r.products?.cost_price ?? 0) * Number(r.quantity_on_hand ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      productCount: (prodRes.data ?? []).length,
      stockValue,
      totalUnits,
      lowStock,
      openPOs,
      poValue,
      salesValue,
      salesThisMonth,
      topProducts: byValue,
    };
  });
