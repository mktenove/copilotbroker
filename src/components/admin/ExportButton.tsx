import { Download } from "lucide-react";

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

interface ExportButtonProps {
  leads: Lead[];
  filename?: string;
}

const ExportButton = ({ leads, filename = "leads" }: ExportButtonProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;

    const getOriginLabel = (origin: string | null | undefined) => {
      if (!origin) return "";
      const found = LEAD_ORIGINS.find(o => o.key === origin);
      return found?.label || origin;
    };

    const headers = ["Nome", "WhatsApp", "Cadastrado por", "Origem", "Corretor", "Data de Cadastro"];
    const rows = leads.map((lead) => [
      lead.name,
      lead.whatsapp,
      lead.source === "enove" ? "Enove" : lead.source,
      getOriginLabel(lead.lead_origin),
      lead.broker?.name || "",
      formatDate(lead.created_at),
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
      Exportar CSV
    </button>
  );
};

export default ExportButton;
