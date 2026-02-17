import { useState } from "react";
import { Bot, Plus, Loader2, Pencil, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutoMessageRules } from "@/hooks/use-auto-message-rules";
import { AutoMessageRuleEditor } from "./AutoMessageRuleEditor";
import { AutoCadenciaSection } from "./AutoCadenciaSection";
import type { BrokerAutoMessageRule } from "@/types/auto-message";
import { cn } from "@/lib/utils";

export function AutoMessageTab() {
  const { rules, isLoading, toggleRuleActive, deleteRule, createRule, updateRule, isSaving } = useAutoMessageRules();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrokerAutoMessageRule | null>(null);

  const handleCreateNew = () => { setEditingRule(null); setIsEditorOpen(true); };
  const handleEdit = (rule: BrokerAutoMessageRule) => { setEditingRule(rule); setIsEditorOpen(true); };
  const handleCloseEditor = () => { setIsEditorOpen(false); setEditingRule(null); };
  const handleToggleActive = async (rule: BrokerAutoMessageRule) => { await toggleRuleActive(rule.id, !rule.is_active); };
  const handleDelete = async (ruleId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta regra?")) {
      await deleteRule(ruleId);
    }
  };

  return (
    <Tabs defaultValue="first-message" className="space-y-4">
      <TabsList className="bg-[#1a1a1d] border border-[#2a2a2e] w-full grid grid-cols-2">
        <TabsTrigger value="first-message" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
          <Bot className="w-4 h-4" />
          <span className="truncate">1ª Mensagem</span>
        </TabsTrigger>
        <TabsTrigger value="cadencia" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Zap className="w-4 h-4" />
          <span className="truncate">Cadência 10D</span>
        </TabsTrigger>
      </TabsList>

      {/* First Message Tab */}
      <TabsContent value="first-message" className="space-y-4 sm:space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">Automação de Primeira Mensagem</h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Envie mensagens de boas-vindas automáticas</p>
                </div>
              </div>
              <Button onClick={handleCreateNew} className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Nova Regra
              </Button>
            </div>

            {/* Rules List */}
            {rules.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-[#1a1a1d] rounded-xl border border-[#2a2a2e]">
                <Bot className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-white mb-1.5">Nenhuma regra configurada</h3>
                <p className="text-slate-400 text-sm mb-6 px-4">Crie sua primeira regra para enviar mensagens automáticas</p>
                <Button onClick={handleCreateNew} variant="outline" className="gap-2 w-full sm:w-auto mx-auto max-w-[280px]">
                  <Plus className="w-4 h-4" />
                  Criar Primeira Regra
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className={cn(
                    "p-3 sm:p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.99]",
                    rule.is_active ? "bg-[#1a1a1d] border-primary/30" : "bg-[#141417] border-[#2a2a2e] opacity-60"
                  )} onClick={() => handleEdit(rule)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide truncate max-w-[200px]",
                        rule.project_id ? "bg-primary/20 text-primary" : "bg-slate-500/20 text-slate-300"
                      )}>
                        {rule.project?.name || "🌐 Todos"}
                      </span>
                      {rule.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Ativo
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 shrink-0">Inativo</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                      "{rule.message_content.slice(0, 100)}{rule.message_content.length > 100 ? '...' : ''}"
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2e]/50">
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch checked={rule.is_active} onCheckedChange={() => handleToggleActive(rule)} className="data-[state=checked]:bg-primary" />
                        </div>
                        <span className="text-xs text-slate-500">{rule.delay_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(rule); }}
                                className="text-slate-400 hover:text-white h-8 w-8 p-0 sm:w-auto sm:px-3">
                                <Pencil className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Editar</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="sm:hidden">Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(rule.id); }}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0 sm:w-auto sm:px-3">
                                <Trash2 className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Excluir</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="sm:hidden">Excluir</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Editor Sheet */}
            <AutoMessageRuleEditor
              isOpen={isEditorOpen}
              onClose={handleCloseEditor}
              editingRule={editingRule}
              createRule={createRule}
              updateRule={updateRule}
              isSaving={isSaving}
              rules={rules}
            />
          </>
        )}
      </TabsContent>

      {/* Cadência 10D Tab */}
      <TabsContent value="cadencia">
        <AutoCadenciaSection />
      </TabsContent>
    </Tabs>
  );
}
