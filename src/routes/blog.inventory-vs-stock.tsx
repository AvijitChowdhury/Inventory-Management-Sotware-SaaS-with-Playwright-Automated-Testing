import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CANONICAL = "https://item-chum-flow.lovable.app/blog/inventory-vs-stock";
const TITLE = "Inventory vs Stock: What's the Difference? (2026 Guide)";
const DESCRIPTION =
  "Inventory and stock sound identical but mean different things in operations, accounting, and software. A clear guide with definitions, examples, and when each term matters.";

export const Route = createFileRoute("/blog/inventory-vs-stock")({
  component: InventoryVsStockPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "article:section", content: "Inventory Management" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          url: CANONICAL,
          mainEntityOfPage: CANONICAL,
          inLanguage: "en",
          author: { "@type": "Organization", name: "StockFlow" },
          publisher: {
            "@type": "Organization",
            name: "StockFlow",
            url: "https://item-chum-flow.lovable.app",
          },
          about: [
            { "@type": "Thing", name: "Inventory management" },
            { "@type": "Thing", name: "Stock control" },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is inventory the same as stock?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "In everyday use they overlap, but 'stock' usually refers only to finished goods available for sale, while 'inventory' covers everything a business holds — raw materials, work-in-progress, finished goods, MRO supplies, and safety stock.",
              },
            },
            {
              "@type": "Question",
              name: "Which term should retailers use?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Retailers typically talk about 'stock' because they only handle finished goods. Manufacturers, distributors, and multi-location operators use 'inventory' because they track raw materials and work-in-progress alongside finished goods.",
              },
            },
            {
              "@type": "Question",
              name: "Do accounting and software treat them differently?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Accounting standards (IFRS and US GAAP) recognize 'inventory' as the balance-sheet asset. Most inventory management software uses 'inventory' as the parent record and 'stock' or 'stock on hand' as the per-location quantity.",
              },
            },
          ],
        }),
      },
    ],
  }),
});

function InventoryVsStockPage() {
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
              search={{ mode: "signin" }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Blog</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Inventory vs Stock</span>
        </nav>

        <article className="prose prose-slate max-w-none dark:prose-invert">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Inventory management guide
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Inventory vs Stock: What's the Difference?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            "Inventory" and "stock" are often used interchangeably, but they mean different
            things depending on whether you're talking to a retailer, a manufacturer, an
            accountant, or a warehouse manager. Here's a plain-English breakdown, why the
            distinction matters, and how modern inventory software models both.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">Quick answer</h2>
          <ul>
            <li>
              <strong>Stock</strong> = finished goods you have on hand that are ready to sell.
            </li>
            <li>
              <strong>Inventory</strong> = everything your business holds to run and produce —
              raw materials, work-in-progress, finished goods, MRO supplies, and safety stock.
            </li>
            <li>All stock is inventory. Not all inventory is stock.</li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold">What "stock" means</h2>
          <p>
            In retail and e-commerce, stock is the count of sellable units on the shelf, in the
            stockroom, or in a fulfillment center. It's the number a store manager checks
            before promising a customer they can buy something today. Reorder points, low-stock
            alerts, and stockouts are all about this narrower view.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">What "inventory" means</h2>
          <p>
            Inventory is the operational and accounting concept. It covers every physical item
            a business is holding to run the business, typically split into four buckets:
          </p>
          <ul>
            <li>
              <strong>Raw materials</strong> — inputs waiting to be turned into a product
              (flour for a bakery, aluminum for a bike factory).
            </li>
            <li>
              <strong>Work-in-progress (WIP)</strong> — partially finished items on the
              production line.
            </li>
            <li>
              <strong>Finished goods</strong> — completed items ready to sell. This is the
              subset most people call "stock".
            </li>
            <li>
              <strong>MRO (maintenance, repair, operations)</strong> — supplies used to keep
              the business running: packaging, cleaning supplies, spare machine parts.
            </li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold">Why the distinction matters</h2>
          <p>
            The two words feel like synonyms until they don't. Three places where it changes
            decisions:
          </p>
          <ol>
            <li>
              <strong>Accounting.</strong> IFRS and US GAAP recognize <em>inventory</em> as a
              current asset on the balance sheet. Valuation methods (FIFO, LIFO, weighted
              average) apply to inventory, not just to sellable stock.
            </li>
            <li>
              <strong>Purchasing.</strong> A purchasing team that only reorders based on
              finished-goods stock misses raw-material and MRO shortages, which cause silent
              production delays.
            </li>
            <li>
              <strong>Reporting.</strong> "How much stock do we have?" and "How much inventory
              is on the balance sheet?" produce different numbers. Executives, warehouse teams,
              and finance teams need to agree on which one they're looking at.
            </li>
          </ol>

          <h2 className="mt-10 text-2xl font-semibold">
            How inventory software models the difference
          </h2>
          <p>
            Most modern inventory platforms — including StockFlow — treat <em>inventory</em> as
            the parent concept and <em>stock on hand</em> as a per-location quantity. That
            gives you a single product record with:
          </p>
          <ul>
            <li>Global inventory across every warehouse, store, or 3PL.</li>
            <li>Stock on hand per location so store staff see only what's local.</li>
            <li>Committed, available, and incoming quantities distinct from raw counts.</li>
          </ul>
          <p>
            The ledger-based approach (every movement is a signed transaction) means you can
            reconcile inventory across the whole business while still answering "is this in
            stock at Store #4?" instantly.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">Which term should you use?</h2>
          <ul>
            <li>
              Selling only finished goods (retail, DTC, marketplace)? <strong>Stock</strong> is
              usually clearer.
            </li>
            <li>
              Running production, multiple locations, or 3PLs? <strong>Inventory</strong>{" "}
              scales better because it includes everything you're tracking.
            </li>
            <li>
              Talking to finance or auditors? Use <strong>inventory</strong> — that's the
              balance-sheet word.
            </li>
          </ul>

          <div className="mt-12 rounded-lg border border-border bg-muted/40 p-6">
            <h3 className="text-lg font-semibold">Track both in one place</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              StockFlow gives you real-time stock on hand per location, plus full inventory
              visibility across products, purchase orders, and sales orders.
            </p>
            <div className="mt-4">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button>
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} StockFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
