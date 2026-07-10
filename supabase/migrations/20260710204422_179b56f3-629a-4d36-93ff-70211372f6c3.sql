
create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.org_role as enum ('owner', 'admin', 'manager', 'staff', 'viewer');
create type public.member_status as enum ('active', 'invited', 'disabled');
create type public.inventory_txn_type as enum (
  'purchase_receipt','sale_fulfillment','adjustment_increase','adjustment_decrease',
  'transfer_in','transfer_out','return_in','return_out'
);
create type public.po_status as enum ('draft','submitted','partially_received','received','cancelled');
create type public.so_status as enum ('draft','confirmed','partially_fulfilled','fulfilled','cancelled');
create type public.transfer_status as enum ('pending','in_transit','completed','cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  low_stock_default_threshold integer not null default 10,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, avatar_url text, email citext, phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email citext,
  role public.org_role not null default 'staff',
  status public.member_status not null default 'invited',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_members_user_or_invite check (user_id is not null or invited_email is not null),
  constraint org_members_unique_user unique (organization_id, user_id)
);
create index idx_org_members_org on public.organization_members (organization_id);
create index idx_org_members_user on public.organization_members (user_id);
grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organization_members to service_role;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null, description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_unique_name unique (organization_id, parent_id, name)
);
create index idx_categories_org on public.categories (organization_id);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, code text not null,
  address_line1 text, address_line2 text, city text, state text, postal_code text, country text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_unique_code unique (organization_id, code)
);
create index idx_locations_org on public.locations (organization_id);
grant select, insert, update, delete on public.locations to authenticated;
grant all on public.locations to service_role;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, contact_name text, email citext, phone text, address text,
  payment_terms text, notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_suppliers_org on public.suppliers (organization_id);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, contact_name text, email citext, phone text, address text,
  customer_type text default 'retail', notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_org on public.customers (organization_id);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  sku text not null, name text not null, description text, barcode text,
  unit_of_measure text not null default 'each',
  cost_price numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  image_url text,
  reorder_point integer not null default 0,
  reorder_quantity integer not null default 0,
  has_variants boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_unique_sku unique (organization_id, sku)
);
create index idx_products_org on public.products (organization_id);
create index idx_products_category on public.products (category_id);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null, name text not null,
  attributes jsonb not null default '{}'::jsonb,
  cost_price numeric(14,2), selling_price numeric(14,2), barcode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variants_unique_sku unique (organization_id, sku)
);
create index idx_variants_product on public.product_variants (product_id);
grant select, insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  quantity_on_hand integer not null default 0,
  quantity_reserved integer not null default 0,
  quantity_available integer generated always as (quantity_on_hand - quantity_reserved) stored,
  reorder_point_override integer,
  updated_at timestamptz not null default now(),
  constraint inventory_non_negative check (quantity_on_hand >= 0 and quantity_reserved >= 0)
);
create unique index inventory_unique_slot on public.inventory (
  product_id, location_id, (coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
create index idx_inventory_org on public.inventory (organization_id);
create index idx_inventory_location on public.inventory (location_id);
create index idx_inventory_product on public.inventory (product_id);
grant select, insert, update, delete on public.inventory to authenticated;
grant all on public.inventory to service_role;

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  location_id uuid not null references public.locations(id),
  transaction_type public.inventory_txn_type not null,
  quantity_change integer not null,
  reference_type text, reference_id uuid,
  unit_cost numeric(14,2), notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_inv_txn_org on public.inventory_transactions (organization_id);
create index idx_inv_txn_product on public.inventory_transactions (product_id, location_id);
create index idx_inv_txn_reference on public.inventory_transactions (reference_type, reference_id);
create index idx_inv_txn_created on public.inventory_transactions (created_at);
grant select, insert on public.inventory_transactions to authenticated;
grant all on public.inventory_transactions to service_role;

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transfer_number text not null,
  from_location_id uuid not null references public.locations(id),
  to_location_id uuid not null references public.locations(id),
  status public.transfer_status not null default 'pending',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint transfers_unique_number unique (organization_id, transfer_number),
  constraint transfers_diff_locations check (from_location_id <> to_location_id)
);
grant select, insert, update, delete on public.stock_transfers to authenticated;
grant all on public.stock_transfers to service_role;

create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  stock_transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity integer not null check (quantity > 0)
);
create index idx_transfer_items_transfer on public.stock_transfer_items (stock_transfer_id);
grant select, insert, update, delete on public.stock_transfer_items to authenticated;
grant all on public.stock_transfer_items to service_role;

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  location_id uuid not null references public.locations(id),
  po_number text not null,
  status public.po_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date, notes text,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint po_unique_number unique (organization_id, po_number)
);
create index idx_po_org on public.purchase_orders (organization_id);
create index idx_po_supplier on public.purchase_orders (supplier_id);
create index idx_po_status on public.purchase_orders (organization_id, status);
grant select, insert, update, delete on public.purchase_orders to authenticated;
grant all on public.purchase_orders to service_role;

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0,
  unit_cost numeric(14,2) not null,
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(14,2) generated always as (quantity_ordered * unit_cost) stored
);
create index idx_po_items_po on public.purchase_order_items (purchase_order_id);
grant select, insert, update, delete on public.purchase_order_items to authenticated;
grant all on public.purchase_order_items to service_role;

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  location_id uuid not null references public.locations(id),
  so_number text not null,
  status public.so_status not null default 'draft',
  order_date date not null default current_date,
  notes text,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint so_unique_number unique (organization_id, so_number)
);
create index idx_so_org on public.sales_orders (organization_id);
create index idx_so_customer on public.sales_orders (customer_id);
create index idx_so_status on public.sales_orders (organization_id, status);
grant select, insert, update, delete on public.sales_orders to authenticated;
grant all on public.sales_orders to service_role;

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_fulfilled integer not null default 0,
  unit_price numeric(14,2) not null,
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(14,2) generated always as (quantity_ordered * unit_price) stored
);
create index idx_so_items_so on public.sales_order_items (sales_order_id);
grant select, insert, update, delete on public.sales_order_items to authenticated;
grant all on public.sales_order_items to service_role;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null, table_name text not null, record_id uuid,
  old_data jsonb, new_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_org on public.audit_log (organization_id, created_at);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.organization_members om
    where om.organization_id = target_org and om.user_id = auth.uid() and om.status = 'active');
$$;

create or replace function public.get_org_role(target_org uuid)
returns public.org_role language sql security definer stable set search_path = public as $$
  select om.role from public.organization_members om
   where om.organization_id = target_org and om.user_id = auth.uid() and om.status = 'active' limit 1;
$$;

create or replace function public.is_org_manager_or_above(target_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.get_org_role(target_org) in ('owner','admin','manager');
$$;

create or replace function public.is_org_admin_or_above(target_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.get_org_role(target_org) in ('owner','admin');
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','organization_members','categories','locations',
    'suppliers','customers','products','product_variants','purchase_orders','sales_orders'
  ] loop
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

create or replace function public.apply_inventory_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory (organization_id, product_id, variant_id, location_id, quantity_on_hand)
  values (new.organization_id, new.product_id, new.variant_id, new.location_id, new.quantity_change)
  on conflict (product_id, location_id, (coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set quantity_on_hand = public.inventory.quantity_on_hand + excluded.quantity_on_hand, updated_at = now();
  return new;
end; $$;
create trigger trg_apply_inventory_transaction
  after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_transaction();

create or replace function public.recalc_po_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_po uuid := coalesce(new.purchase_order_id, old.purchase_order_id);
  v_subtotal numeric(14,2); v_tax numeric(14,2);
begin
  select coalesce(sum(line_total),0), coalesce(sum(line_total*tax_rate/100.0),0)
    into v_subtotal, v_tax from public.purchase_order_items where purchase_order_id = target_po;
  update public.purchase_orders
     set subtotal = v_subtotal, tax_total = v_tax, total = v_subtotal + v_tax, updated_at = now()
   where id = target_po;
  return coalesce(new, old);
end; $$;
create trigger trg_po_items_recalc
  after insert or update or delete on public.purchase_order_items
  for each row execute function public.recalc_po_totals();

create or replace function public.recalc_so_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_so uuid := coalesce(new.sales_order_id, old.sales_order_id);
  v_subtotal numeric(14,2); v_tax numeric(14,2);
begin
  select coalesce(sum(line_total),0), coalesce(sum(line_total*tax_rate/100.0),0)
    into v_subtotal, v_tax from public.sales_order_items where sales_order_id = target_so;
  update public.sales_orders
     set subtotal = v_subtotal, tax_total = v_tax, total = v_subtotal + v_tax, updated_at = now()
   where id = target_so;
  return coalesce(new, old);
end; $$;
create trigger trg_so_items_recalc
  after insert or update or delete on public.sales_order_items
  for each row execute function public.recalc_so_totals();

create or replace view public.v_low_stock as
select i.organization_id, i.product_id, p.sku, p.name as product_name,
  i.variant_id, pv.name as variant_name,
  i.location_id, l.name as location_name,
  i.quantity_on_hand, i.quantity_reserved, i.quantity_available,
  coalesce(i.reorder_point_override, p.reorder_point) as reorder_point
from public.inventory i
join public.products p on p.id = i.product_id
left join public.product_variants pv on pv.id = i.variant_id
join public.locations l on l.id = i.location_id
where i.quantity_available <= coalesce(i.reorder_point_override, p.reorder_point);
grant select on public.v_low_stock to authenticated;

create or replace view public.v_inventory_valuation as
select i.organization_id, i.location_id, l.name as location_name,
  sum(i.quantity_on_hand * coalesce(pv.cost_price, p.cost_price)) as total_cost_value,
  sum(i.quantity_on_hand * coalesce(pv.selling_price, p.selling_price)) as total_retail_value,
  count(distinct i.product_id) as distinct_products
from public.inventory i
join public.products p on p.id = i.product_id
left join public.product_variants pv on pv.id = i.variant_id
join public.locations l on l.id = i.location_id
group by i.organization_id, i.location_id, l.name;
grant select on public.v_inventory_valuation to authenticated;

create or replace view public.v_sales_daily as
select so.organization_id, so.order_date,
  count(distinct so.id) as order_count, sum(so.total) as total_sales
from public.sales_orders so
where so.status in ('confirmed','partially_fulfilled','fulfilled')
group by so.organization_id, so.order_date;
grant select on public.v_sales_daily to authenticated;

alter table public.organizations           enable row level security;
alter table public.profiles                enable row level security;
alter table public.organization_members    enable row level security;
alter table public.categories              enable row level security;
alter table public.locations               enable row level security;
alter table public.suppliers               enable row level security;
alter table public.customers               enable row level security;
alter table public.products                enable row level security;
alter table public.product_variants        enable row level security;
alter table public.inventory               enable row level security;
alter table public.inventory_transactions  enable row level security;
alter table public.stock_transfers         enable row level security;
alter table public.stock_transfer_items    enable row level security;
alter table public.purchase_orders         enable row level security;
alter table public.purchase_order_items    enable row level security;
alter table public.sales_orders            enable row level security;
alter table public.sales_order_items       enable row level security;
alter table public.audit_log               enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

create policy "orgs_select_member" on public.organizations for select using (public.is_org_member(id));
create policy "orgs_update_admin" on public.organizations for update using (public.is_org_admin_or_above(id));
create policy "orgs_insert_authenticated" on public.organizations for insert with check (auth.uid() is not null);

create policy "org_members_select" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "org_members_insert_admin" on public.organization_members for insert with check (public.is_org_admin_or_above(organization_id));
create policy "org_members_update_admin" on public.organization_members for update using (public.is_org_admin_or_above(organization_id));
create policy "org_members_delete_admin" on public.organization_members for delete using (public.is_org_admin_or_above(organization_id));

create policy "categories_select" on public.categories for select using (public.is_org_member(organization_id));
create policy "categories_write" on public.categories for insert with check (public.is_org_manager_or_above(organization_id));
create policy "categories_update" on public.categories for update using (public.is_org_manager_or_above(organization_id));
create policy "categories_delete" on public.categories for delete using (public.is_org_admin_or_above(organization_id));

create policy "locations_select" on public.locations for select using (public.is_org_member(organization_id));
create policy "locations_write" on public.locations for insert with check (public.is_org_admin_or_above(organization_id));
create policy "locations_update" on public.locations for update using (public.is_org_admin_or_above(organization_id));
create policy "locations_delete" on public.locations for delete using (public.is_org_admin_or_above(organization_id));

create policy "suppliers_select" on public.suppliers for select using (public.is_org_member(organization_id));
create policy "suppliers_write" on public.suppliers for insert with check (public.is_org_manager_or_above(organization_id));
create policy "suppliers_update" on public.suppliers for update using (public.is_org_manager_or_above(organization_id));
create policy "suppliers_delete" on public.suppliers for delete using (public.is_org_admin_or_above(organization_id));

create policy "customers_select" on public.customers for select using (public.is_org_member(organization_id));
create policy "customers_write" on public.customers for insert with check (public.is_org_manager_or_above(organization_id));
create policy "customers_update" on public.customers for update using (public.is_org_manager_or_above(organization_id));
create policy "customers_delete" on public.customers for delete using (public.is_org_admin_or_above(organization_id));

create policy "products_select" on public.products for select using (public.is_org_member(organization_id));
create policy "products_write" on public.products for insert with check (public.is_org_manager_or_above(organization_id));
create policy "products_update" on public.products for update using (public.is_org_manager_or_above(organization_id));
create policy "products_delete" on public.products for delete using (public.is_org_admin_or_above(organization_id));

create policy "variants_select" on public.product_variants for select using (public.is_org_member(organization_id));
create policy "variants_write" on public.product_variants for insert with check (public.is_org_manager_or_above(organization_id));
create policy "variants_update" on public.product_variants for update using (public.is_org_manager_or_above(organization_id));
create policy "variants_delete" on public.product_variants for delete using (public.is_org_admin_or_above(organization_id));

create policy "inventory_select" on public.inventory for select using (public.is_org_member(organization_id));
create policy "inventory_write" on public.inventory for insert with check (public.is_org_manager_or_above(organization_id));
create policy "inventory_update" on public.inventory for update using (public.is_org_manager_or_above(organization_id));

create policy "inv_txn_select" on public.inventory_transactions for select using (public.is_org_member(organization_id));
create policy "inv_txn_insert" on public.inventory_transactions for insert with check (public.is_org_member(organization_id));

create policy "transfers_select" on public.stock_transfers for select using (public.is_org_member(organization_id));
create policy "transfers_write" on public.stock_transfers for insert with check (public.is_org_manager_or_above(organization_id));
create policy "transfers_update" on public.stock_transfers for update using (public.is_org_manager_or_above(organization_id));
create policy "transfers_delete" on public.stock_transfers for delete using (public.is_org_admin_or_above(organization_id));

create policy "transfer_items_select" on public.stock_transfer_items for select using (
  exists (select 1 from public.stock_transfers st where st.id = stock_transfer_id and public.is_org_member(st.organization_id)));
create policy "transfer_items_write" on public.stock_transfer_items for insert with check (
  exists (select 1 from public.stock_transfers st where st.id = stock_transfer_id and public.is_org_manager_or_above(st.organization_id)));
create policy "transfer_items_update" on public.stock_transfer_items for update using (
  exists (select 1 from public.stock_transfers st where st.id = stock_transfer_id and public.is_org_manager_or_above(st.organization_id)));
create policy "transfer_items_delete" on public.stock_transfer_items for delete using (
  exists (select 1 from public.stock_transfers st where st.id = stock_transfer_id and public.is_org_admin_or_above(st.organization_id)));

create policy "po_select" on public.purchase_orders for select using (public.is_org_member(organization_id));
create policy "po_write" on public.purchase_orders for insert with check (public.is_org_manager_or_above(organization_id));
create policy "po_update" on public.purchase_orders for update using (public.is_org_manager_or_above(organization_id));
create policy "po_delete" on public.purchase_orders for delete using (public.is_org_admin_or_above(organization_id));

create policy "po_items_select" on public.purchase_order_items for select using (
  exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and public.is_org_member(po.organization_id)));
create policy "po_items_write" on public.purchase_order_items for insert with check (
  exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and public.is_org_manager_or_above(po.organization_id)));
create policy "po_items_update" on public.purchase_order_items for update using (
  exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and public.is_org_manager_or_above(po.organization_id)));
create policy "po_items_delete" on public.purchase_order_items for delete using (
  exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and public.is_org_admin_or_above(po.organization_id)));

create policy "so_select" on public.sales_orders for select using (public.is_org_member(organization_id));
create policy "so_write" on public.sales_orders for insert with check (public.is_org_manager_or_above(organization_id));
create policy "so_update" on public.sales_orders for update using (public.is_org_manager_or_above(organization_id));
create policy "so_delete" on public.sales_orders for delete using (public.is_org_admin_or_above(organization_id));

create policy "so_items_select" on public.sales_order_items for select using (
  exists (select 1 from public.sales_orders so where so.id = sales_order_id and public.is_org_member(so.organization_id)));
create policy "so_items_write" on public.sales_order_items for insert with check (
  exists (select 1 from public.sales_orders so where so.id = sales_order_id and public.is_org_manager_or_above(so.organization_id)));
create policy "so_items_update" on public.sales_order_items for update using (
  exists (select 1 from public.sales_orders so where so.id = sales_order_id and public.is_org_manager_or_above(so.organization_id)));
create policy "so_items_delete" on public.sales_order_items for delete using (
  exists (select 1 from public.sales_orders so where so.id = sales_order_id and public.is_org_admin_or_above(so.organization_id)));

create policy "audit_select_admin" on public.audit_log for select using (public.is_org_admin_or_above(organization_id));

create or replace function public.create_organization_with_owner(org_name text, org_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_org_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  insert into public.profiles (id, email)
  select auth.uid(), (select email from auth.users where id = auth.uid())
  on conflict (id) do nothing;

  insert into public.organizations (name, slug) values (org_name, org_slug) returning id into new_org_id;
  insert into public.organization_members (organization_id, user_id, role, status)
    values (new_org_id, auth.uid(), 'owner', 'active');
  insert into public.locations (organization_id, name, code, is_default)
    values (new_org_id, 'Main Warehouse', 'MAIN', true);
  return new_org_id;
end; $$;

grant execute on function public.create_organization_with_owner(text, text) to authenticated;
