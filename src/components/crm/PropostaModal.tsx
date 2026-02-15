import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Building2, FileText, Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropostaInsert, ParcelaInsert } from "@/hooks/use-propostas";

const TIPOS_PARCELA = [
  { value: "entrada", label: "Entrada" },
  { value: "parcelamento", label: "Parcelamento" },
  { value: "reforco", label: "Reforço" },
  { value: "balao", label: "Balão" },
  { value: "dacao", label: "Dação" },
  { value: "financiamento_bancario", label: "Financiamento Bancário" },
];

const INDICES = [
  { value: "nenhum", label: "Nenhum" },
  { value: "INCC", label: "INCC" },
  { value: "IGPM", label: "IGP-M" },
  { value: "IPCA", label: "IPCA" },
  { value: "outro", label: "Outro" },
];

interface ParcelaForm {
  id: string;
  tipo: string;
  valor: string;
  quantidade_parcelas: string;
  valor_parcela: string;
  indice_correcao: string;
  observacao: string;
}

const emptyParcela = (): ParcelaForm => ({
  id: crypto.randomUUID(),
  tipo: "entrada",
  valor: "",
  quantidade_parcelas: "",
  valor_parcela: "",
  indice_correcao: "nenhum",
  observacao: "",
});

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
  const [observacoes, setObservacoes] = useState("");
  const [condicoesEspeciais, setCondicoesEspeciais] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([emptyParcela()]);

  const parseCurrency = (v: string) => parseFloat(v.replace(/\D/g, "")) / 100 || 0;
  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits || "0") / 100;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const valorPropostaNum = parseCurrency(valorProposta);
  const totalParcelas = useMemo(() => parcelas.reduce((sum, p) => sum + parseCurrency(p.valor), 0), [parcelas]);
  const diferenca = valorPropostaNum - totalParcelas;
  const isComposicaoOk = Math.abs(diferenca) < 0.01 && valorPropostaNum > 0;

  const addParcela = () => setParcelas(prev => [...prev, emptyParcela()]);
  const removeParcela = (id: string) => setParcelas(prev => prev.filter(p => p.id !== id));
  const updateParcela = (id: string, field: keyof ParcelaForm, value: string) => {
    setParcelas(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (field === "valor" || field === "quantidade_parcelas") {
        const val = parseCurrency(field === "valor" ? value : updated.valor);
        const qty = parseInt(field === "quantidade_parcelas" ? value : updated.quantidade_parcelas);
        if (val > 0 && qty > 0) {
          const perInstallment = Math.round((val / qty) * 100);
          updated.valor_parcela = String(perInstallment);
        }
      }
      return updated;
    }));
  };

  const resetForm = () => {
    setProjectId(leadProjectId || "");
    setUnidade("");
    setValorProposta("");
    setObservacoes("");
    setCondicoesEspeciais("");
    setParcelas([emptyParcela()]);
  };

  const handleConfirm = async () => {
    if (valorPropostaNum <= 0) return;
    setLoading(true);
    try {
      const parcelasData: ParcelaInsert[] = parcelas
        .filter(p => parseCurrency(p.valor) > 0)
        .map((p, i) => ({
          tipo: p.tipo,
          valor: parseCurrency(p.valor),
          quantidade_parcelas: p.quantidade_parcelas ? parseInt(p.quantidade_parcelas) : null,
          valor_parcela: p.valor_parcela ? parseCurrency(p.valor_parcela) : null,
          descricao: p.observacao || null,
          indice_correcao: p.indice_correcao !== "nenhum" ? p.indice_correcao : null,
          observacao: null,
          ordem: i,
        }));

      // Check for dacao as permuta
      const hasDacao = parcelasData.some(p => p.tipo === "dacao");
      const dacaoDesc = parcelas.find(p => p.tipo === "dacao")?.observacao || "";

      const ok = await onConfirm({
        lead_id: "",
        project_id: projectId || null,
        broker_id: leadBrokerId || null,
        unidade: unidade || undefined,
        valor_proposta: valorPropostaNum,
        permuta: hasDacao,
        descricao_permuta: hasDacao ? dacaoDesc : undefined,
        observacoes_corretor: observacoes || undefined,
        condicoes_especiais: condicoesEspeciais || undefined,
        parcelas: parcelasData,
      });
      if (ok) {
        onOpenChange(false);
        resetForm();
      }
    } finally {
      setLoading(false);
    }
  };

  const tipoLabel = (tipo: string) => TIPOS_PARCELA.find(t => t.value === tipo)?.label || tipo;

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

          {/* Valor Total */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> Valor Total da Proposta
            </h3>
            <Input
              placeholder="R$ 0,00"
              value={valorProposta ? formatCurrency(valorProposta) : ""}
              onChange={(e) => setValorProposta(e.target.value.replace(/\D/g, ""))}
              className="bg-[#0f0f12] border-[#2a2a2e] text-lg font-semibold"
            />
          </div>

          {/* Fluxo de Pagamento */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Fluxo de Pagamento
            </h3>
            <div className="space-y-3">
              {parcelas.map((parcela, idx) => (
                <div key={parcela.id} className="bg-[#0f0f12] rounded-xl border border-[#2a2a2e] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-600">#{idx + 1}</span>
                    {parcelas.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeParcela(parcela.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Tipo</label>
                      <Select value={parcela.tipo} onValueChange={(v) => updateParcela(parcela.id, "tipo", v)}>
                        <SelectTrigger className="bg-[#1e1e22] border-[#2a2a2e] text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                          {TIPOS_PARCELA.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-slate-200 text-xs focus:bg-[#2a2a2e] focus:text-white">{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Valor *</label>
                      <Input
                        placeholder="R$ 0,00"
                        value={parcela.valor ? formatCurrency(parcela.valor) : ""}
                        onChange={(e) => updateParcela(parcela.id, "valor", e.target.value.replace(/\D/g, ""))}
                        className="bg-[#1e1e22] border-[#2a2a2e] text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Qtd Parcelas</label>
                      <Input
                        type="number"
                        placeholder="Ex: 10"
                        value={parcela.quantidade_parcelas}
                        onChange={(e) => updateParcela(parcela.id, "quantidade_parcelas", e.target.value)}
                        className="bg-[#1e1e22] border-[#2a2a2e] text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Valor/Parcela</label>
                      <Input
                        placeholder="R$ 0,00"
                        value={parcela.valor_parcela ? formatCurrency(parcela.valor_parcela) : ""}
                        onChange={(e) => updateParcela(parcela.id, "valor_parcela", e.target.value.replace(/\D/g, ""))}
                        className="bg-[#1e1e22] border-[#2a2a2e] text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Índice</label>
                      <Select value={parcela.indice_correcao} onValueChange={(v) => updateParcela(parcela.id, "indice_correcao", v)}>
                        <SelectTrigger className="bg-[#1e1e22] border-[#2a2a2e] text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                          {INDICES.map(i => (
                            <SelectItem key={i.value} value={i.value} className="text-slate-200 text-xs focus:bg-[#2a2a2e] focus:text-white">{i.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Observação</label>
                    <Input
                      placeholder="Ex: Terreno em Estância Velha, 6 reforços semestrais..."
                      value={parcela.observacao}
                      onChange={(e) => updateParcela(parcela.id, "observacao", e.target.value)}
                      className="bg-[#1e1e22] border-[#2a2a2e] text-xs h-8"
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addParcela} className="w-full border-dashed border-[#2a2a2e] text-slate-400 hover:text-slate-200 hover:bg-[#1e1e22] text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar Parcela
              </Button>
            </div>

            {/* Resumo Composição */}
            {valorPropostaNum > 0 && (
              <div className={cn(
                "mt-4 rounded-xl border p-4",
                isComposicaoOk ? "border-emerald-500/30 bg-emerald-500/5" :
                totalParcelas > 0 ? "border-yellow-500/30 bg-yellow-500/5" :
                "border-[#2a2a2e] bg-[#0f0f12]"
              )}>
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Resumo da Composição</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Total Proposta</p>
                    <p className="text-sm font-semibold text-yellow-400">{formatCurrency(valorProposta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Composto</p>
                    <p className="text-sm font-semibold text-slate-200">R$ {totalParcelas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Diferença</p>
                    <div className="flex items-center justify-center gap-1">
                      {isComposicaoOk ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : diferenca !== valorPropostaNum ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      ) : null}
                      <p className={cn(
                        "text-sm font-semibold",
                        isComposicaoOk ? "text-emerald-400" : "text-yellow-400"
                      )}>
                        R$ {Math.abs(diferenca).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        {!isComposicaoOk && diferenca > 0 && totalParcelas > 0 && " (falta)"}
                        {!isComposicaoOk && diferenca < 0 && " (excede)"}
                      </p>
                    </div>
                  </div>
                </div>
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
