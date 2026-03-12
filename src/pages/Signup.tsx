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

  // If already logged in, redirect to dashboard instead of starting checkout again
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsCheckingAuth(false);
          return;
        }
        const { data: rolesData } = await (supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", session.user.id) as any);
        const roles = (rolesData || []).map((r: { role: string }) => r.role);
        if (roles.includes("broker") || roles.includes("leader")) {
          navigate("/corretor/admin", { replace: true });
        } else if (roles.includes("admin")) {
          navigate("/admin", { replace: true });
        } else {
          // No role yet — show form so they can sign up and go to checkout
          setIsCheckingAuth(false);
        }
      } catch {
        setIsCheckingAuth(false);
      }
    };
    checkSession();
  }, [navigate]);

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
    console.log("[SIGNUP] handleSubmit called", { name, email, agreedTerms });

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!agreedTerms) {
      toast.error("Aceite os Termos de Uso para continuar.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[SIGNUP] calling supabase.auth.signUp...");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      console.log("[SIGNUP] signUp result", { user: data?.user?.id, identities: data?.user?.identities?.length, session: !!data?.session, error: error?.message });

      if (error) {
        console.error("[SIGNUP] error from signUp:", error.message);
        if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
          toast.error(
            "Este email já está cadastrado. Faça login.",
            { action: { label: "Ir para login", onClick: () => navigate("/auth") } }
          );
          return;
        }
        throw error;
      }

      // Supabase silently handles duplicate emails when email confirmation is enabled.
      // It returns a fake user with empty identities array instead of an error.
      if (!data.session && (!data.user || data.user.identities?.length === 0)) {
        console.log("[SIGNUP] duplicate email detected via empty identities");
        toast.error(
          "Este email já está cadastrado. Faça login.",
          { action: { label: "Ir para login", onClick: () => navigate("/auth") } }
        );
        return;
      }

      if (data.session) {
        toast.success("Conta criada! Redirecionando para pagamento...");
        await startCheckout();
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar e depois faça login.");
        navigate("/auth");
      }
    } catch (err: any) {
      console.error("[SIGNUP] catch:", err);
      toast.error(err.message || "Erro ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  const plan = STRIPE_PLANS[selectedPlan];
  const total = plan.price + (selectedPlan === "imobiliaria" ? extraUsers * EXTRA_USER_PRICE.price : 0);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Verificando...</p>
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

      <div className="min-h-screen bg-background text-foreground">
        <div className="flex flex-col lg:flex-row min-h-screen">

          {/* LEFT PANEL — Branding + Plan Selection */}
          <div className="lg:w-[55%] xl:w-[50%] lg:min-h-screen lg:sticky lg:top-0 bg-gradient-to-br from-background via-background to-card lg:border-r border-border">
            <div className="p-6 sm:p-8 lg:p-12 xl:p-16 flex flex-col h-full">
              {/* Logo */}
              <div className="flex items-center justify-between mb-8 lg:mb-12">
                <Link to="/">
                  <img src={copilotLogo} alt="Copilot Broker" className="h-12 lg:h-14" />
                </Link>
                <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors lg:hidden">
                  Já sou cliente →
                </Link>
              </div>

              {/* Headline */}
              <div className="mb-8 lg:mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-primary/20 bg-primary/5">
                  <Plane className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-primary">
                    Acesso em minutos
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-bold mb-3 tracking-tight leading-tight">
                  Você está a 1 passo de operar como um{" "}
                  <span className="text-primary">corretor de alta performance.</span>
                </h1>
                <p className="text-muted-foreground text-sm lg:text-base font-mono max-w-md">
                  Crie sua conta e confirme o pagamento. Acesso liberado em minutos.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 sm:gap-4 mb-8 lg:mb-10">
                {[
                  { step: 1, label: "Criar conta", active: true },
                  { step: 2, label: "Confirmar pagamento", active: false },
                  { step: 3, label: "Acesso liberado", active: false },
                ].map(({ step, label, active }) => (
                  <div key={step} className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {step}
                    </div>
                    <span className={`text-xs sm:text-sm font-mono hidden sm:inline whitespace-nowrap ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                    {step < 3 && <div className="w-6 sm:w-10 h-px bg-border" />}
                  </div>
                ))}
              </div>

              {/* Plan Cards */}
              <div className="space-y-4 flex-1">
                <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Escolha seu plano</h2>

                <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {(["broker", "imobiliaria"] as PlanType[]).map((key) => {
                    const p = STRIPE_PLANS[key];
                    const isSelected = selectedPlan === key;
                    const Icon = key === "broker" ? Zap : Building2;
                    const bullets = key === "broker"
                      ? ["1 licença", "CRM de lançamentos", "Copiloto IA para WhatsApp", "Sem fidelidade"]
                      : [`3 usuários inclusos (1 admin + 2 corretores)`, `+ R$ ${EXTRA_USER_PRICE.price.toFixed(2).replace(".", ",")} por usuário adicional`, "Roletas de distribuição", "Campanhas de WhatsApp", "Sem fidelidade"];

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPlan(key)}
                        className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-[0_0_30px_hsl(var(--primary)/0.08)]"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        {key === "imobiliaria" && (
                          <span className="absolute -top-2.5 left-5 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full font-mono">
                            Popular
                          </span>
                        )}

                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold">{p.name}</h3>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>

                        <div className="mb-3">
                          <span className="text-2xl font-bold font-mono">
                            R$ {p.price.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-muted-foreground text-sm">/mês</span>
                        </div>

                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {bullets.map((b) => (
                            <li key={b} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>

                        {key === "imobiliaria" && isSelected && (
                          <div className="mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm text-muted-foreground mb-2 font-mono">
                              Usuários extras (R$ {EXTRA_USER_PRICE.price.toFixed(2).replace(".", ",")}/mês cada)
                            </p>
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => setExtraUsers(Math.max(0, extraUsers - 1))} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:border-primary/30">
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-lg font-semibold w-8 text-center font-mono">{extraUsers}</span>
                              <button type="button" onClick={() => setExtraUsers(extraUsers + 1)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:border-primary/30">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            {extraUsers > 0 && (
                              <p className="text-xs text-muted-foreground mt-2 font-mono">
                                Total: {3 + extraUsers} usuários · R$ {total.toFixed(2).replace(".", ",")}/mês
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Price summary */}
                <div className="rounded-xl bg-card border border-border p-4 font-mono mt-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Plano {plan.name}</span>
                    <span>R$ {plan.price.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {selectedPlan === "imobiliaria" && extraUsers > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>{extraUsers} usuário(s) extra(s)</span>
                      <span>R$ {(extraUsers * EXTRA_USER_PRICE.price).toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold mt-3 pt-3 border-t border-border">
                    <span>Total mensal</span>
                    <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Sign up form */}
          <div className="lg:w-[45%] xl:w-[50%] flex items-center justify-center p-6 sm:p-8 lg:p-12 xl:p-16">
            <div className="w-full max-w-md">
              {/* Desktop-only login link */}
              <div className="hidden lg:flex justify-end mb-8">
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary font-mono transition-colors">
                  Já sou cliente? <span className="text-primary">Fazer login →</span>
                </Link>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 lg:p-10">
                <div className="mb-8">
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Crie sua conta</h2>
                  <p className="text-sm text-muted-foreground font-mono">Preencha abaixo e vá para o pagamento.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Nome completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 bg-background border border-border rounded-xl text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 bg-background border border-border rounded-xl text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 bg-background border border-border rounded-xl text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
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
                      className="mt-1 rounded border-border bg-background text-primary focus:ring-primary/20"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      Li e aceito os{" "}
                      <Link to="/termos" className="text-primary hover:underline" target="_blank">
                        Termos de Uso
                      </Link>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-primary-foreground font-mono font-bold text-sm uppercase tracking-wider rounded-xl transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
                <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Shield, text: "Pagamento 100% seguro via Stripe" },
                    { icon: Check, text: "Sem fidelidade • Cancele quando quiser" },
                    { icon: Lock, text: "Dados protegidos (LGPD)" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <Icon className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>

                {/* Mobile login link */}
                <div className="mt-6 pt-4 border-t border-border text-center lg:hidden">
                  <p className="text-sm text-muted-foreground font-mono">
                    Já sou cliente?{" "}
                    <Link to="/auth" className="text-primary hover:underline font-medium">
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
