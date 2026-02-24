import { UserPlus, Clock, ArrowRightCircle, Shuffle, LucideIcon } from "lucide-react";
import type { Notification } from "@/hooks/use-notifications";

export type NotificationType = Notification["type"];

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  new_lead: UserPlus,
  stale_lead: Clock,
  status_change: ArrowRightCircle,
  roleta_lead: Shuffle,
};

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  new_lead: "text-emerald-400",
  stale_lead: "text-yellow-400",
  status_change: "text-blue-400",
  roleta_lead: "text-purple-400",
};
