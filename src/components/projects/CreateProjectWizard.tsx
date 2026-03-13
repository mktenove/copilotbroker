import { useState } from "react";
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
  // Step 1 — Basic Info
  name: string;
  slug: string;
  city: string;
  city_slug: string;
  status: ProjectStatus;
  property_type: PropertyType | "";
  address: string;
  // Step 2 — Property Details
  bedrooms: string;
  suites: string;
  parking_spots: string;
  area_m2: string;
  price_range: string;
  ideal_buyer: string;
  differentials: string;
  amenity_input: string;
  amenities: string[];
  // Step 3 — Media + Config
  main_image_url: string;
  video_url: string;
  map_embed_url: string;
  description: string;
  webhook_url: string;
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
};

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  brokerId?: string | null;
  /** Called with the newly created project id after AI generation */
  onCreated?: (projectId: string) => void;
  /** Called with the newly created project id WITHOUT going to editor (admin flow) */
  onCreatedSimple?: (projectId: string) => void;
  /** If true, after creation navigates to editor automatically */
  navigateToEditor?: boolean;
}

const STEPS = [
  { id: 1, label: "Informações Básicas" },
  { id: 2, label: "Detalhes do Imóvel" },
  { id: 3, label: "Mídias e Configurações" },
];

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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormData>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const set = (field: keyof WizardFormData, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setStep(1);
    setForm(initialForm);
    onOpenChange(false);
  };

  const addAmenity = () => {
    const val = form.amenity_input.trim();
    if (!val || form.amenities.includes(val)) return;
    setForm((prev) => ({
      ...prev,
      amenities: [...prev.amenities, val],
      amenity_input: "",
    }));
  };

  const removeAmenity = (a: string) =>
    setForm((prev) => ({ ...prev, amenities: prev.amenities.filter((x) => x !== a) }));

  const step1Valid =
    form.name.trim() &&
    form.slug.trim() &&
    form.city.trim() &&
    form.city_slug.trim();

  const handleSubmit = async (withAI: boolean) => {
    if (!step1Valid) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      // 1. Create project via edge function (handles slug conflicts)
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
      };

      const createRes = await supabase.functions.invoke("create-broker-project", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: projectPayload,
      });

      if (createRes.error || createRes.data?.error) {
        throw new Error(createRes.data?.error || createRes.error?.message || "Erro ao criar projeto");
      }

      const projectId: string = createRes.data.project_id || createRes.data.id;

      if (!withAI) {
        toast.success("Empreendimento criado com sucesso!");
        handleClose();
        onCreatedSimple?.(projectId);
        return;
      }

      // 2. Generate landing page with AI
      setIsGenerating(true);
      toast.info("Gerando landing page com IA...");

      const genRes = await supabase.functions.invoke("generate-landing-page", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { project: { ...projectPayload, id: projectId } },
      });

      if (genRes.error || genRes.data?.error) {
        // Non-fatal: project already created, just warn
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
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Novo Empreendimento
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step >= s.id
                    ? "bg-primary text-black"
                    : "bg-[#2a2a2e] text-muted-foreground"
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
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1 w-4", step > s.id ? "bg-primary" : "bg-[#2a2a2e]")} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 mt-2">
          {/* ───── STEP 1 ───── */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Nome do Empreendimento *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    set("name", name);
                    set("slug", toSlug(name));
                  }}
                  placeholder="Ex: Residencial Alto da Serra"
                  className="bg-[#141417] border-[#2a2a2e]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => {
                      const city = e.target.value;
                      set("city", city);
                      set("city_slug", toSlug(city));
                    }}
                    placeholder="Porto Alegre"
                    className="bg-[#141417] border-[#2a2a2e]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Imóvel</Label>
                  <Select
                    value={form.property_type}
                    onValueChange={(v) => set("property_type", v)}
                  >
                    <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROPERTY_TYPE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.icon} {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as ProjectStatus)}
                  >
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
                URL:{" "}
                <span className="text-muted-foreground">
                  /{form.city_slug || "cidade"}/{form.slug || "empreendimento"}/seu-slug
                </span>
              </p>
            </>
          )}

          {/* ───── STEP 2 ───── */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Dormitórios</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.bedrooms}
                    onChange={(e) => set("bedrooms", e.target.value)}
                    placeholder="3"
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Suítes</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.suites}
                    onChange={(e) => set("suites", e.target.value)}
                    placeholder="1"
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vagas de Garagem</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.parking_spots}
                    onChange={(e) => set("parking_spots", e.target.value)}
                    placeholder="2"
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Metragem (m²)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.area_m2}
                    onChange={(e) => set("area_m2", e.target.value)}
                    placeholder="85"
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Faixa de Preço</Label>
                  <Input
                    value={form.price_range}
                    onChange={(e) => set("price_range", e.target.value)}
                    placeholder="R$ 350.000 - R$ 480.000"
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil do Comprador Ideal</Label>
                  <Input
                    value={form.ideal_buyer}
                    onChange={(e) => set("ideal_buyer", e.target.value)}
                    placeholder="Famílias, investidores..."
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Diferenciais Principais</Label>
                <Textarea
                  value={form.differentials}
                  onChange={(e) => set("differentials", e.target.value)}
                  placeholder="Vista panorâmica, acabamento premium, segurança 24h..."
                  rows={2}
                  className="bg-[#141417] border-[#2a2a2e]"
                />
              </div>

              <div className="space-y-2">
                <Label>Área de Lazer</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.amenity_input}
                    onChange={(e) => set("amenity_input", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAmenity();
                      }
                    }}
                    placeholder="Ex: Piscina, Academia..."
                    className="bg-[#141417] border-[#2a2a2e]"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addAmenity}
                    className="border-[#2a2a2e] hover:bg-[#2a2a2e]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.amenities.map((a) => (
                      <Badge
                        key={a}
                        variant="secondary"
                        className="text-xs cursor-pointer bg-[#2a2a2e] hover:bg-destructive/20"
                        onClick={() => removeAmenity(a)}
                      >
                        {a} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ───── STEP 3 ───── */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>URL da Imagem Principal</Label>
                <Input
                  type="url"
                  value={form.main_image_url}
                  onChange={(e) => set("main_image_url", e.target.value)}
                  placeholder="https://..."
                  className="bg-[#141417] border-[#2a2a2e]"
                />
                <p className="text-xs text-muted-foreground/70">
                  Usada como fundo do hero da landing page.
                </p>
              </div>

              <div className="space-y-2">
                <Label>URL do Vídeo (opcional)</Label>
                <Input
                  type="url"
                  value={form.video_url}
                  onChange={(e) => set("video_url", e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="bg-[#141417] border-[#2a2a2e]"
                />
              </div>

              <div className="space-y-2">
                <Label>Embed do Mapa (opcional)</Label>
                <Input
                  value={form.map_embed_url}
                  onChange={(e) => set("map_embed_url", e.target.value)}
                  placeholder="URL do Google Maps embed..."
                  className="bg-[#141417] border-[#2a2a2e]"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição Adicional</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Informações complementares para a IA..."
                  rows={2}
                  className="bg-[#141417] border-[#2a2a2e]"
                />
              </div>

              <div className="space-y-2">
                <Label>Webhook URL (opcional)</Label>
                <Input
                  type="url"
                  value={form.webhook_url}
                  onChange={(e) => set("webhook_url", e.target.value)}
                  placeholder="https://webhook.example.com/..."
                  className="bg-[#141417] border-[#2a2a2e]"
                />
                <p className="text-xs text-muted-foreground/70">
                  Receba notificações de novos leads neste endpoint.
                </p>
              </div>

              {/* Generation preview */}
              <div className="bg-[#141417] border border-primary/20 rounded-lg p-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Geração com IA</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  A IA irá criar automaticamente toda a estrutura da landing page: hero, seção de localização,
                  diferenciais, público-alvo, CTA e formulário — adaptados ao contexto do seu imóvel.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-2 pt-4 border-t border-[#2a2a2e]">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={isSaving}
                className="hover:bg-[#2a2a2e]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}
              className="hover:bg-[#2a2a2e]">
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
                  {isSaving && !isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Salvar sem IA
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving || isGenerating}
                  className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40 text-sm"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? "Gerando..." : "Gerar Landing Page com IA"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
