import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Users, ShieldPlus, ShieldMinus, BarChart3 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Broker {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  email: string;
  whatsapp: string | null;
  is_active: boolean;
  lider_id: string | null;
  created_at: string;
}

interface Leader {
  id: string;
  name: string;
  user_id: string;
}

interface Roleta {
  id: string;
  nome: string;
  lider_id: string;
  ativa: boolean;
}

interface LeaderManagementProps {
  brokers: Broker[];
  leaders: Leader[];
  leadsCountMap: Record<string, number>;
  roletas: Roleta[];
  onRefresh: () => void;
}

const getAvatarGradient = (name: string) => {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-yellow-400 to-yellow-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-cyan-500 to-blue-600',
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
};

const LeaderManagement = ({ brokers, leaders, leadsCountMap, roletas, onRefresh }: LeaderManagementProps) => {
  const [promotingBrokerId, setPromotingBrokerId] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const promotablebrokers = brokers.filter(b => !leaders.some(l => l.user_id === b.user_id));

  const promoteBroker = async () => {
    if (!promotingBrokerId) return;
    const broker = brokers.find(b => b.id === promotingBrokerId);
    if (!broker) return;

    setIsPromoting(true);
    try {
      const { error } = await (supabase
        .from("user_roles" as any)
        .insert({ user_id: broker.user_id, role: "leader" }) as any);

      if (error) throw error;
      toast.success(`${broker.name} promovido a líder!`);
      setPromotingBrokerId("");
      onRefresh();
    } catch (error: any) {
      console.error("Erro ao promover:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Este corretor já é líder.");
      } else {
        toast.error("Erro ao promover corretor.");
      }
    } finally {
      setIsPromoting(false);
    }
  };

  const removeLeader = async (leader: Leader) => {
    if (!confirm(`Remover ${leader.name} como líder? Os corretores da equipe ficarão sem líder.`)) return;

    setRemovingId(leader.id);
    try {
      // Remove leader role
      const { error } = await (supabase
        .from("user_roles" as any)
        .delete()
        .eq("user_id", leader.user_id)
        .eq("role", "leader") as any);

      if (error) throw error;

      // Clear lider_id from brokers in this team
      await (supabase
        .from("brokers" as any)
        .update({ lider_id: null })
        .eq("lider_id", leader.id) as any);

      toast.success(`${leader.name} removido como líder.`);
      onRefresh();
    } catch (error) {
      console.error("Erro ao remover líder:", error);
      toast.error("Erro ao remover líder.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Promote broker section */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ShieldPlus className="w-4 h-4 text-primary" />
          Promover Corretor a Líder
        </h3>
        <div className="flex items-center gap-3">
          <Select value={promotingBrokerId} onValueChange={setPromotingBrokerId}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Selecionar corretor..." />
            </SelectTrigger>
            <SelectContent>
              {promotablebrokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id}>
                  {broker.name}
                </SelectItem>
              ))}
              {promotablebrokers.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Todos os corretores já são líderes
                </div>
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={promoteBroker}
            disabled={!promotingBrokerId || isPromoting}
            className="shrink-0"
          >
            {isPromoting ? "Promovendo..." : "Promover"}
          </Button>
        </div>
      </div>

      {/* Leaders list */}
      {leaders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum líder cadastrado. Promova um corretor acima.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaders.map(leader => {
            const teamMembers = brokers.filter(b => b.lider_id === leader.id);
            const teamLeads = teamMembers.reduce((sum, b) => sum + (leadsCountMap[b.id] || 0), 0);
            const leaderRoletas = roletas.filter(r => r.lider_id === leader.id);

            return (
              <div
                key={leader.id}
                className="rounded-xl border border-border bg-card/50 p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/30">
                    <AvatarFallback className={cn("text-white text-sm font-semibold bg-gradient-to-br", getAvatarGradient(leader.name))}>
                      {leader.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{leader.name}</span>
                      <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {teamMembers.length} corretor{teamMembers.length !== 1 ? 'es' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {teamLeads} leads
                      </span>
                    </div>

                    {leaderRoletas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {leaderRoletas.map(r => (
                          <Badge key={r.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {r.nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLeader(leader)}
                    disabled={removingId === leader.id}
                    title="Remover como líder"
                  >
                    <ShieldMinus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaderManagement;
