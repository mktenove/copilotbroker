import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeadDocument, DOCUMENT_TYPES } from "@/types/crm";
import { toast } from "sonner";

export function useLeadDocuments(leadId: string | null) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_documents")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDocuments((data || []) as unknown as LeadDocument[]);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const initializeDocuments = useCallback(async () => {
    if (!leadId) return;

    // Check if documents already exist
    const { data: existing } = await supabase
      .from("lead_documents")
      .select("id")
      .eq("lead_id", leadId)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Create default document checklist
    const docsToCreate = DOCUMENT_TYPES.map(doc => ({
      lead_id: leadId,
      document_type: doc.key,
      is_received: false
    }));

    try {
      const { error } = await supabase
        .from("lead_documents")
        .insert(docsToCreate);

      if (error) throw error;
      await fetchDocuments();
    } catch (error) {
      console.error("Erro ao inicializar documentos:", error);
    }
  }, [leadId, fetchDocuments]);

  const toggleDocument = useCallback(async (documentId: string, isReceived: boolean, userId?: string) => {
    try {
      const { error } = await supabase
        .from("lead_documents")
        .update({
          is_received: isReceived,
          received_at: isReceived ? new Date().toISOString() : null,
          received_by: isReceived ? userId : null
        })
        .eq("id", documentId);

      if (error) throw error;

      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              is_received: isReceived,
              received_at: isReceived ? new Date().toISOString() : null,
              received_by: isReceived ? userId || null : null
            }
          : doc
      ));

      return true;
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
      toast.error("Erro ao atualizar documento.");
      return false;
    }
  }, []);

  const allDocumentsReceived = documents.length > 0 && documents.every(doc => doc.is_received);
  const receivedCount = documents.filter(doc => doc.is_received).length;

  return {
    documents,
    isLoading,
    fetchDocuments,
    initializeDocuments,
    toggleDocument,
    allDocumentsReceived,
    receivedCount,
    totalCount: documents.length
  };
}
