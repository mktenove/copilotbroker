import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_ORIGINS } from "@/types/crm";

const PREDEFINED_KEYS = new Set(LEAD_ORIGINS.map(o => o.key));

export function useCustomOrigins() {
  return useQuery({
    queryKey: ["custom-origins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("lead_origin")
        .not("lead_origin", "is", null);

      if (error) throw error;

      const unique = [...new Set(
        (data || [])
          .map(l => l.lead_origin)
          .filter((o): o is string => !!o && !PREDEFINED_KEYS.has(o as any))
      )].sort();

      return unique;
    },
    staleTime: 5 * 60 * 1000,
  });
}
