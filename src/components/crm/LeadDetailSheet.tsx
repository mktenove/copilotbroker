import { useState, useEffect } from "react";
import { Phone, Mail, User, Calendar, Clock, FileText, MessageSquare, Send, CheckCircle, X, MapPin } from "lucide-react";
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

interface LeadDetailSheetProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (leadId: string, updates: Partial<CRMLead>) => Promise<void>;
  onStatusChange: (leadId: string, oldStatus: LeadStatus, newStatus: LeadStatus) => Promise<void>;
}

export function LeadDetailSheet({ lead, isOpen, onClose, onUpdate, onStatusChange }: LeadDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<CRMLead> & { custom_origin?: string }>({});
  const [newNote, setNewNote] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("whatsapp");
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
      // Verifica se lead_origin é um valor personalizado
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
    // Se a origem for "outro", usa o valor personalizado
    const originToSave = editedLead.lead_origin === 'outro' 
      ? editedLead.custom_origin 
      : editedLead.lead_origin;
    
    const { custom_origin, ...dataToSave } = editedLead;
    
    // Verifica se a origem mudou para registrar no histórico
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
      // Remove template
      const newTemplates = selectedTemplates.filter(t => t !== text);
      setSelectedTemplates(newTemplates);
      setNewNote(newTemplates.join(". "));
    } else {
      // Add template
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
      newStatus: "awaiting_docs",
      createdBy: userId || undefined
    });
    await onStatusChange(lead.id, lead.status, "awaiting_docs");
    toast.success("Marcado como aguardando documentos!");
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{lead.name}</SheetTitle>
            <span className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              statusConfig.color,
              statusConfig.bgColor
            )}>
              {statusConfig.label}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-foreground">Dados de Contato</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancelar" : "Editar"}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editedLead.name || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={editedLead.whatsapp || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedLead.email || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={editedLead.cpf || ""}
                    onChange={(e) => setEditedLead(prev => ({ ...prev, cpf: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lead_origin">Origem do Lead</Label>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_ORIGINS.map(origin => (
                        <SelectItem key={origin.key} value={origin.key}>
                          {origin.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editedLead.lead_origin === 'outro' && (
                    <Input
                      className="mt-2"
                      placeholder="Digite a origem personalizada..."
                      value={editedLead.custom_origin || ""}
                      onChange={(e) => setEditedLead(prev => ({ 
                        ...prev, 
                        custom_origin: e.target.value 
                      }))}
                    />
                  )}
                </div>
                <Button onClick={handleSaveEdit} className="w-full">
                  Salvar Alterações
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <a
                  href={`https://wa.me/55${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-green-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {lead.whatsapp}
                </a>
                {lead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {lead.email}
                  </div>
                )}
                {lead.cpf && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    CPF: {lead.cpf}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Entrada: {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  Cadastrado por: {lead.source === "enove" ? "Enove" : lead.source}
                </div>
                {lead.lead_origin && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full border",
                      ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
                    )}>
                      {getOriginDisplayLabel(lead.lead_origin)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-foreground">Ações Rápidas</h4>
            
            <div className="grid grid-cols-2 gap-2">
              {lead.status === "new" && (
                <div className="col-span-2 flex gap-2">
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERACTION_CHANNELS.map(ch => (
                        <SelectItem key={ch.key} value={ch.key}>{ch.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
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
                  className="col-span-2"
                  onClick={handleMarkDocsRequested}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Solicitar Dados
                </Button>
              )}

              {lead.status === "awaiting_docs" && allDocumentsReceived && (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  onClick={handleMarkDocsReceived}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar Dados Recebidos
                </Button>
              )}

              {lead.status === "docs_received" && (
                <Button
                  variant="default"
                  size="sm"
                  className="col-span-2"
                  onClick={handleMarkRegistered}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cadastrar no Ábaco
                </Button>
              )}
            </div>
          </div>

          {/* Document Checklist */}
          {(lead.status === "awaiting_docs" || lead.status === "docs_received") && (
            <DocumentChecklist
              documents={documents}
              onToggle={(docId, isReceived) => toggleDocument(docId, isReceived, userId || undefined)}
              receivedCount={receivedCount}
              totalCount={totalCount}
            />
          )}

          {/* Notes */}
          <div className="space-y-3">
            {lead.notes && (
              <div className="space-y-1">
                <h4 className="font-medium text-sm text-foreground">Observações do Lead</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
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
                className="min-h-[60px]"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Adicionar Observação
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <LeadTimeline interactions={interactions} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
