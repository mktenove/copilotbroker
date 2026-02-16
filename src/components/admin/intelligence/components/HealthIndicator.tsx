import { cn } from "@/lib/utils";
import type { HealthStatus } from "../utils/calculations";

interface HealthIndicatorProps {
  status: HealthStatus;
  label?: string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<HealthStatus, { color: string; bg: string; text: string }> = {
  green: { color: "bg-emerald-400", bg: "bg-emerald-400/10", text: "Saudável" },
  yellow: { color: "bg-yellow-400", bg: "bg-yellow-400/10", text: "Atenção" },
  red: { color: "bg-red-400", bg: "bg-red-400/10", text: "Crítico" },
};

export function HealthIndicator({ status, label, size = "md" }: HealthIndicatorProps) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", config.bg)}>
      <div className={cn("rounded-full", config.color, size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5")} />
      <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm", "text-slate-200")}>
        {label ?? config.text}
      </span>
    </div>
  );
}
