import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Check } from "lucide-react";
import logoCopilot from "@/assets/copilot-logo-dark.png";

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user already has a tenant with a proper name
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
          navigate("/admin");
          return;
        }
      } else if (sessionId) {
        // Webhook may not have fired yet — use fallback to confirm the checkout
        try {
          const { error } = await supabase.functions.invoke("confirm-checkout", {
            body: { session_id: sessionId },
          });
          if (error) console.error("Fallback confirm-checkout error:", error);
        } catch (err) {
          console.error("Fallback confirm-checkout failed:", err);
        }
      }

      setIsVerifying(false);
    };

    verify();
  }, [navigate, sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error("Digite o nome da sua empresa.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Get user's tenant
      const { data: membership } = await (supabase
        .from("tenant_memberships" as any)
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle() as any);

      if (!membership) {
        toast.error("Assinatura não encontrada. Tente novamente em alguns segundos.");
        return;
      }

      // Update tenant name and slug
      const slug = orgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      await (supabase
        .from("tenants" as any)
        .update({ name: orgName.trim(), slug: slug || `org-${Date.now()}` })
        .eq("id", membership.tenant_id) as any);

      // Create broker record for the owner if not exists
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

        await (supabase.from("brokers" as any).insert({
          user_id: session.user.id,
          name: userName,
          email: userEmail,
          slug: brokerSlug || `broker-${Date.now()}`,
          tenant_id: membership.tenant_id,
          is_active: true,
        }) as any);
      }

      toast.success("Conta configurada com sucesso!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Erro ao configurar conta");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando sua conta...</p>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--gold)/0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Configurando...
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
