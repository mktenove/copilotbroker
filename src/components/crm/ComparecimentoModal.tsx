import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparecimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompareceu: (valorProposta: number) => Promise<void>;
  onNaoCompareceu: () => void;
}

export function ComparecimentoModal({ open, onOpenChange, onCompareceu, onNaoCompareceu }: ComparecimentoModalProps) {
  const [compareceu, setCompareceu] = useState<boolean | null>(null);
  const [valorProposta, setValorProposta] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirmProposta = async () => {
    const valor = parseFloat(valorProposta.replace(/\D/g, "")) / 100;
    if (!valor || valor <= 0) return;
    setLoading(true);
    try {
      await onCompareceu(valor);
      onOpenChange(false);
      resetState();
    } finally {
      setLoading(false);
    }
  };

  const handleNaoCompareceu = () => {
    onNaoCompareceu();
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setCompareceu(null);
    setValorProposta("");
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits || "0") / 100;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white">Registrar Comparecimento</DialogTitle>
        </DialogHeader>

        {compareceu === null && (
          <div className="flex gap-3 py-6">
            <button
              onClick={() => setCompareceu(true)}
              className={cn(
                "flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#2a2a2e]",
                "hover:border-emerald-500 hover:bg-emerald-500/10 transition-all"
              )}
            >
              <CheckCircle className="w-10 h-10 text-emerald-500" />
              <span className="text-sm font-medium text-white">Compareceu</span>
            </button>
            <button
              onClick={handleNaoCompareceu}
              className={cn(
                "flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#2a2a2e]",
                "hover:border-red-500 hover:bg-red-500/10 transition-all"
              )}
            >
              <XCircle className="w-10 h-10 text-red-500" />
              <span className="text-sm font-medium text-white">Não Compareceu</span>
            </button>
          </div>
        )}

        {compareceu === true && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-emerald-400">✅ Comparecimento confirmado</p>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Valor da Proposta *</label>
              <Input
                placeholder="R$ 0,00"
                value={valorProposta ? formatCurrency(valorProposta) : ""}
                onChange={(e) => setValorProposta(e.target.value.replace(/\D/g, ""))}
                className="bg-[#0f0f12] border-[#2a2a2e] text-lg"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCompareceu(null)}>Voltar</Button>
              <Button onClick={handleConfirmProposta} disabled={!valorProposta || loading}>
                {loading ? "Salvando..." : "Gerar Proposta"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
