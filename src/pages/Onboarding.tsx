import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Check, AlertTriangle } from "lucide-react";
import logoCopilot from "@/assets/copilot-logo-dark.png";

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verify = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        const { data: membership } = await (supabase
          .from("tenant_memberships" as any)
          .select("tenant_id")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .maybeSingle() as any);

        if (membership) {
          const { data: tenant } = await (supabase
            .from("tenants" as any)
            .select("name, status")
            .eq("id", membership.tenant_id)
            .single() as any);

          if (tenant && tenant.name !== "Minha Empresa" && tenant.status === "active") {
            const { data: roleData } = await (supabase
              .from("user_roles" as any)
              .select("role")
              .eq("user_id", session.user.id)
              .maybeSingle() as any);
            const dest = roleData?.role === "admin" ? "/admin" : "/corretor/admin";
            navigate(dest, { replace: true });
            return;
          }
        } else if (sessionId) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Tempo esgotado (20s). Tente novamente em instantes.")), 20000)
            );
            const { error, data } = await Promise.race([
              supabase.functions.invoke("confirm-checkout", { body: { session_id: sessionId } }),
              timeoutPromise,
            ]);
            if (error) {
              // Extract real error message from the response body
              let realMsg = error.message;
              try {
                const body = await (error as any).context?.json?.();
                if (body?.error) realMsg = body.error;
              } catch {}
              setVerifyError(`Erro ao ativar assinatura: ${realMsg}`);
            } else if (data?.error) {
              setVerifyError(`Erro ao ativar assinatura: ${data.error}`);
            }
          } catch (err: any) {
            setVerifyError(err.message || "Erro ao processar pagamento. Tente novamente.");
          }
        } else {
          setVerifyError("Sessão de pagamento não encontrada. Contate o suporte em suporte@copilotbroker.com.br");
        }
      } catch (err: any) {
        setVerifyError(err.message || "Erro ao verificar conta.");
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [navigate, sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setSubmitError("Digite o nome da sua empresa.");
      return;
    }

    setIsLoading(true);
    setSubmitError("");
    setSubmitStatus("Verificando sessão...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      setSubmitStatus("Buscando assinatura...");
      const { data: membership } = await (supabase
        .from("tenant_memberships" as any)
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle() as any);

      if (!membership) {
        setSubmitError("Assinatura não encontrada. Aguarde alguns segundos e tente novamente. Se o problema persistir, contate o suporte.");
        return;
      }

      setSubmitStatus("Salvando nome da empresa...");
      const slug = orgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { error: updateError } = await (supabase
        .from("tenants" as any)
        .update({ name: orgName.trim(), slug: slug || `org-${Date.now()}` })
        .eq("id", membership.tenant_id) as any);

      if (updateError) {
        setSubmitError(`Erro ao salvar nome: ${updateError.message}`);
        return;
      }

      setSubmitStatus("Configurando perfil...");
      const { data: existingBroker } = await (supabase
        .from("brokers" as any)
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle() as any);

      if (!existingBroker) {
        const userEmail = session.user.email || "";
        const userName = session.user.user_metadata?.full_name || userEmail.split("@")[0];
        const brokerSlug = userName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const { error: brokerError } = await (supabase.from("brokers" as any).insert({
          user_id: session.user.id,
          name: userName,
          email: userEmail,
          slug: brokerSlug || `broker-${Date.now()}`,
          tenant_id: membership.tenant_id,
          is_active: true,
        }) as any);

        if (brokerError) {
          setSubmitError(`Erro ao criar perfil: ${brokerError.message}`);
          return;
        }
      }

      setSubmitStatus("Verificando permissões...");
      const { data: roleData, error: roleError } = await (supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle() as any);

      if (roleError) {
        setSubmitError(`Erro ao verificar permissões: ${roleError.message}`);
        return;
      }

      setSubmitStatus("Acessando painel...");
      const destination = roleData?.role === "admin" ? "/admin" : "/corretor/admin";
      window.location.replace(destination);
    } catch (err: any) {
      setSubmitError(err.message || "Erro ao configurar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
      setSubmitStatus("");
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Ativando sua assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configurar Conta | Copilot Broker</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoCopilot} alt="Copilot Broker" className="h-14 mx-auto mb-6" />
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
              Assinatura confirmada!
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure sua empresa para começar
            </p>
          </div>

          {verifyError && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{verifyError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nome da empresa
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ex: Imobiliária Alfa"
                  autoFocus
                />
              </div>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            {isLoading && submitStatus && (
              <p className="text-center text-sm text-muted-foreground">{submitStatus}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--gold)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  {submitStatus || "Configurando..."}
                </span>
              ) : (
                "Começar a usar"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
