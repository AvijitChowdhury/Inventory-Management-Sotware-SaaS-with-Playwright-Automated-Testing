import { useOrganizations } from "@/hooks/use-organizations";

export function useCurrentOrgId(): string | null {
  const { currentOrg } = useOrganizations();
  return currentOrg?.id ?? null;
}

export function formatMoney(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
