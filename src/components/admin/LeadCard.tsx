import { useState } from "react";
import { Phone, Calendar, MapPin, UserCheck, Trash2, UserX, RotateCw } from "lucide-react";
import { getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { cn } from "@/lib/utils";
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

interface LeadCardProps {
  lead: Lead;
  showSource?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  onDelete?: (leadId: string) => Promise<void>;
  onInactivate?: (leadId: string, reason: string) => Promise<void>;
  onReactivate?: (leadId: string) => Promise<void>;
}

const LeadCard = ({ lead, showSource = true, showStatus = true, onClick, onDelete, onInactivate, onReactivate }: LeadCardProps) => {
  const [isInactivationOpen, setIsInactivationOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSourceLabel = () => {
    if (lead.source === "enove") {
      return <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Enove</span>;
    }
    return (
      <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full">
        {lead.source}
      </span>
    );
  };

  const getOriginLabel = () => {
    if (!lead.lead_origin) return null;
    
    return (
      <span className={cn(
        "px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit border max-w-[150px]",
        ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
      )}>
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{getOriginDisplayLabel(lead.lead_origin)}</span>
      </span>
    );
  };

  const getStatusLabel = () => {
    if (!lead.status) return null;
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

  const handleInactivateConfirm = async (reason: string) => {
    if (onInactivate) {
      await onInactivate(lead.id, reason);
    }
    setIsInactivationOpen(false);
  };

  const isInactive = lead.status === "inactive";

  return (
    <>
      <div 
        className={cn(
          "bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-3 transition-all",
          onClick && "cursor-pointer hover:border-slate-600"
        )}
        onClick={onClick}
      >
        {/* Header com nome */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-white text-lg leading-tight">{lead.name}</h3>
          <div className="flex flex-wrap gap-1">
            {showStatus && getStatusLabel()}
            {showSource && getSourceLabel()}
            {getOriginLabel()}
          </div>
        </div>

        {/* Informações */}
        <div className="space-y-2 text-sm">
          {/* WhatsApp */}
          <div className="flex items-center gap-2 text-slate-400">
            <Phone className="w-4 h-4 shrink-0 text-slate-500" />
            <span>{lead.whatsapp}</span>
          </div>

          {/* Corretor atribuído */}
          <div className="flex items-center gap-2 text-slate-400">
            <UserCheck className="w-4 h-4 shrink-0 text-slate-500" />
            <span>
              {lead.broker?.name ? (
                <span className="text-slate-200 font-medium">{lead.broker.name}</span>
              ) : (
                <span className="text-slate-500">Não atribuído</span>
              )}
            </span>
          </div>

          {/* Data */}
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
            <span>{formatDate(lead.created_at)}</span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            WhatsApp
          </a>
          
          {/* Botão Inativar */}
          {onInactivate && !isInactive && (
            <button
              onClick={() => setIsInactivationOpen(true)}
              className="flex items-center justify-center px-4 py-3 bg-[#2a2a2e] text-slate-400 rounded-lg hover:bg-[#3a3a3e] hover:text-slate-200 transition-colors"
              title="Inativar lead"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
          
          {/* Botão Reativar */}
          {onReactivate && isInactive && (
            <button
              onClick={() => onReactivate(lead.id)}
              className="flex items-center justify-center px-4 py-3 bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-emerald-600/20 transition-colors"
              title="Reativar lead"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
          
          {/* Botão Excluir */}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center justify-center px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
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
      </div>

      {/* Inactivation Picker */}
      <InactivationPicker
        leadId={lead.id}
        leadName={lead.name}
        isOpen={isInactivationOpen}
        onClose={() => setIsInactivationOpen(false)}
        onConfirm={handleInactivateConfirm}
      />
    </>
  );
};

export default LeadCard;
