import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Zap, Plus, Trash2, GripVertical, Building2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import type { BrokerAutoCadenciaRule, AutoCadenciaStep } from "@/hooks/use-auto-cadencia-rules";

const INTERESSE_OPTIONS = [
  { value: "all", label: "🌐 Todos os interesses" },
  { value: "casa", label: "Interesse em Casa" },
  { value: "apartamento", label: "Interesse em Apartamento" },
  { value: "terreno", label: "Interesse em Terreno" },
  { value: "investimento", label: "Interesse em Investimento" },
  { value: "comercial", label: "Interesse em Imóvel Comercial" },
];

interface AutoCadenciaRuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule: BrokerAutoCadenciaRule | null;
  createRule: (data: { name?: string | null; project_id: string | null; interest_type?: string | null; is_active: boolean; steps: AutoCadenciaStep[] }) => Promise<any>;
  updateRule: (id: string, data: Partial<{ name: string | null; project_id: string | null; interest_type: string | null; is_active: boolean }>, steps?: AutoCadenciaStep[]) => Promise<any>;
  isSaving: boolean;
  rules: BrokerAutoCadenciaRule[];
}

interface Project { id: string; name: string; }

const DELAY_PRESETS = [
  { label: "Imediato", minutes: 0 },
  { label: "30 minutos", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "3 horas", minutes: 180 },
  { label: "6 horas", minutes: 360 },
  { label: "12 horas", minutes: 720 },
  { label: "24 horas", minutes: 1440 },
  { label: "2 dias", minutes: 2880 },
  { label: "3 dias", minutes: 4320 },
  { label: "5 dias", minutes: 7200 },
  { label: "7 dias", minutes: 10080 },
  { label: "10 dias", minutes: 14400 },
];

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Imediato";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 1440)} dia(s)`;
}

export const DEFAULT_AUTO_CADENCIA_STEPS: AutoCadenciaStep[] = [
  { messageContent: "Olá {nome}, tudo bem? Aqui é {corretor_nome}! Recebi agora seu cadastro para saber mais sobre o {empreendimento}, já quis te chamar para te explicar como funciona! Foi você mesmo que se cadastrou?", delayMinutes: 0, sendIfReplied: true },
  { messageContent: "Pode falar agora?", delayMinutes: 60, sendIfReplied: false },
  { messageContent: "Tentei ligar para você, mas não consegui contato, qual melhor horário para falarmos?", delayMinutes: 180, sendIfReplied: false },
  { messageContent: "Oi {nome}! Caso não esteja no momento certo, entenderei perfeitamente! Só acho que uma oportunidade dessas merece ser ouvida, caso queira fazer um bate papo sem compromisso, estarei aqui pra te ajudar.", delayMinutes: 1440, sendIfReplied: false },
  { messageContent: "Percebi que você não está podendo falar comigo agora, em virtude disso, vou finalizar esse atendimento, mas fique a vontade de me chamar quando quiser!", delayMinutes: 2880, sendIfReplied: false },
  { messageContent: "Ei! Não esqueci de ti! Lembrei de te chamar pois entrou uma condição que eu não poderia deixar de te mostrar, tem 20 minutos para uma video chamada? Prometo te apresentar algo que você nunca viu na vida!", delayMinutes: 7200, sendIfReplied: false },
  { messageContent: "Oi {nome}! Voltei porque surgiu uma condição que muda totalmente o cenário desse projeto. Não estou enviando para todos, pois recebemos pouquíssimas unidades com uma condição realmente diferenciada, você tem 10 minutos hoje para entender?", delayMinutes: 14400, sendIfReplied: false },
];

function replaceVarsPreview(text: string) {
  return text
    .replace(/{nome}/g, "João")
    .replace(/{corretor_nome}/g, "Corretor")
    .replace(/{empreendimento}/g, "Empreendimento")
    .replace(/{cidade}/g, "Porto Alegre")
    .replace(/{dormitorios}/g, "2")
    .replace(/{interesse}/g, "Casa");
}

export function AutoCadenciaRuleEditor({
  isOpen, onClose, editingRule, createRule, updateRule, isSaving, rules,
}: AutoCadenciaRuleEditorProps) {
  const { brokerId } = useUserRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [ruleName, setRuleName] = useState<string>("");
  const [targetMode, setTargetMode] = useState<"project" | "interest">("project");
  const [projectId, setProjectId] = useState<string>("all");
  const [interestType, setInterestType] = useState<string>("");
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [hasFirstMessageConflict, setHasFirstMessageConflict] = useState(false);
  const [steps, setSteps] = useState<AutoCadenciaStep[]>(DEFAULT_AUTO_CADENCIA_STEPS.map(s => ({ ...s })));
  const [loadingSteps, setLoadingSteps] = useState(false);

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

  // Load steps when editing
  useEffect(() => {
    if (editingRule) {
      setRuleName(editingRule.name || "");
      if (editingRule.interest_type) {
        setTargetMode("interest");
        setInterestType(editingRule.interest_type);
        setProjectId("all");
      } else {
        setTargetMode("project");
        setProjectId(editingRule.project_id || "all");
        setInterestType("");
      }
      setHasFirstMessageConflict(false);
      // Load saved steps
      setLoadingSteps(true);
      (supabase.from("auto_cadencia_steps") as any)
        .select("*")
        .eq("rule_id", editingRule.id)
        .order("step_order", { ascending: true })
        .then(({ data }: any) => {
          if (data && data.length > 0) {
            setSteps(data.map((s: any) => ({
              messageContent: s.message_content,
              delayMinutes: s.delay_minutes,
              sendIfReplied: s.send_if_replied,
            })));
          } else {
            setSteps(DEFAULT_AUTO_CADENCIA_STEPS.map(s => ({ ...s })));
          }
          setLoadingSteps(false);
        });
    } else {
      setRuleName("");
      setTargetMode("project");
      setProjectId("all");
      setInterestType("");
      setSteps(DEFAULT_AUTO_CADENCIA_STEPS.map(s => ({ ...s })));
      if (isOpen && brokerId) checkConflict("all");
    }
  }, [editingRule, isOpen]);

  const projectHasRule = useMemo(() => {
    if (editingRule) return false;
    const target = projectId === "all" ? null : projectId;
    return rules.some(r => r.project_id === target);
  }, [projectId, rules, editingRule]);

  const addStep = () => {
    setSteps(prev => [...prev, { messageContent: "", delayMinutes: 1440, sendIfReplied: false }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<AutoCadenciaStep>) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const stepsValid = steps.length > 0 && steps.every(s => s.messageContent.trim().length > 0);

  const handleSubmit = async () => {
    const data = {
      name: ruleName.trim() || null,
      project_id: targetMode === "project" && projectId !== "all" ? projectId : null,
      interest_type: targetMode === "interest" ? (interestType || "all") : null,
      is_active: true,
    };

    let success;
    if (editingRule) {
      success = await updateRule(editingRule.id, data, steps);
    } else {
      success = await createRule({ ...data, steps });
    }
    if (success) onClose();
  };

  const isLoading = loadingProjects || loadingSteps;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-[#1a1a1d] border-[#2a2a2e] w-full sm:max-w-lg flex flex-col h-full p-0">
        <div className="px-6 pt-6">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              {editingRule ? "Editar Regra" : "Nova Regra de Cadência 10D"}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Configure as etapas da cadência automática
            </SheetDescription>
          </SheetHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="space-y-5 mt-4">
                {/* Rule Name */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Nome da Regra <span className="text-slate-500 font-normal">(opcional)</span></Label>
                  <Input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="Ex: Cadência Geral, Cadência Casa..."
                    className="bg-[#141417] border-[#2a2a2e] text-white"
                  />
                </div>

                {/* Target: Empreendimento or Interesse */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Aplicar para</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setTargetMode("project"); setInterestType(""); checkConflict(projectId); }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        targetMode === "project"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : "border-[#2a2a2e] bg-[#141417] text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />Empreendimento
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTargetMode("interest"); setProjectId("all"); }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        targetMode === "interest"
                          ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                          : "border-[#2a2a2e] bg-[#141417] text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <Tag className="w-4 h-4" />Interesse
                    </button>
                  </div>

                  {targetMode === "project" && (
                    <div className="space-y-1.5">
                      <Select value={projectId} onValueChange={handleProjectChange}>
                        <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white min-h-[44px]">
                          <SelectValue placeholder="Selecione o empreendimento" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                          <SelectItem value="all" className="text-white">🌐 Todos os empreendimentos</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id} className="text-white">{project.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {checkingConflict && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Loader2 className="w-3 h-3 animate-spin" />Verificando conflitos...
                        </div>
                      )}
                      {projectHasRule && <p className="text-xs text-red-400">Já existe uma regra para este empreendimento</p>}
                      {!editingRule && hasFirstMessageConflict && !projectHasRule && (
                        <p className="text-xs text-red-400">Já existe uma 1ª Mensagem ativa para este empreendimento. Desative-a primeiro.</p>
                      )}
                    </div>
                  )}

                  {targetMode === "interest" && (
                    <Select value={interestType} onValueChange={setInterestType}>
                      <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white min-h-[44px]">
                        <SelectValue placeholder="Selecione o interesse" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                        {INTERESSE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Steps Editor */}
                <div className="space-y-3">
                  <Label className="text-slate-300">Etapas da Cadência</Label>

                  {steps.map((step, index) => (
                    <div key={index}>
                      {index > 0 && (
                        <div className="flex items-center gap-2 py-2 pl-4">
                          <div className="w-0.5 h-4 bg-[#2a2a2e]" />
                          <span className="text-xs text-slate-500">após {formatDelay(step.delayMinutes)}</span>
                        </div>
                      )}

                      <div className="rounded-lg border border-[#2a2a2e] bg-[#141417] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-300">Etapa {index + 1}</span>
                            {index === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Imediato</span>}
                          </div>
                          {steps.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10" onClick={() => removeStep(index)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        {index > 0 && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-400">Enviar após</Label>
                              <Select value={String(step.delayMinutes)} onValueChange={(v) => updateStep(index, { delayMinutes: Number(v) })}>
                                <SelectTrigger className="bg-[#0f0f11] border-[#2a2a2e] text-white h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                                  {DELAY_PRESETS.filter(p => p.minutes > 0).map((p) => (
                                    <SelectItem key={p.minutes} value={String(p.minutes)}>{p.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <RadioGroup
                              value={step.sendIfReplied ? "true" : "false"}
                              onValueChange={(val) => updateStep(index, { sendIfReplied: val === "true" })}
                              className="space-y-1.5 py-1.5"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id={`auto-cad-send-${index}`} />
                                <Label className="text-xs text-slate-400 cursor-pointer font-normal" htmlFor={`auto-cad-send-${index}`}>Enviar mesmo que responda</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id={`auto-cad-stop-${index}`} />
                                <Label className="text-xs text-slate-400 cursor-pointer font-normal" htmlFor={`auto-cad-stop-${index}`}>Enviar somente se não responder</Label>
                              </div>
                            </RadioGroup>
                          </>
                        )}

                        <div className="space-y-1.5">
                          <Textarea
                            value={step.messageContent}
                            onChange={(e) => updateStep(index, { messageContent: e.target.value })}
                            placeholder="Digite sua mensagem... Use {nome}, {empreendimento}, {corretor_nome}"
                            className="bg-[#0f0f11] border-[#2a2a2e] text-white min-h-[80px] text-sm"
                          />
                          <p className="text-xs text-slate-600">
                            Variáveis: {"{nome}"}, {"{empreendimento}"}, {"{corretor_nome}"}, {"{cidade}"}, {"{dormitorios}"}, {"{interesse}"}
                          </p>
                        </div>

                        {step.messageContent && (
                          <div className="p-2.5 rounded bg-[#0f0f11] border border-[#2a2a2e]">
                            <p className="text-xs text-slate-400 mb-1">Prévia:</p>
                            <p className="text-sm text-slate-200 whitespace-pre-wrap">{replaceVarsPreview(step.messageContent)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-[#2a2a2e] text-slate-400 hover:text-white hover:border-primary/50"
                    onClick={addStep}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar etapa
                  </Button>

                  <p className="text-xs text-slate-400 text-center">
                    {steps.length} etapa{steps.length > 1 ? "s" : ""}
                  </p>
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
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-[#2a2a2e] bg-[#1a1a1d] px-6 py-4 flex gap-3 mt-auto">
              <Button variant="outline" onClick={onClose} disabled={isSaving}
                className="flex-1 border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e] min-h-[44px] sm:min-h-0">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving || (targetMode === "project" && (projectHasRule || hasFirstMessageConflict || checkingConflict)) || (targetMode === "interest" && !interestType) || !stepsValid}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 min-h-[44px] sm:min-h-0">
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                ) : editingRule ? "Salvar" : "Criar Regra"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}