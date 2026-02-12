import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCw, LogIn, LogOut, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoletaMembro {
  id: string;
  ordem: number;
  status_checkin: boolean;
  checkin_em: string | null;
  checkout_em: string | null;
  corretor_id: string;
  roleta_id: string;
  roleta?: {
    id: string;
    nome: string;
    ativa: boolean;
    tempo_reserva_minutos: number;
  };
}

export function BrokerRoletas({ brokerId }: { brokerId: string }) {
  const [membros, setMembros] = useState<RoletaMembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMembros = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("roletas_membros" as any)
        .select(`
          *,
          roleta:roletas(id, nome, ativa, tempo_reserva_minutos)
        `)
        .eq("corretor_id", brokerId)
        .eq("ativo", true) as any);

      if (error) throw error;
      setMembros((data || []) as RoletaMembro[]);
    } catch (error) {
      console.error("Erro ao buscar roletas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  useEffect(() => {
    fetchMembros();
  }, [fetchMembros]);

  const handleToggleCheckin = async (membro: RoletaMembro) => {
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
      await fetchMembros();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar check-in.");
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-6 flex items-center justify-center">
        <RotateCw className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (membros.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RotateCw className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Minhas Roletas</h3>
      </div>

      <div className="space-y-2">
        {membros.map((membro) => (
          <div
            key={membro.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              membro.status_checkin
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-[#0f0f12] border-[#2a2a2e]"
            )}
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">
                {(membro.roleta as any)?.nome || "Roleta"}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  Ordem: {membro.ordem}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {(membro.roleta as any)?.tempo_reserva_minutos}min reserva
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant={membro.status_checkin ? "destructive" : "default"}
              disabled={togglingId === membro.id}
              onClick={() => handleToggleCheckin(membro)}
              className={cn(
                "min-w-[110px]",
                !membro.status_checkin && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {membro.status_checkin ? (
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
        ))}
      </div>
    </div>
  );
}
