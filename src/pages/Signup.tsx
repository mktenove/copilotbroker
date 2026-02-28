import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STRIPE_PLANS, EXTRA_USER_PRICE, PlanType } from "@/lib/stripe-plans";
import { Check, Minus, Plus, Mail, Lock, User, Shield, Zap, Building2, ArrowRight, Plane } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planParam = searchParams.get("plan");
  const usersParam = searchParams.get("users");

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(
    planParam === "imobiliaria" ? "imobiliaria" : "broker"
  );
  const [extraUsers, setExtraUsers] = useState(
    usersParam ? Math.max(0, parseInt(usersParam) - 3) : 0
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // If already logged in, go straight to checkout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED") return;
        if (session) {
          // Already logged in — go to checkout
          await startCheckout();
        } else {
          setIsCheckingAuth(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [selectedPlan, extraUsers]);

  const startCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan_type: selectedPlan,
          extra_users: selectedPlan === "imobiliaria" ? extraUsers : 0,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
          toast.error(
            "Este email já está cadastrado. Faça login.",
            { action: { label: "Ir para login", onClick: () => navigate("/auth") } }
          );
          return;
        }
        throw error;
      }

      if (data.session) {
        toast.success("Conta criada! Redirecionando para pagamento...");
        await startCheckout();
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar e depois faça login.");
        navigate("/auth");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  const plan = STRIPE_PLANS[selectedPlan];
  const total = plan.price + (selectedPlan === "imobiliaria" ? extraUsers * EXTRA_USER_PRICE.price : 0);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-mono text-sm">Verificando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar Conta | Copilot Broker</title>
        <meta name="description" content="Crie sua conta no Copilot Broker e comece a vender mais com IA." />
      </Helmet>

      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="border-b border-[#1a1a1a] px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/">
              <img src={copilotLogo} alt="Copilot Broker" className="h-8" />
            </Link>
            <Link to="/auth" className="text-sm text-slate-400 hover:text-[#FFFF00] font-mono transition-colors">
              Já sou cliente →
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          {/* Headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-[#FFFF00]/20 bg-[#FFFF00]/5">
              <Plane className="w-3.5 h-3.5 text-[#FFFF00]" />
              <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-[#FFFF00]">
                Acesso em minutos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight">
              Você está a 1 passo de operar como um{" "}
              <span className="text-[#FFFF00]">corretor de alta performance.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base font-mono max-w-lg mx-auto">
              Crie sua conta e confirme o pagamento. Acesso liberado em minutos.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
            {[
              { step: 1, label: "Criar conta", active: true },
              { step: 2, label: "Confirmar pagamento", active: false },
              { step: 3, label: "Acesso liberado", active: false },
            ].map(({ step, label, active }) => (
              <div key={step} className="flex items-center gap-2 sm:gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                  active ? "bg-[#FFFF00] text-black" : "bg-[#1a1a1a] text-slate-500 border border-[#333]"
                }`}>
                  {step}
                </div>
                <span className={`text-xs sm:text-sm font-mono hidden sm:inline ${active ? "text-white" : "text-slate-500"}`}>
                  {label}
                </span>
                {step < 3 && <div className="w-6 sm:w-12 h-px bg-[#333]" />}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Plan Selection — Left */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-lg font-mono font-bold text-white mb-4">Escolha seu plano</h2>

              {(["broker", "imobiliaria"] as PlanType[]).map((key) => {
                const p = STRIPE_PLANS[key];
                const isSelected = selectedPlan === key;
                const Icon = key === "broker" ? Zap : Building2;
                const bullets = key === "broker"
                  ? ["1 licença", "CRM de lançamentos", "Copiloto IA para WhatsApp", "Sem fidelidade"]
                  : ["3 usuários inclusos (1 admin + 2 corretores)", "+ R$ 4,90 por usuário adicional", "Roletas de distribuição", "Campanhas de WhatsApp", "Sem fidelidade"];

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key)}
                    className={`relative w-full text-left rounded-2xl border-2 p-5 sm:p-6 transition-all duration-300 ${
                      isSelected
                        ? "border-[#FFFF00] bg-[#FFFF00]/5 shadow-[0_0_30px_rgba(255,255,0,0.08)]"
                        : "border-[#222] bg-[#0a0a0a] hover:border-[#FFFF00]/30"
                    }`}
                  >
                    {key === "imobiliaria" && (
                      <span className="absolute -top-2.5 left-5 px-3 py-0.5 bg-[#FFFF00] text-black text-[10px] font-bold uppercase tracking-wider rounded-full font-mono">
                        Popular
                      </span>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-[#FFFF00]" />
                        <h3 className="text-lg font-bold">{p.name}</h3>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-[#FFFF00] bg-[#FFFF00]" : "border-[#444]"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-2xl font-bold font-mono">
                        R$ {p.price.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-slate-400 text-sm">/mês</span>
                    </div>

                    <ul className="space-y-1.5 text-sm text-slate-400">
                      {bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#FFFF00] shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>

                    {key === "imobiliaria" && isSelected && (
                      <div className="mt-4 pt-4 border-t border-[#222]" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm text-slate-400 mb-2 font-mono">
                          Usuários extras (R$ {EXTRA_USER_PRICE.price.toFixed(2).replace(".", ",")}/mês cada)
                        </p>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setExtraUsers(Math.max(0, extraUsers - 1))} className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#FFFF00]/30">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-lg font-semibold w-8 text-center font-mono">{extraUsers}</span>
                          <button type="button" onClick={() => setExtraUsers(extraUsers + 1)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#FFFF00]/30">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {extraUsers > 0 && (
                          <p className="text-xs text-slate-500 mt-2 font-mono">
                            Total: {3 + extraUsers} usuários · R$ {total.toFixed(2).replace(".", ",")}/mês
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Price summary */}
              <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4 font-mono">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Plano {plan.name}</span>
                  <span>R$ {plan.price.toFixed(2).replace(".", ",")}</span>
                </div>
                {selectedPlan === "imobiliaria" && extraUsers > 0 && (
                  <div className="flex justify-between text-sm text-slate-400 mt-1">
                    <span>{extraUsers} usuário(s) extra(s)</span>
                    <span>R$ {(extraUsers * EXTRA_USER_PRICE.price).toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold mt-3 pt-3 border-t border-[#222]">
                  <span>Total mensal</span>
                  <span className="text-[#FFFF00]">R$ {total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
            </div>

            {/* Signup Form — Right */}
            <div className="lg:col-span-2">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 sm:p-8 sticky top-8">
                <h2 className="text-lg font-mono font-bold text-white mb-6">Crie sua conta</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nome completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-1 rounded border-[#333] bg-black text-[#FFFF00] focus:ring-[#FFFF00]/20"
                    />
                    <span className="text-xs text-slate-500 font-mono">
                      Li e aceito os{" "}
                      <Link to="/termos" className="text-[#FFFF00] hover:underline" target="_blank">
                        Termos de Uso
                      </Link>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-[#FFFF00] text-black font-mono font-bold text-sm uppercase tracking-wider rounded-xl transition-all hover:shadow-[0_0_40px_rgba(255,255,0,0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Criar conta e ir para o pagamento
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Trust signals */}
                <div className="mt-6 space-y-2">
                  {[
                    { icon: Shield, text: "Pagamento 100% seguro via Stripe" },
                    { icon: Check, text: "Sem fidelidade • Cancele quando quiser" },
                    { icon: Lock, text: "Seus dados protegidos (LGPD)" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <Icon className="w-3.5 h-3.5 text-[#FFFF00]/50 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-[#1a1a1a] text-center">
                  <p className="text-sm text-slate-500 font-mono">
                    Já sou cliente?{" "}
                    <Link to="/auth" className="text-[#FFFF00] hover:underline font-medium">
                      Fazer login
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
