import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  isLoading: boolean;
  subscribed: boolean;
  status: "active" | "past_due" | null;
  planType: string | null;
  subscriptionEnd: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    subscribed: false,
    status: null,
    planType: null,
    subscriptionEnd: null,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isLoading: false, subscribed: false, status: null, planType: null, subscriptionEnd: null });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setState({
        isLoading: false,
        subscribed: data?.subscribed ?? false,
        status: data?.status ?? null,
        planType: data?.plan_type ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
      });
    } catch (err) {
      console.error("Erro ao verificar assinatura:", err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Auto-refresh every 60s
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Erro ao abrir portal:", err);
      throw err;
    }
  }, []);

  return { ...state, refresh: checkSubscription, openCustomerPortal };
}
