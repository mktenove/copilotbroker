import { LeadDocument, DOCUMENT_TYPES } from "@/types/crm";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, FileX } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentChecklistProps {
  documents: LeadDocument[];
  onToggle: (documentId: string, isReceived: boolean) => void;
  receivedCount: number;
  totalCount: number;
}

export function DocumentChecklist({ documents, onToggle, receivedCount, totalCount }: DocumentChecklistProps) {
  const getDocLabel = (type: string) => {
    return DOCUMENT_TYPES.find(d => d.key === type)?.label || type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-foreground">Checklist de Documentos</h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          receivedCount === totalCount 
            ? "bg-emerald-100 text-emerald-700" 
            : "bg-amber-100 text-amber-700"
        )}>
          {receivedCount}/{totalCount}
        </span>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <label
            key={doc.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
              doc.is_received 
                ? "bg-emerald-50 border border-emerald-200" 
                : "bg-muted/50 border border-transparent hover:border-border"
            )}
          >
            <Checkbox
              checked={doc.is_received}
              onCheckedChange={(checked) => onToggle(doc.id, !!checked)}
            />
            <div className="flex items-center gap-2 flex-1">
              {doc.is_received ? (
                <FileCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <FileX className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={cn(
                "text-sm",
                doc.is_received ? "text-emerald-700" : "text-foreground"
              )}>
                {getDocLabel(doc.document_type)}
              </span>
            </div>
            {doc.received_at && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(doc.received_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
