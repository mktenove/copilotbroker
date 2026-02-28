import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Minus, Plus, Zap, Building2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, EXTRA_USER_PRICE, PlanType } from "@/lib/stripe-plans";
import { toast } from "sonner";

const CopilotPricing = () => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("imobiliaria");
  const [extraUsers, setExtraUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan_type: selectedPlan, extra_users: selectedPlan === "imobiliaria" ? extraUsers : 0 },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const plans: { key: PlanType; icon: typeof Zap; popular?: boolean }[] = [
    { key: "broker", icon: Zap },
    { key: "imobiliaria", icon: Building2, popular: true },
  ];

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
          {plans.map(({ key, icon: Icon, popular }) => {
            const plan = STRIPE_PLANS[key];
            const isSelected = selectedPlan === key;
            const isImob = key === "imobiliaria";
            const total = plan.price + (isImob && isSelected ? extraUsers * EXTRA_USER_PRICE.price : 0);

            return (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`relative w-full text-left rounded-2xl border-2 p-6 md:p-8 transition-all duration-300 ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-[0_0_40px_hsl(var(--gold)/0.12)]"
                    : "border-border bg-card/50 hover:border-primary/30"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full font-mono">
                    Popular
                  </span>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-foreground font-mono">
                    R$ {total.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />{plan.included_users} {plan.included_users === 1 ? "usuário incluso" : "usuários inclusos"}</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />CRM Kanban completo</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />Copiloto IA para WhatsApp</li>
                  {isImob && (
                    <>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />Roletas de distribuição</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" />Campanhas de WhatsApp</li>
                    </>
                  )}
                </ul>

                {isImob && isSelected && (
                  <div className="mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-muted-foreground mb-2">
                      Usuários extras (R$ {EXTRA_USER_PRICE.price.toFixed(2).replace(".", ",")}/mês)
                    </p>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setExtraUsers(Math.max(0, extraUsers - 1))} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-lg font-semibold w-8 text-center font-mono">{extraUsers}</span>
                      <button type="button" onClick={() => setExtraUsers(extraUsers + 1)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
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
