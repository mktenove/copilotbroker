import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "broker" | null;

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

        // Verificar role do usuário usando query genérica
        const { data: roleData, error: roleError } = await (supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle() as any);

        if (roleError) {
          console.error("Erro ao buscar role:", roleError);
          setState({ role: null, isLoading: false, brokerId: null });
          return;
        }

        const role = (roleData?.role as AppRole) || null;

        // Se for corretor, buscar o broker_id
        let brokerId = null;
        if (role === "broker") {
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
