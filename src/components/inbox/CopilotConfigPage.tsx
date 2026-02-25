import { useState, useEffect } from "react";
import { Bot, Save, Sparkles, MessageSquare, Target, Sliders, Shield, Building2, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopilotConfig, CopilotConfig } from "@/hooks/use-copilot";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CopilotConfigPageProps {
  brokerId: string;
}

const PERSONALITIES = [
  { id: "formal", label: "Formal", desc: "Profissional e direto" },
  { id: "consultivo", label: "Consultivo", desc: "Empático e estratégico" },
  { id: "agressivo", label: "Agressivo Comercial", desc: "Persuasivo e orientado ao fechamento" },
  { id: "tecnico", label: "Técnico", desc: "Informativo e preciso" },
  { id: "premium", label: "Premium", desc: "Sofisticado e exclusivo" },
];

const PROPERTY_TYPES = [
  { id: "popular", label: "Popular" },
  { id: "medio", label: "Médio Padrão" },
  { id: "alto", label: "Alto Padrão" },
  { id: "lancamentos", label: "Lançamentos" },
  { id: "comercial", label: "Comercial" },
];

const AUTONOMY_LABELS: Record<string, string> = {
  suggest_only: "Apenas sugerir",
  suggest_and_draft: "Sugerir e rascunhar",
  auto_respond: "Responder automaticamente",
};

const PRIORITY_LABELS: Record<string, string> = {
  agendamento: "Agendamento de visita",
  proposta: "Envio de proposta",
  qualificacao: "Qualificação do lead",
  fechamento: "Fechamento direto",
};

function CopilotSummary({ config, onEdit, onDelete }: { config: CopilotConfig; onEdit: () => void; onDelete: () => void }) {
  const personality = PERSONALITIES.find(p => p.id === config.personality);
  const propertyType = PROPERTY_TYPES.find(p => p.id === config.property_type);

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 space-y-4 pt-4">
      {/* Status card */}
      <Card className="bg-[#1a1a1e] border-[#2a2a2e] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-9 h-9 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{config.name}</h2>
              {config.is_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Ativo
                </span>
              )}
              {!config.is_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-xs font-medium">
                  Inativo
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {personality?.label} · {personality?.desc}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryItem label="Persuasão" value={`${config.persuasion_level}%`} />
        <SummaryItem label="Objetividade" value={`${config.objectivity_level}%`} />
        <SummaryItem label="Prioridade" value={PRIORITY_LABELS[config.commercial_priority] || config.commercial_priority} />
        <SummaryItem label="Autonomia" value={AUTONOMY_LABELS[config.max_autonomy] || config.max_autonomy} />
        <SummaryItem label="Imóvel" value={propertyType?.label || config.property_type} />
        <SummaryItem label="Gatilhos mentais" value={config.use_mental_triggers ? "Sim" : "Não"} />
        <SummaryItem label="Emojis" value={config.allow_emojis ? "Sim" : "Não"} />
        <SummaryItem label="Follow-up auto" value={config.followup_auto ? "Sim" : "Não"} />
      </div>

      {config.region && (
        <Card className="bg-[#1a1a1e] border-[#2a2a2e] p-3">
          <p className="text-xs text-slate-500">Região</p>
          <p className="text-sm text-slate-200">{config.region}</p>
        </Card>
      )}

      {config.target_audience && (
        <Card className="bg-[#1a1a1e] border-[#2a2a2e] p-3">
          <p className="text-xs text-slate-500">Público-alvo</p>
          <p className="text-sm text-slate-200">{config.target_audience}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onEdit}
          className="flex-1 bg-[#FFFF00] text-black hover:bg-[#FFFF00]/80 font-medium"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#1e1e22] border-[#2a2a2e]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir Copiloto</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Tem certeza que deseja excluir o copiloto "{config.name}"? Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#2a2a2e] border-[#3a3a3e] text-slate-200 hover:bg-[#3a3a3e]">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-[#1a1a1e] border-[#2a2a2e] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200 font-medium">{value}</p>
    </Card>
  );
}

export function CopilotConfigPage({ brokerId }: CopilotConfigPageProps) {
  const { config, isLoading, saveConfig, fetchConfig } = useCopilotConfig(brokerId);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<CopilotConfig>>({
    name: "Meu Copiloto",
    personality: "consultivo",
    persuasion_level: 50,
    objectivity_level: 50,
    use_mental_triggers: true,
    allow_emojis: true,
    language_style: "proximo",
    commercial_priority: "agendamento",
    commercial_focus: "presencial",
    incentive_visit: true,
    incentive_call: false,
    followup_auto: false,
    followup_tone: "consultivo",
    auto_close_inactive: false,
    max_autonomy: "suggest_only",
    property_type: "lancamentos",
    region: "",
    target_audience: "",
    brand_positioning: "",
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveConfig(form);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!config?.id) return;
    try {
      const { error } = await supabase
        .from("copilot_configs")
        .delete()
        .eq("id", config.id);
      if (error) throw error;
      toast.success("Copiloto excluído com sucesso");
      await fetchConfig();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir copiloto");
    }
  };

  const update = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show summary if config exists and not editing
  if (config && !isEditing) {
    return (
      <CopilotSummary
        config={config}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
      />
    );
  }

  const isFirstTime = !config;

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">
            {isFirstTime ? "Crie seu Copiloto" : "Editar Copiloto"}
          </h1>
          <p className="text-sm text-slate-400">
            {isFirstTime ? "Configure seu assistente de vendas com IA" : form.name}
          </p>
        </div>
      </div>

      {/* Name */}
      <Card className="bg-[#1a1a1e] border-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFFF00]" /> Identidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">Nome do Copiloto</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => update("name", e.target.value)}
              className="bg-[#141417] border-[#2a2a2e] text-white"
              placeholder="Ex: Max, Luna, Atlas..."
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Copiloto ativo</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Personality */}
      <Card className="bg-[#1a1a1e] border-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" /> Personalidade e Tom
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => update("personality", p.id)}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  form.personality === p.id
                    ? "border-[#FFFF00] bg-[#FFFF00]/10"
                    : "border-[#2a2a2e] bg-[#141417] hover:border-[#3a3a3e]"
                )}
              >
                <p className="text-xs font-medium text-white">{p.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>

          <div>
            <Label className="text-xs text-slate-400">Nível de persuasão: {form.persuasion_level}%</Label>
            <Slider
              value={[form.persuasion_level || 50]}
              onValueChange={([v]) => update("persuasion_level", v)}
              max={100} step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-400">Nível de objetividade: {form.objectivity_level}%</Label>
            <Slider
              value={[form.objectivity_level || 50]}
              onValueChange={([v]) => update("objectivity_level", v)}
              max={100} step={5}
              className="mt-2"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Usar gatilhos mentais</Label>
            <Switch checked={form.use_mental_triggers} onCheckedChange={(v) => update("use_mental_triggers", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Permitir emojis</Label>
            <Switch checked={form.allow_emojis} onCheckedChange={(v) => update("allow_emojis", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Commercial Strategy */}
      <Card className="bg-[#1a1a1e] border-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" /> Estratégia Comercial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">Prioridade</Label>
            <Select value={form.commercial_priority} onValueChange={(v) => update("commercial_priority", v)}>
              <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendamento">Agendamento de visita</SelectItem>
                <SelectItem value="proposta">Envio de proposta</SelectItem>
                <SelectItem value="qualificacao">Qualificação do lead</SelectItem>
                <SelectItem value="fechamento">Fechamento direto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Incentivar visita presencial</Label>
            <Switch checked={form.incentive_visit} onCheckedChange={(v) => update("incentive_visit", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Incentivar chamada online</Label>
            <Switch checked={form.incentive_call} onCheckedChange={(v) => update("incentive_call", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Autonomy */}
      <Card className="bg-[#1a1a1e] border-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" /> Limites de Autonomia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">Nível máximo de autonomia</Label>
            <Select value={form.max_autonomy} onValueChange={(v) => update("max_autonomy", v)}>
              <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggest_only">Apenas sugerir</SelectItem>
                <SelectItem value="suggest_and_draft">Sugerir e rascunhar</SelectItem>
                <SelectItem value="auto_respond">Responder automaticamente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Follow-up automático</Label>
            <Switch checked={form.followup_auto} onCheckedChange={(v) => update("followup_auto", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Encerrar lead inativo automaticamente</Label>
            <Switch checked={form.auto_close_inactive} onCheckedChange={(v) => update("auto_close_inactive", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Property Profile */}
      <Card className="bg-[#1a1a1e] border-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" /> Perfil da Imobiliária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">Tipo de imóvel predominante</Label>
            <Select value={form.property_type} onValueChange={(v) => update("property_type", v)}>
              <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>{pt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Região de atuação</Label>
            <Input
              value={form.region || ""}
              onChange={(e) => update("region", e.target.value)}
              className="bg-[#141417] border-[#2a2a2e] text-white"
              placeholder="Ex: Grande Porto Alegre"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Público-alvo</Label>
            <Input
              value={form.target_audience || ""}
              onChange={(e) => update("target_audience", e.target.value)}
              className="bg-[#141417] border-[#2a2a2e] text-white"
              placeholder="Ex: Jovens casais, investidores"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Posicionamento de marca</Label>
            <Textarea
              value={form.brand_positioning || ""}
              onChange={(e) => update("brand_positioning", e.target.value)}
              className="bg-[#141417] border-[#2a2a2e] text-white min-h-[60px]"
              placeholder="Descreva o posicionamento da sua marca..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#141417]/95 backdrop-blur border-t border-[#2a2a2e] lg:static lg:bg-transparent lg:border-0 lg:p-0">
        <div className="flex gap-3">
          {!isFirstTime && (
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              className="border-[#2a2a2e] text-slate-400 hover:bg-[#2a2a2e] hover:text-white"
            >
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#FFFF00] text-black hover:bg-[#FFFF00]/80 font-medium"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Salvando..." : isFirstTime ? "Criar Copiloto" : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
