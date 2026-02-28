import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone } from "lucide-react";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import logoEnove from "@/assets/logo-enove.png";

type Step = "auth" | "profile";

const BrokerSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [profileData, setProfileData] = useState({
    name: "",
    whatsapp: "",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authData.email || !authData.password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (authData.password !== authData.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (authData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      if (data.user) {
        toast.success("Conta criada! Agora complete seu perfil.");
        setStep("profile");
      }
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("Este email já está cadastrado. Faça login.");
      } else {
        toast.error("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name || !profileData.whatsapp) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (!isValidBrazilianWhatsApp(profileData.whatsapp)) {
      toast.error("Insira um número de WhatsApp completo com código do Brasil (+55).");
      return;
    }
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/auth");
        return;
      }
      const slug = generateSlug(profileData.name);
      const { error: brokerError } = await supabase
        .from("brokers")
        .insert({
          user_id: user.id,
          name: profileData.name.trim(),
          email: authData.email,
          whatsapp: profileData.whatsapp.trim(),
          slug,
          is_active: true,
        });
      if (brokerError) throw brokerError;
      toast.success("Perfil criado com sucesso! Bem-vindo à Enove.");
      navigate("/corretor/admin");
    } catch (error: any) {
      console.error("Erro ao criar perfil:", error);
      toast.error("Erro ao criar perfil. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col lg:flex-row">
      {/* Left Panel - Visual Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-[60%] xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0f0f12] to-[#1a1a1e] min-h-screen">
        <div className="absolute inset-0 animate-float-subtle">
          <div className="absolute top-20 left-20 w-96 h-96 border border-primary/10 rotate-45" />
          <div className="absolute top-40 left-40 w-72 h-72 border border-primary/5 rotate-45" />
          <div className="absolute bottom-20 right-20 w-80 h-80 border border-primary/10 rotate-12" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-24">
          <img src={logoEnove} alt="Enove" className="h-16 w-auto object-contain mb-10 opacity-0 animate-fade-in-down" />
          <h1 className="font-serif text-4xl xl:text-6xl font-bold text-white leading-tight mb-6 opacity-0 animate-fade-in-left delay-200">
            Seja um<br /><span className="text-primary">Corretor Enove</span>
          </h1>
          <div className="h-1 bg-primary mb-8 opacity-0 animate-expand-width delay-400" />
          <p className="text-lg xl:text-xl text-slate-400 max-w-md leading-relaxed opacity-0 animate-fade-up delay-500">
            Cadastre-se e tenha acesso exclusivo à nossa plataforma de gestão de leads e empreendimentos premium.
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-[40%] xl:w-2/5 flex items-center justify-center p-6 lg:p-8 xl:p-12 min-h-screen lg:overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/">
              <img src={logoEnove} alt="Enove" className="h-10 w-auto object-contain mx-auto mb-6 opacity-0 animate-fade-in" />
            </Link>
            <h1 className="font-serif text-3xl font-bold text-white mb-3 opacity-0 animate-fade-up delay-100">
              Cadastro de Corretor
            </h1>
            <div className="w-16 h-0.5 bg-primary mx-auto opacity-0 animate-expand-width delay-200" />
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 opacity-0 animate-fade-in delay-600">Criar sua conta</h2>
            <p className="text-slate-400 opacity-0 animate-fade-in delay-700">
              {step === "auth" ? "Comece criando suas credenciais" : "Complete seu perfil de corretor"}
            </p>
          </div>

          {/* Progress Indicator - 2 Steps */}
          <div className="flex items-center justify-center gap-3 mb-8 opacity-0 animate-fade-in delay-300 lg:delay-[800ms]">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "auth" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
              }`}>1</div>
              <span className={`text-sm hidden sm:inline ${step === "auth" ? "text-white" : "text-slate-500"}`}>Conta</span>
            </div>
            <div className="w-6 h-px bg-border" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "profile" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>2</div>
              <span className={`text-sm hidden sm:inline ${step === "profile" ? "text-white" : "text-slate-500"}`}>Perfil</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/50 opacity-0 animate-scale-in delay-[400ms] lg:delay-[900ms]">
            {step === "auth" ? (
              <form onSubmit={handleAuthSubmit} className="space-y-5">
                <div className="opacity-0 animate-fade-up delay-[500ms] lg:delay-[1000ms]">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input id="email" type="email" placeholder="seu@email.com" value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })} disabled={isLoading} required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
                  </div>
                </div>
                <div className="opacity-0 animate-fade-up delay-[600ms] lg:delay-[1100ms]">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                      value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                      disabled={isLoading} required
                      className="w-full pl-12 pr-12 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="opacity-0 animate-fade-up delay-[700ms] lg:delay-[1200ms]">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Digite a senha novamente"
                      value={authData.confirmPassword} onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                      disabled={isLoading} required
                      className="w-full pl-12 pr-12 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-300 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="opacity-0 animate-scale-in delay-[800ms] lg:delay-[1300ms]">
                  <button type="submit" disabled={isLoading}
                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                    {isLoading ? "Criando conta..." : "Continuar"}
                  </button>
                </div>
                <p className="text-center text-sm text-slate-400 opacity-0 animate-fade-in delay-[900ms] lg:delay-[1400ms]">
                  Já tem uma conta?{" "}
                  <Link to="/auth" className="text-primary hover:underline font-medium">Fazer login</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="opacity-0 animate-fade-up delay-100">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input id="name" type="text" placeholder="Seu nome completo" value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={isLoading} required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
                  </div>
                </div>
                <div className="opacity-0 animate-fade-up delay-200">
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-300 mb-2">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <WhatsAppInput id="whatsapp" value={profileData.whatsapp}
                      onChange={(value) => setProfileData({ ...profileData, whatsapp: value })}
                      disabled={isLoading} required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2 opacity-0 animate-scale-in delay-[400ms]">
                  <button type="button" onClick={() => setStep("auth")} disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-muted text-slate-300 font-medium rounded-xl hover:bg-muted/80 transition-all disabled:opacity-50">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button type="submit" disabled={isLoading}
                    className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                    {isLoading ? "Criando perfil..." : "Finalizar Cadastro"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao se cadastrar, você concorda com nossos{" "}
            <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrokerSignup;
