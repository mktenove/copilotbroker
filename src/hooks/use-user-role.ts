import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "leader" | "broker" | null;

interface UserRoleState {
  role: AppRole;
  isLoading: boolean;
  brokerId: string | null;
}

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isLoading: true,
    brokerId: null,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setState({ role: null, isLoading: false, brokerId: null });
          return;
        }

        // Verificar roles do usuário (pode ter múltiplas)
        const { data: rolesData, error: roleError } = await (supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id) as any);

        if (roleError) {
          console.error("Erro ao buscar role:", roleError);
          setState({ role: null, isLoading: false, brokerId: null });
          return;
        }

        // Priorizar admin > leader > broker se tiver múltiplas roles
        const roles = (rolesData || []).map((r: { role: string }) => r.role);
        let role: AppRole = null;
        if (roles.includes("admin")) {
          role = "admin";
        } else if (roles.includes("leader")) {
          role = "leader";
        } else if (roles.includes("broker")) {
          role = "broker";
        }

        // Buscar broker_id se o usuário TEM a role "broker" (independente de ter admin também)
        let brokerId = null;
        if (roles.includes("broker") || roles.includes("leader")) {
          const { data: brokerData } = await (supabase
            .from("brokers" as any)
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle() as any);
          
          brokerId = brokerData?.id || null;
        }

        setState({ role, isLoading: false, brokerId });
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        setState({ role: null, isLoading: false, brokerId: null });
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
