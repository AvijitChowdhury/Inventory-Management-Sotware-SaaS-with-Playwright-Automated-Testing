# StockPilot — Multi-Tenant Inventory Management Platform

> A custom-built, production-grade inventory management SaaS. Designed and coded from the ground up — schema, backend, frontend, auth, RLS, and a full end-to-end test suite with Allure reporting.

<p align="center">
  <img src="docs/screenshots/01_landing.png" alt="StockPilot Landing Page" width="900"/>
</p>

<p align="center">
  <a href="#-highlights"><img src="https://img.shields.io/badge/status-active-brightgreen" alt="status"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="ts"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="react"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/TanStack%20Start-v1-EF4444" alt="tanstack"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="tailwind"/></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Postgres-RLS-336791?logo=postgresql&logoColor=white" alt="postgres"/></a>
  <a href="#-end-to-end-testing"><img src="https://img.shields.io/badge/E2E-Playwright%20%2B%20Allure-2EAD33?logo=playwright&logoColor=white" alt="playwright"/></a>
  <a href="#-end-to-end-testing"><img src="https://img.shields.io/badge/tests-39%2F39%20passing-brightgreen" alt="tests"/></a>
</p>

---

## Table of Contents

1. [Highlights](#-highlights)
2. [Tech Stack](#-tech-stack)
3. [System Architecture](#-system-architecture)
4. [Feature Tour](#-feature-tour)
5. [Product Roadmap](#-product-roadmap)
6. [Database & Security Model](#-database--security-model)
7. [End-to-End Testing](#-end-to-end-testing)
8. [Local Development](#-local-development)
9. [Admin Credentials](#-admin-credentials)
10. [Repository Layout](#-repository-layout)
11. [Credits](#-credits)

---

## Highlights

- **Custom-coded, not scaffolded.** Every route, server function, RLS policy, migration and test in this repo was authored for this project.
- **Multi-tenant by design.** Organizations are first-class; users belong to one or more orgs and every table is scoped by `organization_id` at the database layer.
- **Secure by default.** Row Level Security enforced on every public table, `SECURITY DEFINER` helpers for role checks, storage buckets with per-org policies, and Google + email/password auth out of the box.
- **Full-stack type safety.** TanStack Start + strict TypeScript + typed server functions + typed router — the same contract flows from database to UI.
- **Production-grade QA.** A **39-test Playwright (E2E + CRUD) suite** (Page Object Model) covers marketing, SEO, auth (valid + invalid credentials), onboarding, dashboard KPIs, protected-route redirects, blog content, every application route and sign-out — published as a browsable **Allure report** with screenshots on every step.
- **Documented like a product.** System architecture, E2E flow, and every UI state are rendered as diagrams and screenshots checked into the repo.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **TanStack Start v1** (React 19, SSR, file-based routing) |
| Build tool | **Vite 7** + Lightning CSS |
| Language | **TypeScript** (strict mode) |
| Styling | **Tailwind CSS v4** with semantic design tokens |
| UI kit | **shadcn/ui** on Radix primitives |
| State & data | **TanStack Query** wired into router loaders |
| Backend runtime | **Cloudflare Workers** (edge) via server functions |
| Database | **PostgreSQL** with Row Level Security |
| Auth | Email/password + **Google OAuth** |
| Storage | Object storage with per-org RLS (product images, org logos) |
| E2E testing | **Playwright (Python)** + **Allure** report |
| Diagrams | **Mermaid** rendered to PNG |

---

## System Architecture

<p align="center">
  <img src="docs/diagrams/system-architecture.png" alt="System architecture" width="880"/>
</p>

The browser talks to the edge-rendered TanStack Start app. Client components call **typed server functions** (`createServerFn`) which are stripped from the browser bundle and run on the edge with the caller's Supabase JWT attached by `attachSupabaseAuth`. The server function opens a scoped Supabase client and every query is filtered by **RLS policies** keyed on `auth.uid()` and the user's `organization_id`. Auth flows (email/password + Google OAuth) run directly against the auth service; on success the session is hydrated on the client and forwarded to every subsequent server call.

---

## Feature Tour

### 1. Marketing landing page
Distinct, on-brand landing page with clear CTAs into the product.

<p align="center"><img src="docs/screenshots/01_landing.png" alt="Landing" width="820"/></p>

### 2. Authentication — email/password + Google OAuth
Unified sign-in / sign-up experience with social auth pre-wired.

<p align="center">
  <img src="docs/screenshots/02_auth.png" alt="Auth" width="400"/>
  <img src="docs/screenshots/03_auth_filled.png" alt="Auth filled" width="400"/>
</p>

### 3. Organization onboarding
First-run flow: create your organization, become its owner, get dropped into the dashboard. Enforced by the `_authenticated` layout — unauthenticated users are redirected to `/auth` before any protected loader runs.

<p align="center"><img src="docs/screenshots/06_onboarding_filled.png" alt="Onboarding" width="820"/></p>

### 4. Dashboard — KPIs & getting-started checklist
Sidebar + top bar shell with organization switcher, KPI cards, and a guided next-step checklist.

<p align="center"><img src="docs/screenshots/07_dashboard.png" alt="Dashboard" width="820"/></p>

### 5. Application shell — every module routed and protected

| Products | Categories | Suppliers |
|---|---|---|
| ![Products](docs/screenshots/10_route_products.png) | ![Categories](docs/screenshots/10_route_categories.png) | ![Suppliers](docs/screenshots/10_route_suppliers.png) |

| Customers | Inventory | Purchase Orders |
|---|---|---|
| ![Customers](docs/screenshots/10_route_customers.png) | ![Inventory](docs/screenshots/10_route_inventory.png) | ![PO](docs/screenshots/10_route_purchase_orders.png) |

| Sales Orders | Reports | Settings |
|---|---|---|
| ![SO](docs/screenshots/10_route_sales_orders.png) | ![Reports](docs/screenshots/10_route_reports.png) | ![Settings](docs/screenshots/10_route_settings.png) |

### 6. Sign-out
Full session tear-down and redirect back to the marketing site.

<p align="center"><img src="docs/screenshots/20_signed_out.png" alt="Signed out" width="820"/></p>

---

## Product Roadmap

Phase 1 ships the multi-tenant foundation end-to-end. Modules for Phases 2–8 are routed and gated today; their UIs land iteratively on top of the already-migrated database schema.

| Phase | Scope | Status |
|---|---|---|
| **1** | Cloud, schema, auth, onboarding, org context, app shell, dashboard | ✅ **Shipped** |
| 2 | Products & Categories CRUD, image upload | 🚧 UI in progress (DB ready) |
| 3 | Suppliers & Customers CRM | 🚧 UI in progress (DB ready) |
| 4 | Inventory levels, adjustments, stock movements | 🚧 UI in progress (DB ready) |
| 5 | Purchase Orders (draft → received) | 🚧 UI in progress (DB ready) |
| 6 | Sales Orders (draft → fulfilled) | 🚧 UI in progress (DB ready) |
| 7 | Reports & analytics views | 🚧 UI in progress (DB ready) |
| 8 | Settings, roles, invitations | 🚧 UI in progress (DB ready) |

---

## Database & Security Model

- **Every public-schema table** carries an `organization_id`, has RLS enabled, and receives explicit `GRANT`s alongside its `CREATE TABLE` migration.
- **Roles are stored in a dedicated `user_roles` table** — never on profiles — and checked via a `SECURITY DEFINER` `has_role(user_id, role)` helper to prevent recursive RLS and privilege-escalation attacks.
- **Reporting views** run with `security_invoker = true` so the caller's RLS still applies.
- **Storage buckets** (`product-images`, `org-logos`) enforce per-organization read/write policies.
- **Auth**: email/password with confirmation, Google OAuth pre-configured, anonymous sign-ups disabled.

---

## End-to-End Testing

The suite lives in [`tests/test_e2e.py`](tests/test_e2e.py) and drives a real Chromium against the app. Every step captures a screenshot into `docs/screenshots/` and reports into **Allure**.

### E2E flow

<p align="center">
  <img src="docs/diagrams/e2e-testing.png" alt="E2E flow" width="880"/>
</p>

### Run it locally

```bash
# Deps
pip install playwright pytest allure-pytest
playwright install chromium

# Run + generate Allure results
pytest tests/test_e2e.py --alluredir=allure-results

# Render the browsable report
allure generate allure-results -o allure-report --clean
allure open allure-report
```

### Result — 39 / 39 passing (32 E2E + 7 CRUD)

| Overview | Suites |
|---|---|
| ![Allure overview](docs/screenshots/allure_01_overview.png) | ![Allure suites](docs/screenshots/allure_02_suites.png) |

| Graphs | Behaviors |
|---|---|
| ![Allure graphs](docs/screenshots/allure_03_graph.png) | ![Allure behaviors](docs/screenshots/allure_04_behaviors.png) |

| Timeline | Categories |
|---|---|
| ![Allure timeline](docs/screenshots/allure_05_timeline.png) | ![Allure categories](docs/screenshots/allure_06_categories.png) |

| Packages | New coverage screenshots |
|---|---|
| ![Allure packages](docs/screenshots/allure_07_packages.png) | ![Blog guide](docs/screenshots/31_blog_inventory_vs_stock.png) |

Covered flows: landing render + CTAs, `robots.txt`, `sitemap.xml`, `/blog/inventory-vs-stock`, sign-up, sign-in, **invalid credentials**, **protected-route redirect**, onboarding create-org, dashboard KPIs, top-bar account menu, sidebar presence on 5 modules, direct navigation to all 10 modules, products / reports / settings content checks, 404 not-found, sign-out, and **full CRUD** (create → verify → delete) for Categories, Suppliers, Customers, and Products plus organization-name edit + persistence, inventory adjust-stock control, and reports KPI sections.

---

## Local Development

```bash
# 1. Install
bun install

# 2. Start the dev server (Vite + TanStack Start)
bun dev

# 3. Open the app
open http://localhost:8080
```

The backend (Postgres, auth, storage, edge runtime) is provisioned via Lovable Cloud — no local database setup required. Environment values are wired through `.env` and consumed by the generated Supabase client.

Useful scripts:

```bash
bunx tsgo --noEmit      # strict typecheck
bun run build           # production build
```

---

## Admin Credentials

A seeded admin account is available for demo / QA:

```
email:    abhichy30@gmail.com
password: 12345678
```

> Rotate before any real deployment.

---

## Repository Layout

```
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # Root layout, head metadata, auth listener
│   │   ├── index.tsx               # Marketing landing page
│   │   ├── auth.tsx                # Sign-in / sign-up + Google OAuth
│   │   └── _authenticated/         # Protected layout + all app modules
│   ├── components/                 # App shell, sidebar, top bar, shadcn/ui
│   ├── hooks/use-organizations.tsx # Org context + switcher
│   ├── lib/*.functions.ts          # Typed server functions (createServerFn)
│   ├── integrations/supabase/      # Generated client + auth middleware
│   └── styles.css                  # Tailwind v4 + semantic tokens
├── supabase/migrations/            # Schema, RLS, grants, storage policies
├── tests/test_e2e.py               # Playwright + Allure E2E suite
├── allure-report/                  # Pre-rendered report (browse index.html)
├── docs/
│   ├── diagrams/                   # Mermaid sources + rendered PNGs
│   └── screenshots/                # Feature + Allure screenshots
└── README.md
```

---

## Credits

Designed, coded, tested and documented as a single-author project. All schema, UI, server functions, RLS policies, tests, diagrams and copy are original work — no template pages, no scaffolded placeholders in shipped surfaces.
