import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Loader2 } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useWhatsAppStats } from "@/hooks/use-whatsapp-stats";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyStatsChartProps {
  brokerId?: string;
}

export function DailyStatsChart({ brokerId }: DailyStatsChartProps) {
  const { dailyStats, weeklyTotals, isLoading } = useWhatsAppStats(brokerId);

  const chartData = dailyStats.map((stat) => ({
    date: format(parseISO(stat.date), "EEE", { locale: ptBR }),
    fullDate: format(parseISO(stat.date), "dd/MM"),
    enviados: stat.sent_count || 0,
    respostas: stat.reply_count || 0,
    falhas: stat.failed_count || 0,
  }));

  // Fill in missing days with zeros
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return format(date, "yyyy-MM-dd");
  });

  const filledChartData = last7Days.map((dateStr) => {
    const existing = dailyStats.find((s) => s.date === dateStr);
    return {
      date: format(parseISO(dateStr), "EEE", { locale: ptBR }),
      fullDate: format(parseISO(dateStr), "dd/MM"),
      enviados: existing?.sent_count || 0,
      respostas: existing?.reply_count || 0,
      falhas: existing?.failed_count || 0,
    };
  });

  if (isLoading) {
    return (
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Estatísticas dos Últimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-slate-400">
              Enviados: <span className="text-white font-medium">{weeklyTotals.sent}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-slate-400">
              Respostas: <span className="text-white font-medium">{weeklyTotals.replies}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-slate-400">
              Falhas: <span className="text-white font-medium">{weeklyTotals.failed}</span>
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={filledChartData}>
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
                  backgroundColor: "#1e1e22",
                  border: "1px solid #2a2a2e",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
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
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
