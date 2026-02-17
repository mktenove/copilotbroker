import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./use-user-role";
import { toast } from "sonner";
import type { BrokerAutoMessageRule, AutoMessageRuleFormData } from "@/types/auto-message";

export function useAutoMessageRules() {
  const { brokerId } = useUserRole();
  const [rules, setRules] = useState<BrokerAutoMessageRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!brokerId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("broker_auto_message_rules")
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq("broker_id", brokerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setRules((data as unknown as BrokerAutoMessageRule[]) || []);
    } catch (error) {
      console.error("Error fetching auto message rules:", error);
      toast.error("Erro ao carregar regras de automação");
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  useEffect(() => {
    if (brokerId) {
      fetchRules();
    }
  }, [brokerId, fetchRules]);

  // Check if cadência 10D is active for same project
  const checkCadenciaConflict = async (projectId: string | null): Promise<boolean> => {
    if (!brokerId) return false;
    try {
      let query = (supabase.from("broker_auto_cadencia_rules") as any)
        .select("id")
        .eq("broker_id", brokerId)
        .eq("is_active", true);
      
      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      } else {
        query = query.is("project_id", null);
      }

      const { data } = await query.limit(1);
      return (data && data.length > 0);
    } catch { return false; }
  };

  const createRule = async (data: AutoMessageRuleFormData) => {
    if (!brokerId) return null;
    
    setIsSaving(true);
    try {
      // Check for cadência conflict
      if (data.is_active) {
        const hasConflict = await checkCadenciaConflict(data.project_id);
        if (hasConflict) {
          toast.error("Já existe uma Cadência 10D ativa para este empreendimento. Desative-a antes de ativar a 1ª Mensagem.");
          setIsSaving(false);
          return null;
        }
      }

      const { data: newRule, error } = await supabase
        .from("broker_auto_message_rules")
        .insert({
          broker_id: brokerId,
          project_id: data.project_id,
          message_content: data.message_content,
          delay_minutes: data.delay_minutes,
          is_active: data.is_active,
        })
        .select(`
          *,
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      setRules(prev => [newRule as unknown as BrokerAutoMessageRule, ...prev]);
      toast.success("Regra de automação criada!");
      return newRule;
    } catch (error: any) {
      console.error("Error creating rule:", error);
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

  const updateRule = async (id: string, data: Partial<AutoMessageRuleFormData>) => {
    setIsSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from("broker_auto_message_rules")
        .update(data)
        .eq("id", id)
        .select(`
          *,
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      setRules(prev => prev.map(r => r.id === id ? updated as unknown as BrokerAutoMessageRule : r));
      toast.success("Regra atualizada!");
      return updated;
    } catch (error) {
      console.error("Error updating rule:", error);
      toast.error("Erro ao atualizar regra");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("broker_auto_message_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Regra excluída!");
      return true;
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Erro ao excluir regra");
      return false;
    }
  };

  const toggleRuleActive = async (id: string, is_active: boolean) => {
    if (is_active) {
      const rule = rules.find(r => r.id === id);
      if (rule) {
        const hasConflict = await checkCadenciaConflict(rule.project_id);
        if (hasConflict) {
          toast.error("Já existe uma Cadência 10D ativa para este empreendimento. Desative-a primeiro.");
          return null;
        }
      }
    }
    return updateRule(id, { is_active });
  };

  return {
    rules,
    isLoading,
    isSaving,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
  };
}
