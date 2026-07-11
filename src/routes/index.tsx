import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  BarChart3,
  Layers,
  ShieldCheck,
  Truck,
  Users,
  ArrowRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "StockFlow — Real-time Inventory Management for Growing Teams" },
      {
        name: "description",
        content:
          "Track stock, purchase orders, and sales in one place. StockFlow gives retailers and distributors a single source of truth across every location.",
      },
      {
        property: "og:title",
        content: "StockFlow — Real-time Inventory Management",
      },
      {
        property: "og:description",
        content:
          "One platform for products, stock, suppliers, customers, purchasing, and sales — built for multi-location teams.",
      },
      { property: "og:url", content: "https://item-chum-flow.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://item-chum-flow.lovable.app/" }],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">StockFlow</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Multi-tenant inventory SaaS
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            One source of truth for stock,
            <br />
            purchasing, and sales.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            StockFlow gives growing businesses real-time inventory across every warehouse and
            store — no spreadsheets, no reconciliation headaches, no stockouts.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} StockFlow</span>
          <span>Built for operators.</span>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: Package,
    title: "Real-time inventory",
    body: "Immutable ledger keeps every stock movement traceable, across every warehouse.",
  },
  {
    icon: Truck,
    title: "Purchasing & sales",
    body: "Create POs and sales orders that auto-update inventory on receive and fulfill.",
  },
  {
    icon: Users,
    title: "Team roles",
    body: "Owner, admin, manager, staff, and viewer roles — enforced at the database layer.",
  },
  {
    icon: Layers,
    title: "Multi-location",
    body: "Track stock across warehouses and stores, and transfer between locations.",
  },
  {
    icon: BarChart3,
    title: "Reports that ship",
    body: "Low-stock alerts, valuation, sales summary, top products — with CSV export.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "Row-level tenant isolation. Your data is invisible to every other organization.",
  },
];
