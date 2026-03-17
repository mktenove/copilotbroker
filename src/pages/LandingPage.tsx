import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Project, LandingPageData, LandingPageTheme } from "@/types/project";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
const { RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Check, MapPin, MessageSquare, Zap, X: XIcon } = LucideIcons as any;
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Curated theme presets ────────────────────────────────────────────────────
export const LANDING_THEMES: Record<string, Partial<LandingPageTheme>> = {
  "luxury-gold":          { primaryColor: "#c8a96e", accentColor: "#e8d48a", bgColor: "#0d0b08", textColor: "#f5ede0", buttonTextColor: "#000" },
  "luxury-copper":        { primaryColor: "#c17f4a", accentColor: "#d9a070", bgColor: "#0f0d0a", textColor: "#f5ebe0", buttonTextColor: "#000" },
  "prestige-white":       { primaryColor: "#e8e4dc", accentColor: "#ffffff", bgColor: "#0f0f12", textColor: "#ffffff", buttonTextColor: "#000" },
  "corporate-navy":       { primaryColor: "#60a5fa", accentColor: "#93c5fd", bgColor: "#0a0f1a", textColor: "#f0f4ff", buttonTextColor: "#000" },
  "premium-terracotta":   { primaryColor: "#c86b48", accentColor: "#d9876a", bgColor: "#0f0c0a", textColor: "#f5ede8", buttonTextColor: "#000" },
  "prestige-emerald":     { primaryColor: "#4ade80", accentColor: "#86efac", bgColor: "#0a0f0c", textColor: "#f0fdf4", buttonTextColor: "#000" },
  "editorial-slate":      { primaryColor: "#94a3b8", accentColor: "#cbd5e1", bgColor: "#0c0e12", textColor: "#f1f5f9", buttonTextColor: "#000" },
  "bold-yellow":          { primaryColor: "#facc15", accentColor: "#fde68a", bgColor: "#0f0f0a", textColor: "#fefce8", buttonTextColor: "#000" },
  "deep-ocean":           { primaryColor: "#22d3ee", accentColor: "#67e8f9", bgColor: "#020b14", textColor: "#ecfeff", buttonTextColor: "#000" },
  "crimson-night":        { primaryColor: "#f43f5e", accentColor: "#fb7185", bgColor: "#0a0205", textColor: "#fff1f2", buttonTextColor: "#fff" },
  "violet-dark":          { primaryColor: "#a78bfa", accentColor: "#c4b5fd", bgColor: "#07050f", textColor: "#f5f3ff", buttonTextColor: "#000" },
  "pure-light":           { primaryColor: "#111827", accentColor: "#1e40af", bgColor: "#ffffff", textColor: "#111827", buttonTextColor: "#fff", altBgColor: "#f1f5f9" },
  "warm-paper":           { primaryColor: "#92400e", accentColor: "#b45309", bgColor: "#fffbf5", textColor: "#1c0f06", buttonTextColor: "#fff", altBgColor: "#f5ede0" },
  "fresh-sage":           { primaryColor: "#15803d", accentColor: "#16a34a", bgColor: "#f8fffe", textColor: "#052e16", buttonTextColor: "#fff", altBgColor: "#dcfce7" },
  "modern-slate":         { primaryColor: "#1e293b", accentColor: "#334155", bgColor: "#f8fafc", textColor: "#0f172a", buttonTextColor: "#fff", altBgColor: "#e2e8f0" },
  "azure-clean":          { primaryColor: "#1d4ed8", accentColor: "#3b82f6", bgColor: "#f0f6ff", textColor: "#0f1e40", buttonTextColor: "#fff", altBgColor: "#dbeafe" },
  "coral-energy":         { primaryColor: "#ea580c", accentColor: "#f97316", bgColor: "#fff8f5", textColor: "#431407", buttonTextColor: "#fff", altBgColor: "#ffedd5" },
  "rose-luxury":          { primaryColor: "#be185d", accentColor: "#db2777", bgColor: "#fff5f8", textColor: "#3b0a1f", buttonTextColor: "#fff", altBgColor: "#fce7f3" },
  "forest-premium":       { primaryColor: "#14532d", accentColor: "#166534", bgColor: "#f0fdf4", textColor: "#052e16", buttonTextColor: "#fff", altBgColor: "#dcfce7" },
};

export function resolveTheme(raw: LandingPageTheme): LandingPageTheme {
  const preset = raw.preset ? (LANDING_THEMES[raw.preset] ?? {}) : {};
  return { ...raw, ...preset, fontFamily: raw.fontFamily, heroStyle: raw.heroStyle };
}

// ─── DynamicIcon ──────────────────────────────────────────────────────────────
export function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  if (!name) return null;
  const Icon = (LucideIcons as Record<string, unknown>)[name] as LucideIcon | undefined;
  if (Icon) return <Icon className={className} style={style} />;
  return null;
}

// ─── FadeUp ───────────────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out will-change-transform", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── GalleryCarousel ──────────────────────────────────────────────────────────
function GalleryCarousel({ images, primary, btnTxt }: { images: string[]; primary: string; btnTxt: string }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = (idx: number) => {
    const next = Math.max(0, Math.min(images.length - 1, idx));
    setCurrent(next);
    if (trackRef.current) {
      const slides = trackRef.current.querySelectorAll<HTMLElement>("[data-slide]");
      slides[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    }
  };

  if (images.length === 0) return null;

  return (
    <div>
      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {images.map((img, i) => (
          <div
            key={i}
            data-slide=""
            className="flex-shrink-0 rounded-2xl overflow-hidden cursor-zoom-in group"
            style={{ scrollSnapAlign: "start", width: "min(88vw, 760px)", aspectRatio: "16/9" }}
            onClick={() => setLightbox(i)}
          >
            <img
              src={img}
              alt={`Foto ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      {images.length > 1 && (
        <div className="flex items-center justify-between mt-5 pr-6 sm:pr-8">
          <div className="flex gap-2 items-center">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all duration-300"
                style={{ height: 5, width: i === current ? 28 : 8, backgroundColor: i === current ? primary : `${primary}40` }}
              />
            ))}
            <span className="ml-3 text-xs opacity-30 font-medium">{current + 1} / {images.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-110 disabled:opacity-25"
              style={{ backgroundColor: `${primary}15`, border: `1px solid ${primary}30`, color: primary }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => goTo(current + 1)}
              disabled={current === images.length - 1}
              className="w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-110 disabled:opacity-25"
              style={{ backgroundColor: primary, color: btnTxt }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img
            src={images[lightbox]}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
            <XIcon className="w-5 h-5" />
          </button>
          {lightbox > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }} className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {lightbox < images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }} className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm opacity-40 text-white">
            {lightbox + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-5 h-px" style={{ backgroundColor: color }} />
      <span className="text-[11px] uppercase tracking-[0.18em] font-bold opacity-50">{children}</span>
    </div>
  );
}


// ─── VideoSection ─────────────────────────────────────────────────────────────
function VideoSection({ url, bg, primary, text }: { url: string; bg: string; primary: string; text: string }) {
  const embedUrl = (() => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
    if (url.includes("youtube.com/embed/")) return url;
    const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?rel=0`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}?dnt=1`;
    return null; // direct file
  })();

  return (
    <section className="py-20 sm:py-28 px-6 sm:px-10" style={{ backgroundColor: bg }}>
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px" style={{ backgroundColor: primary }} />
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold opacity-50">Vídeo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-10" style={{ color: text }}>
            Conheça em detalhes
          </h2>
        </FadeUp>
        <FadeUp delay={100}>
          {embedUrl ? (
            <div
              className="relative rounded-3xl overflow-hidden border"
              style={{ aspectRatio: "16/9", borderColor: `${primary}20` }}
            >
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Vídeo do empreendimento"
              />
            </div>
          ) : (
            <video
              src={url}
              controls
              playsInline
              className="w-full rounded-3xl"
              style={{ border: `1px solid ${primary}20` }}
            />
          )}
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BrokerInfo {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
}

type ProjectRecord = Partial<Project> & {
  id: string;
  name: string;
  slug: string;
  city: string;
  city_slug: string | null;
  status: string;
  is_active: boolean;
  tenant_id: string | null;
  webhook_url: string | null;
  landing_page_status?: 'draft' | 'published' | null;
  landing_page_data?: LandingPageData | null;
};

function getFontStyle(font: string) {
  const clean = font?.replace(/\s/g, "+") || "Inter";
  return `https://fonts.googleapis.com/css2?family=${clean}:wght@300;400;500;600;700;800;900&display=swap`;
}

// ─── Default landing page ─────────────────────────────────────────────────────
export function buildDefault(project: Project): LandingPageData {
  const isRenting = project.status === "renting";
  return {
    theme: { primaryColor: "#FFFF00", accentColor: "#facc15", bgColor: "#0f0f12", textColor: "#ffffff", fontFamily: "Inter", heroStyle: "dark-overlay" },
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
      ...(project.bedrooms ? [{ icon: "BedDouble", label: "Dormitórios", value: `${project.bedrooms}` }] : []),
      ...(project.suites ? [{ icon: "Bath", label: "Suítes", value: `${project.suites}` }] : []),
      ...(project.parking_spots ? [{ icon: "Car", label: "Garagem", value: `${project.parking_spots} vagas` }] : []),
      ...(project.area_m2 ? [{ icon: "Maximize2", label: "Área", value: `${project.area_m2}m²` }] : []),
      { icon: "MapPin", label: "Cidade", value: project.city },
    ].slice(0, 6),
    audience: [
      { title: "Quem busca praticidade", description: "Imóvel com localização e estrutura ideais para o dia a dia" },
      { title: "Famílias em crescimento", description: "Espaço e segurança para viver bem" },
      { title: "Investidores inteligentes", description: "Valorização garantida na melhor região" },
      { title: "Quem quer conforto", description: "Acabamento e infraestrutura de alto padrão" },
    ],
    urgency: { type: "opportunity", title: "Aproveite esta oportunidade", description: "Entre em contato agora e garanta as melhores condições disponíveis.", highlight: "Disponibilidade limitada" },
    benefits: [
      { icon: "FileText", title: "Informações completas", description: "Receba todos os detalhes do imóvel" },
      { icon: "CalendarCheck", title: "Agende uma visita", description: "Conheça o imóvel pessoalmente" },
      { icon: "MessageCircle", title: "Atendimento direto", description: "Fale diretamente com o corretor" },
      { icon: "Shield", title: "Sem compromisso", description: "Consulte sem nenhuma obrigação" },
    ],
    cta: { title: "Dê o próximo passo", subtitle: isRenting ? "Agende uma visita e descubra seu próximo lar." : "Entre em contato e receba todas as informações.", buttonText: isRenting ? "Quero agendar" : "Tenho interesse" },
    form: { title: isRenting ? "Agende uma visita" : "Tenho interesse", subtitle: "Preencha seus dados e entraremos em contato.", buttonText: "Enviar", thankYouTitle: "Recebemos seu contato!", thankYouMessage: "Em breve um de nossos corretores entrará em contato. Fique de olho no WhatsApp!" },
    floatingButtonText: isRenting ? "Agendar visita" : "Quero mais informações",
    footer: { disclaimer: "Imagens meramente ilustrativas. Material de divulgação em conformidade com a legislação vigente." },
  };
}

// ─── LandingPageRenderer ──────────────────────────────────────────────────────
export interface LandingPageRendererProps {
  lp: LandingPageData;
  project: Project;
  broker: { id: string; name: string; slug: string; whatsapp?: string | null } | null;
  isPreview?: boolean;
  onDeleteItem?: (arrayPath: string, index: number) => void;
}

export function LandingPageRenderer({ lp, project, broker, isPreview, onDeleteItem }: LandingPageRendererProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Per-element style override helper (used in editor mode)
  const es = (path: string, baseStyle?: React.CSSProperties): React.CSSProperties => {
    const override = (lp as any).elementStyles?.[path];
    if (!override) return baseStyle ?? {};
    let bgStyle: React.CSSProperties = {};
    if (override.backgroundTransparent) {
      bgStyle = { background: 'transparent' };
    } else if (override.background) {
      // Combine hex color + backgroundOpacity into rgba so only the bg is transparent
      const hex = override.background as string;
      const alpha = override.backgroundOpacity ?? 1;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      bgStyle = { background: `rgba(${r},${g},${b},${alpha})` };
    }
    const strokeStyle: React.CSSProperties = override.strokeWidth > 0
      ? { border: `${override.strokeWidth}px solid ${override.strokeColor || '#000000'}` }
      : {};
    return {
      ...(baseStyle ?? {}),
      ...(override.color ? { color: override.color } : {}),
      ...(override.fontSize ? { fontSize: `${override.fontSize}em` } : {}),
      ...bgStyle,
      ...strokeStyle,
    };
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) { toast.info("Formulário desativado no preview."); return; }
    if (!name.trim() || !whatsapp.trim()) { toast.error("Nome e WhatsApp são obrigatórios."); return; }
    if (!project || !broker) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: name.trim(), whatsapp: whatsapp.trim(), email: email.trim() || null,
        broker_id: broker.id, project_id: project.id,
        source: "landing_page", lead_origin: "landing_page",
        lead_origin_detail: `${window.location.origin}${window.location.pathname}`,
        status: "new", tenant_id: project.tenant_id,
      });
      if (error) throw error;
      if (project.webhook_url) {
        try {
          await fetch(project.webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), whatsapp: whatsapp.trim(), email: email.trim() || null, project: project.name, broker: broker.name, source: "landing_page" }) });
        } catch { /* Non-fatal */ }
      }
      setSubmitted(true);
    } catch (err) {
      toast.error("Erro ao enviar cadastro: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const theme = resolveTheme(lp.theme);
  const fontUrl = getFontStyle(theme.fontFamily);
  const primary = theme.primaryColor;
  const accent = theme.accentColor;
  const bg = theme.bgColor;
  const text = theme.textColor;
  const btnTxt = theme.buttonTextColor ?? "#000";
  const sectionAlt = theme.altBgColor ?? `color-mix(in srgb, ${bg} 88%, white 12%)`;
  const isLight = theme.heroStyle === "light-overlay";

  // ── Image pool — gallery first, fallback to project.scraped_images ─────────
  const imgs: string[] = (() => {
    const pool = [...(lp.gallery ?? []), ...(project.scraped_images ?? [])];
    // deduplicate preserving order
    const seen = new Set<string>();
    return pool.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
  })();

  const heroBgImg = lp.hero.bgImage || imgs[0] || project.main_image_url || "";
  const heroText = heroBgImg ? (isLight ? text : "#fff") : text;
  const heroSub = heroBgImg ? (isLight ? `${text}bb` : "rgba(255,255,255,0.78)") : `${text}aa`;
  const stripImgs = imgs.slice(1, 4);          // up to 3 for photo strip
  const showcaseImg = imgs[4] ?? null;         // full-width mid-page showcase
  const gridImgs = imgs.slice(5, 13);          // up to 8 for photo grid
  const carouselImgs = imgs.length > 0 ? imgs : [];  // all images for carousel

  // Returns the lp.gallery index for a given URL (used to build data-lp-path for image editing)
  const imgEditPath = (url: string): string | undefined => {
    const idx = (lp.gallery ?? []).indexOf(url);
    return idx >= 0 ? `gallery.${idx}` : undefined;
  };

  const mapEl = project.map_embed_url ? (
    <section className="lp-section-alt py-16 px-6 sm:px-10">
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-4 h-4" style={{ color: primary }} />
            <span className="text-sm font-semibold opacity-50 uppercase tracking-widest">Localização no mapa</span>
          </div>
        </FadeUp>
        <FadeUp delay={80}>
          <div className="rounded-3xl overflow-hidden border lp-divider">
            <iframe
              src={project.map_embed_url}
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização do empreendimento"
            />
          </div>
        </FadeUp>
      </div>
    </section>
  ) : null;

  const videoEl = project.video_url ? (
    <VideoSection url={project.video_url} bg={bg} primary={primary} text={text} />
  ) : null;

  const DEFAULT_SECTION_ORDER = [
    'photostrip', 'features', 'location', 'showcase', 'photogrid',
    'carousel', 'map', 'audience', 'video', 'urgency', 'benefits', 'cta', 'form',
  ];
  const sectionOrder: string[] = (lp as any).sectionOrder || DEFAULT_SECTION_ORDER;

  return (
    <>
      <link rel="stylesheet" href={fontUrl} />
      <style>{`
        .lp-root { font-family: '${theme.fontFamily}', sans-serif; background-color: ${bg}; color: ${text}; }
        .lp-btn { background-color: ${primary}; color: ${btnTxt}; font-weight: 700; transition: all 0.2s; }
        .lp-btn:hover { filter: brightness(1.08); transform: scale(1.025); }
        .lp-btn:active { transform: scale(0.97); }
        .lp-pulse { animation: lp-pulse 2.4s ease-in-out infinite; }
        @keyframes lp-pulse { 0%,100%{ box-shadow:0 0 0 0 ${primary}55; } 50%{ box-shadow:0 0 0 14px ${primary}00; } }
        .lp-section-alt { background-color: ${sectionAlt}; }
        .lp-divider { border-color: ${primary}18; }
        input::placeholder { opacity: 0.4; }
        input:focus { outline: none; border-color: ${primary}80 !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="lp-root min-h-screen pb-20 md:pb-0 overflow-x-hidden">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        {lp.heroLayout === 'split' ? (
          /* ── HERO: SPLIT ──────────────────────────────────────────────── */
          <section
            className="relative min-h-screen flex flex-col md:flex-row overflow-hidden"
            data-lp-path={isPreview ? "hero.bgImage" : undefined}
            data-lp-type={isPreview ? "image" : undefined}
          >
            {/* Left: image panel */}
            <div
              className="w-full md:w-1/2 min-h-[45vh] md:min-h-screen relative shrink-0"
              style={{
                backgroundImage: heroBgImg ? `url(${heroBgImg})` : `linear-gradient(135deg, ${primary}22 0%, ${primary}44 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: heroBgImg ? undefined : bg,
              }}
            >
              {/* subtle fade on right edge for blending */}
              <div className="absolute inset-0" style={{
                background: isLight
                  ? 'linear-gradient(to right, transparent 60%, rgba(255,255,255,0.18) 100%)'
                  : 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.18) 100%)',
              }} />
            </div>

            {/* Right: text panel */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center px-8 sm:px-12 md:px-16 py-16 md:py-24"
              style={{ backgroundColor: bg }}
            >
              <FadeUp>
                <span
                  data-lp-path="hero.badge"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] mb-8 border w-fit"
                  style={es('hero.badge', { color: primary, borderColor: `${primary}50`, background: `${primary}12` })}
                >
                  <Zap className="w-3 h-3" />
                  {lp.hero.badge}
                </span>
              </FadeUp>
              <FadeUp delay={110}>
                <h1
                  data-lp-path="hero.title"
                  className="text-[2.2rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[4.2rem] font-black leading-[0.9] tracking-tight mb-6 max-w-xl"
                  style={es('hero.title', { color: text })}
                >
                  {lp.hero.titleHighlight ? (() => {
                    const idx = lp.hero.title.indexOf(lp.hero.titleHighlight);
                    if (idx === -1) return <>{lp.hero.title}{" "}<span style={{ color: primary }}>{lp.hero.titleHighlight}</span></>;
                    return (
                      <>
                        <span style={{ color: text }}>{lp.hero.title.slice(0, idx)}</span>
                        <span style={{ color: primary }}>{lp.hero.titleHighlight}</span>
                        <span style={{ color: text }}>{lp.hero.title.slice(idx + lp.hero.titleHighlight.length)}</span>
                      </>
                    );
                  })() : lp.hero.title}
                </h1>
              </FadeUp>
              <FadeUp delay={220}>
                <p data-lp-path="hero.subtitle" className="text-base md:text-lg max-w-lg mb-10 leading-relaxed" style={es('hero.subtitle', { color: `${text}99` })}>
                  {lp.hero.subtitle}
                </p>
              </FadeUp>
              <FadeUp delay={330}>
                <button
                  data-lp-path="hero.ctaText"
                  onClick={scrollToForm}
                  className="lp-btn lp-pulse inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-bold shadow-2xl w-fit"
                  style={es('hero.ctaText')}
                >
                  {lp.hero.ctaText}
                  <span className="opacity-60">→</span>
                </button>
              </FadeUp>
            </div>
          </section>
        ) : lp.heroLayout === 'minimal' ? (
          /* ── HERO: MINIMAL ────────────────────────────────────────────── */
          <section className="relative min-h-[80vh] flex flex-col justify-center overflow-hidden py-24 px-6 sm:px-10" style={{ backgroundColor: bg }}>
            {/* Decorative accent block */}
            <div className="absolute top-0 right-0 w-1/3 h-full pointer-events-none" style={{
              background: `linear-gradient(135deg, transparent 0%, ${primary}08 100%)`,
            }} />
            <div className="absolute top-16 left-0 w-2 h-32" style={{ backgroundColor: primary }} />

            <div className="relative z-10 max-w-6xl mx-auto w-full">
              <FadeUp>
                <span
                  data-lp-path="hero.badge"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] mb-10 border"
                  style={es('hero.badge', { color: primary, borderColor: `${primary}50`, background: `${primary}12` })}
                >
                  <Zap className="w-3 h-3" />
                  {lp.hero.badge}
                </span>
              </FadeUp>
              <FadeUp delay={80}>
                <h1
                  data-lp-path="hero.title"
                  className="text-[3rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7rem] font-black leading-[0.88] tracking-tight mb-8 max-w-5xl"
                  style={es('hero.title', { color: text })}
                >
                  {lp.hero.titleHighlight ? (() => {
                    const idx = lp.hero.title.indexOf(lp.hero.titleHighlight);
                    if (idx === -1) return <>{lp.hero.title}{" "}<span style={{ color: primary }}>{lp.hero.titleHighlight}</span></>;
                    return (
                      <>
                        <span style={{ color: text }}>{lp.hero.title.slice(0, idx)}</span>
                        <span style={{ color: primary }}>{lp.hero.titleHighlight}</span>
                        <span style={{ color: text }}>{lp.hero.title.slice(idx + lp.hero.titleHighlight.length)}</span>
                      </>
                    );
                  })() : lp.hero.title}
                </h1>
              </FadeUp>
              <FadeUp delay={180}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 max-w-4xl">
                  <p data-lp-path="hero.subtitle" className="text-base md:text-xl leading-relaxed flex-1" style={es('hero.subtitle', { color: `${text}80` })}>
                    {lp.hero.subtitle}
                  </p>
                  <button
                    data-lp-path="hero.ctaText"
                    onClick={scrollToForm}
                    className="lp-btn lp-pulse inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-bold shadow-xl shrink-0"
                    style={es('hero.ctaText')}
                  >
                    {lp.hero.ctaText}
                    <span className="opacity-60">→</span>
                  </button>
                </div>
              </FadeUp>
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-7 right-8 hidden md:flex items-center gap-2" style={{ color: `${text}40` }}>
              <span className="text-[10px] uppercase tracking-widest font-semibold">scroll</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          </section>
        ) : (
          /* ── HERO: FULLSCREEN (default) ───────────────────────────────── */
          <section
            className="relative min-h-screen flex flex-col justify-end overflow-hidden"
            data-lp-path={isPreview ? "hero.bgImage" : undefined}
            data-lp-type={isPreview ? "image" : undefined}
            style={{
              backgroundImage: heroBgImg ? `url(${heroBgImg})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: heroBgImg ? undefined : bg,
            }}
          >
            {/* Overlay */}
            <div className="absolute inset-0" style={{
              background: isLight
                ? heroBgImg
                  ? "linear-gradient(to top, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.65) 45%, rgba(255,255,255,0.05) 100%)"
                  : `linear-gradient(135deg, ${bg} 0%, ${primary}15 100%)`
                : heroBgImg
                  ? "linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.48) 55%, rgba(0,0,0,0.05) 100%)"
                  : `linear-gradient(135deg, ${bg} 0%, ${primary}18 100%)`,
            }} />

            {/* Content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 pb-16 md:pb-24 pt-28">
              <FadeUp>
                <span
                  data-lp-path="hero.badge"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] mb-7 border"
                  style={es('hero.badge', { color: primary, borderColor: `${primary}50`, background: `${primary}12` })}
                >
                  <Zap className="w-3 h-3" />
                  {lp.hero.badge}
                </span>
              </FadeUp>

              <FadeUp delay={110}>
                <h1
                  data-lp-path="hero.title"
                  className="text-[2.8rem] sm:text-[3.8rem] md:text-[5rem] lg:text-[5.8rem] font-black leading-[0.88] tracking-tight mb-7 max-w-5xl"
                  style={es('hero.title', { color: heroText })}
                >
                  {lp.hero.titleHighlight ? (() => {
                    const idx = lp.hero.title.indexOf(lp.hero.titleHighlight);
                    if (idx === -1) return (
                      <>{lp.hero.title}{" "}<span style={{ color: primary }}>{lp.hero.titleHighlight}</span></>
                    );
                    return (
                      <>
                        <span style={{ color: heroText }}>{lp.hero.title.slice(0, idx)}</span>
                        <span style={{ color: primary }}>{lp.hero.titleHighlight}</span>
                        <span style={{ color: heroText }}>{lp.hero.title.slice(idx + lp.hero.titleHighlight.length)}</span>
                      </>
                    );
                  })() : lp.hero.title}
                </h1>
              </FadeUp>

              <FadeUp delay={220}>
                <p data-lp-path="hero.subtitle" className="text-base sm:text-lg md:text-xl max-w-2xl mb-10 leading-relaxed" style={es('hero.subtitle', { color: heroSub })}>
                  {lp.hero.subtitle}
                </p>
              </FadeUp>

              <FadeUp delay={330}>
                <button
                  data-lp-path="hero.ctaText"
                  onClick={scrollToForm}
                  className="lp-btn lp-pulse inline-flex items-center gap-3 px-8 py-4 rounded-full text-base sm:text-lg font-bold shadow-2xl"
                  style={es('hero.ctaText')}
                >
                  {lp.hero.ctaText}
                  <span className="opacity-60">→</span>
                </button>
              </FadeUp>
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-7 right-8 hidden md:flex items-center gap-2" style={{ color: heroBgImg ? (isLight ? `${text}60` : "rgba(255,255,255,0.35)") : `${text}40` }}>
              <span className="text-[10px] uppercase tracking-widest font-semibold">scroll</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          </section>
        )}

        {/* ── POST-HERO SECTIONS (ordered) ──────────────────────────────── */}
        {sectionOrder.map((key) => {
          switch (key) {

            case 'photostrip':
              return stripImgs.length > 0 ? (
                <div key="photostrip" className="flex overflow-hidden" style={{ height: "clamp(180px, 30vw, 380px)" }}>
                  {stripImgs.map((img, i) => (
                    <div key={i} className="flex-1 overflow-hidden relative">
                      <img
                        src={img}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        data-lp-path={isPreview ? imgEditPath(img) : undefined}
                        data-lp-type={isPreview && imgEditPath(img) ? "image" : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : null;

            case 'features':
              return lp.features.length > 0 ? (
                lp.featuresLayout === 'grid' ? (
                  /* GRID layout */
                  <section key="features" className="py-16 sm:py-20 px-6 sm:px-10" style={{ backgroundColor: bg }}>
                    <div className="max-w-6xl mx-auto">
                      <FadeUp>
                        <SectionLabel color={primary}>Especificações</SectionLabel>
                      </FadeUp>
                      <div className={`grid gap-4 mt-6 ${lp.features.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : lp.features.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                        {lp.features.map((f, i) => (
                          <FadeUp key={i} delay={i * 55}>
                            <div
                              className="relative flex flex-col gap-3 p-6 rounded-2xl group/feat"
                              style={{ background: `${primary}07`, border: `1px solid ${primary}18` }}
                            >
                              {isPreview && onDeleteItem && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteItem('features', i); }}
                                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/feat:opacity-100 transition-opacity z-10"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              )}
                              <DynamicIcon name={f.icon} className="w-6 h-6" style={{ color: primary }} />
                              <div data-lp-path={`features.${i}.value`} className="text-2xl sm:text-3xl font-black" style={es(`features.${i}.value`, { color: primary })}>{f.value}</div>
                              <div data-lp-path={`features.${i}.label`} className="text-[11px] uppercase tracking-widest opacity-50 font-semibold" style={es(`features.${i}.label`)}>{f.label}</div>
                            </div>
                          </FadeUp>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : (
                  /* STRIP layout (default) */
                  <section key="features" style={{ borderTop: `1px solid ${primary}18`, borderBottom: `1px solid ${primary}18`, backgroundColor: bg }}>
                    <div className="max-w-6xl mx-auto overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
                      <div
                        className="flex md:grid"
                        style={{ gridTemplateColumns: `repeat(${Math.min(lp.features.length, 6)}, 1fr)`, minWidth: "fit-content" }}
                      >
                        {lp.features.map((f, i) => (
                          <FadeUp key={i} delay={i * 55}>
                            <div
                              className="relative flex flex-col items-center text-center px-8 py-8 gap-3 min-w-[140px] group/feat"
                              style={{ borderRight: i < lp.features.length - 1 ? `1px solid ${primary}12` : undefined }}
                            >
                              {isPreview && onDeleteItem && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteItem('features', i); }}
                                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/feat:opacity-100 transition-opacity z-10"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              )}
                              <DynamicIcon name={f.icon} className="w-5 h-5 opacity-50" style={{ color: primary }} />
                              <div data-lp-path={`features.${i}.value`} className="text-2xl sm:text-3xl font-black" style={es(`features.${i}.value`, { color: primary })}>{f.value}</div>
                              <div data-lp-path={`features.${i}.label`} className="text-[10px] uppercase tracking-widest opacity-40 font-semibold leading-tight" style={es(`features.${i}.label`)}>{f.label}</div>
                            </div>
                          </FadeUp>
                        ))}
                      </div>
                    </div>
                  </section>
                )
              ) : null;

            case 'location':
              return (
                <section key="location" className="lp-section-alt py-20 sm:py-28 px-6 sm:px-10">
                  <div className="max-w-6xl mx-auto">
                    <FadeUp>
                      <SectionLabel color={primary}>Localização</SectionLabel>
                      <h2 data-lp-path="location.title" className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-6" style={es('location.title', { color: text })}>
                        {lp.location.title}
                      </h2>
                      <p data-lp-path="location.description" className="text-base md:text-lg leading-relaxed mb-6" style={es('location.description', { color: `${text}88` })}>
                        {lp.location.description}
                      </p>
                    </FadeUp>

                    <div className="grid grid-cols-2 gap-3 md:pt-8">
                      {lp.location.highlights.map((h, i) => (
                        <FadeUp key={i} delay={i * 80 + 100}>
                          <div
                            className="relative flex items-start gap-3 p-4 rounded-2xl h-full transition-transform hover:scale-[1.02] group/loc"
                            style={{ background: `${primary}08`, border: `1px solid ${primary}18` }}
                          >
                            {isPreview && onDeleteItem && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem('location.highlights', i); }}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/loc:opacity-100 transition-opacity z-10"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            )}
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ backgroundColor: primary }}
                            >
                              <Check className="w-3.5 h-3.5" style={{ color: btnTxt }} />
                            </div>
                            <span data-lp-path={`location.highlights.${i}`} className="text-sm font-medium leading-snug" style={es(`location.highlights.${i}`)}>{h}</span>
                          </div>
                        </FadeUp>
                      ))}
                    </div>
                  </div>
                </section>
              );

            case 'showcase':
              return showcaseImg ? (
                <section key="showcase" className="relative w-full overflow-hidden" style={{ height: "clamp(260px, 45vw, 600px)" }}>
                  <img
                    src={showcaseImg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    data-lp-path={isPreview ? imgEditPath(showcaseImg) : undefined}
                    data-lp-type={isPreview && imgEditPath(showcaseImg) ? "image" : undefined}
                  />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 50%, ${bg}cc 100%)` }} />
                </section>
              ) : null;

            case 'photogrid':
              return gridImgs.length > 0 ? (
                <section key="photogrid" className="py-16 sm:py-20" style={{ backgroundColor: bg }}>
                  <FadeUp>
                    <div className="max-w-6xl mx-auto px-6 sm:px-10 mb-8">
                      <SectionLabel color={primary}>Fotos do imóvel</SectionLabel>
                      <h2 className="text-3xl sm:text-4xl font-black">Veja cada detalhe</h2>
                    </div>
                  </FadeUp>
                  <div className="max-w-6xl mx-auto px-6 sm:px-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {gridImgs.map((img, i) => (
                      <FadeUp key={i} delay={i * 40}>
                        <div className="aspect-square rounded-xl overflow-hidden">
                          <img
                            src={img}
                            alt={`Foto ${i + 6}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            data-lp-path={isPreview ? imgEditPath(img) : undefined}
                            data-lp-type={isPreview && imgEditPath(img) ? "image" : undefined}
                          />
                        </div>
                      </FadeUp>
                    ))}
                  </div>
                </section>
              ) : null;

            case 'carousel':
              return carouselImgs.length > 0 ? (
                <section key="carousel" className="py-16 sm:py-24 overflow-hidden" style={{ backgroundColor: bg }}>
                  <FadeUp>
                    <div className="max-w-6xl mx-auto px-6 sm:px-10 mb-10 flex items-end justify-between">
                      <div>
                        <SectionLabel color={primary}>Galeria completa</SectionLabel>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">Todas as fotos</h2>
                      </div>
                      <span className="text-sm opacity-30 font-medium hidden md:block shrink-0 ml-4">
                        {carouselImgs.length} {carouselImgs.length === 1 ? "foto" : "fotos"}
                      </span>
                    </div>
                  </FadeUp>
                  <div className="pl-6 sm:pl-10 md:pl-[max(2.5rem,calc((100vw-72rem)/2+2.5rem))]">
                    <GalleryCarousel images={carouselImgs} primary={primary} btnTxt={btnTxt} />
                  </div>
                </section>
              ) : null;

            case 'map':
              return mapEl ? <React.Fragment key="map">{mapEl}</React.Fragment> : null;

            case 'audience':
              return lp.audience?.length > 0 ? (
                <section key="audience" className="py-20 sm:py-28 px-6 sm:px-10" style={{ backgroundColor: bg }}>
                  <div className="max-w-6xl mx-auto">
                    <FadeUp>
                      <SectionLabel color={primary}>Para quem é</SectionLabel>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-12 max-w-xl">
                        Esse imóvel foi feito pra você se...
                      </h2>
                    </FadeUp>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lp.audience.map((a, i) => (
                        <FadeUp key={i} delay={i * 80}>
                          <div
                            className="relative flex items-start gap-5 p-6 rounded-2xl overflow-hidden transition hover:scale-[1.015] group/aud"
                            style={{ background: `${primary}07`, border: `1px solid ${primary}15` }}
                          >
                            {/* Big faded number decoration */}
                            <div
                              className="absolute top-2 right-4 text-7xl font-black opacity-[0.05] pointer-events-none select-none leading-none"
                              style={{ color: primary }}
                            >
                              0{i + 1}
                            </div>
                            {isPreview && onDeleteItem && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem('audience', i); }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/aud:opacity-100 transition-opacity z-10"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            )}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                              style={{ backgroundColor: primary, color: btnTxt }}
                            >
                              {i + 1}
                            </div>
                            <div>
                              <h3 data-lp-path={`audience.${i}.title`} className="font-bold text-base mb-1.5" style={es(`audience.${i}.title`)}>{a.title}</h3>
                              <p data-lp-path={`audience.${i}.description`} className="text-sm leading-relaxed" style={es(`audience.${i}.description`, { color: `${text}70` })}>{a.description}</p>
                            </div>
                          </div>
                        </FadeUp>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null;

            case 'video':
              return videoEl ? <React.Fragment key="video">{videoEl}</React.Fragment> : null;

            case 'urgency':
              return lp.urgency ? (
                <section
                  key="urgency"
                  className="py-24 sm:py-32 px-6 sm:px-10 text-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
                >
                  {/* Decorative large text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="text-[16rem] font-black opacity-[0.04] leading-none whitespace-nowrap" style={{ color: btnTxt }}>
                      {lp.urgency.highlight}
                    </span>
                  </div>
                  <div className="relative z-10 max-w-3xl mx-auto space-y-7">
                    <FadeUp>
                      <span
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest"
                        style={{ background: "rgba(0,0,0,0.18)", color: btnTxt, border: "1px solid rgba(255,255,255,0.18)" }}
                      >
                        <Zap className="w-3 h-3" />
                        {lp.urgency.type === "urgency" ? "Atenção" : lp.urgency.type === "availability" ? "Disponibilidade" : "Oportunidade"}
                      </span>
                    </FadeUp>
                    <FadeUp delay={100}>
                      <h2 data-lp-path="urgency.title" className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight" style={es('urgency.title', { color: btnTxt })}>
                        {lp.urgency.title}
                      </h2>
                    </FadeUp>
                    <FadeUp delay={180}>
                      <p data-lp-path="urgency.description" className="text-base md:text-lg leading-relaxed" style={es('urgency.description', { color: `${btnTxt}cc` })}>
                        {lp.urgency.description}
                      </p>
                    </FadeUp>
                    <FadeUp delay={260}>
                      <div
                        data-lp-path="urgency.highlight"
                        className="inline-block px-10 py-4 rounded-2xl text-xl font-black"
                        style={es('urgency.highlight', { background: "rgba(0,0,0,0.2)", color: btnTxt, border: "1px solid rgba(255,255,255,0.2)" })}
                      >
                        {lp.urgency.highlight}
                      </div>
                    </FadeUp>
                    <FadeUp delay={340}>
                      <button
                        onClick={scrollToForm}
                        className="inline-flex items-center gap-3 px-9 py-4 rounded-full text-base font-bold transition hover:scale-105 active:scale-95"
                        style={{ background: "rgba(0,0,0,0.22)", color: btnTxt, border: "1px solid rgba(255,255,255,0.28)" }}
                      >
                        {lp.cta.buttonText} →
                      </button>
                    </FadeUp>
                  </div>
                </section>
              ) : null;

            case 'benefits':
              return lp.benefits?.length > 0 ? (
                <section key="benefits" className="lp-section-alt py-20 sm:py-28 px-6 sm:px-10">
                  <div className="max-w-6xl mx-auto">
                    <FadeUp>
                      <SectionLabel color={primary}>Vantagens</SectionLabel>
                      <h2 className="text-3xl sm:text-4xl font-black mb-14">Ao se cadastrar, você recebe:</h2>
                    </FadeUp>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                      {lp.benefits.map((b, i) => (
                        <FadeUp key={i} delay={i * 75}>
                          <div className="relative space-y-4 group/ben">
                            {isPreview && onDeleteItem && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem('benefits', i); }}
                                className="absolute top-0 right-0 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/ben:opacity-100 transition-opacity z-10"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            )}
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center"
                              style={{ background: `${primary}10`, border: `1px solid ${primary}22` }}
                            >
                              <DynamicIcon name={b.icon} className="w-6 h-6" style={{ color: primary }} />
                            </div>
                            <div>
                              <h3 data-lp-path={`benefits.${i}.title`} className="font-bold text-base mb-1.5" style={es(`benefits.${i}.title`)}>{b.title}</h3>
                              <p data-lp-path={`benefits.${i}.description`} className="text-sm leading-relaxed" style={es(`benefits.${i}.description`, { color: `${text}70` })}>{b.description}</p>
                            </div>
                          </div>
                        </FadeUp>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null;

            case 'cta':
              return (
                <section key="cta" className="py-24 sm:py-32 px-6 sm:px-10 text-center" style={{ backgroundColor: bg }}>
                  <div className="max-w-3xl mx-auto space-y-7">
                    <FadeUp>
                      <h2 data-lp-path="cta.title" className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight" style={es('cta.title')}>{lp.cta.title}</h2>
                    </FadeUp>
                    <FadeUp delay={100}>
                      <p data-lp-path="cta.subtitle" className="text-base md:text-xl leading-relaxed max-w-xl mx-auto" style={es('cta.subtitle', { color: `${text}80` })}>
                        {lp.cta.subtitle}
                      </p>
                    </FadeUp>
                    <FadeUp delay={200}>
                      <button
                        data-lp-path="cta.buttonText"
                        onClick={scrollToForm}
                        className="lp-btn lp-pulse inline-flex items-center gap-3 px-10 py-5 rounded-full text-base sm:text-lg font-bold shadow-2xl"
                        style={es('cta.buttonText')}
                      >
                        {lp.cta.buttonText} →
                      </button>
                    </FadeUp>
                  </div>
                </section>
              );

            case 'form':
              return (
                <section key="form" ref={formRef} className="lp-section-alt py-20 sm:py-28 px-6 sm:px-10" id="form">
                  <div className="max-w-lg mx-auto">
                    <div
                      className="rounded-3xl p-8 sm:p-10 shadow-2xl"
                      style={{ backgroundColor: bg, border: `1px solid ${primary}18` }}
                    >
                      {submitted ? (
                        <div className="text-center space-y-5 py-6">
                          <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                            style={{ backgroundColor: primary }}
                          >
                            <Check className="w-10 h-10" style={{ color: btnTxt }} />
                          </div>
                          <h3 className="text-2xl font-black">{lp.form.thankYouTitle}</h3>
                          <p className="text-sm leading-relaxed" style={{ color: `${text}80` }}>{lp.form.thankYouMessage}</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-center mb-9">
                            <h2 data-lp-path="form.title" className="text-2xl sm:text-3xl font-black mb-2" style={es('form.title')}>{lp.form.title}</h2>
                            <p data-lp-path="form.subtitle" className="text-sm" style={es('form.subtitle', { color: `${text}60` })}>{lp.form.subtitle}</p>
                          </div>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-widest font-semibold opacity-50">Nome *</Label>
                              <Input
                                value={name} onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome completo" required
                                className="h-12 rounded-xl text-base bg-transparent border-2"
                                style={{ borderColor: `${primary}35`, color: text }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-widest font-semibold opacity-50">WhatsApp *</Label>
                              <Input
                                value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="(51) 99999-9999" required
                                className="h-12 rounded-xl text-base bg-transparent border-2"
                                style={{ borderColor: `${primary}35`, color: text }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-widest font-semibold opacity-50">
                                E-mail <span className="opacity-50 normal-case tracking-normal">(opcional)</span>
                              </Label>
                              <Input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="h-12 rounded-xl text-base bg-transparent border-2"
                                style={{ borderColor: `${primary}25`, color: text }}
                              />
                            </div>
                            <button
                              type="submit" disabled={submitting}
                              className="lp-btn w-full h-14 rounded-xl text-base font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                              {lp.form.buttonText}
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              );

            default:
              return null;
          }
        })}

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer className="py-10 px-6 sm:px-10 text-center border-t lp-divider" style={{ backgroundColor: bg }}>
          <p className="text-xs opacity-35 max-w-lg mx-auto leading-relaxed">{lp.footer.disclaimer}</p>
          {broker && (
            <p className="text-xs opacity-25 mt-3">
              Apresentado por <strong>{broker.name}</strong> — {project.name} · {project.city}
            </p>
          )}
        </footer>

        {/* ── FLOATING BUTTON (mobile) ───────────────────────────────────── */}
        {!submitted && (
          <div className="fixed bottom-4 inset-x-4 flex justify-center z-50 md:hidden">
            <button
              onClick={scrollToForm}
              className="lp-btn lp-pulse flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold shadow-2xl text-sm max-w-xs w-full justify-center"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {lp.floatingButtonText}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main page (fetches data, then delegates to LandingPageRenderer) ──────────
export default function LandingPage() {
  const { citySlug, projectSlug, brokerSlug } = useParams<{
    citySlug: string;
    projectSlug: string;
    brokerSlug: string;
  }>();

  const [project, setProject] = useState<Project | null>(null);
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [lp, setLp] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!citySlug || !projectSlug || !brokerSlug) { setNotFound(true); setLoading(false); return; }
    loadPage();
  }, [citySlug, projectSlug, brokerSlug]);

  const loadPage = async () => {
    try {
      const { data: brokerData } = await supabase.from("brokers").select("id, name, slug, whatsapp").eq("slug", brokerSlug).maybeSingle();
      if (!brokerData) { setNotFound(true); return; }
      setBroker(brokerData);

      const { data: projectData } = await supabase.from("projects").select("*").eq("slug", projectSlug).eq("city_slug", citySlug).eq("is_active", true).maybeSingle();
      const typedProject = projectData as ProjectRecord | null;
      if (!typedProject) { setNotFound(true); return; }
      if (typedProject.landing_page_status && typedProject.landing_page_status !== 'published') { setNotFound(true); return; }

      const { data: bpCheck } = await supabase.from("broker_projects").select("id").eq("broker_id", brokerData.id).eq("project_id", typedProject.id).eq("is_active", true).maybeSingle();
      if (!bpCheck) { setNotFound(true); return; }

      const normalizedProject = typedProject as Project;
      setProject(normalizedProject);
      setLp(typedProject.landing_page_data || buildDefault(normalizedProject));
    } catch (err) {
      console.error("LandingPage load error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
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

  return <LandingPageRenderer lp={lp} project={project} broker={broker} />;
}
