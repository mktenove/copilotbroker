import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalHealthScoreProps {
  successRate: number;
  totalSent: number;
  totalFailed: number;
}

function getScoreConfig(score: number) {
  if (score >= 80)
    return {
      label: "Excelente",
      color: "text-green-400",
      borderColor: "border-green-500/30",
      progressColor: "bg-green-500",
      icon: TrendingUp,
    };
  if (score >= 60)
    return {
      label: "Bom",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      progressColor: "bg-emerald-500",
      icon: TrendingUp,
    };
  if (score >= 40)
    return {
      label: "Regular",
      color: "text-yellow-400",
      borderColor: "border-yellow-500/30",
      progressColor: "bg-yellow-500",
      icon: Activity,
    };
  return {
    label: "Crítico",
    color: "text-red-400",
    borderColor: "border-red-500/30",
    progressColor: "bg-red-500",
    icon: TrendingDown,
  };
}

export function GlobalHealthScore({ successRate, totalSent, totalFailed }: GlobalHealthScoreProps) {
  const config = getScoreConfig(successRate);
  const Icon = config.icon;

  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Saúde da Instância
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Circle */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
              config.color,
              "bg-gradient-to-br from-[#2a2a2e] to-[#1a1a1d] border-2",
              config.borderColor
            )}
          >
            {successRate}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", config.color)} />
              <span className={cn("font-semibold", config.color)}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Taxa de sucesso das notificações
            </p>
          </div>
        </div>

        {/* Success rate bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Taxa de sucesso</span>
            <span className="text-white font-mono">{successRate}%</span>
          </div>
          <Progress
            value={successRate}
            className="h-2 bg-[#2a2a2e]"
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2a2a2e]">
          <div className="text-center p-3 rounded-lg bg-green-500/5">
            <p className="text-lg font-bold text-green-400">{totalSent}</p>
            <p className="text-xs text-slate-500">Sucesso</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/5">
            <p className="text-lg font-bold text-red-400">{totalFailed}</p>
            <p className="text-xs text-slate-500">Falhas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
