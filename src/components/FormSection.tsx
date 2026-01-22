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

interface FormSectionProps {
  brokerId?: string | null;
  brokerSlug?: string | null;
  allowBrokerSelection?: boolean;
}

const FormSection = ({ brokerId, brokerSlug, allowBrokerSelection = false }: FormSectionProps) => {
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
    if (brokers.length > 0) return; // Already fetched
    
    setLoadingBrokers(true);
    try {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setBrokers(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.whatsapp.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    // Validação básica do WhatsApp (mínimo 14 caracteres formatado)
    if (formData.whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Por favor, insira um número de WhatsApp válido.");
      return;
    }

    // Validação do aceite dos termos
    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Preparar dados do lead
      const leadData: {
        name: string;
        whatsapp: string;
        broker_id?: string;
        source: string;
      } = {
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
        source: brokerSlug || "enove",
      };

      // Se tiver brokerId da URL (landing do corretor), usar ele
      // Senão, se o usuário selecionou manualmente um corretor, usar esse
      if (brokerId) {
        leadData.broker_id = brokerId;
      } else if (selectedBrokerId) {
        leadData.broker_id = selectedBrokerId;
      }

      // Salvar no banco de dados
      const { error } = await supabase
        .from("leads")
        .insert(leadData);

      if (error) throw error;

      // Enviar para o webhook
      await fetch("https://webhook.outoflow.online/webhook/622dff9d-d12f-4150-bf6f-b15908e8b205", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome_completo: formData.name.trim(),
          whatsapp: formData.whatsapp.trim(),
          broker_id: brokerId || selectedBrokerId || null,
          source: brokerSlug || "enove",
        }),
      }).catch((webhookError) => {
        // Não bloquear o fluxo se o webhook falhar
        console.error("Erro ao enviar webhook:", webhookError);
      });

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

  const formatWhatsApp = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");
    
    // Format as (XX) XXXXX-XXXX
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <section 
      id="cadastro" 
      ref={sectionRef} 
      className="py-16 sm:py-20 md:py-32 bg-background relative overflow-hidden"
      aria-labelledby="form-title"
    >
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/5 rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="container relative z-10 px-4">
        <div className={`max-w-xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <header className="text-center mb-8 sm:mb-10">
            <h2 id="form-title" className="section-title mb-4 text-2xl sm:text-3xl md:text-4xl">
              Cadastre-se e Fique{" "}
              <span className="text-primary">Um Passo à Frente</span>
            </h2>
            <p className="section-subtitle text-sm sm:text-base">
              Garanta seu acesso antecipado ao lançamento mais esperado do Vale dos Sinos.
            </p>
          </header>

          <form 
            onSubmit={handleSubmit} 
            className="card-luxury p-6 sm:p-8 md:p-10 space-y-5 sm:space-y-6"
            aria-label="Formulário de cadastro para acesso antecipado"
          >
            <div>
              <label htmlFor="name-landing" className="block text-sm font-medium text-foreground/80 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                id="name-landing"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 sm:py-3.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base"
                placeholder="Digite seu nome completo"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="whatsapp-landing" className="block text-sm font-medium text-foreground/80 mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                id="whatsapp-landing"
                name="whatsapp"
                autoComplete="tel"
                inputMode="numeric"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                className="w-full px-4 py-3 sm:py-3.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base"
                placeholder="(00) 00000-0000"
                maxLength={16}
                aria-required="true"
              />
            </div>

            {/* Optional broker selection - only on main landing page */}
            {allowBrokerSelection && !brokerId && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleToggleBrokerSelect}
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                      <SelectTrigger className="w-full bg-background border-border">
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
                    <p className="text-xs text-muted-foreground">
                      Selecione apenas se você já está em contato com um de nossos corretores
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Checkbox de aceite dos termos */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms-landing"
                name="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5 min-w-[20px]"
                aria-required="true"
              />
              <label 
                htmlFor="terms-landing" 
                className="text-xs sm:text-sm text-foreground/80 leading-relaxed cursor-pointer"
              >
                Li e aceito os{" "}
                <Link 
                  to="/termos#termos-de-uso" 
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  rel="noopener"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link 
                  to="/termos#politica-de-privacidade" 
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  rel="noopener"
                >
                  Política de Privacidade
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[48px] text-sm sm:text-base"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Enviando...</span>
                </span>
              ) : (
                "Quero Acesso Antecipado"
              )}
            </button>

            <p className="text-center text-xs sm:text-sm text-muted-foreground">
              Cadastro gratuito e sem compromisso
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default FormSection;
