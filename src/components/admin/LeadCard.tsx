import { Phone, Calendar, MapPin, UserCheck, User } from "lucide-react";
import { LEAD_ORIGINS } from "@/types/crm";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  source: string;
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
}

const LeadCard = ({ lead, showSource = true }: LeadCardProps) => {
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
    const origin = LEAD_ORIGINS.find(o => o.key === lead.lead_origin);
    return (
      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1 w-fit">
        <MapPin className="w-3 h-3" />
        {origin?.label || lead.lead_origin}
      </span>
    );
  };

  return (
    <div className="card-luxury p-4 space-y-3">
      {/* Header com nome */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground text-lg leading-tight">{lead.name}</h3>
        <div className="flex flex-wrap gap-1">
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
