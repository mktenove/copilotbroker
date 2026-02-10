import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trackLeadAttribution, getLeadOriginFromUTM } from "@/hooks/use-page-tracking";

interface GVFormSectionProps {
  projectId: string;
  brokerId?: string | null;
  brokerSlug?: string | null;
  webhookUrl?: string | null;
  allowBrokerSelection?: boolean;
}

const DEFAULT_WEBHOOK = "https://webhook.outoflow.online/webhook/622dff9d-d12f-4150-bf6f-b15908e8b205";

const GVFormSection = ({ 
  projectId, 
  brokerId, 
  brokerSlug, 
  webhookUrl,
  allowBrokerSelection = true 
}: GVFormSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", whatsapp: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Broker selection states
  const [showBrokerSelect, setShowBrokerSelect] = useState(false);
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const fetchBrokers = async () => {
    if (brokers.length > 0) return;
    
    setLoadingBrokers(true);
    try {
      // Fetch brokers associated with this project
      const { data, error } = await supabase
        .from("broker_projects")
        .select(`
          broker:brokers(id, name)
        `)
        .eq("project_id", projectId)
        .eq("is_active", true);
      
      if (error) throw error;
      
      const activeBrokers = data
        ?.map(bp => bp.broker)
        .filter((b): b is { id: string; name: string } => b !== null)
        .sort((a, b) => a.name.localeCompare(b.name)) || [];
      
      setBrokers(activeBrokers);
    } catch (error) {
      console.error("Erro ao buscar corretores:", error);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleToggleBrokerSelect = () => {
    if (!showBrokerSelect) {
      fetchBrokers();
    }
    setShowBrokerSelect(!showBrokerSelect);
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.whatsapp.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    if (formData.whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Por favor, insira um número de WhatsApp válido.");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setIsSubmitting(true);

    try {
      const leadId = crypto.randomUUID();

      const leadData: {
        id: string;
        name: string;
        whatsapp: string;
        project_id: string;
        broker_id?: string;
        source: string;
        lead_origin?: string | null;
      } = {
        id: leadId,
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
        project_id: projectId,
        source: brokerSlug ? `goldenview/${brokerSlug}` : "goldenview",
        lead_origin: getLeadOriginFromUTM(),
      };

      // Use broker from URL or selected broker
      if (brokerId) {
        leadData.broker_id = brokerId;
      } else if (selectedBrokerId) {
        leadData.broker_id = selectedBrokerId;
      }

      const { error } = await supabase.from("leads").insert(leadData);

      if (error) throw error;

      // Track lead attribution - marca como landing_page
      await trackLeadAttribution(leadId, projectId, "landing_page");
      
      // Trigger auto first message (non-blocking)
      supabase.functions.invoke("auto-first-message", {
        body: { leadId },
      }).catch((err) => {
        console.warn("Auto first message trigger failed:", err);
      });

      // GA4 conversion event
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          event_category: "Lead",
          event_label: brokerSlug || "goldenview",
          value: 1,
          lead_source: brokerSlug || "goldenview",
          broker_id: brokerId || selectedBrokerId || "none",
          project: "goldenview"
        });
      }

      // Webhook
      const targetWebhook = webhookUrl || DEFAULT_WEBHOOK;
      fetch(targetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_completo: formData.name.trim(),
          whatsapp: formData.whatsapp.trim(),
          broker_id: brokerId || selectedBrokerId || null,
          project_id: projectId,
          source: brokerSlug ? `goldenview/${brokerSlug}` : "goldenview",
        }),
      }).catch(console.error);

      // WhatsApp notification
      supabase.functions.invoke("notify-new-lead", {
        body: {
          leadId,
          leadName: formData.name.trim(),
          leadWhatsapp: formData.whatsapp.trim(),
          brokerId: brokerId || selectedBrokerId || null,
          projectId,
          source: brokerSlug ? `GoldenView/${brokerSlug}` : "GoldenView",
        },
      }).catch(console.error);

      toast.success("Cadastro realizado com sucesso! Em breve entraremos em contato.");
      setFormData({ name: "", whatsapp: "" });
      setAcceptedTerms(false);
      setSelectedBrokerId("");
      setShowBrokerSelect(false);
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      toast.error("Ocorreu um erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="cadastro"
      ref={sectionRef}
      className="py-20 md:py-32 bg-background relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container px-4 relative z-10">
        <div className={`max-w-xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              GARANTA SEU{" "}
              <span className="text-gold-gradient">ACESSO AGORA</span>
            </h2>
            <p className="text-muted-foreground">
              Cadastro gratuito. Acesso limitado. Prioridade real.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="card-luxury p-8 md:p-10 space-y-6"
          >
            <div>
              <label htmlFor="gv-name" className="block text-sm font-medium text-foreground/80 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                id="gv-name"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="Digite seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="gv-whatsapp" className="block text-sm font-medium text-foreground/80 mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                id="gv-whatsapp"
                name="whatsapp"
                autoComplete="tel"
                inputMode="numeric"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                className="w-full px-4 py-3.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="(00) 00000-0000"
                maxLength={16}
              />
            </div>

            {/* Optional broker selection */}
            {allowBrokerSelection && !brokerId && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleToggleBrokerSelect}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showBrokerSelect ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Já sou atendido por um corretor Enove
                </button>
                
                {showBrokerSelect && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Select
                      value={selectedBrokerId || "none"}
                      onValueChange={(value) => setSelectedBrokerId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="w-full bg-background border-border text-muted-foreground">
                        <SelectValue placeholder="Nenhum / Não encontrei meu corretor" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="none">
                          Nenhum / Não encontrei meu corretor
                        </SelectItem>
                        {loadingBrokers ? (
                          <SelectItem value="loading" disabled>
                            Carregando...
                          </SelectItem>
                        ) : (
                          brokers.map((broker) => (
                            <SelectItem key={broker.id} value={broker.id}>
                              {broker.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="gv-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="gv-terms" className="text-sm text-foreground/80 leading-relaxed cursor-pointer">
                Li e aceito os{" "}
                <Link
                  to="/termos#termos-de-uso"
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline underline-offset-2"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  to="/termos#politica-de-privacidade"
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline underline-offset-2"
                >
                  Política de Privacidade
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enviando...
                </span>
              ) : (
                "Quero Acesso Antecipado"
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Cadastro gratuito e sem compromisso
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default GVFormSection;
