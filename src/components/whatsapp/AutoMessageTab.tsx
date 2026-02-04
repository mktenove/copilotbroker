import { useState } from "react";
import { Bot, Plus, Info, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAutoMessageRules } from "@/hooks/use-auto-message-rules";
import { AutoMessageRuleEditor } from "./AutoMessageRuleEditor";
import type { BrokerAutoMessageRule } from "@/types/auto-message";
import { cn } from "@/lib/utils";

export function AutoMessageTab() {
  const { rules, isLoading, toggleRuleActive, deleteRule } = useAutoMessageRules();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrokerAutoMessageRule | null>(null);

  const handleCreateNew = () => {
    setEditingRule(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (rule: BrokerAutoMessageRule) => {
    setEditingRule(rule);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingRule(null);
  };

  const handleToggleActive = async (rule: BrokerAutoMessageRule) => {
    await toggleRuleActive(rule.id, !rule.is_active);
  };

  const handleDelete = async (ruleId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta regra?")) {
      await deleteRule(ruleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Automação de Primeira Mensagem</h2>
            <p className="text-sm text-slate-400">
              Envie automaticamente uma mensagem de boas-vindas para novos leads
            </p>
          </div>
        </div>
        
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1d] rounded-xl border border-[#2a2a2e]">
          <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma regra configurada</h3>
          <p className="text-slate-400 text-sm mb-6">
            Crie sua primeira regra de automação para começar a enviar mensagens automáticas
          </p>
          <Button onClick={handleCreateNew} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Primeira Regra
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "p-4 rounded-xl border transition-all",
                rule.is_active 
                  ? "bg-[#1a1a1d] border-primary/30" 
                  : "bg-[#141417] border-[#2a2a2e] opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Project Name */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide",
                      rule.project_id 
                        ? "bg-primary/20 text-primary" 
                        : "bg-slate-500/20 text-slate-300"
                    )}>
                      {rule.project?.name || "🌐 Todos os Empreendimentos"}
                    </span>
                    
                    {rule.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ativo
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Inativo</span>
                    )}
                  </div>

                  {/* Message Preview */}
                  <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                    "{rule.message_content.slice(0, 100)}{rule.message_content.length > 100 ? '...' : ''}"
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Delay: {rule.delay_minutes} min</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleActive(rule)}
                    className="data-[state=checked]:bg-primary"
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                    className="text-slate-400 hover:text-white"
                  >
                    Editar
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Alerts - Moved to bottom */}
      <div className="space-y-3">
        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Info className="w-4 h-4 text-blue-400" />
          <AlertDescription className="text-blue-300 text-sm">
            Esta mensagem é enviada <strong>automaticamente</strong> quando um lead se cadastra via 
            landing page do empreendimento. É uma confirmação de atendimento, não um robô de respostas.
          </AlertDescription>
        </Alert>

        <Alert className="bg-red-500/10 border-red-500/30">
          <XCircle className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-300 text-sm">
            Leads adicionados manualmente ou importados <strong>NUNCA</strong> recebem mensagem automática.
          </AlertDescription>
        </Alert>
      </div>

      {/* Editor Sheet */}
      <AutoMessageRuleEditor
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        editingRule={editingRule}
      />
    </div>
  );
}
