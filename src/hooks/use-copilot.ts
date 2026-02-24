import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CopilotConfig {
  id: string;
  broker_id: string;
  name: string;
  personality: string;
  persuasion_level: number;
  objectivity_level: number;
  use_mental_triggers: boolean;
  allow_emojis: boolean;
  language_style: string;
  commercial_priority: string;
  commercial_focus: string;
  incentive_visit: boolean;
  incentive_call: boolean;
  followup_auto: boolean;
  followup_tone: string;
  auto_close_inactive: boolean;
  max_autonomy: string;
  property_type: string;
  region: string | null;
  target_audience: string | null;
  brand_positioning: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCopilotConfig(brokerId: string | null) {
  const [config, setConfig] = useState<CopilotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!brokerId) return;
    try {
      const { data, error } = await supabase
        .from("copilot_configs")
        .select("*")
        .eq("broker_id", brokerId)
        .maybeSingle();

      if (error) throw error;
      setConfig(data as unknown as CopilotConfig | null);
    } catch (error) {
      console.error("Erro ao buscar config do copiloto:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = useCallback(async (updates: Partial<CopilotConfig>) => {
    if (!brokerId) return false;
    try {
      if (config) {
        const { error } = await supabase
          .from("copilot_configs")
          .update(updates as any)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("copilot_configs")
          .insert({ broker_id: brokerId, ...updates } as any);
        if (error) throw error;
      }
      await fetchConfig();
      toast.success("Configurações do Copiloto salvas!");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações");
      return false;
    }
  }, [brokerId, config, fetchConfig]);

  return { config, isLoading, saveConfig, fetchConfig };
}

export function useCopilotSuggestion() {
  const [suggestion, setSuggestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSuggestion = useCallback(async (params: {
    action: string;
    conversation_id?: string;
    lead_context?: Record<string, unknown>;
    messages?: Array<{ role: string; content: string }>;
    copilot_config?: Partial<CopilotConfig>;
  }) => {
    setIsGenerating(true);
    setSuggestion("");

    try {
      const { data, error } = await supabase.functions.invoke("copilot-ai", {
        body: params,
      });

      if (error) throw error;

      // Non-streaming response
      if (data?.suggestion) {
        setSuggestion(data.suggestion);
        setIsGenerating(false);
        return data.suggestion;
      }

      // If streaming, we need to handle differently
      setSuggestion(data?.suggestion || "Não foi possível gerar sugestão.");
      setIsGenerating(false);
      return data?.suggestion;
    } catch (error: any) {
      console.error("Erro ao gerar sugestão:", error);
      if (error?.status === 429) {
        toast.error("Limite de requisições IA excedido. Tente novamente em instantes.");
      } else if (error?.status === 402) {
        toast.error("Créditos de IA esgotados.");
      } else {
        toast.error("Erro ao consultar Copiloto IA");
      }
      setIsGenerating(false);
      return null;
    }
  }, []);

  return { suggestion, isGenerating, generateSuggestion, setSuggestion };
}
