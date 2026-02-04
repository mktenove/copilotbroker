import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

interface MCFormSectionProps {
  projectId?: string;
  brokerId?: string;
}

const MCFormSection = ({ projectId, brokerId }: MCFormSectionProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidBrazilianWhatsApp(whatsapp)) {
      toast({
        title: "WhatsApp inválido",
        description: "Por favor, informe um número válido com DDD.",
        variant: "destructive",
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Termos não aceitos",
        description: "Você precisa aceitar os termos para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate UUID client-side
      const leadId = crypto.randomUUID();
      
      const { error } = await supabase.from("leads").insert({
        id: leadId,
        name: name.trim(),
        whatsapp,
        project_id: projectId || null,
        broker_id: brokerId || null,
        source: brokerId ? "broker_landing" : "landing_page",
      });

      if (error) throw error;

      // Save attribution - marca como landing_page para diferenciar de manual
      await supabase.from("lead_attribution").insert({
        lead_id: leadId,
        project_id: projectId || null,
        landing_page: "landing_page",
        referrer: document.referrer || null,
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
      });
      
      // Trigger auto first message (non-blocking)
      supabase.functions.invoke("auto-first-message", {
        body: { leadId },
      }).catch((err) => {
        console.warn("Auto first message trigger failed:", err);
      });

      toast({
        title: "Cadastro realizado!",
        description: "Em breve você receberá nossas atualizações.",
      });

      setName("");
      setWhatsapp("");
      setAcceptedTerms(false);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: "Erro ao cadastrar",
        description: "Por favor, tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="cadastro" className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-lg mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-4 md:space-y-6 mb-8 md:mb-12 px-2">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[hsl(var(--mc-charcoal))] leading-[1.2]">
              Alguns projetos passam.
              <br />
              <span className="italic text-[hsl(var(--mc-forest))]">Outros permanecem.</span>
            </h2>
            
            <p className="text-[hsl(var(--mc-earth))] text-xs sm:text-sm">
              Se este endereço faz sentido para você, este é o momento de acompanhar de perto.
            </p>
          </div>

          {/* Form Card - Dark premium */}
          <div className="bg-[hsl(var(--mc-forest))] py-8 md:py-10 px-5 sm:px-6 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-white/70">
                  Seu nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/30 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors text-sm sm:text-base"
                  disabled={isSubmitting}
                />
              </div>

              {/* WhatsApp Input */}
              <div className="space-y-2">
                <label htmlFor="whatsapp" className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-white/70">
                  Seu WhatsApp
                </label>
                <WhatsAppInput
                  value={whatsapp}
                  onChange={setWhatsapp}
                  disabled={isSubmitting}
                  className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/30 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors text-sm sm:text-base"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  disabled={isSubmitting}
                  className="mt-0.5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-[hsl(var(--mc-forest))]"
                />
                <label htmlFor="terms" className="text-[10px] sm:text-xs text-white/70 leading-relaxed">
                  Li e aceito os{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/novohamburgo/mauriciocardoso/termos")}
                    className="text-white underline hover:no-underline"
                  >
                    Termos de Uso e Política de Privacidade
                  </button>
                </label>
              </div>

              {/* Submit Button - Off-white on dark */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 md:gap-3 px-6 md:px-8 py-4 bg-white text-[hsl(var(--mc-forest))] font-medium uppercase tracking-[0.1em] md:tracking-[0.15em] text-[11px] sm:text-xs hover:bg-[hsl(var(--mc-cream))] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6 md:mt-8 min-h-[48px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Quero acompanhar esse projeto
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* LGPD Text */}
            <p className="mt-6 md:mt-8 text-[9px] sm:text-[10px] text-center text-white/50 leading-relaxed">
              Ao se cadastrar, você autoriza o recebimento de comunicações sobre 
              este empreendimento. Seus dados serão tratados com total confidencialidade.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCFormSection;
