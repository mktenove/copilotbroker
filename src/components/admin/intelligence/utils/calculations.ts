// Pure calculation functions for Intelligence Dashboard

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate broker performance score (0-100)
 * 30% response time, 30% conversion, 20% discipline, 20% VGV vs target
 */
export function calculatePerformanceScore(
  avgResponseMinutes: number,
  conversionRate: number,
  timeoutRate: number,
  vgv: number,
  metaVGV: number
): number {
  const responseScore = 30 * clamp(1 - avgResponseMinutes / 60, 0, 1);
  const conversionScore = 30 * clamp(conversionRate, 0, 1);
  const disciplineScore = 20 * clamp(1 - timeoutRate, 0, 1);
  const vgvScore = 20 * (metaVGV > 0 ? Math.min(vgv / metaVGV, 1) : 0);
  return Math.round(responseScore + conversionScore + disciplineScore + vgvScore);
}

/**
 * Calculate time difference in minutes between two ISO timestamps
 */
export function diffMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return diff / (1000 * 60);
}

/**
 * Format minutes to human-readable string
 */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "--";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Format currency (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Calculate variation between current and previous values
 */
export function calcVariation(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * Get previous period date range for comparison
 */
export function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const diff = to.getTime() - from.getTime();
  return {
    from: new Date(from.getTime() - diff),
    to: new Date(from.getTime() - 1),
  };
}

/**
 * Health status based on timeout rate and avg response time
 */
export type HealthStatus = "green" | "yellow" | "red";

export function getHealthStatus(timeoutRate: number, avgResponseMin: number): HealthStatus {
  if (timeoutRate > 0.25 || avgResponseMin > 30) return "red";
  if (timeoutRate > 0.10 || avgResponseMin > 10) return "yellow";
  return "green";
}
