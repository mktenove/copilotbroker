import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./use-user-role";
import { toast } from "sonner";

export interface AutoCadenciaStep {
  messageContent: string;
  delayMinutes: number;
  sendIfReplied: boolean;
}

export interface BrokerAutoCadenciaRule {
  id: string;
  broker_id: string;
  name: string | null;
  project_id: string | null;
  interest_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
  steps_count?: number;
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

      // Fetch step counts for each rule
      const rulesData = (data as BrokerAutoCadenciaRule[]) || [];
      if (rulesData.length > 0) {
        const ruleIds = rulesData.map(r => r.id);
        const { data: stepsData } = await (supabase
          .from("auto_cadencia_steps") as any)
          .select("rule_id")
          .in("rule_id", ruleIds);

        const countMap: Record<string, number> = {};
        (stepsData || []).forEach((s: any) => {
          countMap[s.rule_id] = (countMap[s.rule_id] || 0) + 1;
        });
        rulesData.forEach(r => { r.steps_count = countMap[r.id] || 0; });
      }

      setRules(rulesData);
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

  const checkFirstMessageConflict = async (projectId: string | null): Promise<boolean> => {
    if (!brokerId) return false;
    try {
      let query = supabase
        .from("broker_auto_message_rules")
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

  const saveSteps = async (ruleId: string, steps: AutoCadenciaStep[]) => {
    // Delete existing steps
    await (supabase.from("auto_cadencia_steps") as any)
      .delete()
      .eq("rule_id", ruleId);

    // Insert new steps
    const stepsToInsert = steps.map((step, i) => ({
      rule_id: ruleId,
      step_order: i + 1,
      message_content: step.messageContent,
      delay_minutes: i === 0 ? 0 : step.delayMinutes,
      send_if_replied: i === 0 ? true : step.sendIfReplied,
    }));

    const { error } = await (supabase.from("auto_cadencia_steps") as any)
      .insert(stepsToInsert);
    if (error) throw error;
  };

  const createRule = async (data: { name?: string | null; project_id: string | null; interest_type?: string | null; is_active: boolean; steps: AutoCadenciaStep[] }) => {
    if (!brokerId) return null;
    setIsSaving(true);
    try {
      if (data.is_active) {
        const hasConflict = await checkFirstMessageConflict(data.project_id);
        if (hasConflict) {
          toast.error("Já existe uma 1ª Mensagem ativa para este empreendimento. Desative-a antes de ativar a Cadência 10D.");
          setIsSaving(false);
          return null;
        }
      }

      const { data: newRule, error } = await (supabase
        .from("broker_auto_cadencia_rules") as any)
        .insert({
          broker_id: brokerId,
          name: data.name || null,
          project_id: data.project_id,
          interest_type: data.interest_type || null,
          is_active: data.is_active,
        })
        .select(`*, project:projects(id, name)`)
        .single();

      if (error) throw error;

      // Save steps
      await saveSteps(newRule.id, data.steps);

      const rule = newRule as BrokerAutoCadenciaRule;
      rule.steps_count = data.steps.length;
      setRules(prev => [rule, ...prev]);
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

  const updateRule = async (id: string, data: Partial<{ name: string | null; project_id: string | null; interest_type: string | null; is_active: boolean }>, steps?: AutoCadenciaStep[]) => {
    setIsSaving(true);
    try {
      const { data: updated, error } = await (supabase
        .from("broker_auto_cadencia_rules") as any)
        .update(data)
        .eq("id", id)
        .select(`*, project:projects(id, name)`)
        .single();

      if (error) throw error;

      if (steps) {
        await saveSteps(id, steps);
      }

      const rule = updated as BrokerAutoCadenciaRule;
      rule.steps_count = steps ? steps.length : undefined;
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...rule, steps_count: steps ? steps.length : r.steps_count } : r));
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
    if (is_active) {
      const rule = rules.find(r => r.id === id);
      if (rule) {
        const hasConflict = await checkFirstMessageConflict(rule.project_id);
        if (hasConflict) {
          toast.error("Já existe uma 1ª Mensagem ativa para este empreendimento. Desative-a primeiro.");
          return null;
        }
      }
    }
    return updateRule(id, { is_active });
  };

  return { rules, isLoading, isSaving, fetchRules, createRule, updateRule, deleteRule, toggleRuleActive };
}