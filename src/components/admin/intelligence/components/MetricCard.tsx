import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  variation?: number | null;
  invertVariation?: boolean; // true = negative is good (e.g. losses)
  icon?: React.ReactNode;
  subtitle?: string;
}

export function MetricCard({ label, value, variation, invertVariation, icon, subtitle }: MetricCardProps) {
  const isPositive = variation !== null && variation !== undefined && variation > 0;
  const isNegative = variation !== null && variation !== undefined && variation < 0;
  const isGood = invertVariation ? isNegative : isPositive;
  const isBad = invertVariation ? isPositive : isNegative;

  return (
    <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 truncate">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <span className="text-xl font-bold text-white truncate">{value}</span>
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
