import { useState } from "react";
import { MapPin, Plus, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { LEAD_ORIGINS, getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS } from "@/types/crm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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

interface OriginQuickPickerProps {
  leadId: string;
  leadName: string;
  currentOrigin: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (origin: string) => Promise<void>;
  trigger?: React.ReactNode;
}

// Agrupar origens por categoria
const ORIGIN_GROUPS = [
  {
    label: "Mídia Paga",
    icon: "💰",
    origins: ["meta_ads", "google_ads", "tiktok_ads", "linkedin_ads", "kwai_ads"],
  },
  {
    label: "Orgânico",
    icon: "🌱",
    origins: ["meta_organico", "google_organico", "tiktok_organico"],
  },
  {
    label: "Canais Diretos",
    icon: "📱",
    origins: ["whatsapp_direto", "indicacao", "oferta_ativa"],
  },
  {
    label: "Eventos & Presencial",
    icon: "🏢",
    origins: ["plantao_enove", "evento", "feirão"],
  },
];

export function OriginQuickPicker({
  leadId,
  leadName,
  currentOrigin,
  isOpen,
  onClose,
  onSelect,
  trigger,
}: OriginQuickPickerProps) {
  const isMobile = useIsMobile();
  const [customOrigin, setCustomOrigin] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async (origin: string) => {
    if (!origin.trim()) return;
    setIsLoading(true);
    try {
      await onSelect(origin);
      onClose();
    } finally {
      setIsLoading(false);
      setCustomOrigin("");
      setShowCustomInput(false);
    }
  };

  const getOriginLabel = (key: string) => {
    const found = LEAD_ORIGINS.find((o) => o.key === key);
    return found?.label || key;
  };

  const getOriginIcon = (key: string) => {
    const type = getOriginType(key);
    switch (type) {
      case "paid":
        return "💰";
      case "organic":
        return "🌱";
      case "referral":
        return "👥";
      case "manual":
        return "📝";
      default:
        return "📍";
    }
  };

  // Conteúdo compartilhado para mobile e desktop
  const OriginButton = ({ originKey }: { originKey: string }) => {
    const isSelected = currentOrigin === originKey;
    const typeColors = ORIGIN_TYPE_COLORS[getOriginType(originKey)];
    
    return (
      <button
        onClick={() => handleSelect(originKey)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all",
          "hover:scale-[1.02] active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isSelected
            ? "bg-primary/10 border-primary text-primary"
            : cn("bg-card hover:bg-muted/50 border-border", typeColors)
        )}
      >
        <span className="text-lg">{getOriginIcon(originKey)}</span>
        <span className="font-medium text-sm truncate flex-1">
          {getOriginLabel(originKey)}
        </span>
        {isSelected && <Check className="w-4 h-4 shrink-0" />}
      </button>
    );
  };

  // Mobile: Drawer com botões grandes
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Selecionar Origem
            </DrawerTitle>
            <DrawerDescription className="truncate">
              {leadName}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-5 overflow-y-auto">
            {ORIGIN_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.origins.map((originKey) => (
                    <OriginButton key={originKey} originKey={originKey} />
                  ))}
                </div>
              </div>
            ))}

            {/* Input customizado */}
            <div className="pt-2 border-t">
              {showCustomInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite a origem..."
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    autoFocus
                    className="h-12"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelect(customOrigin);
                    }}
                  />
                  <Button
                    onClick={() => handleSelect(customOrigin)}
                    disabled={!customOrigin.trim() || isLoading}
                    className="h-12 px-6"
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-12 border-dashed"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Outro (personalizado)
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Popover com Command
  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar origem..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhuma origem encontrada.</CommandEmpty>
            
            {ORIGIN_GROUPS.map((group) => (
              <CommandGroup key={group.label} heading={`${group.icon} ${group.label}`}>
                {group.origins.map((originKey) => (
                  <CommandItem
                    key={originKey}
                    value={originKey}
                    onSelect={() => handleSelect(originKey)}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">{getOriginIcon(originKey)}</span>
                    {getOriginLabel(originKey)}
                    {currentOrigin === originKey && (
                      <Check className="w-4 h-4 ml-auto text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandGroup heading="✏️ Personalizado">
              {showCustomInput ? (
                <div className="p-2 flex gap-2">
                  <Input
                    placeholder="Digite..."
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    autoFocus
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelect(customOrigin);
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSelect(customOrigin)}
                    disabled={!customOrigin.trim() || isLoading}
                  >
                    OK
                  </Button>
                </div>
              ) : (
                <CommandItem
                  onSelect={() => setShowCustomInput(true)}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Outro...
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
