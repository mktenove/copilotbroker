import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Check, X, FileText, Send, Plus, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Proposta, PropostaStatus } from "@/hooks/use-propostas";
import { gerarPropostaPDF } from "./PropostaPDF";

interface PropostasListProps {
  propostas: Proposta[];
  loading: boolean;
  onNovaProposta: () => void;
  onAprovar: (id: string) => Promise<boolean>;
  onRejeitar: (id: string, motivo: string) => Promise<boolean>;
  onEncaminhar: (id: string) => Promise<boolean>;
  leadName: string;
  leadWhatsapp: string;
  leadEmail: string | null;
  leadCpf: string | null;
  brokerName: string | null;
  projectName: string | null;
}

const STATUS_BADGES: Record<PropostaStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20" },
  enviada_vendedor: { label: "Enviada", className: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20" },
  aprovada: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" },
  rejeitada: { label: "Rejeitada", className: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20" },
};

export function PropostasList({
  propostas, loading, onNovaProposta, onAprovar, onRejeitar, onEncaminhar,
  leadName, leadWhatsapp, leadEmail, leadCpf, brokerName, projectName,
}: PropostasListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleGerarPDF = (proposta: Proposta) => {
    gerarPropostaPDF({
      proposta,
      leadName,
      leadWhatsapp,
      leadEmail,
      leadCpf,
      brokerName,
      projectName,
    });
  };

  const handleEncaminharWhatsApp = (proposta: Proposta) => {
    const text = [
      `📋 *PROPOSTA #${propostas.indexOf(proposta) + 1}*`,
      ``,
      `🏢 Empreendimento: ${projectName || "N/A"}`,
      `🏠 Unidade: ${proposta.unidade || "N/A"}`,
      `💰 Valor: ${fmt(proposta.valor_proposta)}`,
      proposta.valor_entrada ? `💳 Entrada: ${fmt(proposta.valor_entrada)}` : null,
      proposta.parcelamento ? `📊 Parcelamento: ${proposta.parcelamento}` : null,
      proposta.permuta ? `🔄 Permuta: ${proposta.descricao_permuta || "Sim"}` : null,
      proposta.condicoes_especiais ? `📝 Condições: ${proposta.condicoes_especiais}` : null,
      ``,
      `👤 Cliente: ${leadName}`,
      `📱 Tel: ${leadWhatsapp}`,
      `🧑‍💼 Corretor: ${brokerName || "N/A"}`,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    onEncaminhar(proposta.id);
  };

  if (loading) {
    return (
      <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e22]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Propostas</h2>
        </div>
        <div className="p-5 flex items-center justify-center text-sm text-slate-500">Carregando...</div>
      </section>
    );
  }

  return (
    <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e22] flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Propostas {propostas.length > 0 && <span className="text-yellow-400">({propostas.length})</span>}
        </h2>
        <Button size="sm" onClick={onNovaProposta} className="h-7 px-3 text-[11px] font-semibold bg-yellow-500 hover:bg-yellow-600 text-black">
          <Plus className="w-3 h-3 mr-1" />Nova Proposta
        </Button>
      </div>

      <div className="p-5 space-y-3">
        {propostas.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">Nenhuma proposta registrada</p>
        ) : (
          propostas.map((proposta, idx) => {
            const isExpanded = expandedId === proposta.id;
            const badge = STATUS_BADGES[proposta.status_proposta as PropostaStatus] || STATUS_BADGES.pendente;
            const num = propostas.length - idx;

            return (
              <div key={proposta.id} className={cn(
                "rounded-xl border transition-colors",
                proposta.status_proposta === "aprovada" ? "border-emerald-500/30 bg-emerald-500/5" :
                proposta.status_proposta === "rejeitada" ? "border-red-500/20 bg-red-500/5" :
                "border-[#2a2a2e] bg-[#0f0f12]"
              )}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : proposta.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500">#{num}</span>
                    <span className="text-sm font-medium text-slate-200">{fmt(proposta.valor_proposta)}</span>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-600">{new Date(proposta.created_at).toLocaleDateString("pt-BR")}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-[#1e1e22] pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div><span className="text-slate-500">Unidade</span><p className="text-slate-300 mt-0.5">{proposta.unidade || "—"}</p></div>
                      <div><span className="text-slate-500">Entrada</span><p className="text-slate-300 mt-0.5">{proposta.valor_entrada ? fmt(proposta.valor_entrada) : "—"}</p></div>
                      <div><span className="text-slate-500">Forma Pgto</span><p className="text-slate-300 mt-0.5">{proposta.forma_pagamento_entrada === "parcelado" ? "Parcelado" : "À Vista"}</p></div>
                      <div><span className="text-slate-500">Parcelamento</span><p className="text-slate-300 mt-0.5">{proposta.parcelamento || "—"}</p></div>
                      <div><span className="text-slate-500">Permuta</span><p className="text-slate-300 mt-0.5">{proposta.permuta ? (proposta.descricao_permuta || "Sim") : "Não"}</p></div>
                      <div><span className="text-slate-500">Saldo Financiar</span><p className="text-slate-300 mt-0.5">{proposta.valor_entrada ? fmt(proposta.valor_proposta - (proposta.valor_entrada || 0)) : "—"}</p></div>
                    </div>
                    {proposta.observacoes_corretor && (
                      <div className="text-xs"><span className="text-slate-500">Observações</span><p className="text-slate-300 mt-0.5">{proposta.observacoes_corretor}</p></div>
                    )}
                    {proposta.condicoes_especiais && (
                      <div className="text-xs"><span className="text-slate-500">Condições Especiais</span><p className="text-slate-300 mt-0.5">{proposta.condicoes_especiais}</p></div>
                    )}
                    {proposta.motivo_rejeicao && (
                      <div className="text-xs"><span className="text-red-400">Motivo Rejeição</span><p className="text-red-300 mt-0.5">{proposta.motivo_rejeicao}</p></div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {proposta.status_proposta === "pendente" && (
                        <>
                          <Button size="sm" onClick={() => onAprovar(proposta.id)} className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Check className="w-3 h-3 mr-1" />Aprovar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectOpen(proposta.id); setRejectMotivo(""); }} className="h-7 px-3 text-[11px] border-red-500/20 text-red-400 hover:bg-red-500/10">
                            <X className="w-3 h-3 mr-1" />Rejeitar
                          </Button>
                        </>
                      )}
                      {proposta.status_proposta !== "rejeitada" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleGerarPDF(proposta)} className="h-7 px-3 text-[11px] border-[#2a2a2e] text-slate-300 hover:bg-[#1e1e22]">
                            <FileText className="w-3 h-3 mr-1" />PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEncaminharWhatsApp(proposta)} className="h-7 px-3 text-[11px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
                            <MessageCircle className="w-3 h-3 mr-1" />Enviar WhatsApp
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={(v) => { if (!v) setRejectOpen(null); }}>
        <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-white">Rejeitar Proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm text-slate-400">Motivo da rejeição</label>
            <Input autoFocus placeholder="Ex: Valor abaixo do mínimo..." value={rejectMotivo} onChange={(e) => setRejectMotivo(e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e]" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (rejectOpen && rejectMotivo.trim()) {
                await onRejeitar(rejectOpen, rejectMotivo);
                setRejectOpen(null);
              }
            }} disabled={!rejectMotivo.trim()} className="bg-red-600 hover:bg-red-700 text-white">
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
