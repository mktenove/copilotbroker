import { ReactNode, useState } from "react";
import { BrokerSidebar } from "./BrokerSidebar";
import { BrokerHeader } from "./BrokerHeader";
import { BrokerBottomNav } from "./BrokerBottomNav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/use-notifications";
import { useBrokerSessionTracker } from "@/hooks/use-broker-session-tracker";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, UserPlus, Clock, ArrowRightCircle, Check, Trash2, Loader2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface BrokerLayoutProps {
  children: ReactNode;
  brokerName?: string;
  brokerInitial?: string;
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onLogout: () => void;
  onCopyLink?: () => void;
  onOpenLanding?: () => void;
  onAddLead?: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  isLeader?: boolean;
}

const NOTIFICATION_ICONS = {
  new_lead: UserPlus,
  stale_lead: Clock,
  status_change: ArrowRightCircle,
};

const NOTIFICATION_COLORS = {
  new_lead: "text-emerald-400",
  stale_lead: "text-yellow-400",
  status_change: "text-blue-400",
};

export function BrokerLayout({
  children,
  brokerName,
  brokerInitial,
  viewMode,
  onViewChange,
  onLogout,
  onCopyLink,
  onOpenLanding,
  onAddLead,
  searchTerm,
  onSearchChange,
  isLeader = false,
}: BrokerLayoutProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  // Rastrear sessão de login
  useBrokerSessionTracker();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <div className="min-h-screen bg-[#0f0f12] admin-scrollbar">
      {/* Sidebar - fixed left, hidden on mobile */}
      <BrokerSidebar
        viewMode={viewMode}
        onViewChange={onViewChange}
        onLogout={onLogout}
        onOpenLanding={onOpenLanding}
        onAddLead={onAddLead}
        brokerInitial={brokerInitial}
        isLeader={isLeader}
      />

      {/* Mobile Bottom Navigation */}
      <BrokerBottomNav
        viewMode={viewMode}
        onViewChange={onViewChange}
        onCopyLink={onCopyLink}
        onAddLead={onAddLead}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        isLeader={isLeader}
      />

      {/* Mobile Notifications Sheet */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent side="bottom" className="bg-[#1e1e22] border-[#2a2a2e] h-[80vh] rounded-t-2xl">
          <SheetHeader className="border-b border-[#2a2a2e] pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-slate-200">Notificações</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-slate-400 hover:text-slate-200 h-7 px-2"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(80vh-80px)] mt-4">
              <div className="divide-y divide-[#2a2a2e]">
                {notifications.map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] || Bell;
                  const iconColor = NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || "text-slate-400";

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "relative px-4 py-3 transition-colors",
                        !notification.is_read && "bg-[#252528]/50"
                      )}
                    >
                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      <div className="flex gap-3">
                        <div className={cn("mt-0.5", iconColor)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-1">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-2 rounded hover:bg-[#2a2a2e] text-slate-500 hover:text-slate-300"
                              title="Marcar como lida"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-2 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Main content - offset by sidebar width on desktop */}
      <div className="md:ml-16 min-h-screen flex flex-col pb-20 md:pb-0">
        <BrokerHeader
          brokerName={brokerName}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
        <main className="flex-1 flex flex-col p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
