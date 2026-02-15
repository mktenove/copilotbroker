import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TransferLeadDialogProps {
  leadId: string;
  leadName: string;
  currentBrokerId?: string | null;
  brokers: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferLeadDialog({
  leadId,
  leadName,
  currentBrokerId,
  brokers,
  isOpen,
  onClose,
  onTransferred,
}: TransferLeadDialogProps) {
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const availableBrokers = brokers.filter(b => b.id !== currentBrokerId);

  const handleTransfer = async () => {
    if (!selectedBrokerId) return;

    setIsTransferring(true);
    try {
      const { error } = await supabase.rpc("transfer_lead", {
        _lead_id: leadId,
        _new_broker_id: selectedBrokerId,
      });

      if (error) throw error;

      // Notify new broker via WhatsApp (non-blocking)
      try {
        await supabase.functions.invoke("notify-transfer", {
          body: { lead_id: leadId, new_broker_id: selectedBrokerId },
        });
      } catch (notifyErr) {
        console.error("Notify transfer failed (non-critical):", notifyErr);
      }

      const targetBroker = brokers.find(b => b.id === selectedBrokerId);
      toast.success(`Lead transferido para ${targetBroker?.name || "corretor"}`);
      onTransferred();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao transferir lead");
    } finally {
      setIsTransferring(false);
      setSelectedBrokerId("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ArrowRightLeft className="w-5 h-5" />
            Transferir Lead
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Transferir <span className="text-slate-200 font-medium">{leadName}</span> para outro corretor.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
            <SelectTrigger className="bg-[#0f0f12] border-[#3a3a3e] text-slate-200">
              <SelectValue placeholder="Selecione o corretor destino..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e22] border-[#3a3a3e]">
              {availableBrokers.map(broker => (
                <SelectItem
                  key={broker.id}
                  value={broker.id}
                  className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white"
                >
                  {broker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-[#2a2a2e]">
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedBrokerId || isTransferring}
            className="bg-[#FFFF00] text-black hover:bg-[#FFFF00]/90 font-semibold"
          >
            {isTransferring ? "Transferindo..." : "Confirmar Transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
