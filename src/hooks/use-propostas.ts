import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PropostaStatus = "pendente" | "enviada_vendedor" | "aprovada" | "rejeitada";

export interface PropostaParcela {
  id: string;
  proposta_id: string;
  tipo: string;
  valor: number;
  quantidade_parcelas: number | null;
  valor_parcela: number | null;
  descricao: string | null;
  indice_correcao: string | null;
  observacao: string | null;
  ordem: number;
  created_at: string;
}

export interface ParcelaInsert {
  tipo: string;
  valor: number;
  quantidade_parcelas?: number | null;
  valor_parcela?: number | null;
  descricao?: string | null;
  indice_correcao?: string | null;
  observacao?: string | null;
  ordem?: number;
}

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
  parcelas: PropostaParcela[];
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
  parcelas?: ParcelaInsert[];
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

    const propostasRaw = (data || []) as unknown as Omit<Proposta, "parcelas">[];

    // Fetch parcelas for all propostas
    const ids = propostasRaw.map(p => p.id);
    let parcelasMap: Record<string, PropostaParcela[]> = {};
    if (ids.length > 0) {
      const { data: parcelasData } = await supabase
        .from("proposta_parcelas")
        .select("*")
        .in("proposta_id", ids)
        .order("ordem", { ascending: true });
      if (parcelasData) {
        for (const p of parcelasData as unknown as PropostaParcela[]) {
          if (!parcelasMap[p.proposta_id]) parcelasMap[p.proposta_id] = [];
          parcelasMap[p.proposta_id].push(p);
        }
      }
    }

    setPropostas(propostasRaw.map(p => ({ ...p, parcelas: parcelasMap[p.id] || [] })));
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
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "proposta_parcelas",
      }, () => {
        fetchPropostas();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId, fetchPropostas]);

  const criarProposta = useCallback(async (data: PropostaInsert) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: tenantId } = await (supabase.rpc("get_my_tenant_id" as any) as any);
      const { parcelas, ...propostaData } = data;
      const { data: inserted, error } = await supabase.from("propostas").insert({
        ...propostaData,
        created_by: user?.id,
        tenant_id: tenantId,
      } as any).select("id").single();
      if (error) throw error;

      // Insert parcelas
      if (parcelas && parcelas.length > 0 && inserted) {
        const parcelasToInsert = parcelas.map((p, i) => ({
          proposta_id: inserted.id,
          tenant_id: tenantId,
          tipo: p.tipo,
          valor: p.valor,
          quantidade_parcelas: p.quantidade_parcelas || null,
          valor_parcela: p.valor_parcela || null,
          descricao: p.descricao || null,
          indice_correcao: p.indice_correcao || null,
          observacao: p.observacao || null,
          ordem: p.ordem ?? i,
        }));
        await supabase.from("proposta_parcelas").insert(parcelasToInsert as any);
      }

      // Also update lead status to docs_received and register interaction
      await supabase.from("leads").update({
        status: "docs_received" as any,
        valor_proposta: data.valor_proposta,
        data_envio_proposta: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", data.lead_id);

      // Build notes with parcelas summary
      const parcelasSummary = parcelas && parcelas.length > 0
        ? "\n" + parcelas.map(p => `  • ${p.tipo}: R$ ${p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${p.quantidade_parcelas ? ` (${p.quantidade_parcelas}x)` : ""}${p.descricao ? ` — ${p.descricao}` : ""}`).join("\n")
        : "";

      await supabase.from("lead_interactions").insert({
        lead_id: data.lead_id,
        interaction_type: "proposta_enviada" as any,
        notes: `Proposta registrada: R$ ${data.valor_proposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Unidade: ${data.unidade || "N/A"}${parcelasSummary}`,
        created_by: user?.id,
      });

      await fetchPropostas();
      toast.success("Proposta registrada!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar proposta");
      return false;
    }
  }, [fetchPropostas]);

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
