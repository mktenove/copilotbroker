import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationThread } from "@/components/inbox/ConversationThread";
import { LeadContextPanel } from "@/components/inbox/LeadContextPanel";
import { CreateLeadFromChatModal } from "@/components/inbox/CreateLeadFromChatModal";
import { useConversations, useConversationMessages, Conversation } from "@/hooks/use-conversations";
import { useCopilotSuggestion } from "@/hooks/use-copilot";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LeadPage = lazy(() => import("@/pages/LeadPage"));

export default function AdminInbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showLeadPanel, setShowLeadPanel] = useState(false);
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  // Fetch brokers list for filter
  useEffect(() => {
    const fetchBrokers = async () => {
      const { data } = await supabase
        .from("brokers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (data) setBrokers(data as any);
    };
    fetchBrokers();
  }, []);

  const isArchived = statusFilter === "archived";
  const { conversations, isLoading, totalUnread, markAsRead, archiveConversation, unarchiveConversation, updateAiMode } =
    useConversations({
      brokerId: selectedBrokerId !== "all" ? selectedBrokerId : undefined,
      search,
      statusFilter: isArchived ? "all" : statusFilter,
      isArchived,
    });

  const { messages, isLoading: messagesLoading, sendMessage } =
    useConversationMessages(selectedConversation?.id || null);

  const { suggestion, isGenerating, generateSuggestion, setSuggestion } = useCopilotSuggestion();

  // Auto-select conversation from query param (e.g. coming from LeadPage)
  useEffect(() => {
    const convId = searchParams.get("conversationId");
    if (convId && conversations.length > 0 && !selectedConversation) {
      const target = conversations.find(c => c.id === convId);
      if (target) {
        setSelectedConversation(target);
        setSearchParams({}, { replace: true });
      }
    }
  }, [conversations, searchParams, selectedConversation, setSearchParams]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    if (isMobile) setShowLeadPanel(false);
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
    setShowLeadPanel(false);
    setViewingLeadId(null);
  }, []);

  const handleOpenLead = useCallback((leadId: string) => {
    setViewingLeadId(leadId);
  }, []);

  const handleBackFromLead = useCallback(() => {
    setViewingLeadId(null);
  }, []);

  const handleRequestSuggestion = useCallback(async () => {
    if (!selectedConversation) return;
    const lead = selectedConversation.lead as any;
    const chatHistory = messages.slice(-10).map(m => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content,
    }));
    await generateSuggestion({
      action: "suggest_response",
      conversation_id: selectedConversation.id,
      lead_context: {
        name: lead?.name,
        status: lead?.status,
        origin: lead?.lead_origin,
        notes: lead?.notes,
      },
      messages: chatHistory,
    });
  }, [selectedConversation, messages, generateSuggestion]);

  const handleOpenCreateLeadModal = useCallback(() => {
    setShowCreateLeadModal(true);
  }, []);

  const handleLeadCreated = useCallback(async (leadName: string, _: string, projectId: string | null) => {
    if (!selectedConversation) return;
    const brokerId = selectedConversation.broker_id;

    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name: leadName,
        whatsapp: selectedConversation.phone,
        broker_id: brokerId,
        project_id: projectId,
        status: "new" as any,
        source: "whatsapp",
        lead_origin: "whatsapp_direto",
      } as any)
      .select("id")
      .single();

    if (leadError || !newLead) {
      toast.error("Erro ao criar card no Kanban");
      return;
    }

    await supabase
      .from("conversations")
      .update({ lead_id: (newLead as any).id } as any)
      .eq("id", selectedConversation.id);

    await supabase.from("lead_interactions").insert({
      lead_id: (newLead as any).id,
      interaction_type: "note" as any,
      notes: "Lead criado a partir da Inbox (WhatsApp direto)",
      broker_id: brokerId,
    } as any);

    toast.success("Card criado no Kanban!");
    setSelectedConversation({
      ...selectedConversation,
      lead_id: (newLead as any).id,
      lead: { id: (newLead as any).id, name: leadName, status: "new", project_id: projectId, notes: null, lead_origin: "whatsapp_direto" },
    });
  }, [selectedConversation]);

  const handleAdvanceStatus = useCallback(async (newStatus: string) => {
    const lead = selectedConversation?.lead as any;
    if (!lead) return;
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus } as any)
      .eq("id", lead.id);
    if (error) toast.error("Erro ao atualizar status");
    else toast.success("Status atualizado!");
  }, [selectedConversation]);

  const showList = !selectedConversation || !isMobile;
  const showThread = !!selectedConversation;
  const showContext = showLeadPanel && !isMobile;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#141417]">
      <AdminSidebar activeTab="inbox" onTabChange={(tab) => {
        if (tab === "inbox") return;
        navigate("/admin");
      }} onLogout={handleLogout} />

      <div className="md:pl-16">
        <div className="flex h-[calc(100vh-64px)] md:h-screen overflow-hidden">
          {/* Left panel: filter + list */}
          {showList && (
            <div className={`${isMobile ? "w-full" : "w-80 border-r border-[#2a2a2e]"} flex-shrink-0 flex flex-col`}>
              {/* Broker filter (admin only) */}
              <div className="px-3 pt-3 pb-1">
                <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                  <SelectTrigger className="h-8 bg-[#1e1e22] border-[#2a2a2e] text-sm text-white">
                    <SelectValue placeholder="Todos os corretores" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    <SelectItem value="all" className="text-slate-300 text-sm">Todos os corretores</SelectItem>
                    {brokers.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-slate-300 text-sm">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-h-0">
                <ConversationList
                  conversations={conversations}
                  selectedId={selectedConversation?.id || null}
                  onSelect={handleSelectConversation}
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  isLoading={isLoading}
                  totalUnread={totalUnread}
                  onMarkAsRead={(id) => markAsRead(id)}
                  onArchive={(id) => archiveConversation(id)}
                  isAdminView
                />
              </div>
            </div>
          )}

          {/* Thread or Inline LeadPage */}
          {showThread && (
            <div className={`flex-1 min-w-0 ${isMobile ? "animate-in slide-in-from-right-5 duration-200" : ""}`}>
              {viewingLeadId ? (
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>}>
                  <LeadPage embeddedLeadId={viewingLeadId} onBack={handleBackFromLead} />
                </Suspense>
              ) : (
                <ConversationThread
                  conversation={selectedConversation!}
                  messages={messages}
                  isLoading={messagesLoading}
                  onSendMessage={sendMessage}
                  onBack={handleBack}
                  onMarkAsRead={() => markAsRead(selectedConversation!.id)}
                  onArchive={() => {
                    archiveConversation(selectedConversation!.id);
                    handleBack();
                  }}
                  onUnarchive={() => {
                    unarchiveConversation(selectedConversation!.id);
                    handleBack();
                  }}
                  onToggleAiMode={(mode) => {
                    updateAiMode(selectedConversation!.id, mode);
                    setSelectedConversation(prev => prev ? { ...prev, ai_mode: mode } : prev);
                  }}
                  copilotSuggestion={suggestion}
                  isGeneratingSuggestion={isGenerating}
                  onRequestSuggestion={handleRequestSuggestion}
                  onInsertSuggestion={() => setSuggestion("")}
                  onDismissSuggestion={() => setSuggestion("")}
                  onOpenLeadPanel={() => setShowLeadPanel(!showLeadPanel)}
                  onCreateLead={!selectedConversation!.lead_id ? handleOpenCreateLeadModal : undefined}
                  onOpenLead={handleOpenLead}
                />
              )}
            </div>
          )}

          {/* Lead Context Panel */}
          {showContext && selectedConversation && (
            <div className="w-72 flex-shrink-0">
              <LeadContextPanel
                conversation={selectedConversation}
                onClose={() => setShowLeadPanel(false)}
                onAdvanceStatus={handleAdvanceStatus}
                onCreateLead={!selectedConversation.lead_id ? handleOpenCreateLeadModal : undefined}
                onOpenLead={handleOpenLead}
              />
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav activeTab="inbox" onTabChange={(tab) => navigate("/admin")} />

      {/* Create Lead Modal */}
      {selectedConversation && (
        <CreateLeadFromChatModal
          open={showCreateLeadModal}
          onOpenChange={setShowCreateLeadModal}
          phone={selectedConversation.phone}
          suggestedName={(selectedConversation.lead as any)?.name || selectedConversation.phone}
          brokerId={selectedConversation.broker_id}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}
