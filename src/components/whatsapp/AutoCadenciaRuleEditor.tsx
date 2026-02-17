import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import type { BrokerAutoCadenciaRule } from "@/hooks/use-auto-cadencia-rules";

interface AutoCadenciaRuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule: BrokerAutoCadenciaRule | null;
  createRule: (data: { project_id: string | null; is_active: boolean }) => Promise<any>;
  updateRule: (id: string, data: Partial<{ project_id: string | null; is_active: boolean }>) => Promise<any>;
  isSaving: boolean;
  rules: BrokerAutoCadenciaRule[];
}

interface Project { id: string; name: string; }

const CADENCIA_STEPS_PREVIEW = [
  { label: "Imediato", desc: "Apresentação + confirmação de cadastro" },
  { label: "1 hora", desc: "Pode falar agora?" },
  { label: "3 horas", desc: "Tentei ligar, qual melhor horário?" },
  { label: "1 dia", desc: "Oportunidade merece ser ouvida" },
  { label: "2 dias", desc: "Finalização do atendimento" },
  { label: "5 dias", desc: "Condição especial + vídeo chamada" },
  { label: "10 dias", desc: "Última oferta diferenciada" },
];

export function AutoCadenciaRuleEditor({
  isOpen, onClose, editingRule, createRule, updateRule, isSaving, rules,
}: AutoCadenciaRuleEditorProps) {
  const { brokerId } = useUserRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectId, setProjectId] = useState<string>("all");
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [hasFirstMessageConflict, setHasFirstMessageConflict] = useState(false);

  const checkConflict = async (pid: string) => {
    if (!brokerId) return;
    setCheckingConflict(true);
    try {
      let query = supabase
        .from("broker_auto_message_rules")
        .select("id")
        .eq("broker_id", brokerId)
        .eq("is_active", true);
      if (pid !== "all") {
        query = query.or(`project_id.eq.${pid},project_id.is.null`);
      } else {
        query = query.is("project_id", null);
      }
      const { data } = await query.limit(1);
      setHasFirstMessageConflict(!!(data && data.length > 0));
    } catch {
      setHasFirstMessageConflict(false);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    if (!editingRule) checkConflict(value);
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!brokerId) return;
      setLoadingProjects(true);
      try {
        const { data } = await supabase
          .from("broker_projects")
          .select("project:projects(id, name)")
          .eq("broker_id", brokerId)
          .eq("is_active", true);

        if (data) {
          setProjects(data.map((bp: any) => bp.project).filter(Boolean));
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };
    if (isOpen) fetchProjects();
  }, [isOpen, brokerId]);

  useEffect(() => {
    if (editingRule) {
      setProjectId(editingRule.project_id || "all");
      setHasFirstMessageConflict(false);
    } else {
      setProjectId("all");
      if (isOpen && brokerId) checkConflict("all");
    }
  }, [editingRule, isOpen]);

  const projectHasRule = useMemo(() => {
    if (editingRule) return false;
    const target = projectId === "all" ? null : projectId;
    return rules.some(r => r.project_id === target);
  }, [projectId, rules, editingRule]);

  const handleSubmit = async () => {
    const data = {
      project_id: projectId === "all" ? null : projectId,
      is_active: true,
    };

    let success;
    if (editingRule) {
      success = await updateRule(editingRule.id, data);
    } else {
      success = await createRule(data);
    }
    if (success) onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-[#1a1a1d] border-[#2a2a2e] w-full sm:max-w-lg overflow-y-auto pb-24 sm:pb-6">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            {editingRule ? "Editar Regra" : "Nova Regra de Cadência 10D"}
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Ative automaticamente a cadência para leads de um empreendimento
          </SheetDescription>
        </SheetHeader>

        {loadingProjects ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 mt-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Empreendimento</Label>
              <Select value={projectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white min-h-[44px]">
                  <SelectValue placeholder="Selecione o empreendimento" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                  <SelectItem value="all" className="text-white">
                    🌐 Todos os empreendimentos
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-white">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {checkingConflict && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" />Verificando conflitos...
                </div>
              )}
              {projectHasRule && (
                <p className="text-xs text-red-400">Já existe uma regra para este empreendimento</p>
              )}
              {!editingRule && hasFirstMessageConflict && !projectHasRule && (
                <p className="text-xs text-red-400">Já existe uma 1ª Mensagem ativa para este empreendimento. Desative-a primeiro.</p>
              )}
            </div>

            {/* Steps Preview */}
            <div className="space-y-2">
              <Label className="text-slate-300">Etapas da Cadência (somente leitura)</Label>
              <div className="space-y-1.5">
                {CADENCIA_STEPS_PREVIEW.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#141417] border border-[#2a2a2e]">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500">{step.label}</span>
                      <p className="text-sm text-slate-300 truncate">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning */}
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300 text-sm">
                A cadência será ativada <strong>automaticamente</strong> quando um lead for 
                atribuído a você neste empreendimento. O lead será movido para "Atendimento" 
                e o timeout da roleta será desativado.
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#1a1a1d] pb-4 -mx-6 px-6 border-t border-[#2a2a2e] z-10 sm:static sm:mx-0 sm:px-0 sm:border-t-0 sm:pb-0">
              <Button variant="outline" onClick={onClose} disabled={isSaving}
                className="flex-1 border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e] min-h-[44px] sm:min-h-0">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving || projectHasRule || hasFirstMessageConflict || checkingConflict}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 min-h-[44px] sm:min-h-0">
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                ) : editingRule ? "Salvar" : "Criar Regra"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
