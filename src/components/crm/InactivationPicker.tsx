import { useState } from "react";
import { UserX, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { INACTIVATION_REASONS } from "@/types/crm";

interface InactivationPickerProps {
  leadId: string;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function InactivationPicker({ 
  leadName, 
  isOpen, 
  onClose, 
  onConfirm 
}: InactivationPickerProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    const reason = selectedReason === "outro" 
      ? (customReason.trim() || "Outro motivo") 
      : selectedReason;
    
    if (!reason) return;

    setIsLoading(true);
    try {
      await onConfirm(reason);
      onClose();
      resetState();
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setSelectedReason(null);
    setCustomReason("");
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const getReasonLabel = (key: string): string => {
    const reason = INACTIVATION_REASONS.find(r => r.key === key);
    return reason?.label || key;
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b pb-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <DrawerTitle>Inativar Lead</DrawerTitle>
          </div>
          <DrawerDescription className="text-base font-medium text-foreground">
            {leadName}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Selecione o motivo da inativação:
          </p>

          {/* Reasons Grid */}
          <div className="grid grid-cols-2 gap-2">
            {INACTIVATION_REASONS.map((reason) => (
              <button
                key={reason.key}
                onClick={() => setSelectedReason(reason.key)}
                disabled={isLoading}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                  "hover:border-primary/50 hover:bg-muted/50",
                  selectedReason === reason.key
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-card"
                )}
              >
                <span className="text-lg shrink-0">{reason.icon}</span>
                <span className="text-sm font-medium leading-tight">{reason.label}</span>
                {selectedReason === reason.key && (
                  <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Reason Input */}
          {selectedReason === "outro" && (
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-foreground">
                Descreva o motivo:
              </label>
              <Input
                placeholder="Digite o motivo da inativação..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={isLoading}
                className="h-11"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!selectedReason || isLoading}
              className="flex-1 gap-2"
            >
              <UserX className="w-4 h-4" />
              {isLoading ? "Inativando..." : "Inativar Lead"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
