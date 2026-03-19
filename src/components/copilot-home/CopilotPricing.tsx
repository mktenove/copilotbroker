import { useState } from "react";
import { Check, Zap, Building2, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { toast } from "sonner";

const CopilotPricing = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan_type: "broker", extra_users: 0 },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const brokerPlan = STRIPE_PLANS["broker"];
  const imobPlan = STRIPE_PLANS["imobiliaria"];

  return (
    <section id="planos" className="py-20 sm:py-28 px-4">
      <div className="container max-w-4xl">
        <div className="text-center mb-14">
          <span className="text-xs font-mono font-semibold tracking-[0.3em] uppercase text-primary mb-4 block">Planos</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Invista no seu{" "}
            <span className="text-gold-gradient">crescimento</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Escolha o plano ideal. Cancele quando quiser, sem fidelidade.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Broker — active */}
          <div className="relative w-full text-left rounded-2xl border-2 border-primary bg-primary/5 shadow-[0_0_40px_hsl(var(--gold)/0.12)] p-6 md:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">{brokerPlan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{brokerPlan.description}</p>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>

            <div className="mb-5">
              <span className="text-3xl font-bold text-foreground font-mono">
                R$ {brokerPlan.price.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />1 licença inclusa</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />CRM Kanban completo</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />Copiloto IA para WhatsApp</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />Sem fidelidade</li>
            </ul>
          </div>

          {/* Imobiliária — locked */}
          <div className="relative w-full text-left rounded-2xl border-2 border-border bg-card/30 p-6 md:p-8 opacity-50 cursor-not-allowed select-none">
            <span className="absolute -top-3 left-6 px-3 py-1 bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider rounded-full font-mono flex items-center gap-1">
              <Lock className="w-3 h-3" /> Em breve
            </span>

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-xl font-bold text-muted-foreground">{imobPlan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{imobPlan.description}</p>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground/40 mt-0.5" />
            </div>

            <div className="mb-5">
              <span className="text-3xl font-bold text-muted-foreground font-mono">
                R$ {imobPlan.price.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground/60">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />3 usuários inclusos</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />CRM Kanban completo</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />Copiloto IA para WhatsApp</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />Roletas de distribuição</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />Campanhas de WhatsApp</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-12 py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--gold)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              <>
                Assinar agora
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default CopilotPricing;
