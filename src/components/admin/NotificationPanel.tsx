import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Check, 
  CheckCheck,
  Trash2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { NOTIFICATION_ICONS, NOTIFICATION_COLORS } from "@/lib/notification-config";

interface NotificationPanelProps {
  triggerClassName?: string;
  /**
   * popover: comportamento atual (ícone do sino abre um Popover)
   * inline: renderiza a lista diretamente (sem precisar clicar no sino)
   */
  variant?: "popover" | "inline";
  /** Oculta o cabeçalho interno quando usado dentro de outro header (ex: Sheet mobile) */
  showHeader?: boolean;
}


export function NotificationPanel({
  triggerClassName,
  variant = "popover",
  showHeader = true,
}: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to lead if available
    if (notification.lead_id) {
      setIsOpen(false);
      // The CRM tab will show the lead
      navigate("/admin");
    }
  };

  const Header = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e]">
      <h3 className="font-semibold text-slate-200">Notificações</h3>
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
  );

  const Content = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <Bell className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      );
    }

    return (
      <ScrollArea className={variant === "inline" ? "max-h-[70vh]" : "max-h-[60vh]"}>
        <div className="divide-y divide-[#2a2a2e]">
          {notifications.map((notification) => {
            const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
            const iconColor = NOTIFICATION_COLORS[notification.type] || "text-slate-400";

            return (
              <div
                key={notification.id}
                className={cn(
                  "relative px-4 py-3 hover:bg-[#252528] cursor-pointer transition-colors group",
                  !notification.is_read && "bg-[#252528]/50",
                )}
                onClick={() => handleNotificationClick(notification)}
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
                    <p className="text-sm font-medium text-slate-200 truncate">{notification.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{notification.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-1 rounded hover:bg-[#2a2a2e] text-slate-500 hover:text-slate-300"
                        title="Marcar como lida"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  // Inline mode: used on mobile Sheet to show notifications immediately.
  if (variant === "inline") {
    return (
      <div className="w-full p-0 bg-[#1e1e22] border border-[#2a2a2e] rounded-lg overflow-hidden">
        {showHeader && <Header />}
        <Content />
      </div>
    );
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1e1e22] transition-colors",
            triggerClassName
          )}
          onPointerDown={(e) => {
            // Helps avoid occasional mobile event conflicts when nested in other overlays.
            e.stopPropagation();
          }}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0 bg-[#1e1e22] border-[#2a2a2e]"
      >
        <Header />
        <Content />
      </PopoverContent>
    </Popover>
  );
}
