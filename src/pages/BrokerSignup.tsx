import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import logoEnove from "@/assets/logo-enove.png";

const BrokerSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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

  // formatWhatsApp removed - now using WhatsAppInput component

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/estanciavelha">
            <img 
              src={logoEnove} 
              alt="Enove" 
              className="h-12 mx-auto mb-6"
            />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Cadastro de Corretor
          </h1>
          <p className="text-muted-foreground mt-2">
            {step === "auth" 
              ? "Crie sua conta para começar" 
              : "Complete seu perfil de corretor"
            }
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-16 rounded-full ${step === "auth" ? "bg-primary" : "bg-primary/30"}`} />
          <div className={`h-2 w-16 rounded-full ${step === "profile" ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === "auth" ? (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={authData.confirmPassword}
                onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Continuar"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/auth" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={profileData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <WhatsAppInput
                id="whatsapp"
                value={profileData.whatsapp}
                onChange={(value) => setProfileData({ ...profileData, whatsapp: value })}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Seu Link Personalizado</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /estanciavelha/
                </span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="seu-nome"
                  value={profileData.slug}
                  onChange={(e) => setProfileData({ ...profileData, slug: generateSlug(e.target.value) })}
                  disabled={isLoading}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Este será o link da sua landing page personalizada
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("auth")}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Criando perfil..." : "Criar Perfil"}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Ao se cadastrar, você concorda com nossos{" "}
          <Link to="/termos" className="text-primary hover:underline">
            Termos de Uso
          </Link>
        </p>
      </div>
    </div>
  );
};

export default BrokerSignup;
