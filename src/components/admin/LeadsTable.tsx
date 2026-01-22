import { Phone, Users, RefreshCw } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  source: string;
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
}

const LeadsTable = ({ leads, isLoading, searchTerm, showSource = true }: LeadsTableProps) => {
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
    if (lead.source === "enove" || !lead.broker_id) {
      return <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Enove</span>;
    }
    return (
      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
        {lead.broker?.name || lead.source}
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Nome</th>
            <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">WhatsApp</th>
            {showSource && (
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Origem</th>
            )}
            <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Data de Cadastro</th>
            <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-4">
                <span className="font-medium text-foreground">{lead.name}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-foreground">{lead.whatsapp}</span>
              </td>
              {showSource && (
                <td className="px-6 py-4">
                  {getSourceLabel(lead)}
                </td>
              )}
              <td className="px-6 py-4">
                <span className="text-muted-foreground text-sm">{formatDate(lead.created_at)}</span>
              </td>
              <td className="px-6 py-4">
                <a
                  href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadsTable;
