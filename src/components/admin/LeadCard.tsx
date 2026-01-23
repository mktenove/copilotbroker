import { Phone, Calendar, MapPin, UserCheck } from "lucide-react";
import { getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { cn } from "@/lib/utils";

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
}

const LeadCard = ({ lead, showSource = true, showStatus = true }: LeadCardProps) => {
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

  return (
    <div className="card-luxury p-4 space-y-3">
      {/* Header com nome */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground text-lg leading-tight">{lead.name}</h3>
        <div className="flex flex-wrap gap-1">
          {showStatus && getStatusLabel()}
          {showSource && getSourceLabel()}
          {getOriginLabel()}
        </div>
      </div>

      {/* Informações */}
      <div className="space-y-2 text-sm">
        {/* WhatsApp */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-4 h-4 shrink-0" />
          <span>{lead.whatsapp}</span>
        </div>

        {/* Corretor atribuído */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>
            {lead.broker?.name ? (
              <span className="text-foreground font-medium">{lead.broker.name}</span>
            ) : (
              <span className="text-muted-foreground">Não atribuído</span>
            )}
          </span>
        </div>

        {/* Data */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{formatDate(lead.created_at)}</span>
        </div>
      </div>

      {/* Botão WhatsApp */}
      <a
        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
      >
        <Phone className="w-4 h-4" />
        Chamar no WhatsApp
      </a>
    </div>
  );
};

export default LeadCard;
