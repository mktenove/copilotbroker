import { useState } from "react";
import { MapPin, Plus, Check } from "lucide-react";
import { LEAD_ORIGINS, getOriginType, ORIGIN_TYPE_COLORS } from "@/types/crm";
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

interface OriginQuickPickerProps {
  leadId: string;
  leadName: string;
  currentOrigin: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (origin: string) => Promise<void>;
}

// Agrupar origens por categoria
const ORIGIN_GROUPS = [
  {
    label: "Mídia Paga",
    icon: "💰",
    origins: ["meta_ads", "google_ads", "tiktok_ads", "linkedin_ads"],
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
  leadName,
  currentOrigin,
  isOpen,
  onClose,
  onSelect,
}: OriginQuickPickerProps) {
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
