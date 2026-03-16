import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, EyeOff, RefreshCw, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  uazapi_base_url: string;
  uazapi_token: string;
}

const DEFAULTS: Settings = {
  ai_provider: "anthropic",
  anthropic_api_key: "",
  anthropic_model: "claude-sonnet-4-6",
  openai_api_key: "",
  openai_model: "gpt-4o",
  gemini_api_key: "",
  gemini_model: "gemini-2.0-flash",
  uazapi_base_url: "",
  uazapi_token: "",
};

const AI_PROVIDERS: { id: AiProvider; name: string; logo: string; keyLabel: string; keyPlaceholder: string }[] = [
  {
    id: "anthropic",
    name: "Claude (Anthropic)",
    logo: "🟠",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-...",
  },
  {
    id: "openai",
    name: "OpenAI",
    logo: "🟢",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-...",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    logo: "🔵",
    keyLabel: "Gemini API Key",
    keyPlaceholder: "AIza...",
  },
];

// ─── Masked input ─────────────────────────────────────────────────────────────
function SecretInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
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
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuperAdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value");
      if (error) throw error;
      const map: Partial<Settings> = {};
      (data || []).forEach(({ key, value }) => {
        if (key in DEFAULTS) (map as Record<string, string>)[key] = value ?? "";
      });
      setSettings({ ...DEFAULTS, ...map });
    } catch (err) {
      toast.error("Erro ao carregar configurações: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof Settings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const rows = Object.entries(settings).map(([key, value]) => ({ key, value: value as string, updated_at: new Date().toISOString() }));
      const { error } = await supabase
        .from("platform_settings")
        .upsert(rows, { onConflict: "key" });
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

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Configurações da Plataforma</h1>
          <p className="text-sm text-slate-400 mt-0.5">Integrações e provedores de IA</p>
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#FFFF00] text-black hover:brightness-110 gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      {/* ── AI Provider ─────────────────────────────────────────────────── */}
      <section className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-[#FFFF00]" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Gerador de IA</h2>
        </div>
        <p className="text-xs text-slate-500">
          Provedor usado para gerar landing pages e respostas do copiloto.
        </p>

        {/* Provider selector */}
        <div className="grid grid-cols-3 gap-2">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => set("ai_provider", p.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-all ${
                settings.ai_provider === p.id
                  ? "border-[#FFFF00] bg-[#FFFF00]/10 text-white"
                  : "border-[#2a2a2e] text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              <span className="text-xl">{p.logo}</span>
              <span className="text-xs font-medium leading-tight text-center">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Key + model for selected provider */}
        <div className="space-y-3 pt-1">
          <SecretInput
            label={activeProvider.keyLabel}
            value={(settings as Record<string, string>)[`${settings.ai_provider}_api_key`]}
            placeholder={activeProvider.keyPlaceholder}
            onChange={(v) => set(`${settings.ai_provider}_api_key` as keyof Settings, v)}
          />
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">Modelo</Label>
            <Input
              value={(settings as Record<string, string>)[`${settings.ai_provider}_model`]}
              placeholder="ex: claude-sonnet-4-6"
              onChange={(e) => set(`${settings.ai_provider}_model` as keyof Settings, e.target.value)}
              className="bg-[#0f0f12] border-[#2a2a2e] text-slate-200 font-mono text-sm"
            />
            <p className="text-xs text-slate-600">
              {settings.ai_provider === "anthropic" && "Sugestões: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5-20251001"}
              {settings.ai_provider === "openai" && "Sugestões: gpt-4o, gpt-4o-mini, gpt-4-turbo"}
              {settings.ai_provider === "gemini" && "Sugestões: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash"}
            </p>
          </div>
        </div>
      </section>

      {/* ── Uazapi ──────────────────────────────────────────────────────── */}
      <section className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-[#FFFF00]" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Uazapi (WhatsApp)</h2>
        </div>
        <p className="text-xs text-slate-500">
          Configurações de conexão com a API do WhatsApp via Uazapi.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">URL base</Label>
            <Input
              value={settings.uazapi_base_url}
              placeholder="https://api.uazapi.com"
              onChange={(e) => set("uazapi_base_url", e.target.value)}
              className="bg-[#0f0f12] border-[#2a2a2e] text-slate-200 font-mono text-sm"
            />
          </div>
          <SecretInput
            label="Token de acesso"
            value={settings.uazapi_token}
            placeholder="seu-token-uazapi"
            onChange={(v) => set("uazapi_token", v)}
          />
        </div>
      </section>
    </div>
  );
}
