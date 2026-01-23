import { useState } from "react";
import { Phone, Users, RefreshCw, MapPin, Trash2, UserX } from "lucide-react";
import { getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { cn } from "@/lib/utils";
import LeadCard from "./LeadCard";
import { InactivationPicker } from "@/components/crm/InactivationPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  source: string;
  status?: LeadStatus;
  lead_origin?: string | null;
  broker_id: string | null;
  broker?: {
    name: string;
    slug: string;
  } | null;
}

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  searchTerm: string;
  showSource?: boolean;
  showStatus?: boolean;
  onLeadClick?: (lead: Lead) => void;
  onDelete?: (leadId: string) => Promise<void>;
  onInactivate?: (leadId: string, reason: string) => Promise<void>;
}

const LeadsTable = ({ leads, isLoading, searchTerm, showSource = true, showStatus = true, onLeadClick, onDelete, onInactivate }: LeadsTableProps) => {
  const [inactivatingLead, setInactivatingLead] = useState<Lead | null>(null);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSourceLabel = (lead: Lead) => {
    if (lead.source === "enove") {
      return <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Enove</span>;
    }
    return (
      <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full">
        {lead.source}
      </span>
    );
  };

  const getOriginLabel = (lead: Lead) => {
    if (!lead.lead_origin) return <span className="text-muted-foreground">—</span>;
    
    return (
      <span className={cn(
        "px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit border",
        ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
      )}>
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="max-w-[150px] truncate">{getOriginDisplayLabel(lead.lead_origin)}</span>
      </span>
    );
  };

  const getStatusLabel = (lead: Lead) => {
    if (!lead.status) return <span className="text-muted-foreground">—</span>;
    const config = STATUS_CONFIG[lead.status];
    return (
      <span className={cn(
        "px-2 py-1 text-xs rounded-full",
        config.bgColor,
        config.color
      )}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando leads...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">
          {searchTerm ? "Nenhum lead encontrado." : "Nenhum lead cadastrado ainda."}
        </p>
      </div>
    );
  }

  const handleInactivateConfirm = async (reason: string) => {
    if (onInactivate && inactivatingLead) {
      await onInactivate(inactivatingLead.id, reason);
    }
    setInactivatingLead(null);
  };

  return (
    <>
      {/* Mobile: Cards */}
      <div className="md:hidden space-y-4 p-4">
        {leads.map((lead) => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            showSource={showSource} 
            showStatus={showStatus} 
            onClick={onLeadClick ? () => onLeadClick(lead) : undefined}
            onDelete={onDelete}
            onInactivate={onInactivate}
          />
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">WhatsApp</th>
              {showStatus && (
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
              )}
              {showSource && (
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Cadastrado por</th>
              )}
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Origem</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Corretor</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Data de Cadastro</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => {
              const isInactive = lead.status === "inactive";
              return (
                <tr 
                  key={lead.id} 
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    onLeadClick && "cursor-pointer"
                  )}
                  onClick={() => onLeadClick?.(lead)}
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">{lead.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{lead.whatsapp}</span>
                  </td>
                  {showStatus && (
                    <td className="px-6 py-4">
                      {getStatusLabel(lead)}
                    </td>
                  )}
                  {showSource && (
                    <td className="px-6 py-4">
                      {getSourceLabel(lead)}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {getOriginLabel(lead)}
                  </td>
                  <td className="px-6 py-4">
                    {lead.broker?.name ? (
                      <span className="font-medium text-foreground">{lead.broker.name}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground text-sm">{formatDate(lead.created_at)}</span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        WhatsApp
                      </a>
                      
                      {/* Botão Inativar */}
                      {onInactivate && !isInactive && (
                        <button
                          onClick={() => setInactivatingLead(lead)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-muted text-muted-foreground text-sm rounded-lg hover:bg-muted/80 transition-colors"
                          title="Inativar lead"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Botão Excluir */}
                      {onDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="inline-flex items-center gap-1 px-3 py-2 bg-destructive/10 text-destructive text-sm rounded-lg hover:bg-destructive/20 transition-colors"
                              title="Excluir lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O lead <strong>{lead.name}</strong> e todos os dados relacionados serão excluídos permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(lead.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inactivation Picker */}
      {inactivatingLead && (
        <InactivationPicker
          leadId={inactivatingLead.id}
          leadName={inactivatingLead.name}
          isOpen={!!inactivatingLead}
          onClose={() => setInactivatingLead(null)}
          onConfirm={handleInactivateConfirm}
        />
      )}
    </>
  );
};

export default LeadsTable;
