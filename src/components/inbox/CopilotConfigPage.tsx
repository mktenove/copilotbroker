import { useState, useEffect } from "react";
import { Bot, Save, Sparkles, MessageSquare, Target, Sliders, Shield, Building2, Pencil, Trash2 } from "lucide-react";
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

function CopilotAvatar({ name, isActive }: { name: string; isActive: boolean }) {
  return (
    <div className="relative">
      {/* Glow ring */}
      <div className={cn(
        "absolute -inset-1 rounded-full blur-md transition-opacity duration-1000",
        isActive ? "bg-[#FFFF00]/20 opacity-100 animate-pulse" : "opacity-0"
      )} />
      {/* Avatar */}
      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1e] to-[#0d0d0f] border border-[#FFFF00]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,0,0.08)]">
        {/* Face */}
        <div className="relative">
          {/* Eyes */}
          <div className="flex gap-3 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] shadow-[0_0_8px_rgba(255,255,0,0.6)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] shadow-[0_0_8px_rgba(255,255,0,0.6)]" />
          </div>
          {/* Smile */}
          <div className="w-6 h-3 mx-auto border-b-2 border-[#FFFF00]/60 rounded-b-full" />
        </div>
      </div>
      {/* Antenna */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full border border-[#FFFF00]/40",
          isActive ? "bg-[#FFFF00] shadow-[0_0_10px_rgba(255,255,0,0.5)]" : "bg-[#2a2a2e]"
        )} />
        <div className="w-px h-2 bg-[#FFFF00]/30" />
      </div>
    </div>
  );
}

function CopilotSummary({ config, onEdit, onDelete }: { config: CopilotConfig; onEdit: () => void; onDelete: () => void }) {
  const personality = PERSONALITIES.find(p => p.id === config.personality);
  const propertyType = PROPERTY_TYPES.find(p => p.id === config.property_type);

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 space-y-5 pt-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1a1a1e] border border-[#2a2a2e]">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFF00]/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFFF00]/20 to-transparent" />

        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <CopilotAvatar name={config.name} isActive={config.is_active} />

          <h2 className="text-xl font-bold text-white mt-5 tracking-tight">{config.name}</h2>

          <div className="flex items-center gap-2 mt-2">
            {config.is_active ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFF00]/10 border border-[#FFFF00]/20 text-[#FFFF00] text-xs font-semibold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFFF00] animate-pulse" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 text-xs font-semibold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Offline
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500 mt-3">
            {personality?.label} · {personality?.desc}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-[#2a2a2e]">
        <StatCell label="Persuasão" value={`${config.persuasion_level}%`} />
        <StatCell label="Objetividade" value={`${config.objectivity_level}%`} />
        <StatCell label="Autonomia" value={AUTONOMY_LABELS[config.max_autonomy]?.split(" ")[0] || "—"} />
      </div>

      {/* Config details */}
      <div className="space-y-px rounded-xl overflow-hidden border border-[#2a2a2e]">
        <DetailRow label="Prioridade comercial" value={PRIORITY_LABELS[config.commercial_priority] || config.commercial_priority} />
        <DetailRow label="Tipo de imóvel" value={propertyType?.label || config.property_type} />
        <DetailRow label="Gatilhos mentais" value={config.use_mental_triggers ? "Ativado" : "Desativado"} highlight={config.use_mental_triggers} />
        <DetailRow label="Emojis" value={config.allow_emojis ? "Ativado" : "Desativado"} highlight={config.allow_emojis} />
        <DetailRow label="Follow-up automático" value={config.followup_auto ? "Ativado" : "Desativado"} highlight={config.followup_auto} />
        <DetailRow label="Visita presencial" value={config.incentive_visit ? "Sim" : "Não"} highlight={config.incentive_visit} />
        {config.region && <DetailRow label="Região" value={config.region} />}
        {config.target_audience && <DetailRow label="Público-alvo" value={config.target_audience} />}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          onClick={onEdit}
          className="flex-1 bg-[#FFFF00] text-black hover:bg-[#FFFF00]/80 font-semibold h-11 rounded-xl"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar Copiloto
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="h-11 w-11 rounded-xl border-[#2a2a2e] text-slate-500 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 p-0">
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1a1e] px-3 py-3 text-center">
      <p className="text-base font-bold text-white tracking-tight">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1e]">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn(
        "text-xs font-medium",
        highlight ? "text-[#FFFF00]" : "text-slate-300"
      )}>{value}</span>
    </div>
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
