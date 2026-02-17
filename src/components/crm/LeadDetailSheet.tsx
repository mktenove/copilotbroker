import { useState, useEffect } from "react";
import { Phone, Mail, User, Calendar, Clock, FileText, MessageSquare, Send, CheckCircle, X, MapPin, Play, RotateCw, ArrowRightLeft, Megaphone } from "lucide-react";
import { CRMLead, LeadStatus, STATUS_CONFIG, INTERACTION_CHANNELS, LEAD_ORIGINS, getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS } from "@/types/crm";
import { useLeadInteractions } from "@/hooks/use-lead-interactions";
import { useLeadDocuments } from "@/hooks/use-lead-documents";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadTimeline } from "./LeadTimeline";
import { DocumentChecklist } from "./DocumentChecklist";
import { QuickNotes } from "./QuickNotes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TransferLeadDialog } from "./TransferLeadDialog";

interface LeadDetailSheetProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (leadId: string, updates: Partial<CRMLead>) => Promise<void>;
  onStatusChange: (leadId: string, oldStatus: LeadStatus, newStatus: LeadStatus) => Promise<void>;
  brokers?: { id: string; name: string }[];
  onTransferred?: () => void;
}

export function LeadDetailSheet({ lead, isOpen, onClose, onUpdate, onStatusChange, brokers = [], onTransferred }: LeadDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<CRMLead> & { custom_origin?: string }>({});
  const [newNote, setNewNote] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("whatsapp");
  const [transferOpen, setTransferOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const { interactions, addInteraction, fetchInteractions } = useLeadInteractions(lead?.id || null);
  const { 
    documents, 
    initializeDocuments, 
    toggleDocument, 
    allDocumentsReceived,
    receivedCount,
    totalCount 
  } = useLeadDocuments(lead?.id || null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (lead?.id) {
      initializeDocuments();
    }
  }, [lead?.id, initializeDocuments]);

  useEffect(() => {
    if (lead) {
      const isCustomOrigin = lead.lead_origin && !LEAD_ORIGINS.some(o => o.key === lead.lead_origin);
      setEditedLead({
        name: lead.name,
        whatsapp: lead.whatsapp,
        email: lead.email,
        cpf: lead.cpf,
        source: lead.source,
        lead_origin: isCustomOrigin ? 'outro' : (lead.lead_origin || ''),
        custom_origin: isCustomOrigin ? lead.lead_origin || '' : '',
        notes: lead.notes
      });
    }
  }, [lead]);

  if (!lead) return null;

  const statusConfig = STATUS_CONFIG[lead.status];
  const cleanPhone = lead.whatsapp.replace(/\D/g, "");

  const handleSaveEdit = async () => {
    const originToSave = editedLead.lead_origin === 'outro' 
      ? editedLead.custom_origin 
      : editedLead.lead_origin;
    
    const { custom_origin, ...dataToSave } = editedLead;
    
    const originChanged = originToSave !== lead.lead_origin;
    
    if (originChanged) {
      await addInteraction("origin_change", {
        notes: `Origem alterada de "${lead.lead_origin || 'Não definida'}" para "${originToSave || 'Não definida'}"`,
        createdBy: userId || undefined
      });
    }
    
    await onUpdate(lead.id, { ...dataToSave, lead_origin: originToSave || null });
    setIsEditing(false);
    toast.success("Lead atualizado com sucesso!");
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    const success = await addInteraction("note_added", {
      notes: newNote,
      createdBy: userId || undefined
    });

    if (success) {
      setNewNote("");
      setSelectedTemplates([]);
      toast.success("Observação adicionada!");
    }
  };

  const handleSelectTemplate = (text: string) => {
    if (selectedTemplates.includes(text)) {
      const newTemplates = selectedTemplates.filter(t => t !== text);
      setSelectedTemplates(newTemplates);
      setNewNote(newTemplates.join(". "));
    } else {
      const newTemplates = [...selectedTemplates, text];
      setSelectedTemplates(newTemplates);
      setNewNote(newTemplates.join(". "));
    }
  };

  const handleMarkInfoSent = async () => {
    await addInteraction("info_sent", {
      channel: selectedChannel,
      notes: `Informações enviadas via ${INTERACTION_CHANNELS.find(c => c.key === selectedChannel)?.label}`,
      oldStatus: lead.status,
      newStatus: "info_sent",
      createdBy: userId || undefined
    });
    await onStatusChange(lead.id, lead.status, "info_sent");
    toast.success("Marcado como informações enviadas!");
  };

  const handleMarkDocsRequested = async () => {
    await addInteraction("document_request", {
      notes: "Documentos solicitados ao cliente",
      oldStatus: lead.status,
      newStatus: "docs_received",
      createdBy: userId || undefined
    });
    await onStatusChange(lead.id, lead.status, "docs_received");
    toast.success("Dados solicitados - movido para Dados Recebidos!");
  };

  const handleMarkDocsReceived = async () => {
    await addInteraction("document_received", {
      notes: "Todos os documentos recebidos",
      oldStatus: lead.status,
      newStatus: "docs_received",
      createdBy: userId || undefined
    });
    await onStatusChange(lead.id, lead.status, "docs_received");
    toast.success("Marcado como documentos recebidos!");
  };

  const handleMarkRegistered = async () => {
    await addInteraction("registration", {
      notes: "Lead cadastrado no sistema Ábaco",
      oldStatus: lead.status,
      newStatus: "registered",
      createdBy: userId || undefined
    });
    await onUpdate(lead.id, { registered_at: new Date().toISOString(), registered_by: userId });
    await onStatusChange(lead.id, lead.status, "registered");
    toast.success("Marcado como cadastrado no Ábaco!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-[#0f0f12] border-l border-[#2a2a2e]">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-xl font-bold text-white truncate">
              {lead.name}
            </SheetTitle>
            <span className={cn(
              "px-3 py-1 text-xs font-semibold rounded-full shrink-0",
              statusConfig.color,
              statusConfig.bgColor
            )}>
              {statusConfig.label}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-400">Dados de Contato</h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-[#2a2a2e]"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancelar" : "Editar"}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-slate-400 text-xs">Nome</Label>
                  <Input
                    id="name"
                    value={editedLead.name || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-[#1e1e22] border-[#3a3a3e] text-slate-200 placeholder:text-slate-500 focus:border-[#FFFF00]/50"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="text-slate-400 text-xs">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={editedLead.whatsapp || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="bg-[#1e1e22] border-[#3a3a3e] text-slate-200 placeholder:text-slate-500 focus:border-[#FFFF00]/50"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-slate-400 text-xs">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedLead.email || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-[#1e1e22] border-[#3a3a3e] text-slate-200 placeholder:text-slate-500 focus:border-[#FFFF00]/50"
                  />
                </div>
                <div>
                  <Label htmlFor="cpf" className="text-slate-400 text-xs">CPF</Label>
                  <Input
                    id="cpf"
                    value={editedLead.cpf || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, cpf: e.target.value }))}
                    className="bg-[#1e1e22] border-[#3a3a3e] text-slate-200 placeholder:text-slate-500 focus:border-[#FFFF00]/50"
                  />
                </div>
                <div>
                  <Label htmlFor="lead_origin" className="text-slate-400 text-xs">Origem do Lead</Label>
                  <Select 
                    value={editedLead.lead_origin || ""} 
                    onValueChange={(val) => {
                      setEditedLead(prev => ({ 
                        ...prev, 
                        lead_origin: val,
                        custom_origin: val === 'outro' ? prev.custom_origin || '' : ''
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-[#1e1e22] border-[#3a3a3e] text-slate-200">
                      <SelectValue placeholder="Selecione a origem..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#3a3a3e]">
                      {LEAD_ORIGINS.map(origin => (
                        <SelectItem 
                          key={origin.key} 
                          value={origin.key}
                          className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white"
                        >
                          {origin.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editedLead.lead_origin === 'outro' && (
                    <Input
                      className="mt-2 bg-[#1e1e22] border-[#3a3a3e] text-slate-200 placeholder:text-slate-500"
                      placeholder="Digite a origem personalizada..."
                      value={editedLead.custom_origin || ""}
                      onChange={(e) => setEditedLead(prev => ({ 
                        ...prev, 
                        custom_origin: e.target.value 
                      }))}
                    />
                  )}
                </div>
                <Button 
                  onClick={handleSaveEdit} 
                  className="w-full bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90 font-semibold"
                >
                  Salvar Alterações
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <a
                  href={`https://wa.me/55${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">{lead.whatsapp}</span>
                </a>
                {lead.email && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">{lead.email}</span>
                  </div>
                )}
                {lead.cpf && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">CPF: {lead.cpf}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">Entrada: {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">Cadastrado por: {lead.source === "enove" ? "Enove" : lead.source}</span>
                </div>
                {lead.lead_origin && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full border",
                      ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
                    )}>
                      {getOriginDisplayLabel(lead.lead_origin)}
                    </span>
                  </div>
                )}
                {lead.lead_origin_detail && (
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-400 truncate" title={lead.lead_origin_detail}>
                      {lead.lead_origin_detail}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Roleta Info */}
          {lead.roleta_id && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-medium text-cyan-300">Distribuído via Roleta</h4>
              </div>
              {lead.status_distribuicao && (
                <p className="text-xs text-cyan-300/70">
                  Status: {lead.status_distribuicao === 'atribuicao_inicial' ? 'Atribuição inicial' :
                    lead.status_distribuicao === 'reassinado_timeout' ? 'Reassinado (timeout)' :
                    lead.status_distribuicao === 'fallback_lider' ? 'Fallback para líder' :
                    lead.status_distribuicao === 'atendimento_iniciado' ? 'Atendimento iniciado' :
                    lead.status_distribuicao}
                </p>
              )}
              {lead.reserva_expira_em && lead.status_distribuicao !== 'atendimento_iniciado' && (
                <p className="text-xs text-amber-300/70">
                  ⏱ Reserva expira em: {new Date(lead.reserva_expira_em).toLocaleString("pt-BR")}
                </p>
              )}
              <div className="flex gap-2">
                {lead.status_distribuicao !== 'atendimento_iniciado' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => {
                      await onUpdate(lead.id, {
                        atendimento_iniciado_em: new Date().toISOString(),
                        status_distribuicao: 'atendimento_iniciado' as any,
                        reserva_expira_em: null,
                      });
                      toast.success("Atendimento iniciado!");
                      window.location.href = `https://wa.me/55${cleanPhone}`;
                    }}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Iniciar Atendimento
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-medium text-slate-400">Ações Rápidas</h4>
            
            <div className="grid grid-cols-2 gap-2">
              {lead.status === "new" && (
                <div className="col-span-2 flex gap-2">
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="w-[120px] bg-[#1e1e22] border-[#3a3a3e] text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#3a3a3e]">
                      {INTERACTION_CHANNELS.map(ch => (
                        <SelectItem 
                          key={ch.key} 
                          value={ch.key}
                          className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white"
                        >
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#3a3a3e] bg-[#1e1e22] text-slate-300 hover:bg-[#2a2a2e] hover:text-white"
                    onClick={handleMarkInfoSent}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Marcar Info Enviada
                  </Button>
                </div>
              )}

              {lead.status === "info_sent" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 border-[#3a3a3e] bg-[#1e1e22] text-slate-300 hover:bg-[#2a2a2e] hover:text-white"
                  onClick={handleMarkDocsRequested}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Solicitar Dados
                </Button>
              )}

              {lead.status === "docs_received" && !allDocumentsReceived && (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 border-[#3a3a3e] bg-[#1e1e22] text-slate-300 hover:bg-[#2a2a2e] hover:text-white"
                  onClick={handleMarkDocsReceived}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar Dados Recebidos
                </Button>
              )}

              {lead.status === "docs_received" && (
                <Button
                  size="sm"
                  className="col-span-2 bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90 font-semibold"
                  onClick={handleMarkRegistered}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cadastrar no Ábaco
                </Button>
              )}

              {/* Transfer Button */}
              {brokers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 border-[#3a3a3e] bg-[#1e1e22] text-slate-300 hover:bg-[#2a2a2e] hover:text-white"
                  onClick={() => setTransferOpen(true)}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transferir Lead
                </Button>
              )}
            </div>
          </div>

          {/* Document Checklist */}
          {(lead.status === "info_sent" || lead.status === "docs_received") && (
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
              <DocumentChecklist
                documents={documents}
                onToggle={(docId, isReceived) => toggleDocument(docId, isReceived, userId || undefined)}
                receivedCount={receivedCount}
                totalCount={totalCount}
              />
            </div>
          )}

          {/* Notes */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-3">
            {lead.notes && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-slate-400">Observações do Lead</h4>
                <p className="text-sm text-slate-300 bg-[#0f0f12] p-3 rounded-lg border border-[#2a2a2e]">
                  {lead.notes}
                </p>
              </div>
            )}
            
            <QuickNotes 
              onSelectTemplate={handleSelectTemplate}
              selectedTexts={selectedTemplates}
            />
            
            <div className="space-y-2">
              <Textarea
                placeholder="Adicionar observação..."
                value={newNote}
                onChange={(e) => {
                  setNewNote(e.target.value);
                  if (e.target.value === "") {
                    setSelectedTemplates([]);
                  }
                }}
                className="min-h-[60px] bg-[#0f0f12] border-[#3a3a3e] text-slate-200 placeholder:text-slate-500 focus:border-[#FFFF00]/50"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full border-[#3a3a3e] bg-[#1e1e22] text-slate-300 hover:bg-[#2a2a2e] hover:text-white disabled:opacity-50"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Adicionar Observação
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
            <LeadTimeline interactions={interactions} />
          </div>
        </div>
      </SheetContent>

      {/* Transfer Dialog */}
      <TransferLeadDialog
        leadId={lead.id}
        leadName={lead.name}
        currentBrokerId={lead.broker_id}
        brokers={brokers}
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        onTransferred={() => {
          onTransferred?.();
          onClose();
        }}
      />
    </Sheet>
  );
}
