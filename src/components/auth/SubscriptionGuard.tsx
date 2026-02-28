import { ReactNode, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SubscriptionGuardProps {
  children: ReactNode;
}

/**
 * Ensures the user has an active tenant/subscription.
 * Super admins (role === 'admin') bypass this check entirely.
 * Redirects to /planos if no tenant or tenant is suspended/canceled.
 * Shows suspension message with portal link for suspended tenants.
 * Must be used inside <ProtectedRoute> (user is already authenticated).
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { tenantId, status, isLoading } = useTenant();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const [openingPortal, setOpeningPortal] = useState(false);

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error("Não foi possível abrir o portal de pagamento.");
      }
    } catch (err) {
      console.error("Erro ao abrir portal:", err);
      toast.error("Erro ao abrir portal de pagamento.");
    } finally {
      setOpeningPortal(false);
    }
  };

  if (isLoading || isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super admin bypasses tenant check
  if (role === "admin") {
    return <>{children}</>;
  }

  // No tenant at all → pick a plan
  if (!tenantId) {
    return <Navigate to="/planos" replace />;
  }

  // Tenant suspended → show blocking message with portal button
  if (status === "suspended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Assinatura Suspensa</h1>
            <p className="text-sm text-muted-foreground">
              Sua assinatura foi suspensa por falta de pagamento. Atualize seu método de pagamento no portal para restaurar o acesso.
            </p>
          </div>
          <Button
            onClick={handleOpenPortal}
            disabled={openingPortal}
            className="w-full"
            size="lg"
          >
            {openingPortal ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            Atualizar Pagamento
          </Button>
          <p className="text-xs text-muted-foreground">
            Após o pagamento, o acesso será restaurado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  // Tenant canceled → redirect to pricing
  if (status === "canceled") {
    return <Navigate to="/planos" replace />;
  }

  return (
    <>
      {status === "past_due" && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-200">
            Seu pagamento falhou. Atualize seu método de pagamento para evitar a suspensão da conta.
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={openingPortal} className="border-yellow-500/30 text-yellow-300 hover:text-yellow-100 flex-shrink-0">
            {openingPortal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
            <span className="ml-1">Atualizar</span>
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
