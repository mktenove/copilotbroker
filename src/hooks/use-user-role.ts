import { useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setState({ role: null, isLoading: false, brokerId: null, isLeader: false });
          return;
        }

        const { data: rolesData, error: roleError } = await (supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id) as any);

        if (roleError) {
          console.error("Erro ao buscar role:", roleError);
          setState({ role: null, isLoading: false, brokerId: null, isLeader: false });
          return;
        }

        const roles = (rolesData || []).map((r: { role: string }) => r.role);
        const isLeader = roles.includes("leader");
        
        // Priorizar: admin > broker (leader é flag separada)
        let role: AppRole = null;
        if (roles.includes("admin")) {
          role = "admin";
        } else if (roles.includes("broker") || roles.includes("leader")) {
          role = "broker";
        }

        // Buscar broker_id se o usuário tem role broker ou leader
        let brokerId = null;
        if (roles.includes("broker") || roles.includes("leader")) {
          const { data: brokerData } = await (supabase
            .from("brokers" as any)
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle() as any);
          
          brokerId = brokerData?.id || null;
        }

        setState({ role, isLoading: false, brokerId, isLeader });
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        setState({ role: null, isLoading: false, brokerId: null, isLeader: false });
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
};
