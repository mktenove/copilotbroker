import { NOTE_TEMPLATES, NOTE_CATEGORY_CONFIG, NoteCategory, NoteTemplate } from "@/types/crm";
import { cn } from "@/lib/utils";

interface QuickNotesProps {
  onSelectTemplate: (text: string) => void;
  selectedTexts: string[];
}

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
      <h4 className="font-medium text-sm text-foreground">Observações Rápidas</h4>
      
      <div className="space-y-2">
        {categories.map((category) => {
          const config = NOTE_CATEGORY_CONFIG[category];
          const templates = templatesByCategory[category] || [];
          
          return (
            <div key={category} className="space-y-1">
              <span className={cn("text-xs font-medium", config.color)}>
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
                        "px-2 py-1 text-xs rounded-md transition-all",
                        config.bgColor,
                        config.color,
                        isSelected && "ring-2 ring-offset-1 ring-primary"
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
