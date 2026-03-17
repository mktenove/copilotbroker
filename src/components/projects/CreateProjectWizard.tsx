import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ProjectStatus,
  PropertyType,
  PROJECT_STATUS_CONFIG,
  PROPERTY_TYPE_CONFIG,
} from "@/types/project";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RefreshCw,
  X,
  Plus,
  Globe,
  Link2,
  CheckCircle,
  MapPin,
  Home,
  ImageIcon,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

interface WizardFormData {
  name: string;
  slug: string;
  city: string;
  city_slug: string;
  status: ProjectStatus;
  property_type: PropertyType | "";
  address: string;
  bedrooms: string;
  suites: string;
  parking_spots: string;
  area_m2: string;
  price_range: string;
  ideal_buyer: string;
  differentials: string;
  amenity_input: string;
  amenities: string[];
  main_image_url: string;
  video_url: string;
  map_embed_url: string;
  description: string;
  webhook_url: string;
  _scraped_images: string[];
  _source_url: string;
  _uploaded_videos: string[];
}

const initialForm: WizardFormData = {
  name: "",
  slug: "",
  city: "",
  city_slug: "",
  status: "pre_launch",
  property_type: "",
  address: "",
  bedrooms: "",
  suites: "",
  parking_spots: "",
  area_m2: "",
  price_range: "",
  ideal_buyer: "",
  differentials: "",
  amenity_input: "",
  amenities: [],
  main_image_url: "",
  video_url: "",
  map_embed_url: "",
  description: "",
  webhook_url: "",
  _scraped_images: [],
  _source_url: "",
  _uploaded_videos: [],
};

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  brokerId?: string | null;
  onCreated?: (projectId: string) => void;
  onCreatedSimple?: (projectId: string) => void;
  navigateToEditor?: boolean;
}

const MANUAL_STEPS = [
  { id: 1, label: "Informações Básicas" },
  { id: 2, label: "Detalhes do Imóvel" },
  { id: 3, label: "Mídias e Configurações" },
];

const IMPORT_PROGRESS = ["Dados", "Conteúdo", "Config", "IA + Preview"];

export function CreateProjectWizard({
  open,
  onOpenChange,
  tenantId,
  brokerId,
  onCreated,
  onCreatedSimple,
  navigateToEditor = true,
}: CreateProjectWizardProps) {
  const navigate = useNavigate();

  type WizardMode = "choose" | "import" | "review" | "content" | "manual";
  const [mode, setMode] = useState<WizardMode>("choose");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(-1);
  const [importRequestDone, setImportRequestDone] = useState(false);
  const [imgFailCount, setImgFailCount] = useState(0);
  const importTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const importResultRef = useRef<any>(null);
  const importErrorRef = useRef<string | null>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormData>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Temp ID for pre-creation uploads
  const [tempId] = useState(() => crypto.randomUUID());
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => importTimers.current.forEach(clearTimeout), []);

  // Transition to review only after animation AND request are both complete
  useEffect(() => {
    if (!importing || importStep < 3 || !importRequestDone) return;
    const timer = setTimeout(() => {
      if (importErrorRef.current) {
        toast.error("Erro ao importar: " + importErrorRef.current);
      } else if (importResultRef.current) {
        const s = importResultRef.current;
        setImgFailCount(0);
        setForm((prev) => ({
          ...prev,
          name: s.name || prev.name,
          slug: s.name ? toSlug(s.name) : prev.slug,
          city: s.city || prev.city,
          city_slug: s.city ? toSlug(s.city) : prev.city_slug,
          description: (s.description && s.description.length > 60 ? s.description : null)
            || (s.page_content && s.page_content.length > 120 ? s.page_content.slice(0, 400) : null)
            || prev.description,
          bedrooms: s.bedrooms != null ? String(s.bedrooms) : prev.bedrooms,
          suites: s.suites != null ? String(s.suites) : prev.suites,
          parking_spots: s.parking_spots != null ? String(s.parking_spots) : prev.parking_spots,
          area_m2: s.area_m2 != null ? String(s.area_m2) : prev.area_m2,
          price_range: s.price_range || prev.price_range,
          amenities: s.amenities?.length ? s.amenities : prev.amenities,
          address: s.address || prev.address,
          main_image_url: s.main_image_url || prev.main_image_url,
          map_embed_url: s.map_embed_url || prev.map_embed_url,
          _scraped_images: s.images || [],
          _source_url: s._sourceUrl || prev._source_url,
        }));
        setMode("review");
      }
      importResultRef.current = null;
      importErrorRef.current = null;
      setImportRequestDone(false);
      setImporting(false);
      setImportStep(-1);
    }, 500);
    return () => clearTimeout(timer);
  }, [importing, importStep, importRequestDone]);

  const set = (field: keyof WizardFormData, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    importTimers.current.forEach(clearTimeout);
    importResultRef.current = null;
    importErrorRef.current = null;
    setImportRequestDone(false);
    setImporting(false);
    setImportStep(-1);
    setImgFailCount(0);
    setMode("choose");
    setImportUrl("");
    setStep(1);
    setForm(initialForm);
    onOpenChange(false);
  };

  const handleImport = async () => {
    const url = importUrl.trim();
    if (!url.startsWith("http")) {
      toast.error("Digite uma URL válida começando com https://");
      return;
    }
    setImporting(true);
    setImportStep(0);
    setImportRequestDone(false);
    importResultRef.current = null;
    importErrorRef.current = null;
    importTimers.current.forEach(clearTimeout);
    importTimers.current = [
      setTimeout(() => setImportStep(1), 1500),
      setTimeout(() => setImportStep(2), 3000),
      setTimeout(() => setImportStep(3), 4500),
    ];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("scrape-property", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { url },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      importResultRef.current = { ...res.data.data, _sourceUrl: url };
    } catch (err) {
      importErrorRef.current = err instanceof Error ? err.message : String(err);
    } finally {
      setImportRequestDone(true);
    }
  };

  const addAmenity = () => {
    const val = form.amenity_input.trim();
    if (!val || form.amenities.includes(val)) return;
    setForm((prev) => ({ ...prev, amenities: [...prev.amenities, val], amenity_input: "" }));
  };

  const removeAmenity = (a: string) =>
    setForm((prev) => ({ ...prev, amenities: prev.amenities.filter((x) => x !== a) }));

  const step1Valid =
    form.name.trim() && form.slug.trim() && form.city.trim() && form.city_slug.trim();

  const textBlockCount = form.description
    ? Math.max(
        form.description.split(/\n\n+/).filter((p) => p.trim().length > 20).length,
        Math.ceil(form.description.length / 400)
      )
    : 0;

  const handleSubmit = async (withAI: boolean) => {
    if (!step1Valid) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const projectPayload = {
        name: form.name.trim(),
        slug: form.slug,
        city: form.city.trim(),
        city_slug: form.city_slug,
        status: form.status,
        property_type: form.property_type || null,
        address: form.address.trim() || null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        suites: form.suites ? parseInt(form.suites) : null,
        parking_spots: form.parking_spots ? parseInt(form.parking_spots) : null,
        area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
        price_range: form.price_range.trim() || null,
        ideal_buyer: form.ideal_buyer.trim() || null,
        differentials: form.differentials.trim() || null,
        amenities: form.amenities.length ? form.amenities : null,
        main_image_url: form.main_image_url.trim() || null,
        video_url: form.video_url.trim() || null,
        map_embed_url: form.map_embed_url.trim() || null,
        description: form.description.trim() || null,
        webhook_url: form.webhook_url.trim() || null,
        tenant_id: tenantId ?? null,
        scraped_images: form._scraped_images.length ? form._scraped_images : null,
      };

      const createRes = await supabase.functions.invoke("create-broker-project", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: projectPayload,
      });

      if (createRes.error || createRes.data?.error) {
        throw new Error(createRes.data?.error || createRes.error?.message || "Erro ao criar projeto");
      }

      const projectId: string = createRes.data.project?.id || createRes.data.project_id || createRes.data.id;

      if (!withAI) {
        toast.success("Empreendimento criado com sucesso!");
        handleClose();
        onCreatedSimple?.(projectId);
        return;
      }

      setIsGenerating(true);
      toast.info("Gerando landing page com IA...");

      const genRes = await supabase.functions.invoke("generate-landing-page", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { project: { ...projectPayload, id: projectId, scraped_images: form._scraped_images } },
      });

      if (genRes.error || genRes.data?.error) {
        toast.warning("Projeto criado, mas houve erro ao gerar a landing page. Você pode gerá-la depois.");
      } else {
        toast.success("Landing page gerada com sucesso!");
      }

      handleClose();
      onCreated?.(projectId);

      if (navigateToEditor) {
        navigate(`/corretor/empreendimentos/${projectId}/editor`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsSaving(false);
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] max-w-2xl max-h-[90vh] overflow-y-auto p-0">

        {/* ── CHOOSE ── */}
        {mode === "choose" && (
          <div className="p-8 space-y-7">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Assistente de Criação
              </div>
              <h2 className="text-2xl font-bold text-foreground">Como deseja criar seu imóvel?</h2>
              <p className="text-sm text-muted-foreground">Escolha a forma mais prática para você. A IA cuida do resto.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode("import")}
                className="group flex flex-col items-start p-6 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground mb-2">Importar de um Link</p>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Cole o link de um anúncio e a IA captura automaticamente fotos, dados e informações para criar uma landing page de alta conversão.
                </p>
                <span className="text-xs text-primary font-semibold">Começar →</span>
              </button>

              <button
                onClick={() => setMode("manual")}
                className="group flex flex-col items-start p-6 rounded-xl border border-[#2a2a2e] hover:border-[#3a3a3e] hover:bg-[#2a2a2e] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2a2a2e] flex items-center justify-center mb-4 group-hover:bg-[#3a3a3e]">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground mb-2">Adicionar Imóvel ou Empreendimento</p>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Preencha os dados manualmente, envie fotos e vídeos, e a IA gera a landing page a partir do conteúdo fornecido.
                </p>
                <span className="text-xs text-muted-foreground font-semibold group-hover:text-foreground">Começar →</span>
              </button>
            </div>
          </div>
        )}

        {/* ── IMPORT: URL input + loading animation ── */}
        {mode === "import" && (
          <div className="p-8">
            {importing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-3 w-full max-w-xs">
                  {["Lendo link...", "Extraindo informações...", "Organizando fotos...", "Montando apresentação..."].map((label, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 transition-all duration-300",
                        importStep >= i ? "opacity-100" : "opacity-30"
                      )}
                    >
                      {importStep > i ? (
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      ) : importStep === i ? (
                        <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#3a3a3e] shrink-0" />
                      )}
                      <span className={cn("text-sm", importStep >= i ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-6 py-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Cole o link do anúncio</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    A IA vai capturar automaticamente fotos, dados e informações disponíveis na página para criar uma landing page de alta conversão.
                  </p>
                </div>
                <div className="w-full max-w-md space-y-1.5">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleImport()}
                      placeholder="https://www.exemplo.com/imovel/..."
                      className="bg-[#141417] border-[#2a2a2e] pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Funciona com sites de imobiliárias, portais de imóveis, OLX, Viva Real, ZAP e outros.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode("choose")}
                    className="border-[#2a2a2e] hover:bg-[#2a2a2e] gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!importUrl.trim()}
                    className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40 gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" /> Analisar com IA
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEW: extracted content + photo grid ── */}
        {mode === "review" && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Conteúdo extraído!</h2>
              <p className="text-sm text-muted-foreground">Revise as informações, organize as fotos e continue.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Home className="w-3.5 h-3.5" /> Nome do Imóvel *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => { set("name", e.target.value); set("slug", toSlug(e.target.value)); }}
                  placeholder="Ex: Casa à venda em União"
                  className="bg-[#141417] border-[#2a2a2e] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5" /> Cidade *
                </Label>
                <Input
                  value={form.city}
                  onChange={(e) => { set("city", e.target.value); set("city_slug", toSlug(e.target.value)); }}
                  placeholder="Ex: Estância Velha"
                  className="bg-[#141417] border-[#2a2a2e] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#141417] rounded-lg p-3 text-center border border-[#2a2a2e]">
                <div className="text-2xl font-bold text-primary">{form._scraped_images.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Fotos</div>
              </div>
              <div className="bg-[#141417] rounded-lg p-3 text-center border border-[#2a2a2e]">
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Vídeos</div>
              </div>
              <div className="bg-[#141417] rounded-lg p-3 text-center border border-[#2a2a2e]">
                <div className="text-2xl font-bold text-foreground">{textBlockCount}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Blocos Texto</div>
              </div>
            </div>

            {form._scraped_images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fotos ({form._scraped_images.length}) — Clique para capa · X para remover
                  </p>
                  {imgFailCount > 0 && (
                    <span className="text-xs text-yellow-400">{imgFailCount} não carregaram</span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {form._scraped_images.map((img, i) => (
                    <div
                      key={i}
                      className={cn(
                        "relative rounded-lg overflow-hidden h-20 border-2 transition-all group",
                        form.main_image_url === img
                          ? "border-primary ring-1 ring-primary"
                          : "border-transparent hover:border-[#3a3a3e]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => set("main_image_url", img)}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover"
                          alt=""
                          onError={() => setImgFailCount((c) => c + 1)}
                        />
                      </button>
                      {form.main_image_url === img && (
                        <div className="absolute top-1 left-1 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                          CAPA
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((prev) => ({
                            ...prev,
                            _scraped_images: prev._scraped_images.filter((_, idx) => idx !== i),
                            main_image_url: prev.main_image_url === img ? "" : prev.main_image_url,
                          }));
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2e]">
              <Button
                variant="outline"
                onClick={() => setMode("import")}
                className="border-[#2a2a2e] hover:bg-[#2a2a2e] gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                onClick={() => {
                  if (!form.name.trim() || !form.city.trim()) {
                    toast.error("Preencha o nome e a cidade.");
                    return;
                  }
                  setForm((prev) => ({
                    ...prev,
                    slug: prev.slug || toSlug(prev.name),
                    city_slug: prev.city_slug || toSlug(prev.city),
                  }));
                  setMode("content");
                }}
                className="bg-[#FFFF00] text-black hover:brightness-110 gap-1"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── CONTENT: landing page textarea ── */}
        {mode === "content" && (
          <div>
            <div className="flex border-b border-[#2a2a2e]">
              {IMPORT_PROGRESS.map((label, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 py-3 text-xs text-center font-medium transition-colors",
                    i === 1
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Conteúdo da Landing Page</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cole aqui todas as informações do imóvel. A IA usará este conteúdo para criar a página.
                </p>
              </div>

              {!form.description && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-yellow-500/25 bg-yellow-500/8 text-xs text-yellow-400/90">
                  <span className="mt-0.5 shrink-0">⚡</span>
                  <span>O site não permitiu extração automática de texto (renderização por JavaScript). Cole abaixo a descrição do imóvel — quanto mais detalhes, melhor a landing page.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Conteúdo Completo do Imóvel</Label>
                <p className="text-xs text-muted-foreground/70">
                  Inclua: descrição, diferenciais, infraestrutura, tipologias, faixa de preço, público-alvo, argumentos de venda. Pode deixar vazio — a IA usará as fotos e dados estruturais.
                </p>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={11}
                  placeholder="Cole aqui a descrição do imóvel copiada do site..."
                  className="bg-[#141417] border-[#2a2a2e] text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2e]">
                <Button
                  variant="outline"
                  onClick={() => setMode("review")}
                  className="border-[#2a2a2e] hover:bg-[#2a2a2e] gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving || isGenerating}
                  className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40 gap-1.5"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGenerating ? "Gerando..." : "Próximo"}
                  {!isGenerating && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── MANUAL: traditional 3-step wizard ── */}
        {mode === "manual" && (
          <>
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Novo Empreendimento
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4 mt-4">
              <div className="flex items-center gap-2">
                {MANUAL_STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        step >= s.id ? "bg-primary text-black" : "bg-[#2a2a2e] text-muted-foreground"
                      )}
                    >
                      {s.id}
                    </div>
                    <span
                      className={cn(
                        "text-xs hidden sm:block",
                        step === s.id ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                    {i < MANUAL_STEPS.length - 1 && (
                      <div className={cn("h-px flex-1 w-4", step > s.id ? "bg-primary" : "bg-[#2a2a2e]")} />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label>Nome do Empreendimento *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => { set("name", e.target.value); set("slug", toSlug(e.target.value)); }}
                        placeholder="Ex: Residencial Alto da Serra"
                        className="bg-[#141417] border-[#2a2a2e]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Cidade *</Label>
                        <Input
                          value={form.city}
                          onChange={(e) => { set("city", e.target.value); set("city_slug", toSlug(e.target.value)); }}
                          placeholder="Porto Alegre"
                          className="bg-[#141417] border-[#2a2a2e]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Imóvel</Label>
                        <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
                          <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PROPERTY_TYPE_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
                          <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PROJECT_STATUS_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bairro / Endereço</Label>
                        <Input
                          value={form.address}
                          onChange={(e) => set("address", e.target.value)}
                          placeholder="Bairro Jardim Europa"
                          className="bg-[#141417] border-[#2a2a2e]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      URL: <span className="text-muted-foreground">/{form.city_slug || "cidade"}/{form.slug || "empreendimento"}/seu-slug</span>
                    </p>
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Dormitórios</Label>
                        <Input type="number" min="0" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} placeholder="3" className="bg-[#141417] border-[#2a2a2e]" />
                      </div>
                      <div className="space-y-2">
                        <Label>Suítes</Label>
                        <Input type="number" min="0" value={form.suites} onChange={(e) => set("suites", e.target.value)} placeholder="1" className="bg-[#141417] border-[#2a2a2e]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Vagas de Garagem</Label>
                        <Input type="number" min="0" value={form.parking_spots} onChange={(e) => set("parking_spots", e.target.value)} placeholder="2" className="bg-[#141417] border-[#2a2a2e]" />
                      </div>
                      <div className="space-y-2">
                        <Label>Metragem (m²)</Label>
                        <Input type="number" min="0" value={form.area_m2} onChange={(e) => set("area_m2", e.target.value)} placeholder="85" className="bg-[#141417] border-[#2a2a2e]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Faixa de Preço</Label>
                        <Input value={form.price_range} onChange={(e) => set("price_range", e.target.value)} placeholder="R$ 350.000 - R$ 480.000" className="bg-[#141417] border-[#2a2a2e]" />
                      </div>
                      <div className="space-y-2">
                        <Label>Perfil do Comprador Ideal</Label>
                        <Input value={form.ideal_buyer} onChange={(e) => set("ideal_buyer", e.target.value)} placeholder="Famílias, investidores..." className="bg-[#141417] border-[#2a2a2e]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Diferenciais Principais</Label>
                      <Textarea value={form.differentials} onChange={(e) => set("differentials", e.target.value)} placeholder="Vista panorâmica, acabamento premium..." rows={2} className="bg-[#141417] border-[#2a2a2e]" />
                    </div>
                    <div className="space-y-2">
                      <Label>Área de Lazer</Label>
                      <div className="flex gap-2">
                        <Input
                          value={form.amenity_input}
                          onChange={(e) => set("amenity_input", e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }}
                          placeholder="Ex: Piscina, Academia..."
                          className="bg-[#141417] border-[#2a2a2e]"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={addAmenity} className="border-[#2a2a2e] hover:bg-[#2a2a2e]">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {form.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {form.amenities.map((a) => (
                            <Badge key={a} variant="secondary" className="text-xs cursor-pointer bg-[#2a2a2e] hover:bg-destructive/20" onClick={() => removeAmenity(a)}>
                              {a} <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <>
                    {/* Image upload — multiple */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Imagens</Label>
                        {form._scraped_images.length > 0 && (
                          <span className="text-xs text-muted-foreground">{form._scraped_images.length} foto{form._scraped_images.length > 1 ? "s" : ""} · clique para definir capa</span>
                        )}
                      </div>
                      <input
                        ref={imageFileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          setImageUploading(true);
                          const newUrls: string[] = [];
                          try {
                            for (const file of files) {
                              const path = `projects/${tempId}/${Date.now()}-${file.name}`;
                              const { error } = await supabase.storage
                                .from("project-media")
                                .upload(path, file, { upsert: true });
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage
                                .from("project-media")
                                .getPublicUrl(path);
                              newUrls.push(publicUrl);
                            }
                            setForm((prev) => {
                              const all = [...prev._scraped_images, ...newUrls];
                              return {
                                ...prev,
                                _scraped_images: all,
                                main_image_url: prev.main_image_url || all[0] || "",
                              };
                            });
                            toast.success(`${newUrls.length} imagem${newUrls.length > 1 ? "ns" : ""} enviada${newUrls.length > 1 ? "s" : ""}!`);
                          } catch (err) {
                            toast.error("Erro no upload: " + (err instanceof Error ? err.message : String(err)));
                          } finally {
                            setImageUploading(false);
                            if (imageFileRef.current) imageFileRef.current.value = "";
                          }
                        }}
                      />

                      {form._scraped_images.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5">
                          {form._scraped_images.map((img, i) => (
                            <div
                              key={i}
                              className={cn(
                                "relative rounded-lg overflow-hidden h-20 border-2 transition-all group cursor-pointer",
                                form.main_image_url === img
                                  ? "border-primary ring-1 ring-primary"
                                  : "border-transparent hover:border-[#3a3a3e]"
                              )}
                              onClick={() => set("main_image_url", img)}
                            >
                              <img src={img} className="w-full h-full object-cover" alt="" />
                              {form.main_image_url === img && (
                                <div className="absolute top-1 left-1 bg-primary text-black text-[9px] font-bold px-1 py-0.5 rounded pointer-events-none">
                                  CAPA
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForm((prev) => {
                                    const imgs = prev._scraped_images.filter((_, idx) => idx !== i);
                                    return {
                                      ...prev,
                                      _scraped_images: imgs,
                                      main_image_url: prev.main_image_url === img ? (imgs[0] ?? "") : prev.main_image_url,
                                    };
                                  });
                                }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => imageFileRef.current?.click()}
                            disabled={imageUploading}
                            className="h-20 rounded-lg border-2 border-dashed border-[#2a2a2e] hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground disabled:opacity-50"
                          >
                            {imageUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            <span className="text-[10px]">{imageUploading ? "..." : "Mais"}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageFileRef.current?.click()}
                          disabled={imageUploading}
                          className="w-full h-28 rounded-lg border-2 border-dashed border-[#2a2a2e] hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50"
                        >
                          {imageUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                          <span className="text-xs">{imageUploading ? "Enviando..." : "Clique para enviar imagens"}</span>
                          <span className="text-[10px] text-muted-foreground/50">Selecione várias de uma vez</span>
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground/70">A imagem marcada como CAPA será usada no hero da landing page.</p>
                    </div>

                    {/* Video upload — multiple */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Vídeos (opcional)</Label>
                        {form._uploaded_videos.length > 0 && (
                          <span className="text-xs text-muted-foreground">{form._uploaded_videos.length} vídeo{form._uploaded_videos.length > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <input
                        ref={videoFileRef}
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          const oversized = files.filter((f) => f.size > 50 * 1024 * 1024);
                          if (oversized.length) {
                            toast.error(`${oversized.length} arquivo${oversized.length > 1 ? "s" : ""} excede${oversized.length > 1 ? "m" : ""} 50 MB`);
                            if (videoFileRef.current) videoFileRef.current.value = "";
                            return;
                          }
                          setVideoUploading(true);
                          const newUrls: string[] = [];
                          try {
                            for (const file of files) {
                              const ext = file.name.split(".").pop() || "mp4";
                              const path = `projects/${tempId}/${Date.now()}.${ext}`;
                              const { error } = await supabase.storage
                                .from("project-media")
                                .upload(path, file, { upsert: true });
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage
                                .from("project-media")
                                .getPublicUrl(path);
                              newUrls.push(publicUrl);
                            }
                            setForm((prev) => {
                              const all = [...prev._uploaded_videos, ...newUrls];
                              return { ...prev, _uploaded_videos: all, video_url: prev.video_url || all[0] || "" };
                            });
                            toast.success(`${newUrls.length} vídeo${newUrls.length > 1 ? "s" : ""} enviado${newUrls.length > 1 ? "s" : ""}!`);
                          } catch (err) {
                            toast.error("Erro no upload: " + (err instanceof Error ? err.message : String(err)));
                          } finally {
                            setVideoUploading(false);
                            if (videoFileRef.current) videoFileRef.current.value = "";
                          }
                        }}
                      />

                      {form._uploaded_videos.length > 0 ? (
                        <div className="space-y-2">
                          {form._uploaded_videos.map((url, i) => (
                            <div key={i} className="relative rounded-lg overflow-hidden bg-[#141417] border border-[#2a2a2e] p-2">
                              <video src={url} className="w-full max-h-28 rounded" controls />
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((prev) => {
                                    const vids = prev._uploaded_videos.filter((_, idx) => idx !== i);
                                    return { ...prev, _uploaded_videos: vids, video_url: vids[0] ?? "" };
                                  })
                                }
                                className="absolute top-3 right-3 p-1 rounded bg-black/60 hover:bg-red-600 text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => videoFileRef.current?.click()}
                            disabled={videoUploading}
                            className="w-full h-10 rounded-lg border border-dashed border-[#2a2a2e] hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground text-xs disabled:opacity-50"
                          >
                            {videoUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            {videoUploading ? "Enviando..." : "Adicionar mais vídeos"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => videoFileRef.current?.click()}
                          disabled={videoUploading}
                          className="w-full h-20 rounded-lg border-2 border-dashed border-[#2a2a2e] hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50"
                        >
                          {videoUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
                          <span className="text-xs">{videoUploading ? "Enviando..." : "Clique para enviar vídeos"}</span>
                          <span className="text-[10px] text-muted-foreground/50">Máx. 50 MB por arquivo</span>
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Embed do Mapa (opcional)</Label>
                      <Input value={form.map_embed_url} onChange={(e) => set("map_embed_url", e.target.value)} placeholder="URL do Google Maps embed..." className="bg-[#141417] border-[#2a2a2e]" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição Adicional</Label>
                      <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Informações complementares para a IA..." rows={2} className="bg-[#141417] border-[#2a2a2e]" />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook URL (opcional)</Label>
                      <Input type="url" value={form.webhook_url} onChange={(e) => set("webhook_url", e.target.value)} placeholder="https://webhook.example.com/..." className="bg-[#141417] border-[#2a2a2e]" />
                    </div>
                    <div className="bg-[#141417] border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">Geração com IA</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A IA irá criar toda a estrutura da landing page: hero, localização, diferenciais, público-alvo, CTA e formulário.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-2 pt-4 border-t border-[#2a2a2e]">
                <div>
                  {step > 1 ? (
                    <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={isSaving} className="hover:bg-[#2a2a2e]">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => setMode("choose")} disabled={isSaving} className="hover:bg-[#2a2a2e] text-muted-foreground">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Início
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving} className="hover:bg-[#2a2a2e]">
                    Cancelar
                  </Button>
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={() => setStep((s) => s + 1)}
                      disabled={step === 1 && !step1Valid}
                      className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40"
                    >
                      Próximo <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmit(false)}
                        disabled={isSaving || isGenerating}
                        className="border-[#2a2a2e] hover:bg-[#2a2a2e] text-sm"
                      >
                        {isSaving && !isGenerating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                        Salvar sem IA
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={isSaving || isGenerating}
                        className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40 text-sm"
                      >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {isGenerating ? "Gerando..." : "Gerar Landing Page com IA"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
