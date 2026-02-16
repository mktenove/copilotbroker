import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { diffMinutes, getPreviousPeriod, calcVariation, calculatePerformanceScore, getHealthStatus, type HealthStatus } from "../utils/calculations";

export interface IntelligenceFilters {
  periodPreset: "today" | "7d" | "30d" | "60d" | "90d" | "custom";
  dateFrom: Date;
  dateTo: Date;
  projectIds: string[];
  roletaId: string | null;
  brokerId: string | null;
  origins: string[];
  campaign: string | null;
}

export function getDefaultFilters(): IntelligenceFilters {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  return {
    periodPreset: "30d",
    dateFrom: from,
    dateTo: now,
    projectIds: [],
    roletaId: null,
    brokerId: null,
    origins: [],
    campaign: null,
  };
}

export interface StrategicAlert {
  id: string;
  severity: "warning" | "critical";
  title: string;
  description: string;
}

export interface BrokerRankItem {
  id: string;
  name: string;
  score: number;
  vendas: number;
  vgv: number;
}

// Types for processed data
export interface OverviewData {
  totalLeads: number;
  leadsDistributed: number;
  leadsFallback: number;
  leadsInProgress: number;
  activeProposals: number;
  avgFirstResponse: number | null;
  slaPercent: number;
  totalProposals: number;
  totalSales: number;
  conversionRate: number;
  vgvTotal: number;
  ticketMedio: number;
  leadsLost: number;
  lossRate: number;
  variations: Record<string, number | null>;
  alerts: StrategicAlert[];
  topPerformers: BrokerRankItem[];
  needsAttention: BrokerRankItem[];
  // mini funnel for overview
  miniFunnel: { name: string; count: number; convRate: number | null }[];
}

export interface BrokerPerformance {
  id: string;
  name: string;
  leads: number;
  avgFirstResponse: number | null;
  slaPercent: number;
  timeouts: number;
  timeoutLossRate: number;
  agendamentos: number;
  propostas: number;
  vendas: number;
  conversionRate: number;
  vgv: number;
  ticketMedio: number;
  avgTimeToSale: number | null;
  score: number;
}

export interface RoletaAnalysis {
  id: string;
  nome: string;
  leadsDistributed: number;
  avgResponseTime: number | null;
  timeoutRate: number;
  fallbacks: number;
  health: HealthStatus;
  members: { brokerId: string; brokerName: string; leads: number; vendas: number; vgv: number }[];
}

export interface FunnelStage {
  name: string;
  count: number;
  conversionFromPrev: number | null;
  avgTimeMinutes: number | null;
  abandonRate: number;
  isBottleneck: boolean;
}

export interface OriginPerformance {
  origin: string;
  leads: number;
  slaPercent: number;
  agendamentoRate: number;
  propostaRate: number;
  vendaRate: number;
  vgv: number;
}

export interface SLADistribution {
  range: string;
  count: number;
  percent: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  volume: number;
  slaPercent: number;
}

export interface LossAnalysis {
  totalLost: number;
  lossRate: number;
  byStage: { stage: string; count: number; rate: number }[];
  byReason: { reason: string; count: number }[];
  byBroker: { brokerId: string; brokerName: string; count: number; rate: number }[];
  byOrigin: { origin: string; count: number }[];
  byProject: { projectId: string; projectName: string; count: number }[];
}

export function useIntelligenceData(filters: IntelligenceFilters) {
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [prevLeads, setPrevLeads] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [roletasLog, setRoletasLog] = useState<any[]>([]);
  const [roletas, setRoletas] = useState<any[]>([]);
  const [roletasMembros, setRoletasMembros] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const fromISO = filters.dateFrom.toISOString();
  const toISO = filters.dateTo.toISOString();
  const prev = getPreviousPeriod(filters.dateFrom, filters.dateTo);
  const prevFromISO = prev.from.toISOString();
  const prevToISO = prev.to.toISOString();

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const buildLeadQuery = (from: string, to: string) => {
          let q = supabase
            .from("leads")
            .select("*, broker:brokers!leads_broker_id_fkey(id, name)")
            .gte("created_at", from)
            .lte("created_at", to);
          if (filters.projectIds.length > 0) q = q.in("project_id", filters.projectIds);
          if (filters.roletaId) q = q.eq("roleta_id", filters.roletaId);
          if (filters.brokerId) q = q.eq("broker_id", filters.brokerId);
          if (filters.origins.length > 0) q = q.in("lead_origin", filters.origins);
          if (filters.campaign) q = q.eq("lead_origin_detail", filters.campaign);
          return q.order("created_at", { ascending: false }).limit(1000);
        };

        const [
          leadsRes, prevLeadsRes, interactionsRes, logRes,
          roletasRes, membrosRes, propostasRes, brokersRes, projectsRes,
        ] = await Promise.all([
          buildLeadQuery(fromISO, toISO),
          buildLeadQuery(prevFromISO, prevToISO),
          supabase.from("lead_interactions").select("*").gte("created_at", fromISO).lte("created_at", toISO).limit(1000),
          supabase.from("roletas_log").select("*").gte("created_at", fromISO).lte("created_at", toISO).limit(1000),
          supabase.from("roletas").select("*"),
          supabase.from("roletas_membros").select("*, broker:brokers!roletas_membros_corretor_id_fkey(id, name)"),
          supabase.from("propostas").select("*").gte("created_at", fromISO).lte("created_at", toISO).limit(1000),
          supabase.from("brokers").select("id, name, slug, is_active").eq("is_active", true).order("name"),
          supabase.from("projects").select("id, name, slug").eq("is_active", true).order("name"),
        ]);

        if (cancelled) return;
        setLeads((leadsRes.data as any[]) || []);
        setPrevLeads((prevLeadsRes.data as any[]) || []);
        setInteractions((interactionsRes.data as any[]) || []);
        setRoletasLog((logRes.data as any[]) || []);
        setRoletas((roletasRes.data as any[]) || []);
        setRoletasMembros((membrosRes.data as any[]) || []);
        setPropostas((propostasRes.data as any[]) || []);
        setBrokers((brokersRes.data as any[]) || []);
        setProjects((projectsRes.data as any[]) || []);
      } catch (error) {
        console.error("Intelligence data fetch error:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [fromISO, toISO, prevFromISO, prevToISO, filters.projectIds.join(","), filters.roletaId, filters.brokerId, filters.origins.join(","), filters.campaign]);

  // ---- BROKERS PERFORMANCE (computed first since overview needs it) ----
  const brokerPerformance = useMemo<BrokerPerformance[]>(() => {
    const timeoutsByBroker: Record<string, number> = {};
    roletasLog.filter((l: any) => l.acao === "timeout_reassinado").forEach((l: any) => {
      if (l.de_corretor_id) timeoutsByBroker[l.de_corretor_id] = (timeoutsByBroker[l.de_corretor_id] || 0) + 1;
    });

    const avgVGVTeam = (() => {
      const salesBrokers = leads.filter((l: any) => l.data_fechamento && l.broker_id);
      if (salesBrokers.length === 0) return 1;
      const total = salesBrokers.reduce((s: number, l: any) => s + (Number(l.valor_final_venda) || 0), 0);
      const uniqueBrokers = new Set(salesBrokers.map((l: any) => l.broker_id)).size;
      return uniqueBrokers > 0 ? total / uniqueBrokers : 1;
    })();

    return brokers.map((b: any) => {
      const bLeads = leads.filter((l: any) => l.broker_id === b.id);
      const total = bLeads.length;
      const times = bLeads.map((l: any) => diffMinutes(l.atribuido_em, l.atendimento_iniciado_em)).filter((t): t is number => t !== null && t >= 0);
      const avgResp = times.length > 0 ? times.reduce((a, v) => a + v, 0) / times.length : null;
      const sla = times.length > 0 ? times.filter(t => t <= 10).length / times.length : 0;
      const tos = timeoutsByBroker[b.id] || 0;
      const agend = bLeads.filter((l: any) => l.data_agendamento).length;
      const props = propostas.filter((p: any) => p.broker_id === b.id).length;
      const sales = bLeads.filter((l: any) => l.data_fechamento);
      const vendas = sales.length;
      const vgv = sales.reduce((s: number, l: any) => s + (Number(l.valor_final_venda) || 0), 0);
      const ticket = vendas > 0 ? vgv / vendas : 0;
      const conv = total > 0 ? vendas / total : 0;
      const saleTimes = sales.map((l: any) => diffMinutes(l.created_at, l.data_fechamento)).filter((t): t is number => t !== null);
      const avgToSale = saleTimes.length > 0 ? saleTimes.reduce((a, v) => a + v, 0) / saleTimes.length : null;
      const score = calculatePerformanceScore(avgResp || 60, conv, total > 0 ? tos / total : 0, vgv, avgVGVTeam);

      return {
        id: b.id, name: b.name, leads: total,
        avgFirstResponse: avgResp, slaPercent: sla,
        timeouts: tos, timeoutLossRate: total > 0 ? tos / total : 0,
        agendamentos: agend, propostas: props, vendas, conversionRate: conv,
        vgv, ticketMedio: ticket, avgTimeToSale: avgToSale, score,
      };
    }).sort((a, b) => b.score - a.score);
  }, [leads, brokers, roletasLog, propostas]);

  // ---- OVERVIEW ----
  const overview = useMemo<OverviewData>(() => {
    const totalLeads = leads.length;
    const distributed = leads.filter((l: any) => l.status_distribuicao).length;
    const fallback = leads.filter((l: any) => (l.motivo_atribuicao || "").toLowerCase().includes("fallback")).length;
    const leadsInProgress = leads.filter((l: any) => ["info_sent", "awaiting_docs"].includes(l.status)).length;

    // Active proposals (no closing date, no loss date)
    const activeProposals = propostas.filter((p: any) => {
      const lead = leads.find((l: any) => l.id === p.lead_id);
      return lead && !lead.data_fechamento && !lead.data_perda;
    }).length;

    const responseTimes = leads
      .map((l: any) => diffMinutes(l.atribuido_em, l.atendimento_iniciado_em))
      .filter((t): t is number => t !== null && t >= 0);
    const avgFirstResponse = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null;

    const slaThreshold = 10;
    const withinSLA = responseTimes.filter(t => t <= slaThreshold).length;
    const slaPercent = responseTimes.length > 0 ? withinSLA / responseTimes.length : 0;

    const sales = leads.filter((l: any) => l.data_fechamento);
    const totalSales = sales.length;
    const vgvTotal = sales.reduce((sum: number, l: any) => sum + (Number(l.valor_final_venda) || 0), 0);
    const ticketMedio = totalSales > 0 ? vgvTotal / totalSales : 0;
    const conversionRate = distributed > 0 ? totalSales / distributed : 0;
    const leadsLost = leads.filter((l: any) => l.status === "inactive").length;
    const lossRate = totalLeads > 0 ? leadsLost / totalLeads : 0;

    // Previous period
    const prevTotal = prevLeads.length;
    const prevSales = prevLeads.filter((l: any) => l.data_fechamento).length;
    const prevVGV = prevLeads.filter((l: any) => l.data_fechamento).reduce((s: number, l: any) => s + (Number(l.valor_final_venda) || 0), 0);
    const prevLost = prevLeads.filter((l: any) => l.status === "inactive").length;

    const variations: Record<string, number | null> = {
      totalLeads: calcVariation(totalLeads, prevTotal),
      totalSales: calcVariation(totalSales, prevSales),
      vgvTotal: calcVariation(vgvTotal, prevVGV),
      leadsLost: calcVariation(leadsLost, prevLost),
    };

    // Strategic Alerts
    const alerts: StrategicAlert[] = [];
    if (slaPercent < 0.7 && responseTimes.length > 0) {
      alerts.push({ id: "sla_low", severity: "critical", title: "SLA abaixo de 70%", description: `Apenas ${(slaPercent * 100).toFixed(0)}% dos leads estão sendo atendidos dentro do prazo.` });
    }
    if (lossRate > 0.3 && totalLeads > 0) {
      alerts.push({ id: "loss_high", severity: "critical", title: "Taxa de perda acima de 30%", description: `${(lossRate * 100).toFixed(0)}% dos leads foram perdidos no período.` });
    }
    const brokersZeroSales = brokerPerformance.filter(b => b.leads > 0 && b.vendas === 0);
    if (brokersZeroSales.length > 0) {
      alerts.push({ id: "zero_sales", severity: "warning", title: `${brokersZeroSales.length} corretor(es) sem vendas`, description: `${brokersZeroSales.map(b => b.name).slice(0, 3).join(", ")}${brokersZeroSales.length > 3 ? "..." : ""} não realizaram vendas no período.` });
    }

    // Top performers
    const topPerformers: BrokerRankItem[] = brokerPerformance.filter(b => b.leads > 0).slice(0, 3).map(b => ({
      id: b.id, name: b.name, score: b.score, vendas: b.vendas, vgv: b.vgv,
    }));
    const needsAttention: BrokerRankItem[] = [...brokerPerformance].filter(b => b.leads > 0).reverse().slice(0, 3).map(b => ({
      id: b.id, name: b.name, score: b.score, vendas: b.vendas, vgv: b.vgv,
    }));

    // Mini funnel
    const funnelStages = [
      { name: "Leads", count: totalLeads },
      { name: "Atendimento", count: leadsInProgress },
      { name: "Agendamento", count: leads.filter((l: any) => l.data_agendamento).length },
      { name: "Proposta", count: leads.filter((l: any) => l.data_envio_proposta).length },
      { name: "Venda", count: totalSales },
    ];
    const miniFunnel = funnelStages.map((s, i) => ({
      name: s.name,
      count: s.count,
      convRate: i > 0 && funnelStages[i - 1].count > 0 ? s.count / funnelStages[i - 1].count : null,
    }));

    return {
      totalLeads, leadsDistributed: distributed, leadsFallback: fallback,
      leadsInProgress, activeProposals,
      avgFirstResponse, slaPercent,
      totalProposals: propostas.length, totalSales, conversionRate,
      vgvTotal, ticketMedio, leadsLost, lossRate,
      variations,
      alerts, topPerformers, needsAttention,
      miniFunnel,
    };
  }, [leads, prevLeads, propostas, brokerPerformance]);

  // ---- ROLETAS ----
  const roletaAnalysis = useMemo<RoletaAnalysis[]>(() => {
    return roletas.map((r: any) => {
      const logs = roletasLog.filter((l: any) => l.roleta_id === r.id);
      const initial = logs.filter((l: any) => l.acao === "atribuicao_inicial").length;
      const tos = logs.filter((l: any) => l.acao === "timeout_reassinado").length;
      const fbs = logs.filter((l: any) => l.acao === "fallback_lider").length;
      const rLeads = leads.filter((l: any) => l.roleta_id === r.id);
      const times = rLeads.map((l: any) => diffMinutes(l.atribuido_em, l.atendimento_iniciado_em)).filter((t): t is number => t !== null && t >= 0);
      const avg = times.length > 0 ? times.reduce((a, v) => a + v, 0) / times.length : 0;
      const toRate = initial > 0 ? tos / initial : 0;
      const health = getHealthStatus(toRate, avg);
      const members = roletasMembros.filter((m: any) => m.roleta_id === r.id && m.ativo).map((m: any) => {
        const mLeads = rLeads.filter((l: any) => l.broker_id === m.corretor_id);
        const mSales = mLeads.filter((l: any) => l.data_fechamento);
        return {
          brokerId: m.corretor_id,
          brokerName: m.broker?.name || "—",
          leads: mLeads.length,
          vendas: mSales.length,
          vgv: mSales.reduce((s: number, l: any) => s + (Number(l.valor_final_venda) || 0), 0),
        };
      });
      return { id: r.id, nome: r.nome, leadsDistributed: initial, avgResponseTime: avg || null, timeoutRate: toRate, fallbacks: fbs, health, members };
    });
  }, [leads, roletas, roletasLog, roletasMembros]);

  // ---- FUNNEL ----
  const funnel = useMemo<FunnelStage[]>(() => {
    const stages = [
      { name: "Pré Atendimento", statuses: ["new"] },
      { name: "Atendimento", statuses: ["info_sent", "awaiting_docs"] },
      { name: "Agendamento", statuses: ["scheduling"] },
      { name: "Proposta", statuses: ["docs_received"] },
      { name: "Vendido", statuses: ["registered"] },
    ];

    const counts = stages.map(s => ({
      ...s,
      count: leads.filter((l: any) => s.statuses.includes(l.status) || (s.name === "Vendido" && l.data_fechamento)).length,
      lostFromStage: leads.filter((l: any) => l.status === "inactive" && s.statuses.includes(l.etapa_perda || "")).length,
    }));

    const totalInPipeline = leads.length;
    let maxDrop = 0;
    let bottleneckIdx = -1;

    const result: FunnelStage[] = counts.map((c, i) => {
      const prevCount = i === 0 ? totalInPipeline : counts[i - 1].count;
      const conv = prevCount > 0 ? c.count / prevCount : null;
      const abandon = totalInPipeline > 0 ? c.lostFromStage / totalInPipeline : 0;
      if (conv !== null && i > 0) {
        const drop = 1 - conv;
        if (drop > maxDrop) { maxDrop = drop; bottleneckIdx = i; }
      }
      return { name: c.name, count: c.count, conversionFromPrev: conv, avgTimeMinutes: null, abandonRate: abandon, isBottleneck: false };
    });

    if (bottleneckIdx >= 0) result[bottleneckIdx].isBottleneck = true;
    return result;
  }, [leads]);

  // ---- ORIGINS ----
  const originPerformance = useMemo<OriginPerformance[]>(() => {
    const origins: Record<string, any[]> = {};
    leads.forEach((l: any) => {
      const o = l.lead_origin || "Desconhecida";
      if (!origins[o]) origins[o] = [];
      origins[o].push(l);
    });
    return Object.entries(origins).map(([origin, oLeads]) => {
      const total = oLeads.length;
      const times = oLeads.map((l: any) => diffMinutes(l.atribuido_em, l.atendimento_iniciado_em)).filter((t): t is number => t !== null && t >= 0);
      const sla = times.length > 0 ? times.filter(t => t <= 10).length / times.length : 0;
      const agend = oLeads.filter((l: any) => l.data_agendamento).length;
      const props = oLeads.filter((l: any) => l.data_envio_proposta).length;
      const sales = oLeads.filter((l: any) => l.data_fechamento);
      const vgv = sales.reduce((s: number, l: any) => s + (Number(l.valor_final_venda) || 0), 0);
      return {
        origin, leads: total, slaPercent: sla,
        agendamentoRate: total > 0 ? agend / total : 0,
        propostaRate: total > 0 ? props / total : 0,
        vendaRate: total > 0 ? sales.length / total : 0,
        vgv,
      };
    }).sort((a, b) => b.leads - a.leads);
  }, [leads]);

  // ---- SLA ----
  const slaDistribution = useMemo<SLADistribution[]>(() => {
    const times = leads.map((l: any) => diffMinutes(l.atribuido_em, l.atendimento_iniciado_em)).filter((t): t is number => t !== null && t >= 0);
    const total = times.length || 1;
    const ranges = [
      { range: "0-2 min", min: 0, max: 2 },
      { range: "2-5 min", min: 2, max: 5 },
      { range: "5-10 min", min: 5, max: 10 },
      { range: "+10 min", min: 10, max: Infinity },
    ];
    return ranges.map(r => {
      const count = times.filter(t => t >= r.min && t < r.max).length;
      return { range: r.range, count, percent: count / total };
    });
  }, [leads]);

  const heatmap = useMemo<HeatmapCell[]>(() => {
    const cells: Record<string, { volume: number; slaOk: number }> = {};
    leads.forEach((l: any) => {
      const d = new Date(l.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      if (!cells[key]) cells[key] = { volume: 0, slaOk: 0 };
      cells[key].volume++;
      const resp = diffMinutes(l.atribuido_em, l.atendimento_iniciado_em);
      if (resp !== null && resp <= 10) cells[key].slaOk++;
    });
    const result: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 8; hour <= 22; hour++) {
        const key = `${day}-${hour}`;
        const c = cells[key] || { volume: 0, slaOk: 0 };
        result.push({ day, hour, volume: c.volume, slaPercent: c.volume > 0 ? c.slaOk / c.volume : 0 });
      }
    }
    return result;
  }, [leads]);

  // ---- LOSSES ----
  const lossAnalysis = useMemo<LossAnalysis>(() => {
    const lost = leads.filter((l: any) => l.status === "inactive");
    const totalLost = lost.length;
    const lossRate = leads.length > 0 ? totalLost / leads.length : 0;

    const byStageMap: Record<string, number> = {};
    lost.forEach((l: any) => { const s = l.etapa_perda || "Não informada"; byStageMap[s] = (byStageMap[s] || 0) + 1; });
    const byStage = Object.entries(byStageMap).map(([stage, count]) => ({ stage, count, rate: totalLost > 0 ? count / totalLost : 0 })).sort((a, b) => b.count - a.count);

    const byReasonMap: Record<string, number> = {};
    lost.forEach((l: any) => { const r = l.inactivation_reason || "Não informado"; byReasonMap[r] = (byReasonMap[r] || 0) + 1; });
    const byReason = Object.entries(byReasonMap).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

    const byBrokerMap: Record<string, { name: string; count: number; total: number }> = {};
    lost.forEach((l: any) => {
      if (!l.broker_id) return;
      if (!byBrokerMap[l.broker_id]) {
        const bName = l.broker?.name || "—";
        const bTotal = leads.filter((ll: any) => ll.broker_id === l.broker_id).length;
        byBrokerMap[l.broker_id] = { name: bName, count: 0, total: bTotal };
      }
      byBrokerMap[l.broker_id].count++;
    });
    const byBroker = Object.entries(byBrokerMap).map(([id, v]) => ({ brokerId: id, brokerName: v.name, count: v.count, rate: v.total > 0 ? v.count / v.total : 0 })).sort((a, b) => b.count - a.count);

    const byOriginMap: Record<string, number> = {};
    lost.forEach((l: any) => { const o = l.lead_origin || "Desconhecida"; byOriginMap[o] = (byOriginMap[o] || 0) + 1; });
    const byOrigin = Object.entries(byOriginMap).map(([origin, count]) => ({ origin, count })).sort((a, b) => b.count - a.count);

    const byProjectMap: Record<string, { name: string; count: number }> = {};
    lost.forEach((l: any) => {
      if (!l.project_id) return;
      if (!byProjectMap[l.project_id]) {
        const pName = projects.find((p: any) => p.id === l.project_id)?.name || "—";
        byProjectMap[l.project_id] = { name: pName, count: 0 };
      }
      byProjectMap[l.project_id].count++;
    });
    const byProject = Object.entries(byProjectMap).map(([id, v]) => ({ projectId: id, projectName: v.name, count: v.count })).sort((a, b) => b.count - a.count);

    return { totalLost, lossRate, byStage, byReason, byBroker, byOrigin, byProject };
  }, [leads, projects]);

  return {
    isLoading,
    filters,
    overview,
    brokerPerformance,
    roletaAnalysis,
    funnel,
    originPerformance,
    slaDistribution,
    heatmap,
    lossAnalysis,
    brokers,
    projects,
    roletas,
    leads,
  };
}
