import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparecimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompareceu: () => Promise<void>;
  onNaoCompareceu: () => void;
}

export function ComparecimentoModal({ open, onOpenChange, onCompareceu, onNaoCompareceu }: ComparecimentoModalProps) {
  const [loading, setLoading] = useState(false);

  const handleCompareceu = async () => {
    setLoading(true);
    try {
      await onCompareceu();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNaoCompareceu = () => {
    onNaoCompareceu();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white">Registrar Comparecimento</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 py-6">
          <button
            onClick={handleCompareceu}
            disabled={loading}
            className={cn(
              "flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#2a2a2e]",
              "hover:border-emerald-500 hover:bg-emerald-500/10 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <span className="text-sm font-medium text-white">
              {loading ? "Salvando..." : "Compareceu"}
            </span>
          </button>
          <button
            onClick={handleNaoCompareceu}
            disabled={loading}
            className={cn(
              "flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#2a2a2e]",
              "hover:border-red-500 hover:bg-red-500/10 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <XCircle className="w-10 h-10 text-red-500" />
            <span className="text-sm font-medium text-white">Não Compareceu</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
