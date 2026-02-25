import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Sparkles, User, Phone, Mail, ChevronRight, CheckCircle2, XCircle, Zap, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopilotConfigPage } from "@/components/inbox/CopilotConfigPage";
import { Button } from "@/components/ui/button";

interface BrokerWithCopilot {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  is_active: boolean;
  copilot?: {
    id: string;
    name: string;
    personality: string;
    is_active: boolean;
    persuasion_level: number;
    objectivity_level: number;
    max_autonomy: string;
    commercial_priority: string;
  } | null;
}

const PERSONALITY_MAP: Record<string, string> = {
  formal: "Formal",
  consultivo: "Consultivo",
  agressivo: "Agressivo",
  tecnico: "Técnico",
  premium: "Premium",
};

const AUTONOMY_MAP: Record<string, string> = {
  suggest_only: "Sugestão",
  suggest_and_draft: "Rascunho",
  auto_respond: "Automático",
};

const PRIORITY_MAP: Record<string, string> = {
  agendamento: "Agendamento",
  proposta: "Proposta",
  qualificacao: "Qualificação",
  fechamento: "Fechamento",
};

export function AdminCopilotOverview() {
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  const { data: brokersWithCopilot = [], isLoading } = useQuery({
    queryKey: ["admin-brokers-copilot-overview"],
    queryFn: async () => {
      // Fetch brokers
      const { data: brokers, error: bErr } = await supabase
        .from("brokers")
        .select("id, name, email, whatsapp, is_active")
        .eq("is_active", true)
        .order("name");
      if (bErr) throw bErr;

      // Fetch all copilot configs
      const { data: configs, error: cErr } = await supabase
        .from("copilot_configs")
        .select("id, broker_id, name, personality, is_active, persuasion_level, objectivity_level, max_autonomy, commercial_priority");
      if (cErr) throw cErr;

      const configMap = new Map(configs?.map(c => [c.broker_id, c]) || []);

      return (brokers || []).map(b => ({
        ...b,
        copilot: configMap.get(b.id) || null,
      })) as BrokerWithCopilot[];
    },
  });

  // If a broker is selected, show the config page
  if (selectedBrokerId) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedBrokerId(null)}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          ← Voltar para visão geral
        </Button>
        <CopilotConfigPage brokerId={selectedBrokerId} key={selectedBrokerId} />
      </div>
    );
  }

  const configured = brokersWithCopilot.filter(b => b.copilot);
  const notConfigured = brokersWithCopilot.filter(b => !b.copilot);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total Corretores"
          value={brokersWithCopilot.length}
          icon={<User className="w-4 h-4" />}
        />
        <StatCard
          label="Copiloto Ativo"
          value={configured.filter(b => b.copilot?.is_active).length}
          icon={<Zap className="w-4 h-4" />}
          highlight
        />
        <StatCard
          label="Sem Configurar"
          value={notConfigured.length}
          icon={<XCircle className="w-4 h-4" />}
          warning={notConfigured.length > 0}
        />
      </div>

      {/* Configured brokers */}
      {configured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Copiloto Configurado ({configured.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {configured.map(broker => (
              <BrokerCopilotCard
                key={broker.id}
                broker={broker}
                onSelect={() => setSelectedBrokerId(broker.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not configured brokers */}
      {notConfigured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Sem Copiloto ({notConfigured.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notConfigured.map(broker => (
              <BrokerEmptyCard
                key={broker.id}
                broker={broker}
                onSelect={() => setSelectedBrokerId(broker.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, highlight, warning }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center",
          highlight ? "bg-primary/15 text-primary" :
          warning ? "bg-orange-500/15 text-orange-400" :
          "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
      </div>
      <p className={cn(
        "text-2xl font-bold tracking-tight",
        highlight ? "text-primary" :
        warning ? "text-orange-400" :
        "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function BrokerCopilotCard({ broker, onSelect }: { broker: BrokerWithCopilot; onSelect: () => void }) {
  const copilot = broker.copilot!;
  const isOnline = copilot.is_active;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-200 group"
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                isOnline ? "bg-green-500" : "bg-muted-foreground"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{broker.name}</p>
              <p className="text-xs text-muted-foreground truncate">{copilot.name}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
        </div>

        {/* Status & personality */}
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
            isOnline
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-muted text-muted-foreground border border-border"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
            {PERSONALITY_MAP[copilot.personality] || copilot.personality}
          </span>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden border border-border">
          <MiniStat label="Persuasão" value={`${copilot.persuasion_level}%`} />
          <MiniStat label="Objetividade" value={`${copilot.objectivity_level}%`} />
          <MiniStat label="Autonomia" value={AUTONOMY_MAP[copilot.max_autonomy] || "—"} />
        </div>
      </div>
    </button>
  );
}

function BrokerEmptyCard({ broker, onSelect }: { broker: BrokerWithCopilot; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl border border-dashed border-border bg-card/50 hover:border-primary/30 hover:bg-card transition-all duration-200 group p-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{broker.name}</p>
          <p className="text-xs text-muted-foreground truncate">{broker.email}</p>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
          <Settings2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">Configurar</span>
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-2 py-2 text-center">
      <p className="text-xs font-bold text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
