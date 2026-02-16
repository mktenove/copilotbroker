import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrategicAlert } from "../hooks/useIntelligenceData";

interface AlertCardProps {
  alert: StrategicAlert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const isCritical = alert.severity === "critical";

  return (
    <div className={cn(
      "rounded-xl p-4 flex items-start gap-3 border",
      isCritical
        ? "bg-red-500/5 border-red-500/20"
        : "bg-yellow-500/5 border-yellow-500/20"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
        isCritical ? "bg-red-500/10" : "bg-yellow-500/10"
      )}>
        {isCritical
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <AlertTriangle className="w-4 h-4 text-yellow-400" />
        }
      </div>
      <div className="min-w-0">
        <p className={cn(
          "text-sm font-semibold",
          isCritical ? "text-red-400" : "text-yellow-400"
        )}>
          {alert.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{alert.description}</p>
      </div>
    </div>
  );
}
