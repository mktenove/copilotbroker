import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBrokerActivity } from "@/hooks/use-broker-activity";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LogIn,
  Clock,
  Calendar,
  Users,
  FileText,
  ArrowRightLeft,
  MessageSquare,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Broker {
  id: string;
  name: string;
  email: string;
}

interface BrokerActivitySheetProps {
  broker: Broker | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACTIVITY_ICONS = {
  login: LogIn,
  lead_update: ArrowRightLeft,
  note_added: MessageSquare,
  doc_processed: CheckSquare,
  status_change: FileText,
};

const ACTIVITY_LABELS = {
  login: "Login",
  lead_update: "Atualizou lead",
  note_added: "Adicionou nota",
  doc_processed: "Processou documento",
  status_change: "Mudou status",
};

const ACTIVITY_COLORS = {
  login: "text-blue-400",
  lead_update: "text-amber-400",
  note_added: "text-emerald-400",
  doc_processed: "text-purple-400",
  status_change: "text-cyan-400",
};

const LOGIN_METHOD_LABELS: Record<string, string> = {
  password: "via senha",
  token: "via token",
  refresh: "refresh automático",
};

export function BrokerActivitySheet({
  broker,
  isOpen,
  onClose,
}: BrokerActivitySheetProps) {
  const { summary, sessions, activities, isLoading, fetchSummary, fetchSessions, fetchActivities } =
    useBrokerActivity(broker?.id || null);

  useEffect(() => {
    if (isOpen && broker) {
      fetchSummary();
      fetchSessions();
      fetchActivities();
    }
  }, [isOpen, broker, fetchSummary, fetchSessions, fetchActivities]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-[#1e1e22] border-[#2a2a2e] p-0">
        <SheetHeader className="p-4 border-b border-[#2a2a2e]">
          <SheetTitle className="text-slate-200">
            Histórico - {broker?.name}
          </SheetTitle>
        </SheetHeader>

        {isLoading && !summary ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Resumo do Mês */}
            {summary && (
              <div className="p-4 border-b border-[#2a2a2e] bg-[#252528]/50">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Resumo do Mês
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xl font-semibold text-white">
                      {summary.daysActive}
                    </p>
                    <p className="text-xs text-slate-500">dias ativos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                      <LogIn className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xl font-semibold text-white">
                      {summary.totalLogins}
                    </p>
                    <p className="text-xs text-slate-500">logins</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xl font-semibold text-white">
                      {summary.leadsHandled}
                    </p>
                    <p className="text-xs text-slate-500">leads</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="sessions" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start px-4 py-2 bg-transparent border-b border-[#2a2a2e] rounded-none h-auto">
                <TabsTrigger
                  value="sessions"
                  className="data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white text-slate-400"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Acessos
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white text-slate-400"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Atividades
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sessions" className="flex-1 m-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="p-4 space-y-2">
                    {sessions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum acesso registrado</p>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-[#252528]/50 border border-[#2a2a2e]"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <LogIn className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200">
                              Login{" "}
                              <span className="text-slate-500">
                                {LOGIN_METHOD_LABELS[session.login_method] ||
                                  session.login_method}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {format(
                                new Date(session.logged_in_at),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </p>
                            {session.user_agent && (
                              <p className="text-[10px] text-slate-600 mt-1 truncate">
                                {session.user_agent.substring(0, 60)}...
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {formatDistanceToNow(new Date(session.logged_in_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="activities" className="flex-1 m-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="p-4 space-y-2">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma atividade registrada</p>
                      </div>
                    ) : (
                      activities.map((activity) => {
                        const Icon =
                          ACTIVITY_ICONS[
                            activity.activity_type as keyof typeof ACTIVITY_ICONS
                          ] || FileText;
                        const label =
                          ACTIVITY_LABELS[
                            activity.activity_type as keyof typeof ACTIVITY_LABELS
                          ] || activity.activity_type;
                        const color =
                          ACTIVITY_COLORS[
                            activity.activity_type as keyof typeof ACTIVITY_COLORS
                          ] || "text-slate-400";

                        return (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-[#252528]/50 border border-[#2a2a2e]"
                          >
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                color.replace("text-", "bg-").replace("400", "500/10")
                              )}
                            >
                              <Icon className={cn("w-4 h-4", color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200">{label}</p>
                              {activity.lead && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Lead: {activity.lead.name}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-0.5">
                                {format(
                                  new Date(activity.created_at),
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              </p>
                            </div>
                            <span className="text-[10px] text-slate-500 flex-shrink-0">
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
