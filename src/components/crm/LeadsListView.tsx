import { useMemo } from "react";
import { MessageCircle, User, Clock, MapPin, ArrowUpDown } from "lucide-react";
import { CRMLead, STATUS_CONFIG, getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS } from "@/types/crm";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeadsListViewProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
}

export function LeadsListView({ leads, onLeadClick }: LeadsListViewProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getTimeSince = (dateString: string | null, fallback: string) => {
    const date = dateString ? new Date(dateString) : new Date(fallback);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1d";
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}sem`;
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-4 opacity-50">📋</span>
        <h3 className="text-lg font-medium text-foreground mb-1">Nenhum lead encontrado</h3>
        <p className="text-sm text-muted-foreground">Ajuste os filtros para ver mais resultados</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[280px]">
              <div className="flex items-center gap-1.5 font-medium">
                Lead
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[160px]">Origem</TableHead>
            <TableHead className="w-[140px]">Corretor</TableHead>
            <TableHead className="w-[100px]">Interação</TableHead>
            <TableHead className="w-[100px]">Criado</TableHead>
            <TableHead className="w-[80px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const statusConfig = STATUS_CONFIG[lead.status];
            const isStale = (() => {
              const date = lead.last_interaction_at ? new Date(lead.last_interaction_at) : new Date(lead.created_at);
              const now = new Date();
              return (now.getTime() - date.getTime()) / (1000 * 60 * 60) > 48;
            })();
            
            return (
              <TableRow 
                key={lead.id} 
                onClick={() => onLeadClick(lead)}
                className="table-row-premium"
              >
                {/* Lead Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="avatar-gold-sm shrink-0">
                      {getInitials(lead.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{lead.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{lead.whatsapp}</div>
                    </div>
                    {isStale && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                    statusConfig.bgColor,
                    statusConfig.color
                  )}>
                    <span>{statusConfig.icon}</span>
                    <span className="truncate max-w-[80px]">{statusConfig.label.split(' ')[0]}</span>
                  </span>
                </TableCell>

                {/* Origin */}
                <TableCell>
                  {lead.lead_origin ? (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
                      ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
                    )}>
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{getOriginDisplayLabel(lead.lead_origin)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Broker */}
                <TableCell>
                  {lead.broker ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{lead.broker.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Enove</span>
                  )}
                </TableCell>

                {/* Last Interaction */}
                <TableCell>
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isStale ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    <Clock className="w-3 h-3" />
                    <span>{getTimeSince(lead.last_interaction_at, lead.created_at)}</span>
                  </div>
                </TableCell>

                {/* Created */}
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <a
                    href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                      "bg-primary/10 text-primary hover:bg-primary/20",
                      "transition-colors"
                    )}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
