
alter view public.v_low_stock set (security_invoker = true);
alter view public.v_inventory_valuation set (security_invoker = true);
alter view public.v_sales_daily set (security_invoker = true);

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.get_org_role(uuid) from public, anon;
revoke execute on function public.is_org_manager_or_above(uuid) from public, anon;
revoke execute on function public.is_org_admin_or_above(uuid) from public, anon;
revoke execute on function public.create_organization_with_owner(text, text) from public, anon;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.get_org_role(uuid) to authenticated;
grant execute on function public.is_org_manager_or_above(uuid) to authenticated;
grant execute on function public.is_org_admin_or_above(uuid) to authenticated;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;
