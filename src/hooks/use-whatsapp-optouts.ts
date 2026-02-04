import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppOptout {
  id: string;
  phone: string;
  reason: string | null;
  detected_keyword: string | null;
  created_at: string;
}

interface UseWhatsAppOptoutsReturn {
  optouts: WhatsAppOptout[];
  isLoading: boolean;
  removeOptout: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useWhatsAppOptouts(): UseWhatsAppOptoutsReturn {
  const queryClient = useQueryClient();

  const { data: optouts = [], isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-optouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_optouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppOptout[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_optouts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opt-out removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-optouts"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover opt-out: " + error.message);
    },
  });

  return {
    optouts,
    isLoading,
    removeOptout: deleteMutation.mutateAsync,
    refetch,
  };
}
