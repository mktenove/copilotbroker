import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Project, LandingPageData } from "@/types/project";
import { toast } from "sonner";
import { RefreshCw, ChevronDown, Check, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
  "🏠": "🏠", "🏢": "🏢", "🏊": "🏊", "🌳": "🌳", "🚗": "🚗", "🛡️": "🛡️",
  "📐": "📐", "🛏️": "🛏️", "🚿": "🚿", "🏋️": "🏋️", "🎾": "🎾", "🌆": "🌆",
  "💎": "💎", "🔑": "🔑", "📍": "📍", "💬": "💬", "📋": "📋", "⭐": "⭐",
  "🎯": "🎯", "🏆": "🏆", "✅": "✅", "📞": "📞",
};

interface BrokerInfo {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
}

interface ProjectWithLP extends Project {
  landing_page_data: LandingPageData | null;
}

function getFontStyle(font: string) {
  const clean = font?.replace(/\s/g, "+") || "Inter";
  return `https://fonts.googleapis.com/css2?family=${clean}:wght@400;500;600;700;800&display=swap`;
}

// ─── Default landing page (fallback when no AI data) ─────────────────────────
function buildDefault(project: Project): LandingPageData {
  const isRenting = project.status === "renting";
  return {
    theme: {
      primaryColor: "#FFFF00",
      accentColor: "#facc15",
      bgColor: "#0f0f12",
      textColor: "#ffffff",
      fontFamily: "Inter",
      heroStyle: "dark-overlay",
    },
    hero: {
      badge: isRenting ? "Disponível para Locação" : "Novo Empreendimento",
      title: project.hero_title || project.name,
      titleHighlight: "",
      subtitle: project.hero_subtitle || `${project.city} — ${project.description || ""}`,
      ctaText: isRenting ? "Quero agendar uma visita" : "Quero mais informações",
    },
    location: {
      title: `Localização estratégica em ${project.city}`,
      description: `${project.name} está localizado em uma região privilegiada de ${project.city}, com fácil acesso a todos os serviços essenciais.`,
      highlights: ["Fácil acesso", "Bem localizado", "Região valorizada", "Infraestrutura completa"],
    },
    features: [
      ...(project.bedrooms ? [{ icon: "🛏️", label: "Dormitórios", value: `${project.bedrooms}` }] : []),
      ...(project.suites ? [{ icon: "🚿", label: "Suítes", value: `${project.suites}` }] : []),
      ...(project.parking_spots ? [{ icon: "🚗", label: "Garagem", value: `${project.parking_spots} vagas` }] : []),
      ...(project.area_m2 ? [{ icon: "📐", label: "Área", value: `${project.area_m2}m²` }] : []),
      { icon: "📍", label: "Cidade", value: project.city },
      { icon: "⭐", label: "Status", value: isRenting ? "Para Locação" : "Disponível" },
    ].slice(0, 6),
    audience: [
      { title: "Quem busca praticidade", description: "Imóvel com localização e estrutura ideais para o dia a dia" },
      { title: "Famílias em crescimento", description: "Espaço e segurança para viver bem" },
      { title: "Investidores inteligentes", description: "Valorização garantida na melhor região" },
      { title: "Quem quer conforto", description: "Acabamento e infraestrutura de alto padrão" },
    ],
    urgency: {
      type: "opportunity",
      title: "Aproveite esta oportunidade",
      description: "Entre em contato agora e garanta as melhores condições disponíveis.",
      highlight: "Disponibilidade limitada",
    },
    benefits: [
      { icon: "📋", title: "Informações completas", description: "Receba todos os detalhes do imóvel" },
      { icon: "🎯", title: "Atendimento prioritário", description: "Fale diretamente com o corretor" },
      { icon: "📅", title: "Agende uma visita", description: "Conheça o imóvel pessoalmente" },
      { icon: "💬", title: "Tire suas dúvidas", description: "Estamos prontos para te atender" },
    ],
    cta: {
      title: "Dê o próximo passo",
      subtitle: isRenting
        ? "Agende uma visita e descubra seu próximo lar."
        : "Entre em contato e receba todas as informações.",
      buttonText: isRenting ? "Quero agendar" : "Tenho interesse",
    },
    form: {
      title: isRenting ? "Agende uma visita" : "Tenho interesse",
      subtitle: "Preencha seus dados e entraremos em contato.",
      buttonText: "Enviar",
      thankYouTitle: "Recebemos seu cadastro!",
      thankYouMessage: "Em breve um de nossos corretores entrará em contato com você. Fique de olho no WhatsApp!",
    },
    floatingButtonText: isRenting ? "Agendar visita" : "Quero mais informações",
    footer: {
      disclaimer: "Imagens meramente ilustrativas. Material de divulgação em conformidade com a legislação vigente.",
    },
  };
}

export default function LandingPage() {
  const { citySlug, projectSlug, brokerSlug } = useParams<{
    citySlug: string;
    projectSlug: string;
    brokerSlug: string;
  }>();

  const [project, setProject] = useState<ProjectWithLP | null>(null);
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [lp, setLp] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Lead form
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!citySlug || !projectSlug || !brokerSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadPage();
  }, [citySlug, projectSlug, brokerSlug]);

  const loadPage = async () => {
    try {
      // Load broker
      const { data: brokerData } = await supabase
        .from("brokers")
        .select("id, name, slug, whatsapp")
        .eq("slug", brokerSlug)
        .maybeSingle();

      if (!brokerData) {
        setNotFound(true);
        return;
      }
      setBroker(brokerData);

      // Load project via broker_projects
      const { data: bpData } = await supabase
        .from("broker_projects")
        .select("project_id")
        .eq("broker_id", brokerData.id)
        .eq("is_active", true)
        .maybeSingle();

      // Try matching by slugs
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", projectSlug)
        .eq("city_slug", citySlug)
        .eq("is_active", true)
        .maybeSingle();

      if (!projectData) {
        setNotFound(true);
        return;
      }

      // Verify broker has this project
      const { data: bpCheck } = await supabase
        .from("broker_projects")
        .select("id")
        .eq("broker_id", brokerData.id)
        .eq("project_id", projectData.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!bpCheck) {
        setNotFound(true);
        return;
      }

      setProject(projectData as ProjectWithLP);
      const lpData = (projectData.landing_page_data as LandingPageData) || buildDefault(projectData as Project);
      setLp(lpData);
    } catch (err) {
      console.error("LandingPage load error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }
    if (!project || !broker) return;

    setSubmitting(true);
    try {
      // Insert lead into CRM
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || null,
        broker_id: broker.id,
        project_id: project.id,
        source: "landing_page",
        lead_origin: "landing_page",
        lead_origin_detail: `${window.location.origin}${window.location.pathname}`,
        status: "new",
        tenant_id: project.tenant_id,
      });

      if (error) throw error;

      // Fire webhook if configured
      if (project.webhook_url) {
        try {
          await fetch(project.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              whatsapp: whatsapp.trim(),
              email: email.trim() || null,
              project: project.name,
              broker: broker.name,
              source: "landing_page",
            }),
          });
        } catch {
          // Non-fatal
        }
      }

      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao enviar cadastro: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (notFound || !lp || !project || !broker) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex flex-col items-center justify-center text-white gap-4">
        <span className="text-6xl">🏠</span>
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-gray-400">Este link pode ter expirado ou não existe.</p>
      </div>
    );
  }

  const theme = lp.theme;
  const fontUrl = getFontStyle(theme.fontFamily);

  return (
    <>
      <link rel="stylesheet" href={fontUrl} />
      <style>{`
        .lp-root { font-family: '${theme.fontFamily}', sans-serif; background-color: ${theme.bgColor}; color: ${theme.textColor}; }
        .lp-btn { background-color: ${theme.primaryColor}; color: #000; font-weight: 700; }
        .lp-btn:hover { filter: brightness(1.1); }
        .lp-accent { color: ${theme.accentColor}; }
        .lp-section-alt { background-color: color-mix(in srgb, ${theme.bgColor} 85%, white 15%); }
      `}</style>

      <div className="lp-root min-h-screen">
        {/* ─── HERO ─────────────────────────────────────────────────────── */}
        <section
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-4"
          style={{
            backgroundImage: (lp.hero.bgImage || project.main_image_url)
              ? `url(${lp.hero.bgImage || project.main_image_url})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                theme.heroStyle === "light-overlay"
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(0,0,0,0.65)",
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            {/* Badge */}
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold lp-btn"
            >
              {lp.hero.badge}
            </span>

            {/* Title */}
            <h1
              className="text-4xl md:text-6xl font-extrabold leading-tight"
              style={{ color: theme.heroStyle === "light-overlay" ? theme.bgColor : "#fff" }}
            >
              {lp.hero.titleHighlight ? (
                <>
                  {lp.hero.title.replace(lp.hero.titleHighlight, "")}{" "}
                  <span className="lp-accent">{lp.hero.titleHighlight}</span>
                </>
              ) : (
                lp.hero.title
              )}
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg md:text-xl max-w-xl mx-auto"
              style={{
                color: theme.heroStyle === "light-overlay" ? "#374151" : "rgba(255,255,255,0.85)",
              }}
            >
              {lp.hero.subtitle}
            </p>

            {/* CTA */}
            <button
              onClick={scrollToForm}
              className="lp-btn inline-block px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition-all hover:scale-105"
            >
              {lp.hero.ctaText}
            </button>
          </div>

          {/* Scroll indicator */}
          <button
            onClick={scrollToForm}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-70"
          >
            <ChevronDown
              className="w-8 h-8"
              style={{ color: theme.heroStyle === "light-overlay" ? theme.bgColor : "#fff" }}
            />
          </button>
        </section>

        {/* ─── LOCATION ─────────────────────────────────────────────────── */}
        <section className="lp-section-alt py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 lp-accent" />
              <h2 className="text-2xl md:text-3xl font-bold">{lp.location.title}</h2>
            </div>
            <p className="text-base md:text-lg opacity-80 mb-8 max-w-2xl">
              {lp.location.description}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {lp.location.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-xl border"
                  style={{ borderColor: `${theme.primaryColor}40` }}
                >
                  <Check className="w-5 h-5 lp-accent shrink-0" />
                  <span className="text-sm font-medium">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES / DIFERENCIAIS ──────────────────────────────────── */}
        {lp.features.length > 0 && (
          <section className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
                Diferenciais
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {lp.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center p-5 rounded-2xl border"
                    style={{ borderColor: `${theme.primaryColor}30` }}
                  >
                    <span className="text-3xl mb-3">{f.icon}</span>
                    <span className="text-xs uppercase tracking-wider opacity-60 mb-1">
                      {f.label}
                    </span>
                    <span className="text-lg font-bold lp-accent">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── AUDIENCE ─────────────────────────────────────────────────── */}
        <section className="lp-section-alt py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Para quem é
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lp.audience.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-2xl border"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ backgroundColor: theme.primaryColor, color: "#000" }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{a.title}</h3>
                    <p className="text-sm opacity-70">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── URGENCY ──────────────────────────────────────────────────── */}
        <section
          className="py-16 px-4 text-center"
          style={{
            background: `linear-gradient(135deg, ${theme.bgColor} 0%, color-mix(in srgb, ${theme.primaryColor} 15%, ${theme.bgColor} 85%) 100%)`,
          }}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-bold lp-btn"
            >
              {lp.urgency.highlight}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold">{lp.urgency.title}</h2>
            <p className="text-base md:text-lg opacity-80">{lp.urgency.description}</p>
            <button
              onClick={scrollToForm}
              className="lp-btn inline-block px-8 py-3 rounded-xl font-bold shadow-md transition hover:scale-105"
            >
              {lp.cta.buttonText}
            </button>
          </div>
        </section>

        {/* ─── BENEFITS ─────────────────────────────────────────────────── */}
        <section className="lp-section-alt py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Vantagens de se cadastrar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lp.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border"
                  style={{ borderColor: `${theme.primaryColor}30` }}>
                  <span className="text-3xl shrink-0">{b.icon}</span>
                  <div>
                    <h3 className="font-semibold mb-1">{b.title}</h3>
                    <p className="text-sm opacity-70">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ────────────────────────────────────────────────── */}
        <section className="py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold">{lp.cta.title}</h2>
            <p className="text-lg opacity-80">{lp.cta.subtitle}</p>
          </div>
        </section>

        {/* ─── FORM ─────────────────────────────────────────────────────── */}
        <section ref={formRef} className="lp-section-alt py-16 px-4" id="form">
          <div className="max-w-md mx-auto">
            {submitted ? (
              <div className="text-center space-y-4 py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Check className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold">{lp.form.thankYouTitle}</h3>
                <p className="opacity-80">{lp.form.thankYouMessage}</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{lp.form.title}</h2>
                  <p className="opacity-70">{lp.form.subtitle}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="opacity-80">Nome *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      className="bg-transparent border-2"
                      style={{ borderColor: `${theme.primaryColor}60` }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="opacity-80">WhatsApp *</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(51) 99999-9999"
                      required
                      className="bg-transparent border-2"
                      style={{ borderColor: `${theme.primaryColor}60` }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="opacity-80">E-mail (opcional)</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-transparent border-2"
                      style={{ borderColor: `${theme.primaryColor}60` }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="lp-btn w-full py-4 rounded-xl text-lg font-bold transition hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : null}
                    {lp.form.buttonText}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>

        {/* ─── FOOTER ───────────────────────────────────────────────────── */}
        <footer className="py-8 px-4 text-center border-t" style={{ borderColor: `${theme.primaryColor}20` }}>
          <p className="text-xs opacity-40 max-w-lg mx-auto">{lp.footer.disclaimer}</p>
          <p className="text-xs opacity-30 mt-2">
            Apresentado por {broker.name} — {project.name}
          </p>
        </footer>

        {/* ─── FLOATING BUTTON (mobile) ──────────────────────────────────── */}
        {!submitted && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 md:hidden px-4">
            <button
              onClick={scrollToForm}
              className="lp-btn px-6 py-3 rounded-full font-bold shadow-xl text-sm flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {lp.floatingButtonText}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
