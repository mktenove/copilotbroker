import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import logoEnove from "@/assets/logo-enove.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  const checkUserRoleAndRedirect = async (userId: string) => {
    try {
      const { data: roleData, error } = await (supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId)
        .maybeSingle() as any);

      if (error) {
        console.error("Erro ao buscar role:", error);
        navigate("/admin");
        return;
      }

      if (roleData?.role === "broker") {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await checkUserRoleAndRedirect(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await checkUserRoleAndRedirect(session.user.id);
      } else {
        setIsCheckingAuth(false);
      }
    });

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success("Login realizado com sucesso!");
      
      if (data.user) {
        await checkUserRoleAndRedirect(data.user.id);
      }
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
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>CRM | Login - Enove</title>
      </Helmet>
      <div className="min-h-screen bg-[#0a0a0c] flex">
      {/* Visual Panel - Desktop only */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0f0f12] to-[#1a1a1e]">
        {/* Geometric pattern - with subtle float animation */}
        <div className="absolute inset-0 opacity-10 animate-float-subtle">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,0,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,0,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }} 
          />
        </div>
        
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FFFF00]/5 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <img 
            src={logoEnove} 
            alt="Enove" 
            className="h-16 mb-8 opacity-0 animate-fade-in-down" 
          />
          <h1 className="font-serif text-5xl font-bold text-white text-center mb-4 opacity-0 animate-fade-in-left delay-200">
            Central de Gestão
          </h1>
          <div className="h-1 bg-[#FFFF00] rounded-full mb-6 opacity-0 animate-expand-width delay-400" />
          <p className="text-slate-400 text-lg text-center max-w-md opacity-0 animate-fade-up delay-500">
            Acesse o painel para gerenciar seus leads e acompanhar suas vendas
          </p>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src={logoEnove} 
              alt="Enove" 
              className="h-12 mx-auto mb-6 opacity-0 animate-fade-in" 
            />
            <h1 className="font-serif text-3xl font-bold text-white mb-2 opacity-0 animate-fade-up delay-100">
              Acesso ao Painel
            </h1>
            <div className="w-16 h-0.5 bg-[#FFFF00] mx-auto opacity-0 animate-expand-width delay-200" />
          </div>

          {/* Card */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-2xl p-8 shadow-2xl shadow-black/50 opacity-0 animate-scale-in delay-300 lg:delay-500">
            {/* Desktop Title */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2 opacity-0 animate-fade-in delay-600">Bem-vindo</h2>
              <p className="text-slate-400 opacity-0 animate-fade-in delay-700">Entre com suas credenciais</p>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="opacity-0 animate-fade-up delay-[400ms] lg:delay-[800ms]">
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div className="opacity-0 animate-fade-up delay-[500ms] lg:delay-[900ms]">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              {/* Login Button */}
              <div className="opacity-0 animate-scale-in delay-[600ms] lg:delay-[1000ms]">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#FFFF00] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,0,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </div>
            </form>
            
            {/* Broker Link */}
            <div className="mt-6 pt-6 border-t border-[#2a2a2e] opacity-0 animate-fade-in delay-[700ms] lg:delay-[1100ms]">
              <p className="text-center text-sm text-slate-400">
                É corretor?{" "}
                <Link to="/corretor/cadastro" className="text-[#FFFF00] hover:underline font-medium">
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Auth;
