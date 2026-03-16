import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TenantInfo {
  tenantId: string | null;
  tenantName: string | null;
  planType: string | null;
  status: string | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantInfo>({
  tenantId: null,
  tenantName: null,
  planType: null,
  status: null,
  isLoading: true,
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo>({
    tenantId: null,
    tenantName: null,
    planType: null,
    status: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchTenant = async (_userId: string) => {
      try {
        // Use SECURITY DEFINER RPC to get tenant_id (bypasses RLS on tenant_memberships)
        const { data: tenantIdFromRpc } = await (supabase.rpc("get_my_tenant_id" as any) as any);

        if (!tenantIdFromRpc) {
          setTenant({ tenantId: null, tenantName: null, planType: null, status: null, isLoading: false });
          return;
        }

        // Get tenant details
        const { data: tenantData, error: tError } = await supabase
          .from("tenants" as any)
          .select("id, name, plan_type, status")
          .eq("id", tenantIdFromRpc)
          .single() as any;

        if (tError || !tenantData) {
          setTenant({ tenantId: tenantIdFromRpc, tenantName: null, planType: null, status: null, isLoading: false });
          return;
        }

        setTenant({
          tenantId: tenantData.id,
          tenantName: tenantData.name,
          planType: tenantData.plan_type,
          status: tenantData.status,
          isLoading: false,
        });
      } catch (error) {
        console.error("Erro ao buscar tenant:", error);
        setTenant({ tenantId: null, tenantName: null, planType: null, status: null, isLoading: false });
      }
    };

    // Initialize from current session immediately (avoids TOKEN_REFRESHED trap)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchTenant(session.user.id);
      } else {
        setTenant({ tenantId: null, tenantName: null, planType: null, status: null, isLoading: false });
      }
    });

    // Listen for subsequent sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      if (!session?.user) {
        setTenant({ tenantId: null, tenantName: null, planType: null, status: null, isLoading: false });
        return;
      }
      // Set isLoading: true BEFORE fetching so SubscriptionGuard waits instead of
      // redirecting to /planos while the async fetch is still in flight.
      setTenant(prev => ({ ...prev, isLoading: true }));
      fetchTenant(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}
