import { Download } from "lucide-react";
import { getOriginDisplayLabel, STATUS_CONFIG, LeadStatus } from "@/types/crm";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  email?: string | null;
  created_at: string;
  source: string;
  status?: LeadStatus;
  lead_origin?: string | null;
  last_interaction_at?: string | null;
  registered_at?: string | null;
  broker_id: string | null;
  broker?: {
    name: string;
    slug: string;
  } | null;
}

interface ExportButtonProps {
  leads: Lead[];
  filename?: string;
}

const ExportButton = ({ leads, filename = "leads" }: ExportButtonProps) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status?: LeadStatus) => {
    if (!status) return "";
    return STATUS_CONFIG[status]?.label || status;
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;

    const headers = [
      "Nome",
      "WhatsApp",
      "Email",
      "Status",
      "Cadastrado por",
      "Origem",
      "Corretor",
      "Data de Cadastro",
      "Última Interação",
      "Data de Registro"
    ];
    
    const rows = leads.map((lead) => [
      lead.name,
      lead.whatsapp,
      lead.email || "",
      getStatusLabel(lead.status),
      lead.source === "enove" ? "Enove" : lead.source,
      getOriginDisplayLabel(lead.lead_origin || null),
      lead.broker?.name || "",
      formatDate(lead.created_at),
      formatDate(lead.last_interaction_at),
      formatDate(lead.registered_at),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={leads.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      Exportar CSV ({leads.length})
    </button>
  );
};

export default ExportButton;
