import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  variation?: number | null;
  invertVariation?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  status?: "good" | "bad" | "neutral";
}

export function MetricCard({ label, value, variation, invertVariation, icon, subtitle, size = "md", status }: MetricCardProps) {
  const isPositive = variation !== null && variation !== undefined && variation > 0;
  const isNegative = variation !== null && variation !== undefined && variation < 0;
  const isGood = invertVariation ? isNegative : isPositive;
  const isBad = invertVariation ? isPositive : isNegative;

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };

  const valueClasses = {
    sm: "text-lg font-bold",
    md: "text-xl font-bold",
    lg: "text-3xl font-extrabold",
  };

  const labelClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-xs font-medium",
  };

  const statusBorder = status === "good"
    ? "border-l-emerald-500/50 border-l-2"
    : status === "bad"
    ? "border-l-red-500/50 border-l-2"
    : "";

  return (
    <div className={cn(
      "bg-[#1e1e22] border border-[#2a2a2e] rounded-xl flex flex-col gap-1",
      sizeClasses[size],
      statusBorder,
    )}>
      <div className="flex items-center justify-between">
        <span className={cn("text-slate-400 truncate", labelClasses[size])}>{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <span className={cn("text-white truncate", valueClasses[size])}>{value}</span>
      <div className="flex items-center gap-1 min-h-[20px]">
        {variation !== null && variation !== undefined ? (
          <>
            {isPositive ? (
              <TrendingUp className={cn("w-3.5 h-3.5", isGood ? "text-emerald-400" : "text-red-400")} />
            ) : isNegative ? (
              <TrendingDown className={cn("w-3.5 h-3.5", isBad ? "text-red-400" : "text-emerald-400")} />
            ) : (
              <Minus className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className={cn(
              "text-xs font-medium",
              isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-slate-500"
            )}>
              {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
            </span>
          </>
        ) : subtitle ? (
          <span className="text-xs text-slate-500">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}
