import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Download, Share, Plane } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();
  const routeLocation = useLocation();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const checkUserRoleAndRedirect = async (userId: string) => {
    try {
      const from = (routeLocation.state as any)?.from;

      const { data: rolesData, error } = await (supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId) as any);

      if (error) {
        console.error("Erro ao buscar role:", error);
        navigate("/admin");
        return;
      }

      const roles = (rolesData || []).map((r: { role: string }) => r.role);
      
      if (from) {
        navigate(from, { replace: true });
      } else if (roles.includes("broker") || roles.includes("leader")) {
        navigate("/corretor/admin");
      } else {
        navigate("/admin");
      }
    } catch (error) {
      console.error("Erro ao verificar role:", error);
      navigate("/admin");
    }
  };

  useEffect(() => {
    // Check current session immediately (avoids hanging on onAuthStateChange delay)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserRoleAndRedirect(session.user.id);
      } else {
        setIsCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
        if (session) {
          await checkUserRoleAndRedirect(session.user.id);
        } else {
          setIsCheckingAuth(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      if (data.user) await checkUserRoleAndRedirect(data.user.id);
    } catch (error: any) {
      if (error.message === "Invalid login credentials") {
        toast.error("Email ou senha incorretos.");
      } else {
        toast.error(error.message || "Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-mono text-sm">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login | Copilot Broker</title>
      </Helmet>
      <div className="min-h-screen bg-black flex pt-safe">
        {/* Visual Panel - Desktop */}
        <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-black">
          {/* Runway lights */}
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#FFFF00]/15 to-transparent" />
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 -translate-x-1/2 h-px bg-[#FFFF00]/8"
                style={{ top: `${8 + i * 8}%`, width: `${20 + i * 5}%` }}
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`ll-${i}`} className="absolute" style={{ left: "30%", top: `${15 + i * 10}%` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFFF00]/30" style={{ animationDelay: `${i * 200}ms`, animation: "pulse 2s ease-in-out infinite" }} />
              </div>
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`lr-${i}`} className="absolute" style={{ right: "30%", top: `${15 + i * 10}%` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFFF00]/30" style={{ animationDelay: `${i * 200}ms`, animation: "pulse 2s ease-in-out infinite" }} />
              </div>
            ))}
          </div>

          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FFFF00]/[0.02] rounded-full blur-[120px]" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
            <img src={copilotLogo} alt="Copilot Broker" className="h-20 mb-10" />

            <div className="flex items-center gap-3 mb-4">
              <Plane className="w-5 h-5 text-[#FFFF00]/50 -rotate-45" />
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-[#FFFF00]/40">
                Flight Deck Access
              </p>
              <Plane className="w-5 h-5 text-[#FFFF00]/50 rotate-[135deg]" />
            </div>

            <h1 className="font-mono text-4xl lg:text-5xl font-bold text-white text-center mb-4 tracking-tight">
              Central de
              <span className="block text-[#FFFF00]">Comando</span>
            </h1>

            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#FFFF00] to-transparent rounded-full mb-6" />

            <p className="text-slate-500 text-sm text-center max-w-sm font-mono leading-relaxed">
              Gerencie seus leads, acompanhe vendas e potencialize resultados com IA
            </p>

            {/* HUD corners */}
            <div className="absolute top-8 left-8 w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[#FFFF00]/25 to-transparent" />
              <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-[#FFFF00]/25 to-transparent" />
            </div>
            <div className="absolute top-8 right-8 w-16 h-16">
              <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-[#FFFF00]/25 to-transparent" />
              <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-[#FFFF00]/25 to-transparent" />
            </div>
            <div className="absolute bottom-8 left-8 w-16 h-16">
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-[#FFFF00]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#FFFF00]/25 to-transparent" />
            </div>
            <div className="absolute bottom-8 right-8 w-16 h-16">
              <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-[#FFFF00]/25 to-transparent" />
              <div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#FFFF00]/25 to-transparent" />
            </div>
          </div>
        </div>

        {/* Login Form Panel */}
        <div className="w-full lg:w-2/5 flex items-center justify-center p-6 relative">
          <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#FFFF00]/15 to-transparent" />

          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <img src={copilotLogo} alt="Copilot Broker" className="h-14 mx-auto mb-4" />
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#FFFF00]/40">
                Flight Deck Access
              </p>
            </div>

            {/* Card */}
            <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
              <div className="hidden lg:block mb-8">
                <h2 className="text-xl font-mono font-bold text-white mb-1.5">Entrar</h2>
                <p className="text-slate-500 text-sm font-mono">Acesse sua conta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-mono font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-mono font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-black border border-[#222] rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#FFFF00]/40 focus:ring-2 focus:ring-[#FFFF00]/10 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#FFFF00] text-black font-mono font-bold text-sm uppercase tracking-wider rounded-xl transition-all hover:shadow-[0_0_40px_rgba(255,255,0,0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    "Decolar"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
                <p className="text-center text-sm text-slate-500 font-mono">
                  Não tem conta?{" "}
                  <Link to="/signup?plan=broker" className="text-[#FFFF00] hover:text-[#FFFF00]/80 hover:underline font-medium transition-colors">
                    Criar conta
                  </Link>
                </p>
              </div>

              {!isInstalled && (
                <div className="mt-4">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstallClick}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black border border-[#222] text-slate-400 text-sm font-mono hover:border-[#FFFF00]/30 hover:text-slate-300 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#FFFF00]" />
                      Instalar App
                    </button>
                  ) : isIOS ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black border border-[#222] text-slate-500 text-xs font-mono">
                      <Download className="w-4 h-4 text-[#FFFF00] shrink-0" />
                      <p>
                        <span className="text-slate-400 font-medium">Instale o app:</span>{" "}
                        toque em <Share className="w-3 h-3 inline -mt-0.5 text-slate-400" /> e depois{" "}
                        <span className="text-slate-400">"Adicionar à Tela Início"</span>
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center mt-6">
              <img src={copilotLogo} alt="Copilot Broker" className="h-6 opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
