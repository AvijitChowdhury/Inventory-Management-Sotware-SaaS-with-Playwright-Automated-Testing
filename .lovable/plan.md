# StockFlow — Phased Build Plan

StockFlow is a large product (10 modules, multi-tenant, RLS, ledger-based inventory). Per your PRD's Section 13, we'll build it in phases — one focused turn each — rather than all at once. This plan is the whole roadmap; I'll implement **Phase 1** first, then we iterate.

## Design foundation (applied in Phase 1, used by every phase)

- **Tokens** from PRD §10.3 wired into `src/styles.css` as HSL semantic tokens (primary navy `#1F3A5F`, accent, success/warning/danger, neutrals). No hardcoded colors in components.
- **Typography**: Inter (body) + a clean sans display, loaded via `<link>` in `__root.tsx`.
- **Layout shell**: persistent collapsible left sidebar + top bar (org switcher, search, user menu), consistent page header (title + primary action + filters). Built once, reused by every module.
- **shadcn/ui** for tables, dialogs, forms, badges; Recharts for KPIs/reports.

## Backend foundation (Phase 1)

- Enable Lovable Cloud.
- Run your `schema.sql` as a migration (organizations, profiles, organization_members, locations, categories, products, product_variants, inventory, inventory_transactions, suppliers, customers, purchase_orders + lines, sales_orders + lines, transfers, enums, RLS policies, triggers, RPCs, storage buckets).
- Auth: email/password + Google, using the managed Supabase integration under `_authenticated/`.
- Onboarding: post-signup, if user has no org → "Create organization" screen → calls `create_organization_with_owner` RPC → lands on dashboard.
- Org switcher in top bar for users in multiple orgs (stored in local state + `current_org_id` claim).

## Phased roadmap

| Phase | Scope (one turn each) |
|---|---|
| **1 (this turn)** | Cloud + schema migration, auth, org creation/onboarding, app shell (sidebar/topbar/routes), empty Dashboard, empty-state checklist |
| 2 | Products + Categories: CRUD, images to `product-images` bucket, variants, list/detail/edit |
| 3 | Suppliers + Customers directories, Locations settings |
| 4 | Inventory: per-location stock table, manual adjustments, transfers, ledger view |
| 5 | Purchase Orders: draft → submit → receive (partial/full), auto-ledger writes |
| 6 | Sales Orders: draft → confirm → fulfill (partial/full), auto-ledger writes |
| 7 | Reports (low-stock, valuation, sales summary, top products) + Dashboard KPIs + CSV export |
| 8 | Settings: team management/invites/roles, org profile, polish + responsive/a11y pass |

## Phase 1 deliverables (what I'll build now)

**Routes** (`src/routes/`)
- `__root.tsx` — head metadata (StockFlow), fonts, providers
- `index.tsx` — marketing landing (hero, features, CTA → /auth)
- `auth.tsx` — sign in / sign up (email + Google)
- `_authenticated/route.tsx` — session gate (uses managed integration)
- `_authenticated/onboarding.tsx` — create-organization form (calls RPC)
- `_authenticated/dashboard.tsx` — KPI placeholders + empty-state checklist
- Stub routes with "Coming in Phase N" for: products, inventory, categories, suppliers, customers, purchase-orders, sales-orders, reports, settings

**Components**
- `AppShell` (sidebar + topbar + `<Outlet />`)
- `Sidebar` with nav items + active state
- `TopBar` with org switcher, search, user menu
- `PageHeader` (title, action, filters slot)
- `KpiCard`, `EmptyState`

**Backend (migration)**
- Full `schema.sql` from your upload, with `GRANT` blocks on every `public` table per Lovable's public-schema requirement
- Storage buckets `product-images`, `org-logos` with org-scoped path policies

**Server functions**
- `getCurrentUserOrgs` — orgs the user belongs to
- `createOrganization` — wraps the RPC

## Technical notes

- Multi-tenancy is enforced in Postgres (RLS on every tenant table via `organization_id`); frontend queries use the authed Supabase client so RLS applies as the user.
- `_authenticated/` gate handles the redirect to `/auth` — no protected loaders on public routes.
- Storage upload policies check `storage.foldername(name)[1] = organization_id::text` and role via `has_role`/membership.
- Role checks use a `has_org_role(org_id, roles[])` security-definer function to avoid RLS recursion (your schema already includes this pattern).
- Every schema change → I revise dependent code the same turn.
- After Phase 1 lands and you confirm auth + org creation works end-to-end, we move to Phase 2 (Products).

Approve to start Phase 1.
