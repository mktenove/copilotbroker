import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Building2, FileText } from "lucide-react";
import type { PropostaInsert } from "@/hooks/use-propostas";

interface PropostaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: PropostaInsert) => Promise<boolean>;
  leadProjectId?: string | null;
  leadProjectName?: string | null;
  leadBrokerId?: string | null;
  projects?: { id: string; name: string }[];
}

export function PropostaModal({ open, onOpenChange, onConfirm, leadProjectId, leadProjectName, leadBrokerId, projects = [] }: PropostaModalProps) {
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(leadProjectId || "");
  const [unidade, setUnidade] = useState("");
  const [valorProposta, setValorProposta] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("a_vista");
  const [parcelamento, setParcelamento] = useState("");
  const [permuta, setPermuta] = useState(false);
  const [descricaoPermuta, setDescricaoPermuta] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [condicoesEspeciais, setCondicoesEspeciais] = useState("");

  const parseCurrency = (v: string) => parseFloat(v.replace(/\D/g, "")) / 100 || 0;

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits || "0") / 100;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const valorPropostaNum = parseCurrency(valorProposta);
  const valorEntradaNum = parseCurrency(valorEntrada);
  const saldoFinanciar = useMemo(() => Math.max(0, valorPropostaNum - valorEntradaNum), [valorPropostaNum, valorEntradaNum]);

  const resetForm = () => {
    setProjectId(leadProjectId || "");
    setUnidade("");
    setValorProposta("");
    setValorEntrada("");
    setFormaPagamento("a_vista");
    setParcelamento("");
    setPermuta(false);
    setDescricaoPermuta("");
    setObservacoes("");
    setCondicoesEspeciais("");
  };

  const handleConfirm = async () => {
    if (valorPropostaNum <= 0) return;
    setLoading(true);
    try {
      const ok = await onConfirm({
        lead_id: "", // filled by parent
        project_id: projectId || null,
        broker_id: leadBrokerId || null,
        unidade: unidade || undefined,
        valor_proposta: valorPropostaNum,
        valor_entrada: valorEntradaNum || undefined,
        forma_pagamento_entrada: formaPagamento,
        parcelamento: parcelamento || undefined,
        permuta,
        descricao_permuta: permuta ? descricaoPermuta : undefined,
        observacoes_corretor: observacoes || undefined,
        condicoes_especiais: condicoesEspeciais || undefined,
      });
      if (ok) {
        onOpenChange(false);
        resetForm();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            Nova Proposta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados do Imóvel */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Dados do Imóvel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Empreendimento</label>
                {projects.length > 0 ? (
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-sm">
                      <SelectValue placeholder={leadProjectName || "Selecionar"} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={leadProjectName || ""} disabled className="bg-[#0f0f12] border-[#2a2a2e] text-sm" />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Unidade</label>
                <Input placeholder="Ex: Apto 301, Bloco A" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-sm" />
              </div>
            </div>
          </div>

          {/* Dados Financeiros */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> Dados Financeiros
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Valor da Proposta *</label>
                <Input
                  placeholder="R$ 0,00"
                  value={valorProposta ? formatCurrency(valorProposta) : ""}
                  onChange={(e) => setValorProposta(e.target.value.replace(/\D/g, ""))}
                  className="bg-[#0f0f12] border-[#2a2a2e] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Valor de Entrada</label>
                <Input
                  placeholder="R$ 0,00"
                  value={valorEntrada ? formatCurrency(valorEntrada) : ""}
                  onChange={(e) => setValorEntrada(e.target.value.replace(/\D/g, ""))}
                  className="bg-[#0f0f12] border-[#2a2a2e] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Forma de Pgto da Entrada</label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    <SelectItem value="a_vista" className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white">À Vista</SelectItem>
                    <SelectItem value="parcelado" className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Parcelamento</label>
                <Input placeholder="Ex: 36x de R$ 1.500" value={parcelamento} onChange={(e) => setParcelamento(e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-sm" />
              </div>
            </div>

            {/* Resumo */}
            {valorPropostaNum > 0 && (
              <div className="mt-4 bg-[#0f0f12] rounded-xl border border-[#2a2a2e] p-4">
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Resumo</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Proposta</p>
                    <p className="text-sm font-semibold text-yellow-400">{formatCurrency(valorProposta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Entrada</p>
                    <p className="text-sm font-semibold text-emerald-400">{valorEntradaNum > 0 ? formatCurrency(valorEntrada) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Saldo a Financiar</p>
                    <p className="text-sm font-semibold text-slate-200">R$ {saldoFinanciar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Permuta */}
            <div className="mt-4 flex items-center justify-between bg-[#0f0f12] rounded-xl border border-[#2a2a2e] px-4 py-3">
              <label className="text-sm text-slate-300">Permuta?</label>
              <Switch checked={permuta} onCheckedChange={setPermuta} />
            </div>
            {permuta && (
              <div className="mt-2 space-y-1.5">
                <label className="text-xs text-slate-400">Descrição da Permuta</label>
                <Textarea placeholder="Descreva o bem ofertado em permuta..." value={descricaoPermuta} onChange={(e) => setDescricaoPermuta(e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-sm min-h-[60px]" />
              </div>
            )}
          </div>

          {/* Dados Estratégicos */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Dados Estratégicos
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Observações do Corretor</label>
                <Textarea placeholder="Contexto da negociação, perfil do cliente..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-sm min-h-[60px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Condições Especiais Solicitadas</label>
                <Textarea placeholder="Desconto, prazo diferenciado, inclusões..." value={condicoesEspeciais} onChange={(e) => setCondicoesEspeciais(e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-sm min-h-[60px]" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={valorPropostaNum <= 0 || loading} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
            {loading ? "Salvando..." : "Registrar Proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
