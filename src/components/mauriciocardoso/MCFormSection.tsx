import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
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
    <section id="cadastro" className="py-20 md:py-32 bg-gradient-to-b from-[hsl(var(--mc-stone))] to-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[hsl(var(--mc-earth))]">
              Alguns projetos passam.
              <br />
              <span className="text-[hsl(var(--mc-sage))]">Outros permanecem.</span>
            </h2>
            
            <p className="text-[hsl(var(--mc-earth))]">
              Se este endereço faz sentido para você, este é o momento de acompanhar de perto.
            </p>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-[hsl(var(--mc-sage))]/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-[hsl(var(--mc-forest))]">
                  Seu nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--mc-sage))]/30 bg-[hsl(var(--mc-cream))] text-[hsl(var(--mc-earth))] placeholder:text-[hsl(var(--mc-earth))]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mc-sage))] focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
              </div>

              {/* WhatsApp Input */}
              <div className="space-y-2">
                <label htmlFor="whatsapp" className="text-sm font-medium text-[hsl(var(--mc-forest))]">
                  Seu WhatsApp
                </label>
                <WhatsAppInput
                  value={whatsapp}
                  onChange={setWhatsapp}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--mc-sage))]/30 bg-[hsl(var(--mc-cream))] text-[hsl(var(--mc-earth))] placeholder:text-[hsl(var(--mc-earth))]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mc-sage))] focus:border-transparent transition-all"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  disabled={isSubmitting}
                  className="mt-1 border-[hsl(var(--mc-sage))] data-[state=checked]:bg-[hsl(var(--mc-sage))] data-[state=checked]:border-[hsl(var(--mc-sage))]"
                />
                <label htmlFor="terms" className="text-sm text-[hsl(var(--mc-earth))] leading-relaxed">
                  Li e aceito os{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/termos")}
                    className="text-[hsl(var(--mc-sage))] hover:underline font-medium"
                  >
                    Termos de Uso e Política de Privacidade
                  </button>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-[hsl(var(--mc-sage))] text-white font-semibold uppercase tracking-wider text-sm rounded-full shadow-lg hover:bg-[hsl(var(--mc-sage-dark))] hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Quero acompanhar esse projeto
                  </>
                )}
              </button>
            </form>

            {/* LGPD Text */}
            <p className="mt-6 text-xs text-center text-[hsl(var(--mc-earth))]/70">
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
