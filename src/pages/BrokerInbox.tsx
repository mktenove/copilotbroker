import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationThread } from "@/components/inbox/ConversationThread";
import { LeadContextPanel } from "@/components/inbox/LeadContextPanel";
import { useConversations, useConversationMessages, Conversation } from "@/hooks/use-conversations";
import { useCopilotSuggestion } from "@/hooks/use-copilot";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrokerSidebar } from "@/components/broker/BrokerSidebar";
import { BrokerBottomNav } from "@/components/broker/BrokerBottomNav";

export default function BrokerInbox() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showLeadPanel, setShowLeadPanel] = useState(false);

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

  const { conversations, isLoading, totalUnread, markAsRead, archiveConversation, updateAiMode } =
    useConversations({ brokerId: brokerId || undefined, search, statusFilter });

  const { messages, isLoading: messagesLoading, sendMessage } =
    useConversationMessages(selectedConversation?.id || null);

  const { suggestion, isGenerating, generateSuggestion, setSuggestion } = useCopilotSuggestion();

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    if (isMobile) setShowLeadPanel(false);
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
    setShowLeadPanel(false);
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
        <div className="flex h-[calc(100vh-56px)] lg:h-screen overflow-hidden">
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

        {/* Thread */}
        {showThread && (
          <div className="flex-1 min-w-0">
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
              onToggleAiMode={(mode) => updateAiMode(selectedConversation!.id, mode)}
              copilotSuggestion={suggestion}
              isGeneratingSuggestion={isGenerating}
              onRequestSuggestion={handleRequestSuggestion}
              onInsertSuggestion={() => setSuggestion("")}
              onDismissSuggestion={() => setSuggestion("")}
              onOpenLeadPanel={() => setShowLeadPanel(!showLeadPanel)}
            />
          </div>
        )}

        {/* Lead Context Panel */}
        {showContext && selectedConversation && (
          <div className="w-72 flex-shrink-0">
            <LeadContextPanel
              conversation={selectedConversation}
              onClose={() => setShowLeadPanel(false)}
              onAdvanceStatus={handleAdvanceStatus}
            />
          </div>
        )}
        </div>
      </div>
      <BrokerBottomNav viewMode="kanban" onViewChange={() => navigate("/corretor/admin")} />
    </div>
  );
}
