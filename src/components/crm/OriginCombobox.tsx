import { useState } from "react";
import { Check, Plus, Tag } from "lucide-react";
import { LEAD_ORIGINS, getOriginType } from "@/types/crm";
import { useCustomOrigins } from "@/hooks/use-custom-origins";
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

interface OriginComboboxProps {
  currentOrigin: string | null;
  onSelect: (origin: string) => Promise<void>;
  trigger: React.ReactNode;
}

const TYPE_ICONS: Record<string, string> = {
  paid: "💰",
  organic: "🌱",
  referral: "👥",
  manual: "📝",
  unknown: "📍",
};

export function OriginCombobox({ 
  currentOrigin, 
  onSelect, 
  trigger 
}: OriginComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: customOrigins = [] } = useCustomOrigins();

  const handleSelect = async (value: string) => {
    if (!value.trim()) return;
    setIsLoading(true);
    try {
      await onSelect(value);
      setOpen(false);
      setSearch("");
    } finally {
      setIsLoading(false);
    }
  };

  const searchExists = LEAD_ORIGINS.some(
    o => o.label.toLowerCase() === search.toLowerCase() ||
         o.key.toLowerCase() === search.toLowerCase()
  ) || customOrigins.some(o => o.toLowerCase() === search.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[220px] p-0 bg-[#1e1e22] border-slate-700" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Buscar origem..."
            value={search}
            onValueChange={setSearch}
            className="h-9 text-sm border-slate-700"
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty className="py-2 px-3 text-xs text-slate-500">
              Nenhuma origem encontrada
            </CommandEmpty>
            <CommandGroup>
              {LEAD_ORIGINS.filter(o => o.key !== "outro").map((origin) => {
                const type = getOriginType(origin.key);
                const icon = TYPE_ICONS[type] || TYPE_ICONS.unknown;
                const isSelected = currentOrigin === origin.key;
                
                return (
                  <CommandItem
                    key={origin.key}
                    value={origin.label}
                    onSelect={() => handleSelect(origin.key)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer",
                      "text-slate-300 hover:text-white"
                    )}
                  >
                    <span className="text-xs">{icon}</span>
                    <span className="flex-1">{origin.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {customOrigins.length > 0 && (
              <CommandGroup heading="Personalizadas">
                {customOrigins.map((origin) => {
                  const isSelected = currentOrigin === origin;
                  return (
                    <CommandItem
                      key={origin}
                      value={origin}
                      onSelect={() => handleSelect(origin)}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer",
                        "text-slate-300 hover:text-white"
                      )}
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span className="flex-1">{origin}</span>
                      {isSelected && <Check className="w-3 h-3 text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

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
