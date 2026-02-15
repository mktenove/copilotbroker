import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PropostaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (valorProposta: number) => Promise<void>;
}

export function PropostaModal({ open, onOpenChange, onConfirm }: PropostaModalProps) {
  const [valorProposta, setValorProposta] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits || "0") / 100;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleConfirm = async () => {
    const valor = parseFloat(valorProposta.replace(/\D/g, "")) / 100;
    if (!valor || valor <= 0) return;
    setLoading(true);
    try {
      await onConfirm(valor);
      onOpenChange(false);
      setValorProposta("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setValorProposta(""); }}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white">Inserir Proposta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Valor da Proposta *</label>
            <Input
              autoFocus
              placeholder="R$ 0,00"
              value={valorProposta ? formatCurrency(valorProposta) : ""}
              onChange={(e) => setValorProposta(e.target.value.replace(/\D/g, ""))}
              className="bg-[#0f0f12] border-[#2a2a2e] text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!valorProposta || loading}>
              {loading ? "Salvando..." : "Registrar Proposta"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
