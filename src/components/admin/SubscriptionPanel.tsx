import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useTenant } from "@/contexts/TenantContext";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function SubscriptionPanel() {
  const { subscribed, status, planType, subscriptionEnd, isLoading, refresh, openCustomerPortal } = useSubscription();
  const { tenantName } = useTenant();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleManage = async () => {
    setIsPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch {
      toast.error("Erro ao abrir portal de assinatura.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const planInfo = planType ? STRIPE_PLANS[planType as keyof typeof STRIPE_PLANS] : null;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          Assinatura
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Verificando...
          </div>
        ) : subscribed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">
                    {planInfo?.name || "Plano Ativo"}
                  </span>
                  {status === "active" && (
                    <Badge variant="default" className="bg-green-600 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ativo
                    </Badge>
                  )}
                  {status === "past_due" && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Pagamento pendente
                    </Badge>
                  )}
                </div>
                {tenantName && (
                  <p className="text-sm text-muted-foreground">
                    Organização: {tenantName}
                  </p>
                )}
                {planInfo && (
                  <p className="text-sm text-muted-foreground">
                    R$ {planInfo.price.toFixed(2).replace(".", ",")}/mês
                    {" · "}{planInfo.included_users} {planInfo.included_users === 1 ? "usuário" : "usuários"} inclusos
                  </p>
                )}
                {subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    Próxima renovação: {format(new Date(subscriptionEnd), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            {status === "past_due" && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Seu pagamento está pendente. Atualize seu método de pagamento para evitar a suspensão.
              </div>
            )}

            <Button onClick={handleManage} disabled={isPortalLoading} className="w-full">
              {isPortalLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Gerenciar Assinatura
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-3">Nenhuma assinatura ativa.</p>
            <Button asChild>
              <a href="/planos">Escolher Plano</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
