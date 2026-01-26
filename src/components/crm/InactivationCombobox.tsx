import { useState } from "react";
import { Check, Plus, UserX } from "lucide-react";
import { INACTIVATION_REASONS } from "@/types/crm";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface InactivationComboboxProps {
  onConfirm: (reason: string) => Promise<void>;
  trigger: React.ReactNode;
}

export function InactivationCombobox({ 
  onConfirm, 
  trigger 
}: InactivationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async (value: string) => {
    if (!value.trim()) return;
    setIsLoading(true);
    try {
      await onConfirm(value);
      setOpen(false);
      setSearch("");
    } finally {
      setIsLoading(false);
    }
  };

  const getReasonLabel = (key: string): string => {
    const reason = INACTIVATION_REASONS.find(r => r.key === key);
    return reason?.label || key;
  };

  const searchExists = INACTIVATION_REASONS.some(
    r => r.label.toLowerCase() === search.toLowerCase() ||
         r.key.toLowerCase() === search.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[240px] p-0 bg-[#1e1e22] border-slate-700" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="bg-transparent">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
            <UserX className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-red-400">Inativar Lead</span>
          </div>
          <CommandInput
            placeholder="Buscar motivo..."
            value={search}
            onValueChange={setSearch}
            className="h-9 text-sm border-slate-700"
          />
          <CommandList className="max-h-[220px]">
            <CommandEmpty className="py-2 px-3 text-xs text-slate-500">
              Nenhum motivo encontrado
            </CommandEmpty>
            <CommandGroup>
              {INACTIVATION_REASONS.filter(r => r.key !== "outro").map((reason) => (
                <CommandItem
                  key={reason.key}
                  value={reason.label}
                  onSelect={() => handleSelect(getReasonLabel(reason.key))}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer",
                    "text-slate-300 hover:text-white"
                  )}
                >
                  <span className="text-xs">{reason.icon}</span>
                  <span className="flex-1">{reason.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {search.trim() && !searchExists && (
              <CommandGroup>
                <CommandItem
                  value={`create-${search}`}
                  onSelect={() => handleSelect(search.trim())}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer border-t border-slate-700"
                >
                  <Plus className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-400">
                    Usar "<span className="text-white">{search}</span>"
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
