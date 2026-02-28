import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, UserPlus } from "lucide-react";
import { toast } from "sonner";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de convite não encontrado");
      setIsValidating(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      // Use service role via edge function to validate
      const { data, error } = await supabase.functions.invoke("validate-invite", {
        body: { token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInviteEmail(data.email || "");
    } catch (err: any) {
      setError(err?.message || "Convite inválido");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { token, name: name.trim(), password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast.success("Conta criada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aceitar convite");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Aceitar Convite | CRM</title></Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>
              {error ? "Convite Inválido" : success ? "Conta Criada!" : "Aceitar Convite"}
            </CardTitle>
            <CardDescription>
              {error
                ? error
                : success
                ? "Sua conta foi criada e você já tem acesso ao CRM."
                : `Você foi convidado para se juntar à equipe. Crie sua conta para começar.`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error ? (
              <div className="text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Ir para Login
                </Button>
              </div>
            ) : success ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Fazer Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={inviteEmail} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accept-name">Seu Nome *</Label>
                  <Input
                    id="accept-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accept-password">Criar Senha *</Label>
                  <Input
                    id="accept-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accept-confirm">Confirmar Senha *</Label>
                  <Input
                    id="accept-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Criar Conta e Aceitar
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AcceptInvite;
