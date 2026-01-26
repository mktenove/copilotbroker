import { useState } from "react";
import { MapPin, Plus, Check } from "lucide-react";
import { LEAD_ORIGINS, getOriginType } from "@/types/crm";
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

// Cores vibrantes para dark theme
const PICKER_COLORS: Record<string, { bg: string; icon: string }> = {
  paid: {
    bg: "bg-purple-600/90 hover:bg-purple-500 text-white border-purple-500/50",
    icon: "💰",
  },
  organic: {
    bg: "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500/50",
    icon: "🌱",
  },
  referral: {
    bg: "bg-blue-600/90 hover:bg-blue-500 text-white border-blue-500/50",
    icon: "👥",
  },
  manual: {
    bg: "bg-amber-600/90 hover:bg-amber-500 text-white border-amber-500/50",
    icon: "📝",
  },
  unknown: {
    bg: "bg-slate-600/90 hover:bg-slate-500 text-white border-slate-500/50",
    icon: "📍",
  },
};

// Agrupar origens por categoria com cores específicas
const ORIGIN_GROUPS = [
  {
    label: "Mídia Paga",
    icon: "💰",
    type: "paid",
    origins: ["meta_ads", "google_ads", "tiktok_ads", "linkedin_ads"],
  },
  {
    label: "Orgânico",
    icon: "🌱",
    type: "organic",
    origins: ["meta_organico", "google_organico", "tiktok_organico"],
  },
  {
    label: "Canais Diretos",
    icon: "📱",
    type: "manual",
    origins: ["whatsapp_direto", "indicacao", "oferta_ativa"],
  },
  {
    label: "Eventos & Presencial",
    icon: "🏢",
    type: "manual",
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

  const OriginButton = ({
    originKey,
    groupType,
  }: {
    originKey: string;
    groupType: string;
  }) => {
    const isSelected = currentOrigin === originKey;
    const type = getOriginType(originKey);
    // Usar o tipo do grupo para cores consistentes dentro de cada seção
    const colors = PICKER_COLORS[groupType] || PICKER_COLORS[type] || PICKER_COLORS.unknown;

    return (
      <button
        onClick={() => handleSelect(originKey)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg border text-left",
          "transition-all duration-150 min-h-[52px]",
          "hover:scale-[1.01] active:scale-[0.99]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          colors.bg,
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <span className="text-lg">{colors.icon}</span>
        <span className="font-medium text-sm flex-1 truncate">
          {getOriginLabel(originKey)}
        </span>
        {isSelected && <Check className="w-4 h-4 shrink-0" />}
      </button>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] bg-background">
        <DrawerHeader className="pb-3 border-b border-slate-700/50">
          <DrawerTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary" />
            Selecionar Origem
          </DrawerTitle>
          <DrawerDescription className="truncate text-muted-foreground">
            {leadName}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-6 overflow-y-auto pt-4">
          {ORIGIN_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-2">
                <span className="text-base">{group.icon}</span>
                <span>{group.label}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.origins.map((originKey) => (
                  <OriginButton
                    key={originKey}
                    originKey={originKey}
                    groupType={group.type}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Input customizado */}
          <div className="pt-4 border-t border-slate-700/50">
            {showCustomInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite a origem..."
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  autoFocus
                  className="h-14 bg-slate-800/50 border-slate-600 text-foreground placeholder:text-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSelect(customOrigin);
                  }}
                />
                <Button
                  onClick={() => handleSelect(customOrigin)}
                  disabled={!customOrigin.trim() || isLoading}
                  className="h-14 px-6"
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-14 border-dashed border-slate-600 text-slate-400 hover:text-foreground hover:border-slate-400 hover:bg-slate-800/50"
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
