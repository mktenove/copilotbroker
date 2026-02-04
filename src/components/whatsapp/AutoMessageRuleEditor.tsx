import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoMessageRules } from "@/hooks/use-auto-message-rules";
import { useUserRole } from "@/hooks/use-user-role";
import { 
  type BrokerAutoMessageRule, 
  DEFAULT_AUTO_MESSAGE,
  replaceAutoMessageVariables 
} from "@/types/auto-message";

interface AutoMessageRuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule: BrokerAutoMessageRule | null;
}

interface Project {
  id: string;
  name: string;
}

export function AutoMessageRuleEditor({
  isOpen,
  onClose,
  editingRule,
}: AutoMessageRuleEditorProps) {
  const { brokerId } = useUserRole();
  const { createRule, updateRule, isSaving, rules } = useAutoMessageRules();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [brokerName, setBrokerName] = useState("Corretor");

  // Form state
  const [projectId, setProjectId] = useState<string>("all");
  const [messageContent, setMessageContent] = useState(DEFAULT_AUTO_MESSAGE);
  const [delayMinutes, setDelayMinutes] = useState(2);

  // Load projects on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!brokerId) return;
      
      setLoadingProjects(true);
      try {
        // Fetch projects for this broker
        const { data: brokerProjects } = await supabase
          .from("broker_projects")
          .select("project:projects(id, name)")
          .eq("broker_id", brokerId)
          .eq("is_active", true);

        if (brokerProjects) {
          const projectsList = brokerProjects
            .map((bp: any) => bp.project)
            .filter((p: Project | null): p is Project => p !== null);
          setProjects(projectsList);
        }

        // Fetch broker name
        const { data: broker } = await supabase
          .from("brokers")
          .select("name")
          .eq("id", brokerId)
          .single();
        
        if (broker) {
          setBrokerName(broker.name.split(" ")[0]); // First name only
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, brokerId]);

  // Reset form when opening/closing or editing different rule
  useEffect(() => {
    if (editingRule) {
      setProjectId(editingRule.project_id || "all");
      setMessageContent(editingRule.message_content);
      setDelayMinutes(editingRule.delay_minutes);
    } else {
      setProjectId("all");
      setMessageContent(DEFAULT_AUTO_MESSAGE);
      setDelayMinutes(2);
    }
  }, [editingRule, isOpen]);

  // Check if project already has a rule (for new rules only)
  const projectHasRule = useMemo(() => {
    if (editingRule) return false; // Don't check when editing
    const targetProjectId = projectId === "all" ? null : projectId;
    return rules.some(r => r.project_id === targetProjectId);
  }, [projectId, rules, editingRule]);

  // Preview message
  const previewMessage = useMemo(() => {
    const selectedProject = projects.find(p => p.id === projectId);
    return replaceAutoMessageVariables(messageContent, {
      nome_lead: "João",
      nome_corretor: brokerName,
      empreendimento: projectId === "all" ? "o empreendimento" : selectedProject?.name || "Golden View",
    });
  }, [messageContent, projectId, projects, brokerName]);

  const handleSubmit = async () => {
    if (!messageContent.trim()) {
      return;
    }

    const data = {
      project_id: projectId === "all" ? null : projectId,
      message_content: messageContent.trim(),
      delay_minutes: delayMinutes,
      is_active: true,
    };

    let success;
    if (editingRule) {
      success = await updateRule(editingRule.id, data);
    } else {
      success = await createRule(data);
    }

    if (success) {
      onClose();
    }
  };

  const handleInsertVariable = (variable: string) => {
    setMessageContent(prev => prev + `{${variable}}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-[#1a1a1d] border-[#2a2a2e] w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-white">
            {editingRule ? "Editar Regra" : "Nova Regra de Automação"}
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Configure quando e o que será enviado automaticamente
          </SheetDescription>
        </SheetHeader>

        {loadingProjects ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Empreendimento</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white">
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
              
              {projectHasRule && (
                <p className="text-xs text-red-400">
                  Já existe uma regra para este empreendimento
                </p>
              )}
            </div>

            {/* Delay Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Delay para envio</Label>
                <span className="text-sm text-primary font-medium">{delayMinutes} minuto{delayMinutes > 1 ? 's' : ''}</span>
              </div>
              <Slider
                value={[delayMinutes]}
                onValueChange={(v) => setDelayMinutes(v[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-slate-500">
                A mensagem será enviada entre 1 a 5 minutos após o cadastro
              </p>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label className="text-slate-300">Mensagem</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="bg-[#141417] border-[#2a2a2e] text-white min-h-[150px] resize-none"
              />
              
              {/* Variables */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">Variáveis:</span>
                {["nome_lead", "nome_corretor", "empreendimento"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-slate-300">Preview</Label>
              <div className="bg-[#075e54] rounded-lg p-4 relative">
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-white text-sm whitespace-pre-line leading-relaxed">
                  {previewMessage}
                </p>
              </div>
            </div>

            {/* Warning */}
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <AlertDescription className="text-amber-300 text-sm">
                Esta mensagem será enviada <strong>automaticamente</strong> após o cadastro 
                do lead na landing page. Certifique-se de que o texto está correto.
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !messageContent.trim() || projectHasRule}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingRule ? (
                  "Salvar Alterações"
                ) : (
                  "Criar Regra"
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
