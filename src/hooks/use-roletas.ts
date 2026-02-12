import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Roleta, RoletaMembro, RoletaEmpreendimento, RoletaLog } from "@/types/roleta";

export function useRoletas() {
  const [roletas, setRoletas] = useState<Roleta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoletas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("roletas" as any)
        .select(`
          *,
          lider:brokers!roletas_lider_id_fkey(id, name),
          membros:roletas_membros(*, corretor:brokers(id, name, slug)),
          empreendimentos:roletas_empreendimentos(*, empreendimento:projects(id, name, city))
        `)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setRoletas((data || []) as Roleta[]);
    } catch (error) {
      console.error("Erro ao buscar roletas:", error);
      toast.error("Erro ao carregar roletas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoletas();
  }, [fetchRoletas]);

  const createRoleta = async (data: { nome: string; lider_id: string; tempo_reserva_minutos: number }): Promise<string | null> => {
    try {
      const { data: created, error } = await (supabase
        .from("roletas" as any)
        .insert(data)
        .select("id")
        .single() as any);

      if (error) throw error;
      toast.success("Roleta criada com sucesso!");
      await fetchRoletas();
      return created?.id || null;
    } catch (error: any) {
      console.error("Erro ao criar roleta:", error);
      toast.error(error.message || "Erro ao criar roleta.");
      return null;
    }
  };

  const updateRoleta = async (id: string, updates: Partial<Roleta>) => {
    try {
      const { error } = await (supabase
        .from("roletas" as any)
        .update(updates)
        .eq("id", id) as any);

      if (error) throw error;
      toast.success("Roleta atualizada!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao atualizar roleta:", error);
      toast.error(error.message || "Erro ao atualizar roleta.");
      return false;
    }
  };

  const toggleRoletaAtiva = async (id: string, ativa: boolean) => {
    return updateRoleta(id, { ativa } as any);
  };

  const addMembro = async (roleta_id: string, corretor_id: string, ordem: number) => {
    try {
      const { error } = await (supabase
        .from("roletas_membros" as any)
        .insert({ roleta_id, corretor_id, ordem }) as any);

      if (error) {
        if (error.message?.includes("duplicate key")) {
          toast.error("Este corretor já é membro desta roleta.");
        } else {
          throw error;
        }
        return false;
      }
      toast.success("Membro adicionado!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao adicionar membro:", error);
      toast.error(error.message || "Erro ao adicionar membro.");
      return false;
    }
  };

  const removeMembro = async (membroId: string) => {
    try {
      const { error } = await (supabase
        .from("roletas_membros" as any)
        .delete()
        .eq("id", membroId) as any);

      if (error) throw error;
      toast.success("Membro removido!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      toast.error(error.message || "Erro ao remover membro.");
      return false;
    }
  };

  const updateMembroOrdem = async (membroId: string, ordem: number) => {
    try {
      const { error } = await (supabase
        .from("roletas_membros" as any)
        .update({ ordem })
        .eq("id", membroId) as any);

      if (error) throw error;
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao atualizar ordem:", error);
      return false;
    }
  };

  const toggleCheckin = async (membroId: string, checkin: boolean) => {
    try {
      const updates: any = {
        status_checkin: checkin,
        ...(checkin ? { checkin_em: new Date().toISOString() } : { checkout_em: new Date().toISOString() }),
      };
      const { error } = await (supabase
        .from("roletas_membros" as any)
        .update(updates)
        .eq("id", membroId) as any);

      if (error) throw error;
      toast.success(checkin ? "Check-in realizado!" : "Check-out realizado!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro no check-in/checkout:", error);
      toast.error(error.message || "Erro ao realizar check-in/checkout.");
      return false;
    }
  };

  const addEmpreendimento = async (roleta_id: string, empreendimento_id: string) => {
    try {
      const { error } = await (supabase
        .from("roletas_empreendimentos" as any)
        .insert({ roleta_id, empreendimento_id }) as any);

      if (error) {
        if (error.message?.includes("idx_unique_empreendimento_roleta_ativa")) {
          toast.error("Este empreendimento já está vinculado a outra roleta ativa.");
        } else {
          throw error;
        }
        return false;
      }
      toast.success("Empreendimento vinculado!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao vincular empreendimento:", error);
      toast.error(error.message || "Erro ao vincular empreendimento.");
      return false;
    }
  };

  const removeEmpreendimento = async (id: string) => {
    try {
      const { error } = await (supabase
        .from("roletas_empreendimentos" as any)
        .update({ ativo: false })
        .eq("id", id) as any);

      if (error) throw error;
      toast.success("Empreendimento desvinculado!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao desvincular:", error);
      toast.error(error.message || "Erro ao desvincular empreendimento.");
      return false;
    }
  };

  const deleteRoleta = async (id: string) => {
    try {
      const { error } = await (supabase
        .from("roletas" as any)
        .delete()
        .eq("id", id) as any);

      if (error) throw error;
      toast.success("Roleta excluída com sucesso!");
      await fetchRoletas();
      return true;
    } catch (error: any) {
      console.error("Erro ao excluir roleta:", error);
      toast.error(error.message || "Erro ao excluir roleta.");
      return false;
    }
  };

  return {
    roletas,
    isLoading,
    fetchRoletas,
    createRoleta,
    updateRoleta,
    toggleRoletaAtiva,
    addMembro,
    removeMembro,
    updateMembroOrdem,
    toggleCheckin,
    addEmpreendimento,
    removeEmpreendimento,
    deleteRoleta,
  };
}

export function useRoletaLogs(roletaId: string | null) {
  const [logs, setLogs] = useState<RoletaLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!roletaId) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("roletas_log" as any)
        .select(`
          *,
          lead:leads(name),
          de_corretor:brokers!roletas_log_de_corretor_id_fkey(name),
          para_corretor:brokers!roletas_log_para_corretor_id_fkey(name)
        `)
        .eq("roleta_id", roletaId)
        .order("created_at", { ascending: false })
        .limit(50) as any);

      if (error) throw error;
      setLogs((data || []) as RoletaLog[]);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roletaId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, isLoading, fetchLogs };
}
