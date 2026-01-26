import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone, Link as LinkIcon } from "lucide-react";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import logoEnove from "@/assets/logo-enove.png";

const BrokerSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Auth data
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: "",
    whatsapp: "",
    slug: "",
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

  const handleNameChange = (name: string) => {
    setProfileData({
      ...profileData,
      name,
      slug: generateSlug(name),
    });
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
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      if (data.user) {
        toast.success("Conta criada! Agora complete seu perfil.");
        setStep("profile");
      }
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
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
    
    if (!profileData.name || !profileData.whatsapp || !profileData.slug) {
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
      
      // Check if slug is already taken
      const { data: existingBroker } = await supabase
        .from("brokers")
        .select("id")
        .eq("slug", profileData.slug)
        .maybeSingle();
      
      if (existingBroker) {
        toast.error("Este link personalizado já está em uso. Escolha outro.");
        return;
      }
      
      // Create broker profile
      const { error } = await supabase
        .from("brokers")
        .insert({
          user_id: user.id,
          name: profileData.name.trim(),
          email: authData.email,
          whatsapp: profileData.whatsapp.trim(),
          slug: profileData.slug,
          is_active: true,
        });
      
      if (error) throw error;
      
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
        {/* Geometric Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 border border-[#FFFF00]/10 rotate-45" />
          <div className="absolute top-40 left-40 w-72 h-72 border border-[#FFFF00]/5 rotate-45" />
          <div className="absolute bottom-20 right-20 w-80 h-80 border border-[#FFFF00]/10 rotate-12" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FFFF00]/5 rounded-full blur-[100px]" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-24">
          <img 
            src={logoEnove} 
            alt="Enove" 
           className="h-16 w-auto object-contain mb-10"
          />
          
          <h1 className="font-serif text-4xl xl:text-6xl font-bold text-white leading-tight mb-6">
            Seja um
            <br />
            <span className="text-[#FFFF00]">Corretor Enove</span>
          </h1>
          
          <div className="w-24 h-1 bg-[#FFFF00] mb-8" />
          
          <p className="text-lg xl:text-xl text-slate-400 max-w-md leading-relaxed">
            Cadastre-se e tenha acesso exclusivo à nossa plataforma de gestão de leads e empreendimentos premium.
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-[40%] xl:w-2/5 flex items-center justify-center p-6 lg:p-8 xl:p-12 min-h-screen lg:overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/estanciavelha">
              <img 
                src={logoEnove} 
                alt="Enove" 
               className="h-10 w-auto object-contain mx-auto mb-6"
              />
            </Link>
            <h1 className="font-serif text-3xl font-bold text-white mb-3">
              Cadastro de Corretor
            </h1>
            <div className="w-16 h-0.5 bg-[#FFFF00] mx-auto" />
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Criar sua conta
            </h2>
            <p className="text-slate-400">
              {step === "auth" 
                ? "Comece criando suas credenciais" 
                : "Complete seu perfil de corretor"
              }
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "auth" 
                  ? "bg-[#FFFF00] text-black" 
                  : "bg-[#FFFF00]/20 text-[#FFFF00]"
              }`}>
                1
              </div>
              <span className={`text-sm transition-colors ${step === "auth" ? "text-white" : "text-slate-500"}`}>
                Conta
              </span>
            </div>
            
            <div className="w-8 h-px bg-[#2a2a2e]" />
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "profile" 
                  ? "bg-[#FFFF00] text-black" 
                  : "bg-[#2a2a2e] text-slate-500"
              }`}>
                2
              </div>
              <span className={`text-sm transition-colors ${step === "profile" ? "text-white" : "text-slate-500"}`}>
                Perfil
              </span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-2xl p-8 shadow-2xl shadow-black/50">
            {step === "auth" ? (
              <form onSubmit={handleAuthSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={authData.password}
                      onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-12 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Digite a senha novamente"
                      value={authData.confirmPassword}
                      onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-12 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 bg-[#FFFF00] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,0,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {isLoading ? "Criando conta..." : "Continuar"}
                </button>

                <p className="text-center text-sm text-slate-400">
                  Já tem uma conta?{" "}
                  <Link to="/auth" className="text-[#FFFF00] hover:underline font-medium">
                    Fazer login
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={profileData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-300 mb-2">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
                    <WhatsAppInput
                      id="whatsapp"
                      value={profileData.whatsapp}
                      onChange={(value) => setProfileData({ ...profileData, whatsapp: value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-slate-300 mb-2">
                    Seu Link Personalizado
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <div className="flex items-center">
                      <span className="absolute left-12 text-sm text-slate-500 whitespace-nowrap pointer-events-none">
                        /estanciavelha/
                      </span>
                      <input
                        id="slug"
                        type="text"
                        placeholder="seu-nome"
                        value={profileData.slug}
                        onChange={(e) => setProfileData({ ...profileData, slug: generateSlug(e.target.value) })}
                        disabled={isLoading}
                        required
                        className="w-full pl-[9.5rem] pr-4 py-3.5 bg-[#0f0f12] border border-[#2a2a2e] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFFF00]/50 focus:ring-2 focus:ring-[#FFFF00]/20 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Este será o link da sua landing page personalizada
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("auth")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-[#2a2a2e] text-slate-300 font-medium rounded-xl hover:bg-[#3a3a3e] transition-all disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 py-4 bg-[#FFFF00] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,0,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {isLoading ? "Criando perfil..." : "Criar Perfil"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Ao se cadastrar, você concorda com nossos{" "}
            <Link to="/termos" className="text-[#FFFF00] hover:underline">
              Termos de Uso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrokerSignup;
