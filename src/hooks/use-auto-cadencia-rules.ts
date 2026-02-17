import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./use-user-role";
import { toast } from "sonner";

export interface BrokerAutoCadenciaRule {
  id: string;
  broker_id: string;
  project_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
}

export function useAutoCadenciaRules() {
  const { brokerId } = useUserRole();
  const [rules, setRules] = useState<BrokerAutoCadenciaRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!brokerId) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("broker_auto_cadencia_rules") as any)
        .select(`*, project:projects(id, name)`)
        .eq("broker_id", brokerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules((data as BrokerAutoCadenciaRule[]) || []);
    } catch (error) {
      console.error("Error fetching cadencia rules:", error);
      toast.error("Erro ao carregar regras de cadência");
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  useEffect(() => {
    if (brokerId) fetchRules();
  }, [brokerId, fetchRules]);

  const createRule = async (data: { project_id: string | null; is_active: boolean }) => {
    if (!brokerId) return null;
    setIsSaving(true);
    try {
      const { data: newRule, error } = await (supabase
        .from("broker_auto_cadencia_rules") as any)
        .insert({
          broker_id: brokerId,
          project_id: data.project_id,
          is_active: data.is_active,
        })
        .select(`*, project:projects(id, name)`)
        .single();

      if (error) throw error;
      setRules(prev => [newRule as BrokerAutoCadenciaRule, ...prev]);
      toast.success("Regra de cadência criada!");
      return newRule;
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Já existe uma regra para este empreendimento");
      } else {
        toast.error("Erro ao criar regra");
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const updateRule = async (id: string, data: Partial<{ project_id: string | null; is_active: boolean }>) => {
    setIsSaving(true);
    try {
      const { data: updated, error } = await (supabase
        .from("broker_auto_cadencia_rules") as any)
        .update(data)
        .eq("id", id)
        .select(`*, project:projects(id, name)`)
        .single();

      if (error) throw error;
      setRules(prev => prev.map(r => r.id === id ? updated as BrokerAutoCadenciaRule : r));
      toast.success("Regra atualizada!");
      return updated;
    } catch (error) {
      toast.error("Erro ao atualizar regra");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await (supabase
        .from("broker_auto_cadencia_rules") as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Regra excluída!");
      return true;
    } catch (error) {
      toast.error("Erro ao excluir regra");
      return false;
    }
  };

  const toggleRuleActive = async (id: string, is_active: boolean) => {
    return updateRule(id, { is_active });
  };

  return { rules, isLoading, isSaving, fetchRules, createRule, updateRule, deleteRule, toggleRuleActive };
}
