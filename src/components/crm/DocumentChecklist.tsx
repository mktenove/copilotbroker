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
        <h4 className="text-sm font-medium text-slate-400">Checklist de Documentos</h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          receivedCount === totalCount 
            ? "bg-emerald-500/20 text-emerald-300" 
            : "bg-yellow-500/20 text-yellow-300"
        )}>
          {receivedCount}/{totalCount}
        </span>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <label
            key={doc.id}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border",
              doc.is_received 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-[#0f0f12] border-[#2a2a2e] hover:border-slate-600"
            )}
          >
            <Checkbox
              checked={doc.is_received}
              onCheckedChange={(checked) => onToggle(doc.id, !!checked)}
              className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div className="flex items-center gap-2 flex-1">
              {doc.is_received ? (
                <FileCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <FileX className="w-4 h-4 text-slate-500" />
              )}
              <span className={cn(
                "text-sm",
                doc.is_received ? "text-emerald-300" : "text-slate-300"
              )}>
                {getDocLabel(doc.document_type)}
              </span>
            </div>
            {doc.received_at && (
              <span className="text-[10px] text-slate-500">
                {new Date(doc.received_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
