import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook que rastreia sessões de login dos corretores.
 * Registra automaticamente quando um corretor faz login ou refresha o token.
 */
export function useBrokerSessionTracker() {
  const hasTracked = useRef(false);

  useEffect(() => {
    const trackSession = async () => {
      // Evitar múltiplos registros na mesma sessão
      if (hasTracked.current) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Verificar se é corretor
        const { data: broker, error: brokerError } = await supabase
          .from("brokers")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (brokerError || !broker) return;

        // Detectar método de login baseado no auth event mais recente
        // Por padrão consideramos 'token' se não houver senha recente
        const loginMethod = "token";

        // Registrar sessão
        const { error: insertError } = await supabase
          .from("broker_sessions")
          .insert({
            broker_id: broker.id,
            user_id: session.user.id,
            login_method: loginMethod,
            user_agent: navigator.userAgent,
          } as any);

        if (!insertError) {
          hasTracked.current = true;
        }
      } catch (error) {
        console.error("Erro ao rastrear sessão:", error);
      }
    };

    // Rastrear na montagem inicial
    trackSession();

    // Escutar mudanças de auth para detectar logins
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        hasTracked.current = false; // Reset para permitir novo registro
        trackSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}

/**
 * Hook para registrar atividades dos corretores.
 * Use as funções retornadas para logar diferentes tipos de atividades.
 */
export function useBrokerActivityLogger() {
  const logActivity = async (
    activityType: "lead_update" | "note_added" | "doc_processed" | "status_change",
    options: {
      leadId?: string;
      details?: Record<string, unknown>;
    } = {}
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Verificar se é corretor
      const { data: broker } = await supabase
        .from("brokers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!broker) return false;

      const { error } = await supabase
        .from("broker_activity_logs")
        .insert({
          broker_id: broker.id,
          user_id: session.user.id,
          activity_type: activityType,
          lead_id: options.leadId,
          details: options.details,
          user_agent: navigator.userAgent,
        } as any);

      return !error;
    } catch (error) {
      console.error("Erro ao registrar atividade:", error);
      return false;
    }
  };

  return {
    logLeadUpdate: (leadId: string, details?: Record<string, unknown>) =>
      logActivity("lead_update", { leadId, details }),
    logNoteAdded: (leadId: string, details?: Record<string, unknown>) =>
      logActivity("note_added", { leadId, details }),
    logDocProcessed: (leadId: string, details?: Record<string, unknown>) =>
      logActivity("doc_processed", { leadId, details }),
    logStatusChange: (leadId: string, details?: Record<string, unknown>) =>
      logActivity("status_change", { leadId, details }),
  };
}
