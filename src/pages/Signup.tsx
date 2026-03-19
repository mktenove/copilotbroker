import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Mail, Lock, User, Shield, ArrowRight, CheckCircle, Plane } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // If already logged in with roles, redirect to dashboard
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsCheckingAuth(false);
          return;
        }
        // If post-payment and already logged in: confirm checkout and go to onboarding
        if (sessionId) {
          await supabase.functions.invoke("confirm-checkout", { body: { session_id: sessionId } });
          navigate(`/onboarding?session_id=${sessionId}`, { replace: true });
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
          setIsCheckingAuth(false);
        }
      } catch {
        setIsCheckingAuth(false);
      }
    };
    checkSession();
  }, [navigate, sessionId]);

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
    if (!agreedTerms) {
      toast.error("Aceite os Termos de Uso para continuar.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) {
        if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
          toast.error("Este email já está cadastrado. Faça login.", {
            action: { label: "Ir para login", onClick: () => navigate("/auth") },
          });
          return;
        }
        throw error;
      }

      if (!data.session && (!data.user || data.user.identities?.length === 0)) {
        toast.error("Este email já está cadastrado. Faça login.", {
          action: { label: "Ir para login", onClick: () => navigate("/auth") },
        });
        return;
      }

      if (data.session && sessionId) {
        // Post-payment: confirm checkout to create tenant + roles
        const { error: confirmError } = await supabase.functions.invoke("confirm-checkout", {
          body: { session_id: sessionId },
        });
        if (confirmError) throw confirmError;
        toast.success("Conta criada! Configurando seu acesso...");
        navigate(`/onboarding?session_id=${sessionId}`);
      } else if (data.session) {
        toast.success("Conta criada!");
        navigate("/");
      } else {
        toast.success("Verifique seu email para confirmar e depois faça login.");
        navigate("/auth");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const steps = sessionId
    ? [
        { step: 1, label: "Pagamento", done: true },
        { step: 2, label: "Criar conta", active: true },
        { step: 3, label: "Acesso liberado", active: false },
      ]
    : [
        { step: 1, label: "Criar conta", active: true },
        { step: 2, label: "Confirmar pagamento", active: false },
        { step: 3, label: "Acesso liberado", active: false },
      ];

  return (
    <>
      <Helmet>
        <title>Criar Conta | Copilot Broker</title>
        <meta name="description" content="Crie sua conta no Copilot Broker e comece a vender mais com IA." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <div className="flex flex-col lg:flex-row min-h-screen">

          {/* LEFT PANEL */}
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
                {sessionId ? (
                  <>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-bold mb-3 tracking-tight leading-tight">
                      Pagamento confirmado!{" "}
                      <span className="text-primary">Agora crie sua conta.</span>
                    </h1>
                    <p className="text-muted-foreground text-sm lg:text-base font-mono max-w-md">
                      Último passo — crie sua conta para acessar o painel.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-bold mb-3 tracking-tight leading-tight">
                      Você está a 1 passo de operar como um{" "}
                      <span className="text-primary">corretor de alta performance.</span>
                    </h1>
                    <p className="text-muted-foreground text-sm lg:text-base font-mono max-w-md">
                      Crie sua conta e confirme o pagamento. Acesso liberado em minutos.
                    </p>
                  </>
                )}
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 sm:gap-4 mb-8 lg:mb-10">
                {steps.map(({ step, label, done, active }, i) => (
                  <div key={step} className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                    <span className={`text-xs sm:text-sm font-mono hidden sm:inline whitespace-nowrap ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                    {i < steps.length - 1 && <div className="w-6 sm:w-10 h-px bg-border" />}
                  </div>
                ))}
              </div>

              {/* Post-payment confirmation badge */}
              {sessionId && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Plano Broker ativado</p>
                    <p className="text-xs text-muted-foreground font-mono">Pagamento processado com sucesso pelo Stripe</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL — Sign up form */}
          <div className="lg:w-[45%] xl:w-[50%] flex items-center justify-center p-6 sm:p-8 lg:p-12 xl:p-16">
            <div className="w-full max-w-md">
              <div className="hidden lg:flex justify-end mb-8">
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary font-mono transition-colors">
                  Já sou cliente? <span className="text-primary">Fazer login →</span>
                </Link>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 lg:p-10">
                <div className="mb-8">
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Crie sua conta</h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {sessionId ? "Preencha abaixo para acessar seu painel." : "Preencha abaixo e vá para o pagamento."}
                  </p>
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
                        {sessionId ? "Criando conta..." : "Criando conta..."}
                      </>
                    ) : (
                      <>
                        {sessionId ? "Criar conta e acessar" : "Criar conta e ir para o pagamento"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

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
