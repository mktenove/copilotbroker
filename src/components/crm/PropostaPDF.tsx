import type { Proposta } from "@/hooks/use-propostas";

interface PropostaPDFData {
  proposta: Proposta;
  leadName: string;
  leadWhatsapp: string;
  leadEmail: string | null;
  leadCpf: string | null;
  brokerName: string | null;
  projectName: string | null;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function gerarPropostaPDF(data: PropostaPDFData) {
  const { proposta, leadName, leadWhatsapp, leadEmail, leadCpf, brokerName, projectName } = data;
  const saldo = proposta.valor_proposta - (proposta.valor_entrada || 0);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta - ${leadName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #c9a84c; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 24px; color: #1a1a2e; }
    .header .date { font-size: 12px; color: #666; }
    .logo { height: 40px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c9a84c; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .field-value { font-size: 14px; font-weight: 500; margin-top: 2px; }
    .highlight { background: #f8f6f0; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .highlight .grid { grid-template-columns: 1fr 1fr 1fr; text-align: center; }
    .highlight .field-value { font-size: 18px; font-weight: 700; }
    .highlight .field-value.gold { color: #c9a84c; }
    .highlight .field-value.green { color: #059669; }
    .notes { background: #fafafa; border-left: 3px solid #c9a84c; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #444; line-height: 1.5; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #999; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Proposta Comercial</h1>
      <p class="date">${new Date(proposta.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:20px;font-weight:700;color:#c9a84c;">ENOVE</p>
      <p style="font-size:10px;color:#888;">Imobiliária</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Cliente</div>
    <div class="grid">
      <div class="field"><div class="field-label">Nome</div><div class="field-value">${leadName}</div></div>
      <div class="field"><div class="field-label">Telefone</div><div class="field-value">${leadWhatsapp}</div></div>
      ${leadEmail ? `<div class="field"><div class="field-label">Email</div><div class="field-value">${leadEmail}</div></div>` : ""}
      ${leadCpf ? `<div class="field"><div class="field-label">CPF</div><div class="field-value">${leadCpf}</div></div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Imóvel</div>
    <div class="grid">
      <div class="field"><div class="field-label">Empreendimento</div><div class="field-value">${projectName || "—"}</div></div>
      <div class="field"><div class="field-label">Unidade</div><div class="field-value">${proposta.unidade || "—"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Valores</div>
    <div class="highlight">
      <div class="grid">
        <div class="field"><div class="field-label">Valor Proposta</div><div class="field-value gold">${fmt(proposta.valor_proposta)}</div></div>
        <div class="field"><div class="field-label">Entrada</div><div class="field-value green">${proposta.valor_entrada ? fmt(proposta.valor_entrada) : "—"}</div></div>
        <div class="field"><div class="field-label">Saldo Financiar</div><div class="field-value">${fmt(Math.max(0, saldo))}</div></div>
      </div>
    </div>
    <div class="grid" style="margin-top:12px">
      <div class="field"><div class="field-label">Forma Pgto Entrada</div><div class="field-value">${proposta.forma_pagamento_entrada === "parcelado" ? "Parcelado" : "À Vista"}</div></div>
      <div class="field"><div class="field-label">Parcelamento</div><div class="field-value">${proposta.parcelamento || "—"}</div></div>
    </div>
    ${proposta.permuta ? `<div class="grid" style="margin-top:8px"><div class="field"><div class="field-label">Permuta</div><div class="field-value">${proposta.descricao_permuta || "Sim"}</div></div></div>` : ""}
  </div>

  ${proposta.observacoes_corretor ? `<div class="section"><div class="section-title">Observações do Corretor</div><div class="notes">${proposta.observacoes_corretor}</div></div>` : ""}
  ${proposta.condicoes_especiais ? `<div class="section"><div class="section-title">Condições Especiais</div><div class="notes">${proposta.condicoes_especiais}</div></div>` : ""}

  <div class="footer">
    <span>Corretor: ${brokerName || "—"}</span>
    <span>Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
