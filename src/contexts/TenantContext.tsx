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
    const fetchTenant = async (userId: string) => {
      try {
        // Get user's tenant membership
        const { data: membership, error: mError } = await supabase
          .from("tenant_memberships" as any)
          .select("tenant_id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle() as any;

        if (mError || !membership) {
          setTenant({ tenantId: null, tenantName: null, planType: null, status: null, isLoading: false });
          return;
        }

        // Get tenant details
        const { data: tenantData, error: tError } = await supabase
          .from("tenants" as any)
          .select("id, name, plan_type, status")
          .eq("id", membership.tenant_id)
          .single() as any;

        if (tError || !tenantData) {
          setTenant({ tenantId: membership.tenant_id, tenantName: null, planType: null, status: null, isLoading: false });
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
