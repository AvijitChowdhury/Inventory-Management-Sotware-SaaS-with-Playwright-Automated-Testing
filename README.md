# StockFlow — Multi-tenant Inventory Management SaaS

> A custom-coded, production-grade inventory platform for retailers, distributors, and multi-location businesses.
> Every line of application code, every database policy, every test in this repo is hand-written for this project — **no low-code drag-and-drop, no template checkout**.

<p align="center">
  <img src="docs/screenshots/01_landing.png" alt="StockFlow landing page" width="900"/>
</p>

<p align="center">
  <b>Status</b> · Phase 1 shipped (auth · onboarding · app shell · dashboard) &nbsp;•&nbsp;
  <b>Tests</b> · 15 / 15 Playwright E2E passing &nbsp;•&nbsp;
  <b>Coverage</b> · Every route in the sidebar
</p>

---

## Table of contents

1. [What StockFlow is](#what-stockflow-is)
2. [System architecture](#system-architecture)
3. [Tech stack](#tech-stack)
4. [Feature tour (with screenshots)](#feature-tour-with-screenshots)
5. [Product roadmap](#product-roadmap)
6. [Database & security model](#database--security-model)
7. [End-to-end testing](#end-to-end-testing)
8. [Allure test report](#allure-test-report)
9. [Local development](#local-development)
10. [Admin credentials](#admin-credentials)
11. [Repository layout](#repository-layout)

---

## What StockFlow is

StockFlow is a **multi-tenant SaaS** that gives growing businesses a single source of truth for:

- **Products & variants** with images, SKUs, barcodes, cost, price
- **Real-time inventory** across unlimited warehouses/stores, backed by an immutable ledger
- **Purchasing** — draft → submit → receive purchase orders that auto-post to the ledger
- **Sales** — draft → confirm → fulfill sales orders with the same auto-ledger flow
- **Suppliers, customers, categories, locations** — clean CRUD directories
- **Reports** — low-stock alerts, valuation, sales summary, top products, CSV export
- **Team roles** — owner / admin / manager / staff / viewer enforced at the database layer

Every organization's data is isolated at the **database** level via Postgres Row-Level Security — not by client-side filters. See [Database & security model](#database--security-model).

---

## System architecture

<p align="center">
  <img src="docs/diagrams/system-architecture.png" alt="StockFlow system architecture" width="1000"/>
</p>

**Highlights**

- **Client** — React 19 + TanStack Router with file-based routing. Public routes are SSR'd for SEO; the `_authenticated/` subtree is a client-only gate that redirects to `/auth` when no Supabase session exists.
- **Edge runtime** — Cloudflare Worker running TanStack Start. All server-only logic is expressed as `createServerFn` RPC handlers with the `requireSupabaseAuth` middleware attaching the caller's JWT — no separate REST layer, no Edge Functions.
- **Cloud** — Postgres + Supabase Auth + Storage. Multi-tenant isolation is enforced by **18 tables × 4 RLS policies each**, backed by security-definer helpers (`is_org_member`, `is_org_manager_or_above`, `has_role`) that avoid RLS recursion.
- **Automation inside the DB** — inventory movements post through the `apply_inventory_transaction` trigger; PO/SO totals recompute via `recalc_po_totals` / `recalc_so_totals` triggers so the client cannot desync money.

---

## Tech stack

| Layer         | Choice                                                                 |
|---------------|------------------------------------------------------------------------|
| Frontend      | React 19, TanStack Router v1, TanStack Query v5, Vite 7, Tailwind v4  |
| UI kit        | shadcn/ui + Radix primitives, Lucide icons, Sonner toasts             |
| Server        | TanStack Start (`createServerFn`) on Cloudflare Workers               |
| Data          | Supabase Postgres, RLS everywhere, security-definer RPCs               |
| Auth          | Supabase Auth — email/password + managed Google OAuth                 |
| Storage       | Supabase Storage (`product-images`, `org-logos`)                      |
| Testing       | Playwright (Python) + pytest + Allure report                          |
| Language      | TypeScript (strict) end-to-end                                         |

---

## Feature tour (with screenshots)

### 1 · Landing page
Public marketing route with server-rendered SEO metadata (`og:*`, `twitter:card`, description).
![Landing](docs/screenshots/01_landing.png)

### 2 · Authentication
Email + password AND managed Google OAuth on a single page. Toggle between sign-in and sign-up.
![Auth](docs/screenshots/02_auth.png)

### 3 · Onboarding
On first sign-in, the user creates their organization. A security-definer RPC (`create_organization_with_owner`) atomically creates the org, adds the caller as **owner**, and seeds a default `Main Warehouse` location — all in one transaction.
![Onboarding](docs/screenshots/06_onboarding_filled.png)

### 4 · Dashboard
Post-onboarding landing with KPI cards and a "Get Started" checklist that guides the operator through the first month.
![Dashboard](docs/screenshots/07_dashboard.png)

### 5 · Sidebar navigation & organization switcher
Collapsible sidebar with 10 modules, sticky top-bar organization switcher (multi-org users), and account menu with sign-out.
![Products](docs/screenshots/10_route_products.png)

### 6 · Every module route reachable
Each sidebar entry resolves to its own route with the app shell intact. Phases 2–8 will replace the "coming soon" placeholders with full CRUD, tables, dialogs, and CSV export.

| Inventory | Categories | Suppliers |
|---|---|---|
| ![](docs/screenshots/10_route_inventory.png) | ![](docs/screenshots/10_route_categories.png) | ![](docs/screenshots/10_route_suppliers.png) |

| Customers | Purchase Orders | Sales Orders |
|---|---|---|
| ![](docs/screenshots/10_route_customers.png) | ![](docs/screenshots/10_route_purchase_orders.png) | ![](docs/screenshots/10_route_sales_orders.png) |

| Reports | Settings | Signed out |
|---|---|---|
| ![](docs/screenshots/10_route_reports.png) | ![](docs/screenshots/10_route_settings.png) | ![](docs/screenshots/20_signed_out.png) |

---

## Product roadmap

The PRD describes 10 modules; StockFlow is being delivered in eight focused phases.

| Phase | Scope                                                                                                    | Status |
|-------|----------------------------------------------------------------------------------------------------------|--------|
| **1** | Cloud + full schema, RLS, storage, auth (email + Google), onboarding, app shell, dashboard, all routes   | ✅ **Shipped** |
| 2     | Products & Categories — CRUD, image upload, variants                                                     | 🚧 Next |
| 3     | Suppliers, Customers, Locations directories                                                              | ⏳ |
| 4     | Inventory — per-location stock, adjustments, transfers, ledger view                                      | ⏳ |
| 5     | Purchase Orders — draft/submit/receive with auto-ledger                                                  | ⏳ |
| 6     | Sales Orders — draft/confirm/fulfill with auto-ledger                                                    | ⏳ |
| 7     | Reports (low-stock, valuation, sales summary, top products) + CSV export + KPI wiring                    | ⏳ |
| 8     | Team management, invites, role UI, polish, a11y & responsive pass                                        | ⏳ |

The **entire database schema, all RLS policies, all business-logic RPCs, and all storage buckets already exist** — future phases only add UI on top of the finished data layer.

---

## Database & security model

- **18 tables** in `public`: organizations, organization_members, profiles, locations, categories, products, product_variants, inventory, inventory_transactions, suppliers, customers, purchase_orders, purchase_order_items, sales_orders, sales_order_items, stock_transfers, stock_transfer_items, audit_log.
- **RLS enabled on every tenant table** with policies scoped through security-definer helpers:
  - `is_org_member(org_id)` — read access
  - `is_org_manager_or_above(org_id)` — writes
  - `is_org_admin_or_above(org_id)` — sensitive writes
  - `get_org_role(org_id)` — returns the caller's role
- **Roles table pattern**: roles live in `organization_members.role` (enum `org_role`) — never on `profiles`, per the anti-privilege-escalation guideline.
- **Immutable inventory ledger**: `inventory_transactions` is append-only; the `apply_inventory_transaction` trigger updates the running `inventory` totals so on-hand can be rebuilt from the ledger at any point.
- **Money integrity**: `recalc_po_totals` / `recalc_so_totals` triggers keep header totals in lock-step with line items — the client cannot lie about a total.
- **Storage isolation**: `product-images` and `org-logos` buckets use path prefix `{organization_id}/…` with policies that check `storage.foldername(name)[1] = organization_id::text`.

---

## End-to-end testing

<p align="center">
  <img src="docs/diagrams/e2e-testing.png" alt="StockFlow E2E test architecture" width="1000"/>
</p>

The test suite drives a real Chromium browser through the live app.

- **Runner**: `pytest` + `playwright` (sync API, headless Chromium, viewport 1280 × 1600)
- **Reporter**: `allure-pytest` — each test attaches its screenshots and any page errors
- **Scope**: 15 tests covering marketing, auth, onboarding, all 10 navigation routes, and sign-out
- **Determinism**: every test signs in from scratch — no cookie/state carry-over between tests

Run it locally:

```bash
# 1. Install deps
python -m pip install allure-pytest pytest-playwright
python -m playwright install chromium

# 2. Start the app (in another terminal)
bun install && bun run dev

# 3. Execute the suite
pytest tests/test_e2e.py --alluredir=allure-results

# 4. Generate & open the Allure report
allure generate allure-results -o allure-report --clean
allure open allure-report
```

### Test matrix

| # | Feature | Story | Screenshot |
|---|---------|-------|------------|
| 1 | Marketing | Landing page renders | `01_landing.png` |
| 2 | Auth | Sign-in form renders | `02_auth.png` |
| 3 | Auth | Admin can sign in | `03_auth_filled.png`, `04_after_signin.png` |
| 4 | Onboarding | Post-signin routes correctly | `05_post_signin_route.png` – `07_dashboard.png` |
| 5–14 | App shell | Each of 10 sidebar routes renders | `10_route_*.png` |
| 15 | Auth | Sign-out clears session | `20_signed_out.png` |

---

## Allure test report

Latest run: **15 tests · 100% passing · 52.7s**

| Overview | Suites |
|---|---|
| ![Allure overview](docs/screenshots/allure_01_overview.png) | ![Allure suites](docs/screenshots/allure_02_suites.png) |

| Graphs | Behaviors |
|---|---|
| ![Allure graphs](docs/screenshots/allure_03_graph.png) | ![Allure behaviors](docs/screenshots/allure_04_behaviors.png) |

---

## Local development

```bash
# Install
bun install

# Dev server (Vite + TanStack Start SSR on http://localhost:8080)
bun run dev

# Type-check
bunx tsgo

# Database migrations live in supabase/migrations/ and are applied via Lovable Cloud
```

### Environment variables

Client-visible (Vite):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-only (Cloudflare Worker):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` (managed)

---

## Admin credentials

An admin user is provisioned in the connected Supabase project for QA and demos:

| Email | Password |
|---|---|
| `abhichy30@gmail.com` | `12345678` |

> Change the password immediately in production. This account is confirmed and can log in via email + password from `/auth`.

---

## Repository layout

```
src/
├── routes/                    # File-based routing (TanStack Router)
│   ├── __root.tsx             # Root shell, head metadata, auth listener
│   ├── index.tsx              # Public landing page
│   ├── auth.tsx               # Sign in / sign up
│   └── _authenticated/        # Client-only auth gate (redirects to /auth)
│       ├── route.tsx
│       ├── onboarding.tsx     # Create-organization flow
│       ├── dashboard.tsx      # KPI dashboard
│       ├── products.tsx       # …and 8 more module routes
│       └── …
├── components/
│   ├── app-shell.tsx          # Sidebar + top bar layout
│   ├── app-sidebar.tsx        # Nav items
│   ├── top-bar.tsx            # Org switcher, account menu
│   └── ui/                    # shadcn/ui primitives
├── hooks/
│   └── use-organizations.tsx  # Multi-org context + local persistence
├── lib/
│   └── organizations.functions.ts   # createServerFn: getMyOrganizations, createOrganization
├── integrations/supabase/     # Generated client + auth middleware
└── styles.css                 # Tailwind v4 tokens + theme

supabase/migrations/           # Full schema, RLS, RPCs, storage policies
tests/test_e2e.py              # 15-test Playwright suite (Allure-tagged)
docs/
├── screenshots/               # Captured by the E2E suite
└── diagrams/                  # Mermaid sources + rendered PNGs
```

---

<p align="center">
  <sub>StockFlow is <b>custom-coded</b> from the database schema up. No templates, no drag-and-drop — every RLS policy, every server function, every test is authored for this app.</sub>
</p>
