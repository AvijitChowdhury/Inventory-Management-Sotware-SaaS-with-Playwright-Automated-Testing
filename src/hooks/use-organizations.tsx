import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrganizations } from "@/lib/organizations.functions";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  role: string;
};

type OrgContextValue = {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrgId: (id: string) => void;
  isLoading: boolean;
  refetch: () => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "stockflow.currentOrgId";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const fetchOrgs = useServerFn(getMyOrganizations);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-organizations"],
    queryFn: () => fetchOrgs(),
  });

  const organizations = data ?? [];
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && organizations.some((o) => o.id === saved)) {
      setCurrentOrgIdState(saved);
    } else if (organizations.length > 0) {
      setCurrentOrgIdState(organizations[0].id);
    }
  }, [organizations]);

  const setCurrentOrgId = (id: string) => {
    setCurrentOrgIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  };

  const value = useMemo<OrgContextValue>(
    () => ({
      organizations,
      currentOrg: organizations.find((o) => o.id === currentOrgId) ?? null,
      setCurrentOrgId,
      isLoading,
      refetch: () => void refetch(),
    }),
    [organizations, currentOrgId, isLoading, refetch],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganizations() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrganizations must be used inside OrganizationProvider");
  return ctx;
}
