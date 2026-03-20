import { useState } from "react";
import { Zap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoCadenciaRules, type BrokerAutoCadenciaRule } from "@/hooks/use-auto-cadencia-rules";
import { AutoCadenciaRuleEditor } from "./AutoCadenciaRuleEditor";
import { cn } from "@/lib/utils";

export function AutoCadenciaSection() {
  const { rules, isLoading, toggleRuleActive, deleteRule, createRule, updateRule, isSaving } = useAutoCadenciaRules();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrokerAutoCadenciaRule | null>(null);

  const handleCreateNew = () => { setEditingRule(null); setIsEditorOpen(true); };
  const handleEdit = (rule: BrokerAutoCadenciaRule) => { setEditingRule(rule); setIsEditorOpen(true); };
  const handleCloseEditor = () => { setIsEditorOpen(false); setEditingRule(null); };

  const handleDelete = async (ruleId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta regra?")) {
      await deleteRule(ruleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">Cadência 10D Automática</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Ative a cadência automaticamente ao receber leads
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-8 bg-[#1a1a1d] rounded-xl border border-[#2a2a2e]">
          <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-white mb-1">Nenhuma regra configurada</h3>
          <p className="text-slate-400 text-sm mb-4 px-4">
            Crie uma regra para ativar a Cadência 10D automaticamente
          </p>
          <Button onClick={handleCreateNew} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Primeira Regra
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "p-3 sm:p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.99]",
                rule.is_active
                  ? "bg-[#1a1a1d] border-emerald-500/30"
                  : "bg-[#141417] border-[#2a2a2e] opacity-60"
              )}
              onClick={() => handleEdit(rule)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {rule.name && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold text-white truncate max-w-[150px]">
                      {rule.name}
                    </span>
                  )}
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide truncate max-w-[200px]",
                    rule.interest_type ? "bg-blue-500/20 text-blue-400" :
                    rule.project_id ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-300"
                  )}>
                    {rule.interest_type
                      ? ({ casa: "Casa", apartamento: "Apartamento", terreno: "Terreno", investimento: "Investimento", comercial: "Comercial", all: "🌐 Todos os interesses", none: "Sem definição" } as Record<string, string>)[rule.interest_type] || rule.interest_type
                      : rule.project?.name || "🌐 Todos"}
                  </span>
                  {rule.project_status_filter && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 truncate">
                      {({ pre_launch: "Pré-Lançamento", launch: "Lançamento", selling: "Em Vendas", sold_out: "Esgotado", renting: "Locação" } as Record<string,string>)[rule.project_status_filter] || rule.project_status_filter}
                    </span>
                  )}
                  {rule.is_active ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ativo
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 shrink-0">Inativo</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleActive(rule.id, !rule.is_active)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(rule); }}
                          className="text-slate-400 hover:text-white h-8 w-8 p-0">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(rule.id); }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                {rule.steps_count && rule.steps_count > 0 ? rule.steps_count : 7} etapas · Imediato até 10 dias
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <AutoCadenciaRuleEditor
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        editingRule={editingRule}
        createRule={createRule}
        updateRule={updateRule}
        isSaving={isSaving}
        rules={rules}
      />
    </div>
  );
}
