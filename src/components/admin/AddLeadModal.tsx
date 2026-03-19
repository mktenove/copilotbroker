import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppInput } from "@/components/ui/whatsapp-input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Building2, Tag } from "lucide-react";

interface Broker {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultBrokerId?: string;
  hideBrokerSelect?: boolean;
}

const INTERESSE_OPTIONS = [
  { value: "casa", label: "Interesse em Casa" },
  { value: "apartamento", label: "Interesse em Apartamento" },
  { value: "terreno", label: "Interesse em Terreno" },
  { value: "investimento", label: "Interesse em Investimento" },
  { value: "comercial", label: "Interesse em Imóvel Comercial" },
];

const ORIGIN_OPTIONS = [
  { value: "meta_ads", label: "Meta ADS" },
  { value: "google_ads", label: "Google ADS" },
  { value: "instagram_organic", label: "Instagram Orgânico" },
  { value: "facebook_organic", label: "Facebook Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "plantao", label: "Plantão" },
  { value: "site", label: "Site" },
  { value: "whatsapp_direto", label: "WhatsApp Direto" },
  { value: "outro", label: "Outro" },
];

export function AddLeadModal({ isOpen, onClose, onSuccess, defaultBrokerId, hideBrokerSelect }: AddLeadModalProps) {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [brokerId, setBrokerId] = useState<string>(defaultBrokerId || "enove");
  const [origin, setOrigin] = useState<string>("");
  const [customOrigin, setCustomOrigin] = useState("");
  const [targetMode, setTargetMode] = useState<"project" | "interest">("project");
  const [projectId, setProjectId] = useState<string>("");
  const [interesse, setInteresse] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");

  // Fetch brokers and projects on mount
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultBrokerId]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      let fetchedProjects: Project[] = [];

      if (defaultBrokerId) {
        // Broker context: only show this broker's active projects (two-step to avoid JOIN+RLS issues)
        const { data: bpRows } = await supabase
          .from("broker_projects" as any)
          .select("project_id")
          .eq("broker_id", defaultBrokerId)
          .eq("is_active", true) as any;
        const projectIds = (bpRows || []).map((r: { project_id: string }) => r.project_id);
        if (projectIds.length > 0) {
          const { data: projData } = await supabase
            .from("projects" as any)
            .select("id, name, slug")
            .in("id", projectIds)
            .order("name") as any;
          fetchedProjects = projData || [];
        }
        const [brokersRes] = await Promise.all([
          supabase.from("brokers").select("id, name, slug").eq("is_active", true).order("name"),
        ]);
        if (brokersRes.data) setBrokers(brokersRes.data);
      } else {
        // Admin context: show all active projects and all brokers
        const [brokersRes, projectsRes] = await Promise.all([
          supabase.from("brokers").select("id, name, slug").eq("is_active", true).order("name"),
          supabase.from("projects").select("id, name, slug").eq("is_active", true).order("name"),
        ]);
        if (brokersRes.data) setBrokers(brokersRes.data);
        fetchedProjects = projectsRes.data || [];
      }

      setProjects(fetchedProjects);
      if (fetchedProjects.length === 1) {
        setProjectId(fetchedProjects[0].id);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForm = () => {
    setName("");
    setWhatsapp("");
    setBrokerId(defaultBrokerId || "enove");
    setOrigin("");
    setCustomOrigin("");
    setTargetMode("project");
    setProjectId(projects.length === 1 ? projects[0].id : "");
    setInteresse("");
    setObservacao("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!whatsapp || whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("WhatsApp inválido (mínimo 10 dígitos)");
      return;
    }

    setIsLoading(true);

    try {
      // Generate client-side UUID to avoid RLS SELECT issues
      const leadId = crypto.randomUUID();
      const realProjectId = targetMode === "project" && projectId ? projectId : null;
      const finalOrigin = !origin ? "Cadastrado manualmente" :
        origin === "outro" ? customOrigin || "Manual" :
        ORIGIN_OPTIONS.find(o => o.value === origin)?.label || origin;

      // Prepare lead data
      const leadData: Record<string, any> = {
        id: leadId,
        name: name.trim(),
        whatsapp,
        source: brokerId === "enove" ? "enove" : "broker",
        status: "new",
        lead_origin: finalOrigin,
        broker_id: brokerId === "enove" ? null : brokerId,
      };
      if (realProjectId) leadData.project_id = realProjectId;
      if (targetMode === "interest" && interesse) leadData.interest_type = interesse;
      if (observacao.trim()) leadData.notes = observacao.trim();

      // Insert lead
      const { error: leadError } = await (supabase
        .from("leads" as any)
        .insert(leadData as any) as any);

      if (leadError) throw leadError;

      // Insert attribution only if project selected
      if (realProjectId) {
        await (supabase.from("lead_attribution" as any).insert({
          lead_id: leadId,
          project_id: realProjectId,
          landing_page: "admin_manual",
        }) as any);
      }

      // Trigger WhatsApp notification via edge function
      try {
        await supabase.functions.invoke("notify-new-lead", {
          body: {
            leadId,
            leadName: name.trim(),
            leadWhatsapp: whatsapp,
            brokerId: brokerId === "enove" ? null : brokerId,
          },
        });
      } catch (notifyError) {
        console.warn("Notificação WhatsApp falhou:", notifyError);
        // Don't fail the whole operation
      }

      toast.success("Lead adicionado com sucesso!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao adicionar lead:", error);
      toast.error("Erro ao adicionar lead");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-5 h-5 text-primary" />
            Adicionar Lead
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Cadastre um novo lead manualmente no sistema
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Nome <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className="bg-[#141417] border-[#2a2a2e] text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-slate-300">
                WhatsApp <span className="text-red-400">*</span>
              </Label>
              <WhatsAppInput
                id="whatsapp"
                value={whatsapp}
                onChange={setWhatsapp}
                className="bg-[#141417] border-[#2a2a2e] text-slate-200"
              />
            </div>

            {/* Empreendimento ou Interesse */}
            <div className="space-y-2">
              <Label className="text-slate-300">Interesse / Empreendimento</Label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setTargetMode("project"); setInteresse(""); setObservacao(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    targetMode === "project"
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-[#2a2a2e] bg-[#141417] text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <Building2 className="w-4 h-4" />Empreendimento
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetMode("interest"); setProjectId(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    targetMode === "interest"
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-[#2a2a2e] bg-[#141417] text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <Tag className="w-4 h-4" />Interesse
                </button>
              </div>

              {targetMode === "project" && (
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-slate-200">
                    <SelectValue placeholder="Selecione o empreendimento" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-slate-200 focus:bg-[#2a2a2e] focus:text-slate-100">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {targetMode === "interest" && (
                <>
                  <Select value={interesse} onValueChange={setInteresse}>
                    <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-slate-200">
                      <SelectValue placeholder="Selecione o interesse" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                      {INTERESSE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-slate-200 focus:bg-[#2a2a2e] focus:text-slate-100">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Procura imóvel de 2 quartos, até R$ 400k, prefere Zona Sul..."
                    className="bg-[#141417] border-[#2a2a2e] text-slate-200 placeholder:text-slate-500 min-h-[72px] resize-none mt-2"
                  />
                </>
              )}
            </div>

            {/* Corretor */}
            {!hideBrokerSelect && (
              <div className="space-y-2">
                <Label className="text-slate-300">Corretor</Label>
                <Select value={brokerId} onValueChange={setBrokerId}>
                  <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-slate-200">
                    <SelectValue placeholder="Selecione o corretor" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    <SelectItem 
                      value="enove"
                      className="text-slate-200 focus:bg-[#2a2a2e] focus:text-slate-100"
                    >
                      Enove (Sem corretor)
                    </SelectItem>
                    {brokers.map((broker) => (
                      <SelectItem 
                        key={broker.id} 
                        value={broker.id}
                        className="text-slate-200 focus:bg-[#2a2a2e] focus:text-slate-100"
                      >
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Origem */}
            <div className="space-y-2">
              <Label className="text-slate-300">Origem</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger className="bg-[#141417] border-[#2a2a2e] text-slate-200">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                  {ORIGIN_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-slate-200 focus:bg-[#2a2a2e] focus:text-slate-100"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Origin (if "Outro" selected) */}
            {origin === "outro" && (
              <div className="space-y-2">
                <Label htmlFor="customOrigin" className="text-slate-300">
                  Especifique a origem
                </Label>
                <Input
                  id="customOrigin"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder="Ex: Evento XYZ"
                  className="bg-[#141417] border-[#2a2a2e] text-slate-200 placeholder:text-slate-500"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e] hover:text-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Adicionar Lead"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
