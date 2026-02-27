import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, UserPlus, ChevronDown, ChevronRight, Clock, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Broker {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  email: string;
  whatsapp: string | null;
  is_active: boolean;
  lider_id: string | null;
  nome_equipe: string | null;
  created_at: string;
}

interface Leader {
  id: string;
  name: string;
  user_id: string;
}

interface TeamViewProps {
  brokers: Broker[];
  leaders: Leader[];
  leadsCountMap: Record<string, number>;
  lastAccessMap: Record<string, string>;
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

const TeamView = ({ brokers, leaders, leadsCountMap, lastAccessMap, onRefresh }: TeamViewProps) => {
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const toggleTeam = (leaderId: string) => {
    setExpandedTeams(prev => ({ ...prev, [leaderId]: !prev[leaderId] }));
  };

  const assignLeader = async (brokerId: string, leaderId: string | null) => {
    try {
      const { error } = await (supabase
        .from("brokers" as any)
        .update({ lider_id: leaderId })
        .eq("id", brokerId) as any);

      if (error) throw error;
      toast.success("Líder atribuído com sucesso!");
      onRefresh();
    } catch (error) {
      console.error("Erro ao atribuir líder:", error);
      toast.error("Erro ao atribuir líder.");
    }
  };

  // Group brokers by leader
  const teams = leaders.map(leader => {
    const leaderBroker = brokers.find(b => b.user_id === leader.user_id);
    return {
      leader,
      teamName: leaderBroker?.nome_equipe,
      members: brokers.filter(b => b.lider_id === leader.id),
    };
  });
  const unassigned = brokers.filter(b => !b.lider_id);

  const TeamLeadsTotal = (members: Broker[]) =>
    members.reduce((sum, b) => sum + (leadsCountMap[b.id] || 0), 0);

  return (
    <div className="space-y-4">
      {teams.map(({ leader, teamName, members }) => {
        const isExpanded = expandedTeams[leader.id] !== false; // default open
        const totalLeads = TeamLeadsTotal(members);

        return (
          <div key={leader.id} className="rounded-xl border border-border bg-card/50 overflow-hidden">
            {/* Leader header */}
            <button
              onClick={() => toggleTeam(leader.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-1 text-muted-foreground">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <Avatar className="w-8 h-8 border border-primary/30">
                <AvatarFallback className={cn("text-white text-xs font-semibold bg-gradient-to-br", getAvatarGradient(leader.name))}>
                  {leader.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {teamName ? `${teamName}` : leader.name}
                  </span>
                  <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                </div>
                {teamName && (
                  <span className="text-[10px] text-muted-foreground">Líder: {leader.name}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {members.length}
                </span>
                <span>{totalLeads} leads</span>
              </div>
            </button>

            {/* Members grid */}
            {isExpanded && (
              <div className="px-4 pb-4">
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Nenhum corretor nesta equipe</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {members.map(broker => (
                      <MemberCard
                        key={broker.id}
                        broker={broker}
                        leadsCount={leadsCountMap[broker.id] || 0}
                        lastAccess={lastAccessMap[broker.id]}
                        leaders={leaders}
                        onAssignLeader={assignLeader}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned brokers */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-border border-dashed bg-card/30 overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-muted-foreground">Sem equipe</span>
            <Badge variant="outline" className="text-[10px] ml-auto">{unassigned.length}</Badge>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unassigned.map(broker => (
                <MemberCard
                  key={broker.id}
                  broker={broker}
                  leadsCount={leadsCountMap[broker.id] || 0}
                  lastAccess={lastAccessMap[broker.id]}
                  leaders={leaders}
                  onAssignLeader={assignLeader}
                  showAssignButton
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {teams.length === 0 && unassigned.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum corretor cadastrado.
        </div>
      )}
    </div>
  );
};

interface MemberCardProps {
  broker: Broker;
  leadsCount: number;
  lastAccess?: string;
  leaders: Leader[];
  onAssignLeader: (brokerId: string, leaderId: string | null) => void;
  showAssignButton?: boolean;
}

const MemberCard = ({ broker, leadsCount, lastAccess, leaders, onAssignLeader, showAssignButton }: MemberCardProps) => {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50",
      "hover:border-primary/30 transition-colors",
      !broker.is_active && "opacity-60"
    )}>
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarFallback className={cn("text-white text-[10px] font-medium bg-gradient-to-br", getAvatarGradient(broker.name))}>
          {broker.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{broker.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{leadsCount} leads</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {lastAccess ? formatDistanceToNow(new Date(lastAccess), { addSuffix: false, locale: ptBR }) : '—'}
          </span>
        </div>
      </div>
      <Badge variant={broker.is_active ? "default" : "destructive"} className="text-[9px] px-1.5 py-0 h-4 shrink-0">
        {broker.is_active ? 'Ativo' : 'Inativo'}
      </Badge>
      {showAssignButton && (
        <Select onValueChange={(value) => onAssignLeader(broker.id, value)}>
          <SelectTrigger className="w-8 h-7 p-0 border-dashed [&>svg]:hidden" title="Atribuir líder">
            <UserPlus className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
          </SelectTrigger>
          <SelectContent>
            {leaders.map(leader => (
              <SelectItem key={leader.id} value={leader.id}>
                {leader.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default TeamView;
