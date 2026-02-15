import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface VendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (valorFinal: number, dataFechamento: Date) => Promise<void>;
}

export function VendaModal({ open, onOpenChange, onConfirm }: VendaModalProps) {
  const [valor, setValor] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const number = parseInt(digits || "0") / 100;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleConfirm = async () => {
    const valorNum = parseFloat(valor.replace(/\D/g, "")) / 100;
    if (!valorNum || valorNum <= 0 || !date) return;
    setLoading(true);
    try {
      await onConfirm(valorNum, date);
      onOpenChange(false);
      setValor("");
      setDate(new Date());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white">Confirmar Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Valor Final da Venda *</label>
            <Input
              placeholder="R$ 0,00"
              value={valor ? formatCurrency(valor) : ""}
              onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))}
              className="bg-[#0f0f12] border-[#2a2a2e] text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">Data do Fechamento *</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#0f0f12] border-[#2a2a2e]",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#1e1e22] border-[#2a2a2e]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) setDate(d); setCalendarOpen(false); }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!valor || loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? "Salvando..." : "Confirmar Venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
