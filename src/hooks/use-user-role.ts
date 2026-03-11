import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "broker" | null;

interface UserRoleState {
  role: AppRole;
  isLoading: boolean;
  brokerId: string | null;
  isLeader: boolean;
  tenantId: string | null;
}

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isLoading: true,
    brokerId: null,
    isLeader: false,
    tenantId: null,
  });

  const isFetchingRef = useRef(false);
  const cachedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async (userId: string) => {
      // Skip if already fetching or cached for same user
      if (isFetchingRef.current) return;
      if (cachedUserIdRef.current === userId && !state.isLoading) return;

      isFetchingRef.current = true;

      try {
        // Parallel fetch: roles + broker info + tenant membership
        const [rolesResult, brokerResult, tenantResult] = await Promise.all([
          supabase
            .from("user_roles" as any)
            .select("role")
            .eq("user_id", userId) as any,
          supabase
            .from("brokers" as any)
            .select("id")
            .eq("user_id", userId)
            .maybeSingle() as any,
          supabase
            .from("tenant_memberships" as any)
            .select("tenant_id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle() as any,
        ]);

        if (rolesResult.error) {
          console.error("Erro ao buscar role:", rolesResult.error);
          setState({ role: null, isLoading: false, brokerId: null, isLeader: false, tenantId: null });
          return;
        }

        const roles = (rolesResult.data || []).map((r: { role: string }) => r.role);
        const isLeader = roles.includes("leader");

        let role: AppRole = null;
        if (roles.includes("admin")) {
          role = "admin";
        } else if (roles.includes("broker") || roles.includes("leader")) {
          role = "broker";
        }

        const brokerId = brokerResult.data?.id || null;
        const tenantId = tenantResult.data?.tenant_id || null;

        cachedUserIdRef.current = userId;
        setState({ role, isLoading: false, brokerId, isLeader, tenantId });
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        setState({ role: null, isLoading: false, brokerId: null, isLeader: false, tenantId: null });
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Initialize from current session immediately (avoids TOKEN_REFRESHED trap)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setState({ role: null, isLoading: false, brokerId: null, isLeader: false, tenantId: null });
      }
    });

    // Listen for subsequent sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

      if (!session?.user) {
        cachedUserIdRef.current = null;
        setState({ role: null, isLoading: false, brokerId: null, isLeader: false, tenantId: null });
        return;
      }

      fetchUserRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
};
