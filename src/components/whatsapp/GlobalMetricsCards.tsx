import { Card, CardContent } from "@/components/ui/card";
import { Send, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface GlobalMetricsCardsProps {
  total: number;
  sent: number;
  failed: number;
  successRate: number;
}

const metrics = [
  {
    key: "total",
    label: "Total Enviadas",
    icon: Send,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "sent",
    label: "Com Sucesso",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    key: "failed",
    label: "Falhas",
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  {
    key: "successRate",
    label: "Taxa de Sucesso",
    icon: TrendingUp,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    suffix: "%",
  },
] as const;

export function GlobalMetricsCards({ total, sent, failed, successRate }: GlobalMetricsCardsProps) {
  const values: Record<string, number> = { total, sent, failed, successRate };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.key} className="bg-[#1a1a1d] border-[#2a2a2e]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${m.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {values[m.key]}
                    {"suffix" in m && m.suffix}
                  </p>
                  <p className="text-xs text-slate-500">{m.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
