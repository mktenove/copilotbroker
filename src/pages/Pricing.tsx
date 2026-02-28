import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, EXTRA_USER_PRICE, PlanType } from "@/lib/stripe-plans";
import { Check, Minus, Plus, Zap, Building2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import logoEnove from "@/assets/logo-enove.png";

const PlanCard = ({
  planKey,
  selected,
  onSelect,
  extraUsers,
  onExtraUsersChange,
}: {
  planKey: PlanType;
  selected: boolean;
  onSelect: () => void;
  extraUsers: number;
  onExtraUsersChange: (n: number) => void;
}) => {
  const plan = STRIPE_PLANS[planKey];
  const isImob = planKey === "imobiliaria";
  const total = plan.price + (isImob ? extraUsers * EXTRA_USER_PRICE.price : 0);

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left rounded-2xl border-2 p-6 md:p-8 transition-all duration-300 ${
        selected
          ? "border-primary bg-primary/5 shadow-[0_0_40px_hsl(var(--gold)/0.15)]"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {isImob && (
        <span className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full">
          Popular
        </span>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isImob ? (
              <Building2 className="w-5 h-5 text-primary" />
            ) : (
              <Zap className="w-5 h-5 text-primary" />
            )}
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/30"
          }`}
        >
          {selected && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-foreground">
          R$ {total.toFixed(2).replace(".", ",")}
        </span>
        <span className="text-muted-foreground text-sm">/mês</span>
      </div>

      <ul className="space-y-2 text-sm text-muted-foreground mb-4">
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-primary shrink-0" />
          {plan.included_users} {plan.included_users === 1 ? "usuário incluso" : "usuários inclusos"}
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-primary shrink-0" />
          CRM completo + Kanban
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-primary shrink-0" />
          Copilot IA para WhatsApp
        </li>
        {isImob && (
          <>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" />
              Roletas de distribuição
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" />
              Campanhas de WhatsApp
            </li>
          </>
        )}
      </ul>

      {isImob && selected && (
        <div
          className="mt-4 pt-4 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-muted-foreground mb-2">
            Usuários extras (R$ {EXTRA_USER_PRICE.price.toFixed(2).replace(".", ",")}
            /mês cada)
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onExtraUsersChange(Math.max(0, extraUsers - 1))}
              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-semibold w-8 text-center">{extraUsers}</span>
            <button
              type="button"
              onClick={() => onExtraUsersChange(extraUsers + 1)}
              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </button>
  );
};

const Pricing = () => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("imobiliaria");
  const [extraUsers, setExtraUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Faça login antes de assinar.");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan_type: selectedPlan,
          extra_users: selectedPlan === "imobiliaria" ? extraUsers : 0,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Planos | Copilot Broker - Enove</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <img src={logoEnove} alt="Enove" className="h-8" />
            <button
              onClick={() => navigate("/auth")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tenho conta
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-10">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                Escolha seu plano
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                CRM inteligente com IA para corretores e imobiliárias. Cancele quando quiser.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <PlanCard
                planKey="broker"
                selected={selectedPlan === "broker"}
                onSelect={() => setSelectedPlan("broker")}
                extraUsers={0}
                onExtraUsersChange={() => {}}
              />
              <PlanCard
                planKey="imobiliaria"
                selected={selectedPlan === "imobiliaria"}
                onSelect={() => setSelectedPlan("imobiliaria")}
                extraUsers={extraUsers}
                onExtraUsersChange={setExtraUsers}
              />
            </div>

            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full md:w-auto md:mx-auto md:flex md:px-12 items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--gold)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex"
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
        </main>
      </div>
    </>
  );
};

export default Pricing;
