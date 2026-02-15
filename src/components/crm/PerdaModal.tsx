import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { INACTIVATION_REASONS } from "@/types/crm";
import { cn } from "@/lib/utils";

interface PerdaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function PerdaModal({ open, onOpenChange, onConfirm }: PerdaModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const reason = selectedReason === "outro" ? customReason : selectedReason;
    if (!reason) return;
    setLoading(true);
    try {
      await onConfirm(reason);
      onOpenChange(false);
      setSelectedReason("");
      setCustomReason("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-red-400">Registrar Perda</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <label className="text-sm text-slate-400">Motivo da perda *</label>
          <div className="grid grid-cols-2 gap-2">
            {INACTIVATION_REASONS.map(r => (
              <button
                key={r.key}
                onClick={() => setSelectedReason(r.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all text-left",
                  selectedReason === r.key
                    ? "border-red-500 bg-red-500/10 text-white"
                    : "border-[#2a2a2e] text-slate-400 hover:border-slate-500"
                )}
              >
                <span>{r.icon}</span>
                <span className="truncate">{r.label}</span>
              </button>
            ))}
          </div>

          {selectedReason === "outro" && (
            <Input
              placeholder="Descreva o motivo..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="bg-[#0f0f12] border-[#2a2a2e]"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === "outro" && !customReason) || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Salvando..." : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
