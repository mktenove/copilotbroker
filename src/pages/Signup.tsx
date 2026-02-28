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
        {/* Desktop: Full two-panel layout. Mobile: single column */}
        <div className="flex flex-col lg:flex-row min-h-screen">

          {/* LEFT PANEL — Branding + Plan Selection (desktop: fixed side panel) */}
          <div className="lg:w-[55%] xl:w-[50%] lg:min-h-screen lg:sticky lg:top-0 bg-gradient-to-br from-black via-[#050505] to-[#0a0a0a] lg:border-r border-[#1a1a1a]">
            <div className="p-6 sm:p-8 lg:p-12 xl:p-16 flex flex-col h-full">
              {/* Logo */}
              <div className="flex items-center justify-between mb-8 lg:mb-12">
                <Link to="/">
                  <img src={copilotLogo} alt="Copilot Broker" className="h-8 lg:h-10" />
                </Link>
                <Link to="/auth" className="text-xs text-slate-500 hover:text-[#FFFF00] font-mono transition-colors lg:hidden">
                  Já sou cliente →
                </Link>
              </div>

              {/* Headline */}
              <div className="mb-8 lg:mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-[#FFFF00]/20 bg-[#FFFF00]/5">
                  <Plane className="w-3.5 h-3.5 text-[#FFFF00]" />
                  <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-[#FFFF00]">
                    Acesso em minutos
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-bold mb-3 tracking-tight leading-tight">
                  Você está a 1 passo de operar como um{" "}
                  <span className="text-[#FFFF00]">corretor de alta performance.</span>
                </h1>
                <p className="text-slate-400 text-sm lg:text-base font-mono max-w-md">
                  Crie sua conta e confirme o pagamento. Acesso liberado em minutos.
                </p>
              </div>

              {/* Progress Steps — horizontal on desktop */}
              <div className="flex items-center gap-2 sm:gap-4 mb-8 lg:mb-10">
                {[
                  { step: 1, label: "Criar conta", active: true },
                  { step: 2, label: "Confirmar pagamento", active: false },
                  { step: 3, label: "Acesso liberado", active: false },
                ].map(({ step, label, active }) => (
                  <div key={step} className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      active ? "bg-[#FFFF00] text-black" : "bg-[#1a1a1a] text-slate-500 border border-[#333]"
                    }`}>
                      {step}
                    </div>
                    <span className={`text-xs sm:text-sm font-mono hidden sm:inline whitespace-nowrap ${active ? "text-white" : "text-slate-500"}`}>
                      {label}
                    </span>
                    {step < 3 && <div className="w-6 sm:w-10 h-px bg-[#333]" />}
                  </div>
                ))}
              </div>

              {/* Plan Cards */}
              <div className="space-y-4 flex-1">
                <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wider mb-3">Escolha seu plano</h2>

                <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
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
                        className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 ${
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
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
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
                            <li key={b} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#FFFF00] shrink-0 mt-0.5" />
                              <span>{b}</span>
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
                </div>

                {/* Price summary — desktop: bottom of left panel */}
                <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4 font-mono mt-4">
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
            </div>
          </div>

          {/* RIGHT PANEL — Sign up form (desktop: centered vertically) */}
          <div className="lg:w-[45%] xl:w-[50%] flex items-center justify-center p-6 sm:p-8 lg:p-12 xl:p-16">
            <div className="w-full max-w-md">
              {/* Desktop-only login link at top-right */}
              <div className="hidden lg:flex justify-end mb-8">
                <Link to="/auth" className="text-sm text-slate-500 hover:text-[#FFFF00] font-mono transition-colors">
                  Já sou cliente? <span className="text-[#FFFF00]">Fazer login →</span>
                </Link>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 sm:p-8 lg:p-10">
                <div className="mb-8">
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">Crie sua conta</h2>
                  <p className="text-sm text-slate-500 font-mono">Preencha abaixo e vá para o pagamento.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
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
                        className="w-full pl-10 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
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
                        className="w-full pl-10 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
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
                        className="w-full pl-10 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
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
                <div className="mt-8 pt-6 border-t border-[#1a1a1a] grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Shield, text: "Pagamento 100% seguro via Stripe" },
                    { icon: Check, text: "Sem fidelidade • Cancele quando quiser" },
                    { icon: Lock, text: "Dados protegidos (LGPD)" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <Icon className="w-3.5 h-3.5 text-[#FFFF00]/50 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>

                {/* Mobile login link */}
                <div className="mt-6 pt-4 border-t border-[#1a1a1a] text-center lg:hidden">
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
