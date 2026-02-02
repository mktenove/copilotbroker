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
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        whatsapp,
        project_id: projectId || null,
        broker_id: brokerId || null,
        source: brokerId ? "broker_landing" : "landing_page",
      });

      if (error) throw error;

      // Save attribution
      await supabase.from("lead_attribution").insert({
        project_id: projectId || null,
        landing_page: window.location.pathname,
        referrer: document.referrer || null,
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
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
    <section id="cadastro" className="py-24 md:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-lg mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-[hsl(var(--mc-charcoal))] leading-[1.2]">
              Alguns projetos passam.
              <br />
              <span className="italic text-[hsl(var(--mc-sage))]">Outros permanecem.</span>
            </h2>
            
            <p className="text-[hsl(var(--mc-earth))] text-sm">
              Se este endereço faz sentido para você, este é o momento de acompanhar de perto.
            </p>
          </div>

          {/* Form Card - Dark premium */}
          <div className="bg-[hsl(var(--mc-forest))] py-10 px-8 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs uppercase tracking-[0.15em] text-white/60">
                  Seu nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-[hsl(var(--mc-sage-light))] transition-colors"
                  disabled={isSubmitting}
                />
              </div>

              {/* WhatsApp Input */}
              <div className="space-y-2">
                <label htmlFor="whatsapp" className="text-xs uppercase tracking-[0.15em] text-white/60">
                  Seu WhatsApp
                </label>
                <WhatsAppInput
                  value={whatsapp}
                  onChange={setWhatsapp}
                  disabled={isSubmitting}
                  className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-[hsl(var(--mc-sage-light))] transition-colors"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  disabled={isSubmitting}
                  className="mt-0.5 border-white/40 data-[state=checked]:bg-[hsl(var(--mc-sage-light))] data-[state=checked]:border-[hsl(var(--mc-sage-light))]"
                />
                <label htmlFor="terms" className="text-xs text-white/60 leading-relaxed">
                  Li e aceito os{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/termos")}
                    className="text-[hsl(var(--mc-sage-light))] hover:underline"
                  >
                    Termos de Uso e Política de Privacidade
                  </button>
                </label>
              </div>

              {/* Submit Button - Off-white on dark */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-[hsl(var(--mc-forest))] font-medium uppercase tracking-[0.15em] text-xs hover:bg-[hsl(var(--mc-sage-light))] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
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
            <p className="mt-8 text-[10px] text-center text-white/40 leading-relaxed">
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
