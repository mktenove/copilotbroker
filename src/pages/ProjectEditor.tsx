import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Project, LandingPageData } from "@/types/project";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Save,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BrokerInfo {
  id: string;
  name: string;
  slug: string;
}

// ─── Section edit helpers ─────────────────────────────────────────────────────
interface SectionConfig {
  key: keyof LandingPageData;
  label: string;
  icon: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "hero", label: "Hero", icon: "🎯" },
  { key: "location", label: "Localização", icon: "📍" },
  { key: "features", label: "Diferenciais", icon: "⭐" },
  { key: "audience", label: "Para quem é", icon: "👥" },
  { key: "urgency", label: "Urgência / Oportunidade", icon: "⚡" },
  { key: "benefits", label: "Benefícios do cadastro", icon: "✅" },
  { key: "cta", label: "CTA Final", icon: "🚀" },
  { key: "form", label: "Formulário", icon: "📋" },
];

// ─── Inline text editor for individual fields ─────────────────────────────────
function EditableField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="bg-[#0f0f12] border-[#2a2a2e] text-sm"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#0f0f12] border-[#2a2a2e] text-sm h-8"
        />
      )}
    </div>
  );
}

// ─── Section panel ─────────────────────────────────────────────────────────────
function SectionPanel({
  section,
  data,
  onUpdate,
}: {
  section: SectionConfig;
  data: LandingPageData;
  onUpdate: (updated: LandingPageData) => void;
}) {
  const [open, setOpen] = useState(false);

  const set = (path: string, value: unknown) => {
    // Deep clone and set by path (dot notation)
    const clone = JSON.parse(JSON.stringify(data)) as LandingPageData;
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    onUpdate(clone);
  };

  const renderFields = () => {
    switch (section.key) {
      case "hero": {
        const h = data.hero;
        return (
          <div className="space-y-3">
            <EditableField label="Badge" value={h.badge} onChange={(v) => set("hero.badge", v)} />
            <EditableField label="Título" value={h.title} onChange={(v) => set("hero.title", v)} multiline />
            <EditableField label="Destaque no título (opcional)" value={h.titleHighlight} onChange={(v) => set("hero.titleHighlight", v)} />
            <EditableField label="Subtítulo" value={h.subtitle} onChange={(v) => set("hero.subtitle", v)} multiline />
            <EditableField label="Texto do botão CTA" value={h.ctaText} onChange={(v) => set("hero.ctaText", v)} />
          </div>
        );
      }
      case "location": {
        const l = data.location;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={l.title} onChange={(v) => set("location.title", v)} />
            <EditableField label="Descrição" value={l.description} onChange={(v) => set("location.description", v)} multiline />
            {l.highlights.map((h, i) => (
              <EditableField
                key={i}
                label={`Destaque ${i + 1}`}
                value={h}
                onChange={(v) => {
                  const arr = [...l.highlights];
                  arr[i] = v;
                  set("location.highlights", arr);
                }}
              />
            ))}
          </div>
        );
      }
      case "features": {
        return (
          <div className="space-y-4">
            {data.features.map((f, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f0f12] space-y-2">
                <EditableField label="Ícone (emoji)" value={f.icon} onChange={(v) => {
                  const arr = [...data.features]; arr[i] = { ...arr[i], icon: v }; set("features", arr);
                }} />
                <EditableField label="Rótulo" value={f.label} onChange={(v) => {
                  const arr = [...data.features]; arr[i] = { ...arr[i], label: v }; set("features", arr);
                }} />
                <EditableField label="Valor" value={f.value} onChange={(v) => {
                  const arr = [...data.features]; arr[i] = { ...arr[i], value: v }; set("features", arr);
                }} />
              </div>
            ))}
          </div>
        );
      }
      case "audience": {
        return (
          <div className="space-y-4">
            {data.audience.map((a, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f0f12] space-y-2">
                <EditableField label="Título" value={a.title} onChange={(v) => {
                  const arr = [...data.audience]; arr[i] = { ...arr[i], title: v }; set("audience", arr);
                }} />
                <EditableField label="Descrição" value={a.description} onChange={(v) => {
                  const arr = [...data.audience]; arr[i] = { ...arr[i], description: v }; set("audience", arr);
                }} />
              </div>
            ))}
          </div>
        );
      }
      case "urgency": {
        const u = data.urgency;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={u.title} onChange={(v) => set("urgency.title", v)} />
            <EditableField label="Descrição" value={u.description} onChange={(v) => set("urgency.description", v)} multiline />
            <EditableField label="Destaque (ex: Apenas 8 unidades)" value={u.highlight} onChange={(v) => set("urgency.highlight", v)} />
          </div>
        );
      }
      case "benefits": {
        return (
          <div className="space-y-4">
            {data.benefits.map((b, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f0f12] space-y-2">
                <EditableField label="Ícone (emoji)" value={b.icon} onChange={(v) => {
                  const arr = [...data.benefits]; arr[i] = { ...arr[i], icon: v }; set("benefits", arr);
                }} />
                <EditableField label="Título" value={b.title} onChange={(v) => {
                  const arr = [...data.benefits]; arr[i] = { ...arr[i], title: v }; set("benefits", arr);
                }} />
                <EditableField label="Descrição" value={b.description} onChange={(v) => {
                  const arr = [...data.benefits]; arr[i] = { ...arr[i], description: v }; set("benefits", arr);
                }} />
              </div>
            ))}
          </div>
        );
      }
      case "cta": {
        const c = data.cta;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={c.title} onChange={(v) => set("cta.title", v)} />
            <EditableField label="Subtítulo" value={c.subtitle} onChange={(v) => set("cta.subtitle", v)} multiline />
            <EditableField label="Texto do botão" value={c.buttonText} onChange={(v) => set("cta.buttonText", v)} />
          </div>
        );
      }
      case "form": {
        const f = data.form;
        return (
          <div className="space-y-3">
            <EditableField label="Título" value={f.title} onChange={(v) => set("form.title", v)} />
            <EditableField label="Subtítulo" value={f.subtitle} onChange={(v) => set("form.subtitle", v)} />
            <EditableField label="Texto do botão" value={f.buttonText} onChange={(v) => set("form.buttonText", v)} />
            <EditableField label="Título do agradecimento" value={f.thankYouTitle} onChange={(v) => set("form.thankYouTitle", v)} />
            <EditableField label="Mensagem de agradecimento" value={f.thankYouMessage} onChange={(v) => set("form.thankYouMessage", v)} multiline />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="border border-[#2a2a2e] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-[#2a2a2e] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <span>{section.icon}</span>
          {section.label}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 bg-[#1a1a1e] border-t border-[#2a2a2e]">{renderFields()}</div>}
    </div>
  );
}

// ─── Default LP data (preview fallback when no AI data) ──────────────────────
function buildDefaultLp(project: Project): LandingPageData {
  const isRenting = project.status === "renting";
  return {
    theme: { primaryColor: "#FFFF00", accentColor: "#facc15", bgColor: "#0f0f12", textColor: "#ffffff", fontFamily: "Inter", heroStyle: "dark-overlay" },
    hero: { badge: isRenting ? "Disponível para Locação" : "Novo Empreendimento", title: project.hero_title || project.name, titleHighlight: "", subtitle: project.hero_subtitle || `${project.city} — ${project.description || ""}`, ctaText: isRenting ? "Quero agendar uma visita" : "Quero mais informações" },
    location: { title: `Localização estratégica em ${project.city}`, description: `${project.name} está localizado em uma região privilegiada de ${project.city}.`, highlights: ["Fácil acesso", "Bem localizado", "Região valorizada", "Infraestrutura completa"] },
    features: [{ icon: "📍", label: "Cidade", value: project.city }, { icon: "⭐", label: "Status", value: isRenting ? "Para Locação" : "Disponível" }],
    audience: [{ title: "Quem busca praticidade", description: "Imóvel com localização e estrutura ideais" }, { title: "Famílias em crescimento", description: "Espaço e segurança para viver bem" }, { title: "Investidores inteligentes", description: "Valorização garantida na melhor região" }, { title: "Quem quer conforto", description: "Acabamento e infraestrutura de alto padrão" }],
    urgency: { type: "opportunity", title: "Aproveite esta oportunidade", description: "Entre em contato agora e garanta as melhores condições.", highlight: "Disponibilidade limitada" },
    benefits: [{ icon: "📋", title: "Informações completas", description: "Receba todos os detalhes" }, { icon: "🎯", title: "Atendimento prioritário", description: "Fale diretamente com o corretor" }, { icon: "📅", title: "Agende uma visita", description: "Conheça o imóvel pessoalmente" }, { icon: "💬", title: "Tire suas dúvidas", description: "Estamos prontos para te atender" }],
    cta: { title: "Dê o próximo passo", subtitle: "Entre em contato e receba todas as informações.", buttonText: "Tenho interesse" },
    form: { title: "Tenho interesse", subtitle: "Preencha seus dados e entraremos em contato.", buttonText: "Enviar", thankYouTitle: "Recebemos seu cadastro!", thankYouMessage: "Em breve um corretor entrará em contato. Fique de olho no WhatsApp!" },
    floatingButtonText: "Quero mais informações",
    footer: { disclaimer: "Imagens meramente ilustrativas. Material de divulgação em conformidade com a legislação vigente." },
  };
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function ProjectEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { role, brokerId } = useUserRole();

  const [project, setProject] = useState<Project | null>(null);
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [lpData, setLpData] = useState<LandingPageData | null>(null);
  const [hasAiData, setHasAiData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(true);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copy URL
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (projectId) loadEditor();
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadEditor = async () => {
    try {
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (!projectData) {
        toast.error("Projeto não encontrado");
        navigate(-1);
        return;
      }
      setProject(projectData as Project);
      if (projectData.landing_page_data) {
        setLpData(projectData.landing_page_data as LandingPageData);
        setHasAiData(true);
      } else {
        setLpData(buildDefaultLp(projectData as Project));
      }

      // Load broker for URL preview
      if (brokerId) {
        const { data: brokerData } = await supabase
          .from("brokers")
          .select("id, name, slug")
          .eq("id", brokerId)
          .maybeSingle();
        if (brokerData) setBroker(brokerData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const publicUrl =
    project && broker
      ? `${window.location.origin}/${project.city_slug}/${project.slug}/${broker.slug}`
      : "";

  const copyUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    if (!lpData || !project) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ landing_page_data: lpData })
        .eq("id", project.id);
      if (error) throw error;
      toast.success("Landing page salva!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!project) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await supabase.functions.invoke("generate-landing-page", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { project },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);

      setLpData(res.data.data);
      setHasAiData(true);
      toast.success("Landing page regenerada com sucesso!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro: " + msg);
    } finally {
      setRegenerating(false);
    }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !lpData || !project) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await supabase.functions.invoke("generate-landing-page", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { project, chatMessage: msg, existingData: lpData },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);

      const updated = res.data.data as LandingPageData;
      setLpData(updated);

      // Auto-save
      await supabase
        .from("projects")
        .update({ landing_page_data: updated })
        .eq("id", project.id);

      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Pronto! Apliquei as alterações na sua landing page." },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setChatMessages([...newMessages, { role: "assistant", content: `Erro: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-[#0f0f12] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e] bg-[#1e1e22]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-[#2a2a2e] text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">{project.name}</h1>
            <p className="text-xs text-muted-foreground">Editor de Landing Page</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {publicUrl && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyUrl}
                className="text-xs hover:bg-[#2a2a2e] gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(publicUrl, "_blank")}
                className="text-xs hover:bg-[#2a2a2e] gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs hover:bg-[#2a2a2e] gap-1"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "Ocultar" : "Preview"}
          </Button>

          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className="bg-[#FFFF00] text-black hover:brightness-110 text-xs gap-1"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div
          className={cn(
            "flex flex-col border-r border-[#2a2a2e] bg-[#1e1e22]",
            showPreview ? "w-80" : "w-full max-w-xl"
          )}
        >
          <Tabs defaultValue="edit" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-3 mt-3 shrink-0 bg-[#2a2a2e]">
              <TabsTrigger value="edit" className="flex-1 text-xs gap-1">
                <Pencil className="w-3.5 h-3.5" /> Editar Seções
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 text-xs gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Chat IA
              </TabsTrigger>
            </TabsList>

            {/* Edit tab */}
            <TabsContent value="edit" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {!hasAiData && (
                    <div className="text-center py-6 space-y-3 border border-dashed border-[#3a3a3e] rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Gere com IA para personalizar os textos automaticamente.
                      </p>
                      <Button
                        onClick={regenerate}
                        disabled={regenerating}
                        className="bg-[#FFFF00] text-black hover:brightness-110 text-xs gap-1"
                      >
                        {regenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Gerar com IA
                      </Button>
                    </div>
                  )}
                  {lpData && (
                    <>
                      {/* Regenerate button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={regenerate}
                        disabled={regenerating}
                        className="w-full text-xs border border-[#2a2a2e] hover:bg-[#2a2a2e] gap-1"
                      >
                        {regenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        )}
                        Regenerar tudo com IA
                      </Button>

                      {/* Theme colors */}
                      <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Tema Visual
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Cor primária</Label>
                            <input
                              type="color"
                              value={lpData.theme.primaryColor}
                              onChange={(e) => setLpData(prev => prev ? { ...prev, theme: { ...prev.theme, primaryColor: e.target.value } } : prev)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#2a2a2e]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Destaque</Label>
                            <input
                              type="color"
                              value={lpData.theme.accentColor}
                              onChange={(e) => setLpData(prev => prev ? { ...prev, theme: { ...prev.theme, accentColor: e.target.value } } : prev)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#2a2a2e]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Fundo</Label>
                            <input
                              type="color"
                              value={lpData.theme.bgColor}
                              onChange={(e) => setLpData(prev => prev ? { ...prev, theme: { ...prev.theme, bgColor: e.target.value } } : prev)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#2a2a2e]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sections */}
                      {SECTIONS.map((s) => (
                        <SectionPanel
                          key={s.key}
                          section={s}
                          data={lpData}
                          onUpdate={setLpData}
                        />
                      ))}

                      {/* Floating button text */}
                      <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Botão Flutuante (Mobile)
                        </p>
                        <Input
                          value={lpData.floatingButtonText}
                          onChange={(e) => setLpData(prev => prev ? { ...prev, floatingButtonText: e.target.value } : prev)}
                          className="bg-[#0f0f12] border-[#2a2a2e] text-sm h-8"
                        />
                      </div>

                      {/* Footer disclaimer */}
                      <div className="border border-[#2a2a2e] rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Footer
                        </p>
                        <Textarea
                          value={lpData.footer.disclaimer}
                          onChange={(e) => setLpData(prev => prev ? { ...prev, footer: { ...prev.footer, disclaimer: e.target.value } } : prev)}
                          rows={2}
                          className="bg-[#0f0f12] border-[#2a2a2e] text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Chat tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="py-6 text-center space-y-3">
                      <Sparkles className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm font-medium text-foreground">Chat com IA</p>
                      <p className="text-xs text-muted-foreground">
                        Descreva as alterações que deseja fazer na landing page.
                      </p>
                      <div className="flex flex-col gap-2 mt-4">
                        {[
                          "Deixe o hero mais sofisticado",
                          "Reescreva o CTA para ser mais urgente",
                          "Mude o foco para família com filhos",
                          "Adapte a linguagem para investidores",
                          "Deixe os textos mais curtos",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setChatInput(suggestion)}
                            className="text-xs text-left px-3 py-2 rounded-lg bg-[#2a2a2e] hover:bg-[#3a3a3e] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-3 py-2 text-xs",
                          msg.role === "user"
                            ? "bg-primary text-black font-medium"
                            : "bg-[#2a2a2e] text-foreground"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#2a2a2e] rounded-xl px-3 py-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat input */}
              <div className="p-3 border-t border-[#2a2a2e]">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="Ex: Deixe o hero mais sofisticado..."
                    className="bg-[#0f0f12] border-[#2a2a2e] text-xs h-8 flex-1"
                    disabled={chatLoading || !lpData}
                  />
                  <Button
                    size="sm"
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim() || !lpData}
                    className="bg-primary text-black hover:brightness-110 h-8 w-8 p-0 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {!hasAiData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gere a landing page primeiro para usar o chat.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT PANEL: PREVIEW ── */}
        {showPreview && (
          <div className="flex-1 bg-[#0f0f12] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2e] bg-[#1a1a1e]">
              <p className="text-xs text-muted-foreground">Preview da Landing Page</p>
              {publicUrl && (
                <button
                  onClick={() => window.open(publicUrl, "_blank")}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir em nova aba
                </button>
              )}
            </div>
            {lpData ? (
              <LandingPagePreview data={lpData} project={project} broker={broker} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline preview component ─────────────────────────────────────────────────
function LandingPagePreview({
  data,
  project,
  broker,
}: {
  data: LandingPageData;
  project: Project;
  broker: BrokerInfo | null;
}) {
  const { theme } = data;
  const isRenting = project.status === "renting";

  return (
    <ScrollArea className="flex-1 h-full">
      <div
        style={{
          fontFamily: `'${theme.fontFamily}', sans-serif`,
          backgroundColor: theme.bgColor,
          color: theme.textColor,
          fontSize: "12px",
        }}
      >
        {/* Hero */}
        <div
          className="relative py-16 px-6 text-center"
          style={{
            backgroundImage: project.main_image_url ? `url(${project.main_image_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)" }}
          />
          <div className="relative z-10 space-y-3">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: theme.primaryColor, color: "#000" }}
            >
              {data.hero.badge}
            </span>
            <h1 className="text-xl font-extrabold text-white leading-tight">
              {data.hero.title}
            </h1>
            <p className="text-xs text-white/80">{data.hero.subtitle}</p>
            <button
              className="px-5 py-2 rounded-lg text-xs font-bold"
              style={{ backgroundColor: theme.primaryColor, color: "#000" }}
            >
              {data.hero.ctaText}
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="py-8 px-6" style={{ backgroundColor: `${theme.bgColor}dd` }}>
          <h2 className="font-bold mb-2" style={{ color: theme.accentColor }}>
            {data.location.title}
          </h2>
          <p className="text-xs opacity-80 mb-4">{data.location.description}</p>
          <div className="grid grid-cols-2 gap-2">
            {data.location.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span style={{ color: theme.primaryColor }}>✓</span> {h}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        {data.features.length > 0 && (
          <div className="py-8 px-6">
            <h2 className="font-bold text-center mb-4">Diferenciais</h2>
            <div className="grid grid-cols-3 gap-2">
              {data.features.map((f, i) => (
                <div
                  key={i}
                  className="text-center p-3 rounded-xl border"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  <div className="text-lg mb-1">{f.icon}</div>
                  <div className="text-xs opacity-60">{f.label}</div>
                  <div className="text-sm font-bold" style={{ color: theme.accentColor }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div
          className="py-8 px-6 text-center"
          style={{ background: `linear-gradient(135deg, ${theme.bgColor}, color-mix(in srgb, ${theme.primaryColor} 10%, ${theme.bgColor}))` }}
        >
          <h2 className="font-extrabold mb-2">{data.cta.title}</h2>
          <p className="text-xs opacity-70 mb-3">{data.cta.subtitle}</p>
          <button
            className="px-6 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: theme.primaryColor, color: "#000" }}
          >
            {data.cta.buttonText}
          </button>
        </div>

        {/* Form preview */}
        <div className="py-8 px-6" style={{ backgroundColor: `${theme.bgColor}ee` }}>
          <h2 className="font-bold text-center mb-1">{data.form.title}</h2>
          <p className="text-xs text-center opacity-70 mb-4">{data.form.subtitle}</p>
          <div className="space-y-2 max-w-sm mx-auto">
            {["Nome *", "WhatsApp *", "E-mail (opcional)"].map((p) => (
              <div
                key={p}
                className="px-3 py-2 rounded-lg border text-xs opacity-40"
                style={{ borderColor: `${theme.primaryColor}60` }}
              >
                {p}
              </div>
            ))}
            <button
              className="w-full py-2 rounded-lg text-xs font-bold"
              style={{ backgroundColor: theme.primaryColor, color: "#000" }}
            >
              {data.form.buttonText}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 px-6 text-center border-t opacity-40 text-xs"
          style={{ borderColor: `${theme.primaryColor}20` }}>
          {data.footer.disclaimer}
        </div>
      </div>
    </ScrollArea>
  );
}
