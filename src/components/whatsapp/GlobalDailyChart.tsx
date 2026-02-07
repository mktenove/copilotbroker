import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon } from "lucide-react";
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

interface DailyStat {
  date: string;
  sent: number;
  failed: number;
}

interface GlobalDailyChartProps {
  dailyStats: DailyStat[];
}

export function GlobalDailyChart({ dailyStats }: GlobalDailyChartProps) {
  const chartData = dailyStats.map((stat) => ({
    date: format(parseISO(stat.date), "EEE", { locale: ptBR }),
    fullDate: format(parseISO(stat.date), "dd/MM"),
    sucesso: stat.sent,
    falhas: stat.failed,
  }));

  const totalSent = dailyStats.reduce((sum, s) => sum + s.sent, 0);
  const totalFailed = dailyStats.reduce((sum, s) => sum + s.failed, 0);

  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2">
          <BarChartIcon className="w-5 h-5" />
          Últimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-slate-400">
              Sucesso: <span className="text-white font-medium">{totalSent}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-slate-400">
              Falhas: <span className="text-white font-medium">{totalFailed}</span>
            </span>
          </div>
        </div>

        {/* Chart */}
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
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e22",
                  border: "1px solid #2a2a2e",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                labelFormatter={(_label, payload) => {
                  if (payload && payload.length > 0) {
                    return payload[0].payload.fullDate;
                  }
                  return _label;
                }}
              />
              <Bar dataKey="sucesso" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="falhas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
