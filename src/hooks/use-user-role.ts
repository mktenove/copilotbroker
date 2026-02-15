import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "broker" | null;

interface UserRoleState {
  role: AppRole;
  isLoading: boolean;
  brokerId: string | null;
  isLeader: boolean;
}

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isLoading: true,
    brokerId: null,
    isLeader: false,
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
        // Parallel fetch: roles + broker info at the same time
        const [rolesResult, brokerResult] = await Promise.all([
          supabase
            .from("user_roles" as any)
            .select("role")
            .eq("user_id", userId) as any,
          supabase
            .from("brokers" as any)
            .select("id")
            .eq("user_id", userId)
            .maybeSingle() as any,
        ]);

        if (rolesResult.error) {
          console.error("Erro ao buscar role:", rolesResult.error);
          setState({ role: null, isLoading: false, brokerId: null, isLeader: false });
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

        cachedUserIdRef.current = userId;
        setState({ role, isLoading: false, brokerId, isLeader });
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        setState({ role: null, isLoading: false, brokerId: null, isLeader: false });
      } finally {
        isFetchingRef.current = false;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only react to meaningful auth events
      if (event === "TOKEN_REFRESHED") return;

      if (!session?.user) {
        cachedUserIdRef.current = null;
        setState({ role: null, isLoading: false, brokerId: null, isLeader: false });
        return;
      }

      fetchUserRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
};
