import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { 
  WhatsAppCampaign, 
  WhatsAppMessageTemplate, 
  CampaignStatus,
  formatPhoneE164,
  isValidPhone,
  replaceTemplateVariables,
  getRandomInterval
} from "@/types/whatsapp";
import type { CRMLead, LeadStatus } from "@/types/crm";

interface CreateCampaignData {
  name: string;
  targetStatus: LeadStatus[];
  projectId?: string;
  templateId?: string;
  customMessage?: string;
}

interface CreateTemplateData {
  name: string;
  content: string;
  category: string;
}

export function useWhatsAppCampaigns() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const { role } = useUserRole();

  // Fetch broker ID
  const { data: broker } = useQuery({
    queryKey: ["current-broker"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("brokers")
        .select("id, name")
        .eq("user_id", user.id)
        .single();
      
      return data;
    },
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: isLoadingCampaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ["whatsapp-campaigns", broker?.id, role],
    queryFn: async () => {
      if (role !== "admin" && !broker?.id) return [];
      
      let query = supabase
        .from("whatsapp_campaigns")
        .select(`
          *,
          template:whatsapp_message_templates(id, name, content),
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false });
      
      if (role !== "admin" && broker?.id) {
        query = query.eq("broker_id", broker.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppCampaign[];
    },
    enabled: role === "admin" || !!broker?.id,
  });

  // Fetch templates
  const { data: templates = [], isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ["whatsapp-templates", broker?.id, role],
    queryFn: async () => {
      if (role !== "admin" && !broker?.id) return [];
      
      let query = supabase
        .from("whatsapp_message_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (broker?.id) {
        query = query.or(`broker_id.eq.${broker.id},broker_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppMessageTemplate[];
    },
    enabled: role === "admin" || !!broker?.id,
  });

  // Fetch leads by status
  const fetchLeadsByStatus = useCallback(async (
    targetStatus: LeadStatus[],
    projectId?: string
  ): Promise<CRMLead[]> => {
    if (role !== "admin" && !broker?.id) return [];
    
    let query = supabase
      .from("leads")
      .select(`
        *,
        project:projects(id, name),
        broker:brokers!leads_broker_id_fkey(id, name)
      `)
      .in("status", targetStatus);
    
    if (role !== "admin" && broker?.id) {
      query = query.eq("broker_id", broker.id);
    }
    
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data as unknown as CRMLead[];
  }, [broker?.id, role]);

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      if (!broker?.id) throw new Error("Corretor não encontrado. Associe um perfil de corretor para criar campanhas.");
      
      setIsCreating(true);
      
      // Fetch leads for the campaign
      const leads = await fetchLeadsByStatus(data.targetStatus, data.projectId);
      
      if (leads.length === 0) {
        throw new Error("Nenhum lead encontrado com os filtros selecionados");
      }
      
      // Check for opt-outs
      const phones = leads.map(l => formatPhoneE164(l.whatsapp));
      const { data: optouts } = await supabase
        .from("whatsapp_optouts")
        .select("phone")
        .in("phone", phones);
      
      const optoutPhones = new Set(optouts?.map(o => o.phone) || []);
      const validLeads = leads.filter(l => {
        const phone = formatPhoneE164(l.whatsapp);
        return isValidPhone(l.whatsapp) && !optoutPhones.has(phone);
      });
      
      if (validLeads.length === 0) {
        throw new Error("Nenhum lead válido após filtrar opt-outs e telefones inválidos");
      }
      
      // Get message content
      let messageContent = data.customMessage || "";
      if (data.templateId) {
        const template = templates.find(t => t.id === data.templateId);
        if (template) messageContent = template.content;
      }
      
      if (!messageContent.trim()) {
        throw new Error("Mensagem não pode estar vazia");
      }
      
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          broker_id: broker.id,
          name: data.name,
          template_id: data.templateId || null,
          custom_message: data.customMessage || null,
          target_status: data.targetStatus,
          project_id: data.projectId || null,
          status: "running" as CampaignStatus,
          total_leads: validLeads.length,
        })
        .select()
        .single();
      
      if (campaignError) throw campaignError;
      
      // Schedule messages with random intervals
      let scheduledTime = new Date();
      const queueItems = validLeads.map((lead) => {
        const interval = getRandomInterval();
        scheduledTime = new Date(scheduledTime.getTime() + interval);
        
        const personalizedMessage = replaceTemplateVariables(messageContent, {
          nome: lead.name.split(" ")[0],
          empreendimento: lead.project?.name || "",
          corretor_nome: broker.name.split(" ")[0],
        });
        
        return {
          broker_id: broker.id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          phone: formatPhoneE164(lead.whatsapp),
          message: personalizedMessage,
          status: "scheduled",
          scheduled_at: scheduledTime.toISOString(),
        };
      });
      
      // Insert queue items
      const { error: queueError } = await supabase
        .from("whatsapp_message_queue")
        .insert(queueItems);
      
      if (queueError) throw queueError;
      
      return campaign;
    },
    onSuccess: () => {
      toast.success("Campanha criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar campanha");
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  // Pause campaign
  const pauseCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns")
        .update({ status: "paused" as CampaignStatus })
        .eq("id", campaignId);
      
      if (error) throw error;
      
      // Pause pending messages
      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "paused_by_system" })
        .eq("campaign_id", campaignId)
        .in("status", ["queued", "scheduled"]);
    },
    onSuccess: () => {
      toast.success("Campanha pausada");
      refetchCampaigns();
    },
  });

  // Resume campaign
  const resumeCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns")
        .update({ status: "running" as CampaignStatus })
        .eq("id", campaignId);
      
      if (error) throw error;
      
      // Re-schedule paused messages
      const { data: pausedMessages } = await supabase
        .from("whatsapp_message_queue")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("status", "paused_by_system");
      
      if (pausedMessages && pausedMessages.length > 0) {
        let scheduledTime = new Date();
        for (const msg of pausedMessages) {
          const interval = getRandomInterval();
          scheduledTime = new Date(scheduledTime.getTime() + interval);
          
          await supabase
            .from("whatsapp_message_queue")
            .update({ 
              status: "scheduled",
              scheduled_at: scheduledTime.toISOString()
            })
            .eq("id", msg.id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Campanha retomada");
      refetchCampaigns();
    },
  });

  // Cancel campaign
  const cancelCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns")
        .update({ status: "cancelled" as CampaignStatus })
        .eq("id", campaignId);
      
      if (error) throw error;
      
      // Cancel pending messages
      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "cancelled" })
        .eq("campaign_id", campaignId)
        .in("status", ["queued", "scheduled", "paused_by_system"]);
    },
    onSuccess: () => {
      toast.success("Campanha cancelada");
      refetchCampaigns();
    },
  });

  // Create template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      if (!broker?.id) throw new Error("Corretor não encontrado");
      
      const { error } = await supabase
        .from("whatsapp_message_templates")
        .insert({
          broker_id: broker.id,
          name: data.name,
          content: data.content,
          category: data.category,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template criado");
      refetchTemplates();
    },
  });

  // Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTemplateData> }) => {
      const { error } = await supabase
        .from("whatsapp_message_templates")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template atualizado");
      refetchTemplates();
    },
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_message_templates")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template removido");
      refetchTemplates();
    },
  });

  return {
    broker,
    campaigns,
    templates,
    isLoading: isLoadingCampaigns || isLoadingTemplates,
    isCreating,
    fetchLeadsByStatus,
    createCampaign: createCampaignMutation.mutateAsync,
    pauseCampaign: pauseCampaignMutation.mutateAsync,
    resumeCampaign: resumeCampaignMutation.mutateAsync,
    cancelCampaign: cancelCampaignMutation.mutateAsync,
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: (id: string, data: Partial<CreateTemplateData>) => 
      updateTemplateMutation.mutateAsync({ id, data }),
    deleteTemplate: deleteTemplateMutation.mutateAsync,
  };
}
