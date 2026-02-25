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
import { BrokerSidebar } from "@/components/broker/BrokerSidebar";
import { BrokerBottomNav } from "@/components/broker/BrokerBottomNav";

const LeadPage = lazy(() => import("@/pages/LeadPage"));

export default function BrokerInbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showLeadPanel, setShowLeadPanel] = useState(false);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  // Get broker id
  useEffect(() => {
    const getBrokerId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      const { data } = await supabase
        .from("brokers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setBrokerId((data as any).id);
    };
    getBrokerId();
  }, [navigate]);

  const isArchived = statusFilter === "archived";
  const { conversations, isLoading, totalUnread, markAsRead, archiveConversation, unarchiveConversation, updateAiMode } =
    useConversations({ brokerId: brokerId || undefined, search, statusFilter: isArchived ? "all" : statusFilter, isArchived });

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
        setSearchParams({}, { replace: true }); // clean URL
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
    if (!selectedConversation || !brokerId) return;

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
  }, [selectedConversation, brokerId]);

  const handleAdvanceStatus = useCallback(async (newStatus: string) => {
    const lead = selectedConversation?.lead as any;
    if (!lead) return;
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus } as any)
      .eq("id", lead.id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado!");
    }
  }, [selectedConversation]);

  // View logic: mobile shows one panel at a time
  const showList = !selectedConversation || !isMobile;
  const showThread = !!selectedConversation;
  const showContext = showLeadPanel && !isMobile;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#141417]">
      <BrokerSidebar viewMode="kanban" onViewChange={() => navigate("/corretor/admin")} onLogout={handleLogout} />
      <div className="lg:pl-16">
        <div className="flex h-[calc(100vh-64px)] lg:h-screen overflow-hidden">
        {/* Conversation List */}
        {showList && (
          <div className={`${isMobile ? "w-full" : "w-80 border-r border-[#2a2a2e]"} flex-shrink-0`}>
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
            />
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
      <BrokerBottomNav viewMode="kanban" onViewChange={() => navigate("/corretor/admin")} />

      {/* Create Lead Modal */}
      {selectedConversation && brokerId && (
        <CreateLeadFromChatModal
          open={showCreateLeadModal}
          onOpenChange={setShowCreateLeadModal}
          phone={selectedConversation.phone}
          suggestedName={(selectedConversation.lead as any)?.name || selectedConversation.phone}
          brokerId={brokerId}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}
