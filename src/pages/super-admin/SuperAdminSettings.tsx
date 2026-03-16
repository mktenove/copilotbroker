import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, EyeOff, RefreshCw, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────
type AiProvider = "anthropic" | "openai" | "gemini";

interface Settings {
  ai_provider: AiProvider;
  anthropic_api_key: string;
  anthropic_model: string;
  openai_api_key: string;
  openai_model: string;
  gemini_api_key: string;
  gemini_model: string;
  uazapi_instance_url: string;
  uazapi_token: string;
  uazapi_admin_token: string;
}

const DEFAULTS: Settings = {
  ai_provider: "anthropic",
  anthropic_api_key: "",
  anthropic_model: "claude-sonnet-4-6",
  openai_api_key: "",
  openai_model: "gpt-4o",
  gemini_api_key: "",
  gemini_model: "gemini-2.0-flash",
  uazapi_instance_url: "",
  uazapi_token: "",
  uazapi_admin_token: "",
};

const AI_PROVIDERS: {
  id: AiProvider; name: string; logo: string; keyLabel: string; keyPlaceholder: string; envVar: string;
}[] = [
  { id: "anthropic", name: "Claude (Anthropic)", logo: "🟠", keyLabel: "Anthropic API Key", keyPlaceholder: "sk-ant-...", envVar: "ANTHROPIC_API_KEY" },
  { id: "openai",    name: "OpenAI",             logo: "🟢", keyLabel: "OpenAI API Key",    keyPlaceholder: "sk-...",    envVar: "OPENAI_API_KEY" },
  { id: "gemini",    name: "Google Gemini",       logo: "🔵", keyLabel: "Gemini API Key",    keyPlaceholder: "AIza...",   envVar: "GEMINI_API_KEY" },
];

const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-6",          label: "Claude Sonnet 4.6 — Recomendado" },
    { value: "claude-opus-4-6",            label: "Claude Opus 4.6 — Mais capaz" },
    { value: "claude-haiku-4-5-20251001",  label: "Claude Haiku 4.5 — Mais rápido" },
  ],
  openai: [
    { value: "gpt-4o",       label: "GPT-4o — Recomendado" },
    { value: "gpt-4o-mini",  label: "GPT-4o Mini — Mais rápido" },
    { value: "gpt-4-turbo",  label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo",label: "GPT-3.5 Turbo — Econômico" },
  ],
  gemini: [
    { value: "gemini-2.0-flash",     label: "Gemini 2.0 Flash — Recomendado" },
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp" },
    { value: "gemini-1.5-pro",       label: "Gemini 1.5 Pro — Mais capaz" },
    { value: "gemini-1.5-flash",     label: "Gemini 1.5 Flash — Mais rápido" },
  ],
};

// ─── Masked input ─────────────────────────────────────────────────────────────
function SecretInput({
  label, value, placeholder, hint, onChange,
}: {
  label: string; value: string; placeholder: string; hint?: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-slate-300">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#0f0f12] border-[#2a2a2e] text-slate-200 pr-10 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuperAdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data, error } = await (supabase as any).from("platform_settings").select("key, value");
      if (error) throw error;
      const map: Partial<Settings> = {};
      ((data as Array<{ key: string; value: string | null }>) || []).forEach(({ key, value }) => {
        if (key in DEFAULTS) (map as Record<string, string>)[key] = value ?? "";
      });
      setSettings({ ...DEFAULTS, ...map });
    } catch (err) {
      toast.error("Erro ao carregar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof Settings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const rows = Object.entries(settings).map(([key, value]) => ({
        key, value: value as string, updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase as any).from("platform_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FFFF00]" />
      </div>
    );
  }

  const activeProvider = AI_PROVIDERS.find((p) => p.id === settings.ai_provider)!;
  const modelKey = `${settings.ai_provider}_model` as keyof Settings;
  const keyKey   = `${settings.ai_provider}_api_key` as keyof Settings;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Configurações da Plataforma</h1>
          <p className="text-sm text-slate-400 mt-0.5">Integrações e provedores de IA</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-[#FFFF00] text-black hover:brightness-110 gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      {/* ── AI Provider ─────────────────────────────────────────────────── */}
      <section className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#FFFF00]" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Gerador de IA</h2>
        </div>
        <p className="text-xs text-slate-500">
          Provedor ativo para geração de landing pages e respostas do copiloto. Apenas um ativo por vez.
        </p>

        {/* Provider cards — mutually exclusive */}
        <div className="grid grid-cols-3 gap-2">
          {AI_PROVIDERS.map((p) => {
            const active = settings.ai_provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => set("ai_provider", p.id)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  active
                    ? "border-[#FFFF00] bg-[#FFFF00]/10 text-white"
                    : "border-[#2a2a2e] text-slate-500 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FFFF00]" />
                )}
                <span className="text-2xl">{p.logo}</span>
                <span className="text-xs font-medium leading-tight text-center">{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Key + model — for active provider only */}
        <div className="space-y-3 pt-1 border-t border-[#2a2a2e]">
          <SecretInput
            label={activeProvider.keyLabel}
            value={settings[keyKey]}
            placeholder={activeProvider.keyPlaceholder}
            hint={`Se vazio, usa a variável de ambiente ${activeProvider.envVar} do servidor.`}
            onChange={(v) => set(keyKey, v)}
          />

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">Modelo</Label>
            <Select value={settings[modelKey]} onValueChange={(v) => set(modelKey, v)}>
              <SelectTrigger className="bg-[#0f0f12] border-[#2a2a2e] text-slate-200 font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1e] border-[#2a2a2e]">
                {MODEL_OPTIONS[settings.ai_provider].map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-slate-200 font-mono text-sm focus:bg-[#2a2a2e] focus:text-white"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Uazapi ──────────────────────────────────────────────────────── */}
      <section className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FFFF00]" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Uazapi (WhatsApp)</h2>
        </div>
        <p className="text-xs text-slate-500">
          Conexão com a API do WhatsApp via Uazapi. Se vazio, usa as variáveis de ambiente do servidor.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">URL da instância</Label>
            <Input
              value={settings.uazapi_instance_url}
              placeholder="https://sua-instancia.uazapi.com"
              onChange={(e) => set("uazapi_instance_url", e.target.value)}
              className="bg-[#0f0f12] border-[#2a2a2e] text-slate-200 font-mono text-sm"
            />
            <p className="text-xs text-slate-600">Variável de ambiente: UAZAPI_INSTANCE_URL</p>
          </div>
          <SecretInput
            label="Token de acesso"
            value={settings.uazapi_token}
            placeholder="seu-token-uazapi"
            hint="Variável de ambiente: UAZAPI_TOKEN"
            onChange={(v) => set("uazapi_token", v)}
          />
          <SecretInput
            label="Token Admin (opcional)"
            value={settings.uazapi_admin_token}
            placeholder="token-admin-uazapi"
            hint="Variável de ambiente: UAZAPI_ADMIN_TOKEN — para gerenciar instâncias."
            onChange={(v) => set("uazapi_admin_token", v)}
          />
        </div>
      </section>
    </div>
  );
}
