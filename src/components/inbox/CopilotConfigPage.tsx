import { useState, useEffect } from "react";
import { Bot, Save, Sparkles, MessageSquare, Target, Sliders, Shield, Building2 } from "lucide-react";
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

export function CopilotConfigPage({ brokerId }: CopilotConfigPageProps) {
  const { config, isLoading, saveConfig } = useCopilotConfig(brokerId);
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
    await saveConfig(form);
    setIsSaving(false);
  };

  const update = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full" />
      </div>
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
            {isFirstTime ? "Crie seu Copiloto" : "Configurar Copiloto"}
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
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#FFFF00] text-black hover:bg-[#FFFF00]/80 font-medium"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : isFirstTime ? "Criar Copiloto" : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
