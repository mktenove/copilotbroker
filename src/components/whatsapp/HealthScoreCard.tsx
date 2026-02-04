import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BrokerWhatsAppInstance } from "@/types/whatsapp";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  instance: BrokerWhatsAppInstance;
}

export function HealthScoreCard({ instance }: HealthScoreCardProps) {
  const score = instance.risk_score;
  const healthScore = 100 - score; // Invert risk to health
  
  const getScoreConfig = (score: number) => {
    if (score >= 80) return { 
      label: "Excelente", 
      color: "text-green-400", 
      bgColor: "bg-green-500",
      icon: TrendingUp 
    };
    if (score >= 60) return { 
      label: "Bom", 
      color: "text-emerald-400", 
      bgColor: "bg-emerald-500",
      icon: TrendingUp 
    };
    if (score >= 40) return { 
      label: "Regular", 
      color: "text-yellow-400", 
      bgColor: "bg-yellow-500",
      icon: Activity 
    };
    if (score >= 20) return { 
      label: "Atenção", 
      color: "text-orange-400", 
      bgColor: "bg-orange-500",
      icon: TrendingDown 
    };
    return { 
      label: "Crítico", 
      color: "text-red-400", 
      bgColor: "bg-red-500",
      icon: TrendingDown 
    };
  };

  const config = getScoreConfig(healthScore);
  const Icon = config.icon;

  const dailyProgress = (instance.daily_sent_count / instance.daily_limit) * 100;
  const hourlyProgress = (instance.hourly_sent_count / instance.hourly_limit) * 100;

  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Saúde da Conexão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Score */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
            config.color,
            "bg-gradient-to-br from-[#2a2a2e] to-[#1a1a1d] border-2",
            healthScore >= 60 ? "border-green-500/30" : 
            healthScore >= 40 ? "border-yellow-500/30" : "border-red-500/30"
          )}>
            {healthScore}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", config.color)} />
              <span className={cn("font-semibold", config.color)}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Score de saúde do seu número
            </p>
          </div>
        </div>

        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Enviados hoje</span>
            <span className="text-white font-mono">
              {instance.daily_sent_count}/{instance.daily_limit}
            </span>
          </div>
          <Progress 
            value={Math.min(dailyProgress, 100)} 
            className="h-2 bg-[#2a2a2e]"
          />
        </div>

        {/* Hourly Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Esta hora</span>
            <span className="text-white font-mono">
              {instance.hourly_sent_count}/{instance.hourly_limit}
            </span>
          </div>
          <Progress 
            value={Math.min(hourlyProgress, 100)} 
            className="h-2 bg-[#2a2a2e]"
          />
        </div>

        {/* Pause Status */}
        {instance.is_paused && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 font-medium">
              ⚠️ Envios pausados
            </p>
            {instance.pause_reason && (
              <p className="text-xs text-red-400/70 mt-1">
                {instance.pause_reason}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
