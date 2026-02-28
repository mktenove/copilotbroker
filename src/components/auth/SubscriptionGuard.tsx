import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { RefreshCw } from "lucide-react";

interface SubscriptionGuardProps {
  children: ReactNode;
}

/**
 * Ensures the user has an active tenant/subscription.
 * Redirects to /planos if no tenant, or /onboarding if tenant exists but is not active.
 * Must be used inside <ProtectedRoute> (user is already authenticated).
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { tenantId, status, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No tenant at all → pick a plan
  if (!tenantId) {
    return <Navigate to="/planos" replace />;
  }

  // Tenant suspended/canceled → show pricing to resubscribe
  if (status === "suspended" || status === "canceled") {
    return <Navigate to="/planos" replace />;
  }

  return <>{children}</>;
}
