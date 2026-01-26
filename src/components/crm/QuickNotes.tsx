import { NOTE_TEMPLATES, NOTE_CATEGORY_CONFIG, NoteCategory, NoteTemplate } from "@/types/crm";
import { cn } from "@/lib/utils";

interface QuickNotesProps {
  onSelectTemplate: (text: string) => void;
  selectedTexts: string[];
}

// Dark theme colors for each category
const DARK_CATEGORY_COLORS: Record<NoteCategory, { bg: string; text: string; border: string }> = {
  contato: { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-500/40" },
  interesse: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/40" },
  documentos: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40" },
  financeiro: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/40" }
};

export function QuickNotes({ onSelectTemplate, selectedTexts }: QuickNotesProps) {
  const templatesByCategory = NOTE_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<NoteCategory, NoteTemplate[]>);

  const categories: NoteCategory[] = ['contato', 'interesse', 'documentos', 'financeiro'];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-400">Observações Rápidas</h4>
      
      <div className="space-y-2">
        {categories.map((category) => {
          const config = NOTE_CATEGORY_CONFIG[category];
          const darkColors = DARK_CATEGORY_COLORS[category];
          const templates = templatesByCategory[category] || [];
          
          return (
            <div key={category} className="space-y-1.5">
              <span className={cn("text-xs font-medium", darkColors.text)}>
                {config.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((template) => {
                  const isSelected = selectedTexts.includes(template.text);
                  
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => onSelectTemplate(template.text)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md transition-all border",
                        darkColors.bg,
                        darkColors.text,
                        darkColors.border,
                        isSelected && "ring-2 ring-offset-1 ring-offset-[#1e1e22] ring-[#FFFF00]"
                      )}
                    >
                      {template.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
