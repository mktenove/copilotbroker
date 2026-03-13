import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export function useSeatLimit() {
  const { tenantId } = useTenant();
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [usedSeats, setUsedSeats] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [entitlementRes, countRes] = await Promise.all([
        (supabase
          .from("tenant_entitlements" as any)
          .select("max_users")
          .eq("tenant_id", tenantId)
          .single() as any),
        (supabase
          .from("tenant_memberships" as any)
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_active", true) as any),
      ]);
      setMaxUsers(entitlementRes.data?.max_users ?? null);
      setUsedSeats(countRes.count ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const remainingSeats = maxUsers !== null ? Math.max(0, maxUsers - usedSeats) : null;
  const isAtLimit = maxUsers !== null && usedSeats >= maxUsers;

  return { maxUsers, usedSeats, remainingSeats, isAtLimit, isLoading, refetch: fetch };
}
