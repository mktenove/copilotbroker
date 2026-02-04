import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Smartphone, 
  Users, 
  Send, 
  MessageSquare, 
  RefreshCw, 
  Pause, 
  Play,
  Loader2,
  Ban
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";

interface BrokerInstance {
  id: string;
  broker_id: string;
  instance_name: string;
  phone_number: string | null;
  status: string;
  is_paused: boolean;
  daily_sent_count: number;
  hourly_sent_count: number;
  daily_limit: number;
  hourly_limit: number;
  warmup_day: number;
  warmup_stage: string;
  broker?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface WhatsAppOptout {
  id: string;
  phone: string;
  reason: string | null;
  detected_keyword: string | null;
  created_at: string;
}

interface ChartDataItem {
  date: string;
  fullDate: string;
  enviados: number;
  respostas: number;
  falhas: number;
}

interface WhatsAppOverviewTabProps {
  instances: BrokerInstance[];
  isLoadingInstances: boolean;
  refetchInstances: () => void;
  globalTotals: { sent: number; replies: number; failed: number };
  isLoadingStats: boolean;
  chartData: ChartDataItem[];
  optouts: WhatsAppOptout[];
  isLoadingOptouts: boolean;
  onTogglePause: (instanceId: string, isPaused: boolean) => void;
}

const formatPhone = (phone: string | null) => {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  return phone;
};

const getStatusBadge = (status: string, isPaused: boolean) => {
  if (isPaused) {
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">Pausado</Badge>;
  }
  switch (status) {
    case "connected":
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Online</Badge>;
    case "connecting":
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Conectando</Badge>;
    case "qr_pending":
      return <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">QR Pendente</Badge>;
    default:
      return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Desconectado</Badge>;
  }
};

export function WhatsAppOverviewTab({
  instances,
  isLoadingInstances,
  refetchInstances,
  globalTotals,
  isLoadingStats,
  chartData,
  optouts,
  isLoadingOptouts,
  onTogglePause,
}: WhatsAppOverviewTabProps) {
  const totalInstances = instances.length;
  const connectedInstances = instances.filter(i => i.status === "connected").length;
  const todaySent = instances.reduce((acc, i) => acc + (i.daily_sent_count || 0), 0);
  const replyRate = globalTotals.sent > 0 
    ? Math.round((globalTotals.replies / globalTotals.sent) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={() => refetchInstances()}
          className="bg-card border-border"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instâncias</p>
                <p className="text-2xl font-bold text-foreground">{totalInstances}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-foreground">{connectedInstances}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enviados Hoje</p>
                <p className="text-2xl font-bold text-foreground">{todaySent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Resp.</p>
                <p className="text-2xl font-bold text-foreground">{replyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instances Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Instâncias dos Corretores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInstances ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma instância WhatsApp configurada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Corretor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Telefone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enviados</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Aquecimento</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr key={instance.id} className="border-b border-border/50 hover:bg-accent/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{instance.broker?.name || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">{instance.broker?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                        {formatPhone(instance.phone_number)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(instance.status, instance.is_paused)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {instance.daily_sent_count}/{instance.daily_limit}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-border">
                          Dia {instance.warmup_day}/14
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {instance.status === "connected" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onTogglePause(instance.id, !instance.is_paused)}
                            className={instance.is_paused 
                              ? "text-green-500 hover:text-green-400" 
                              : "text-amber-500 hover:text-amber-400"
                            }
                          >
                            {instance.is_paused ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <Pause className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts and Opt-outs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Global Stats Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              📊 Estatísticas Globais (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span className="text-muted-foreground">
                      Enviados: <span className="text-foreground font-medium">{globalTotals.sent}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-muted-foreground">
                      Respostas: <span className="text-foreground font-medium">{globalTotals.replies}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-muted-foreground">
                      Falhas: <span className="text-foreground font-medium">{globalTotals.failed}</span>
                    </span>
                  </div>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload.length > 0) {
                            return payload[0].payload.fullDate;
                          }
                          return label;
                        }}
                      />
                      <Bar dataKey="enviados" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="respostas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="falhas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Opt-outs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Opt-outs Recentes
              <Badge variant="secondary" className="ml-2">
                {optouts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOptouts ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : optouts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum opt-out registrado
              </p>
            ) : (
              <ScrollArea className="h-[230px]">
                <div className="space-y-2">
                  {optouts.slice(0, 10).map((optout) => (
                    <div
                      key={optout.id}
                      className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-mono text-foreground">
                          {formatPhone(optout.phone)}
                        </p>
                        {optout.detected_keyword && (
                          <p className="text-xs text-red-400">"{optout.detected_keyword}"</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(optout.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
