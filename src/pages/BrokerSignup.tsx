import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone, Link as LinkIcon, Building2, Copy, Check, ExternalLink } from "lucide-react";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import { Checkbox } from "@/components/ui/checkbox";
import logoEnove from "@/assets/logo-enove.png";

interface Project {
  id: string;
  name: string;
  slug: string;
  city: string;
  city_slug: string | null;
}

type Step = "auth" | "profile" | "projects";

const BrokerSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
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

  // Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, slug, city, city_slug")
        .eq("is_active", true)
        .order("name");
      
      if (!error && data) {
        setAvailableProjects(data);
      }
    };
    fetchProjects();
  }, []);

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
    
    // Move to projects step
    setStep("projects");
  };

  const handleFinalSubmit = async () => {
    if (selectedProjectIds.length === 0) {
      toast.error("Selecione pelo menos um empreendimento.");
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
      
      // Create broker profile
      const { data: brokerData, error: brokerError } = await supabase
        .from("brokers")
        .insert({
          user_id: user.id,
          name: profileData.name.trim(),
          email: authData.email,
          whatsapp: profileData.whatsapp.trim(),
          slug: profileData.slug,
          is_active: true,
        })
        .select("id")
        .single();
      
      if (brokerError) throw brokerError;
      
      // Create broker_projects associations
      const brokerProjectsData = selectedProjectIds.map((projectId) => ({
        broker_id: brokerData.id,
        project_id: projectId,
        is_active: true,
      }));
      
      const { error: projectsError } = await supabase
        .from("broker_projects")
        .insert(brokerProjectsData);
      
      if (projectsError) {
        console.error("Error creating broker projects:", projectsError);
        // Don't throw - broker was created successfully
      }
      
      toast.success("Perfil criado com sucesso! Bem-vindo à Enove.");
      navigate("/corretor/admin");
    } catch (error: any) {
      console.error("Erro ao criar perfil:", error);
      toast.error("Erro ao criar perfil. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const getProjectUrl = (project: Project) => {
    if (project.slug === "estanciavelha") {
      return `/estanciavelha/${profileData.slug}`;
    }
    return `/${project.city_slug}/${project.slug}/${profileData.slug}`;
  };

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const selectedProjects = availableProjects.filter((p) =>
    selectedProjectIds.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col lg:flex-row">
      {/* Left Panel - Visual Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-[60%] xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0f0f12] to-[#1a1a1e] min-h-screen">
        {/* Geometric Pattern - with subtle float animation */}
        <div className="absolute inset-0 animate-float-subtle">
          <div className="absolute top-20 left-20 w-96 h-96 border border-primary/10 rotate-45" />
          <div className="absolute top-40 left-40 w-72 h-72 border border-primary/5 rotate-45" />
          <div className="absolute bottom-20 right-20 w-80 h-80 border border-primary/10 rotate-12" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-24">
          <img 
            src={logoEnove} 
            alt="Enove" 
            className="h-16 w-auto object-contain mb-10 opacity-0 animate-fade-in-down"
          />
          
          <h1 className="font-serif text-4xl xl:text-6xl font-bold text-white leading-tight mb-6 opacity-0 animate-fade-in-left delay-200">
            Seja um
            <br />
            <span className="text-primary">Corretor Enove</span>
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
            <Link to="/estanciavelha">
              <img 
                src={logoEnove} 
                alt="Enove" 
                className="h-10 w-auto object-contain mx-auto mb-6 opacity-0 animate-fade-in"
              />
            </Link>
            <h1 className="font-serif text-3xl font-bold text-white mb-3 opacity-0 animate-fade-up delay-100">
              Cadastro de Corretor
            </h1>
            <div className="w-16 h-0.5 bg-primary mx-auto opacity-0 animate-expand-width delay-200" />
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 opacity-0 animate-fade-in delay-600">
              Criar sua conta
            </h2>
            <p className="text-slate-400 opacity-0 animate-fade-in delay-700">
              {step === "auth" 
                ? "Comece criando suas credenciais" 
                : step === "profile"
                ? "Complete seu perfil de corretor"
                : "Escolha seus empreendimentos"
              }
            </p>
          </div>

          {/* Progress Indicator - 3 Steps */}
          <div className="flex items-center justify-center gap-3 mb-8 opacity-0 animate-fade-in delay-300 lg:delay-[800ms]">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "auth" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-primary/20 text-primary"
              }`}>
                1
              </div>
              <span className={`text-sm transition-colors hidden sm:inline ${step === "auth" ? "text-white" : "text-slate-500"}`}>
                Conta
              </span>
            </div>
            
            <div className="w-6 h-px bg-border" />
            
            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "profile" 
                  ? "bg-primary text-primary-foreground" 
                  : step === "projects"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                2
              </div>
              <span className={`text-sm transition-colors hidden sm:inline ${step === "profile" ? "text-white" : "text-slate-500"}`}>
                Perfil
              </span>
            </div>
            
            <div className="w-6 h-px bg-border" />
            
            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === "projects" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                3
              </div>
              <span className={`text-sm transition-colors hidden sm:inline ${step === "projects" ? "text-white" : "text-slate-500"}`}>
                Empreendimentos
              </span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/50 opacity-0 animate-scale-in delay-[400ms] lg:delay-[900ms]">
            {step === "auth" ? (
              <form onSubmit={handleAuthSubmit} className="space-y-5">
                {/* Email */}
                <div className="opacity-0 animate-fade-up delay-[500ms] lg:delay-[1000ms]">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="opacity-0 animate-fade-up delay-[600ms] lg:delay-[1100ms]">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={authData.password}
                      onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-12 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="opacity-0 animate-fade-up delay-[700ms] lg:delay-[1200ms]">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Digite a senha novamente"
                      value={authData.confirmPassword}
                      onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-12 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="opacity-0 animate-scale-in delay-[800ms] lg:delay-[1300ms]">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {isLoading ? "Criando conta..." : "Continuar"}
                  </button>
                </div>

                <p className="text-center text-sm text-slate-400 opacity-0 animate-fade-in delay-[900ms] lg:delay-[1400ms]">
                  Já tem uma conta?{" "}
                  <Link to="/auth" className="text-primary hover:underline font-medium">
                    Fazer login
                  </Link>
                </p>
              </form>
            ) : step === "profile" ? (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Name */}
                <div className="opacity-0 animate-fade-up delay-100">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={profileData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="opacity-0 animate-fade-up delay-200">
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-300 mb-2">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <WhatsAppInput
                      id="whatsapp"
                      value={profileData.whatsapp}
                      onChange={(value) => setProfileData({ ...profileData, whatsapp: value })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Slug */}
                <div className="opacity-0 animate-fade-up delay-300">
                  <label htmlFor="slug" className="block text-sm font-medium text-slate-300 mb-2">
                    Seu Link Personalizado
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="slug"
                      type="text"
                      placeholder="seu-nome"
                      value={profileData.slug}
                      onChange={(e) => setProfileData({ ...profileData, slug: generateSlug(e.target.value) })}
                      disabled={isLoading}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Este será usado em todos os seus links de empreendimentos
                  </p>
                </div>

                <div className="flex gap-3 pt-2 opacity-0 animate-scale-in delay-[400ms]">
                  <button
                    type="button"
                    onClick={() => setStep("auth")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-muted text-slate-300 font-medium rounded-xl hover:bg-muted/80 transition-all disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    Continuar
                  </button>
                </div>
              </form>
            ) : (
              /* Step 3: Projects Selection */
              <div className="space-y-5">
                <div className="opacity-0 animate-fade-up delay-100">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Escolha seus empreendimentos
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecione os empreendimentos que deseja trabalhar:
                  </p>
                  
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {availableProjects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border cursor-pointer hover:border-primary/30 transition-colors"
                      >
                        <Checkbox
                          checked={selectedProjectIds.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div>
                          <p className="font-medium text-white">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.city}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preview Links */}
                {selectedProjects.length > 0 && (
                  <div className="opacity-0 animate-fade-up delay-200 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">
                      Seus links personalizados:
                    </h4>
                    <div className="space-y-2">
                      {selectedProjects.map((project) => {
                        const url = getProjectUrl(project);
                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-4 h-4 text-primary shrink-0" />
                              <code className="text-xs text-slate-300 truncate">
                                {url}
                              </code>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => copyUrl(url)}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-white transition-colors"
                              >
                                {copiedUrl === url ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-white transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2 opacity-0 animate-scale-in delay-[400ms]">
                  <button
                    type="button"
                    onClick={() => setStep("profile")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-muted text-slate-300 font-medium rounded-xl hover:bg-muted/80 transition-all disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button 
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isLoading || selectedProjectIds.length === 0}
                    className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {isLoading ? "Criando perfil..." : "Finalizar Cadastro"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao se cadastrar, você concorda com nossos{" "}
            <Link to="/termos" className="text-primary hover:underline">
              Termos de Uso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrokerSignup;
