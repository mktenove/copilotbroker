import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCw, LogIn, LogOut, Users, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoletaMembroFull {
  id: string;
  ordem: number;
  status_checkin: boolean;
  checkin_em: string | null;
  checkout_em: string | null;
  corretor_id: string;
  roleta_id: string;
  ativo: boolean;
  corretor?: { id: string; name: string } | null;
}

interface RoletaData {
  id: string;
  nome: string;
  ativa: boolean;
  tempo_reserva_minutos: number;
  ultimo_membro_ordem_atribuida: number;
}

interface RoletaGroup {
  roleta: RoletaData;
  myMembro: RoletaMembroFull;
  allMembros: RoletaMembroFull[];
}

function getNextMembro(membros: RoletaMembroFull[], ultimaOrdem: number): string | null {
  const online = membros.filter((m) => m.status_checkin).sort((a, b) => a.ordem - b.ordem);
  if (online.length === 0) return null;
  const next = online.find((m) => m.ordem > ultimaOrdem);
  return (next || online[0])?.id || null;
}

export function BrokerRoletas({ brokerId }: { brokerId: string }) {
  const [groups, setGroups] = useState<RoletaGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedRoletas, setExpandedRoletas] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get my memberships
      const { data: myMembros, error: e1 } = await (supabase
        .from("roletas_membros" as any)
        .select("*")
        .eq("corretor_id", brokerId)
        .eq("ativo", true) as any);
      if (e1) throw e1;
      if (!myMembros || myMembros.length === 0) {
        setGroups([]);
        return;
      }

      const roletaIds = (myMembros as any[]).map((m) => m.roleta_id);

      // 2. Fetch roletas + all members in parallel
      const [roletasRes, allMembrosRes] = await Promise.all([
        (supabase
          .from("roletas" as any)
          .select("id, nome, ativa, tempo_reserva_minutos, ultimo_membro_ordem_atribuida")
          .in("id", roletaIds) as any),
        (supabase
          .from("roletas_membros" as any)
          .select("*, corretor:brokers(id, name)")
          .in("roleta_id", roletaIds)
          .eq("ativo", true)
          .order("ordem", { ascending: true }) as any),
      ]);

      if (roletasRes.error) throw roletasRes.error;
      if (allMembrosRes.error) throw allMembrosRes.error;

      const roletasMap = new Map<string, RoletaData>();
      ((roletasRes.data || []) as RoletaData[]).forEach((r) => roletasMap.set(r.id, r));

      const membrosMap = new Map<string, RoletaMembroFull[]>();
      ((allMembrosRes.data || []) as RoletaMembroFull[]).forEach((m) => {
        const list = membrosMap.get(m.roleta_id) || [];
        list.push(m);
        membrosMap.set(m.roleta_id, list);
      });

      const result: RoletaGroup[] = [];
      for (const myM of myMembros as RoletaMembroFull[]) {
        const roleta = roletasMap.get(myM.roleta_id);
        if (!roleta) continue;
        result.push({
          roleta,
          myMembro: myM,
          allMembros: membrosMap.get(myM.roleta_id) || [],
        });
      }
      setGroups(result);
    } catch (error) {
      console.error("Erro ao buscar roletas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    if (groups.length === 0) return;
    const roletaIds = groups.map((g) => g.roleta.id);
    const channels = roletaIds.map((rid) =>
      supabase
        .channel(`roleta-membros-${rid}`)
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "roletas_membros", filter: `roleta_id=eq.${rid}` },
          () => fetchData()
        )
        .subscribe()
    );
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [groups.length, fetchData]);

  const handleToggleCheckin = async (membro: RoletaMembroFull) => {
    setTogglingId(membro.id);
    try {
      const newCheckin = !membro.status_checkin;
      const updates: any = {
        status_checkin: newCheckin,
        ...(newCheckin
          ? { checkin_em: new Date().toISOString() }
          : { checkout_em: new Date().toISOString() }),
      };
      const { error } = await (supabase
        .from("roletas_membros" as any)
        .update(updates)
        .eq("id", membro.id) as any);
      if (error) throw error;
      toast.success(newCheckin ? "Check-in realizado!" : "Check-out realizado!");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar check-in.");
    } finally {
      setTogglingId(null);
    }
  };

  const toggleExpanded = (roletaId: string) => {
    setExpandedRoletas((prev) => {
      const next = new Set(prev);
      next.has(roletaId) ? next.delete(roletaId) : next.add(roletaId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-6 flex items-center justify-center">
        <RotateCw className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RotateCw className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Minhas Roletas</h3>
      </div>

      <div className="space-y-3">
        {groups.map(({ roleta, myMembro, allMembros }) => {
          const nextId = getNextMembro(allMembros, roleta.ultimo_membro_ordem_atribuida);
          const onlineCount = allMembros.filter((m) => m.status_checkin).length;
          const isExpanded = expandedRoletas.has(roleta.id);

          return (
            <div
              key={myMembro.id}
              className={cn(
                "rounded-lg border overflow-hidden",
                myMembro.status_checkin
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-[#0f0f12] border-[#2a2a2e]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-white">{roleta.nome}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      Ordem: {myMembro.ordem}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {roleta.tempo_reserva_minutos}min reserva
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={myMembro.status_checkin ? "destructive" : "default"}
                  disabled={togglingId === myMembro.id}
                  onClick={() => handleToggleCheckin(myMembro)}
                  className={cn(
                    "min-w-[110px]",
                    !myMembro.status_checkin && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {myMembro.status_checkin ? (
                    <>
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      Check-out
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5 mr-1.5" />
                      Check-in
                    </>
                  )}
                </Button>
              </div>

              {/* Queue toggle */}
              <button
                onClick={() => toggleExpanded(roleta.id)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-[#16161a] text-[11px] text-slate-400 hover:text-slate-300 transition-colors"
              >
                <span>
                  Fila Online ({onlineCount} corretor{onlineCount !== 1 ? "es" : ""})
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Queue list - only online members */}
              {isExpanded && (
                <div className="px-3 pb-2 pt-1 space-y-1">
                  {allMembros.filter((m) => m.status_checkin).map((m) => {
                    const isMe = m.corretor_id === brokerId;
                    const isNext = m.id === nextId;
                    const corretorName = (m.corretor as any)?.name || "Corretor";

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-center justify-between py-1 px-2 rounded text-xs",
                          isMe && "bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              m.status_checkin ? "bg-emerald-400" : "bg-slate-600"
                            )}
                          />
                          <span className="text-slate-500 w-5">#{m.ordem}</span>
                          <span
                            className={cn(
                              "text-slate-300",
                              isMe && "font-semibold text-white"
                            )}
                          >
                            {isMe ? "Você" : corretorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isNext && (
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] px-1.5 py-0">
                              Próximo
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
