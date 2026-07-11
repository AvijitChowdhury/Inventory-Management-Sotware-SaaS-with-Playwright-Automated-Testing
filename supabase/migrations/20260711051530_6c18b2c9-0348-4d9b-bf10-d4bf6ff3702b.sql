
-- 1. Fix mutable search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin new.updated_at = now(); return new; end;
$$;

-- 2. Revoke EXECUTE from PUBLIC/anon/authenticated on internal trigger functions
-- (triggers run as table owner and don't need role EXECUTE grants)
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_po_totals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_so_totals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_inventory_transaction() FROM PUBLIC, anon, authenticated;

-- 3. Revoke from anon on org-role helper functions (used inside RLS policies).
-- Keep authenticated EXECUTE so RLS policy expressions still evaluate.
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_manager_or_above(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin_or_above(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_manager_or_above(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin_or_above(uuid) TO authenticated;

-- 4. create_organization_with_owner: only signed-in users, never anon
REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text) TO authenticated;
