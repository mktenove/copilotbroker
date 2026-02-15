import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PropostaStatus = "pendente" | "enviada_vendedor" | "aprovada" | "rejeitada";

export interface Proposta {
  id: string;
  lead_id: string;
  project_id: string | null;
  broker_id: string | null;
  created_by: string | null;
  unidade: string | null;
  valor_proposta: number;
  valor_entrada: number | null;
  forma_pagamento_entrada: string | null;
  parcelamento: string | null;
  permuta: boolean;
  descricao_permuta: string | null;
  observacoes_corretor: string | null;
  condicoes_especiais: string | null;
  status_proposta: PropostaStatus;
  enviada_vendedor_em: string | null;
  aprovada_em: string | null;
  rejeitada_em: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropostaInsert {
  lead_id: string;
  project_id?: string | null;
  broker_id?: string | null;
  created_by?: string | null;
  unidade?: string;
  valor_proposta: number;
  valor_entrada?: number;
  forma_pagamento_entrada?: string;
  parcelamento?: string;
  permuta?: boolean;
  descricao_permuta?: string;
  observacoes_corretor?: string;
  condicoes_especiais?: string;
}

export function usePropostas(leadId: string) {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPropostas = useCallback(async () => {
    if (!leadId) return;
    const { data, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao buscar propostas:", error);
      return;
    }
    setPropostas((data || []) as unknown as Proposta[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchPropostas();
  }, [fetchPropostas]);

  // Realtime
  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel(`propostas-${leadId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "propostas",
        filter: `lead_id=eq.${leadId}`,
      }, () => {
        fetchPropostas();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId, fetchPropostas]);

  const criarProposta = useCallback(async (data: PropostaInsert) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("propostas").insert({
        ...data,
        created_by: user?.id,
      } as any);
      if (error) throw error;

      // Also update lead status to docs_received and register interaction
      await supabase.from("leads").update({
        status: "docs_received" as any,
        valor_proposta: data.valor_proposta,
        data_envio_proposta: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", data.lead_id);

      await supabase.from("lead_interactions").insert({
        lead_id: data.lead_id,
        interaction_type: "proposta_enviada" as any,
        notes: `Proposta registrada: R$ ${data.valor_proposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Unidade: ${data.unidade || "N/A"}`,
        created_by: user?.id,
      });

      toast.success("Proposta registrada!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar proposta");
      return false;
    }
  }, []);

  const aprovarProposta = useCallback(async (propostaId: string) => {
    try {
      const { error } = await supabase.from("propostas").update({
        status_proposta: "aprovada",
        aprovada_em: new Date().toISOString(),
      } as any).eq("id", propostaId);
      if (error) throw error;

      const proposta = propostas.find(p => p.id === propostaId);
      if (proposta) {
        await supabase.from("lead_interactions").insert({
          lead_id: proposta.lead_id,
          interaction_type: "proposta_enviada" as any,
          notes: `✅ Proposta APROVADA: R$ ${proposta.valor_proposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      toast.success("Proposta aprovada!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar");
      return false;
    }
  }, [propostas]);

  const rejeitarProposta = useCallback(async (propostaId: string, motivo: string) => {
    try {
      const { error } = await supabase.from("propostas").update({
        status_proposta: "rejeitada",
        rejeitada_em: new Date().toISOString(),
        motivo_rejeicao: motivo,
      } as any).eq("id", propostaId);
      if (error) throw error;

      const proposta = propostas.find(p => p.id === propostaId);
      if (proposta) {
        await supabase.from("lead_interactions").insert({
          lead_id: proposta.lead_id,
          interaction_type: "proposta_enviada" as any,
          notes: `❌ Proposta REJEITADA: R$ ${proposta.valor_proposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — Motivo: ${motivo}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      toast.success("Proposta rejeitada.");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
      return false;
    }
  }, [propostas]);

  const encaminharVendedor = useCallback(async (propostaId: string) => {
    try {
      const { error } = await supabase.from("propostas").update({
        status_proposta: "enviada_vendedor",
        enviada_vendedor_em: new Date().toISOString(),
      } as any).eq("id", propostaId);
      if (error) throw error;

      const proposta = propostas.find(p => p.id === propostaId);
      if (proposta) {
        await supabase.from("lead_interactions").insert({
          lead_id: proposta.lead_id,
          interaction_type: "proposta_enviada" as any,
          notes: `📤 Proposta encaminhada ao vendedor: R$ ${proposta.valor_proposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      toast.success("Proposta encaminhada ao vendedor!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Erro ao encaminhar");
      return false;
    }
  }, [propostas]);

  const hasApprovedProposta = propostas.some(p => p.status_proposta === "aprovada");

  return {
    propostas,
    loading,
    criarProposta,
    aprovarProposta,
    rejeitarProposta,
    encaminharVendedor,
    hasApprovedProposta,
    refetch: fetchPropostas,
  };
}
