import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-global-instance-manager`;

interface GlobalInstance {
  instance_name: string;
  status: "connected" | "connecting" | "disconnected" | "qr_pending";
  phone_number: string | null;
}

interface UseWhatsAppGlobalInstanceReturn {
  instance: GlobalInstance | null;
  isLoading: boolean;
  qrCode: string | null;
  isLoadingQR: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  fetchQRCode: () => Promise<void>;
  logout: () => Promise<void>;
  restart: () => Promise<void>;
}

export function useWhatsAppGlobalInstance(): UseWhatsAppGlobalInstanceReturn {
  const [instance, setInstance] = useState<GlobalInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Authorization": `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/status`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to get status");
      }

      setInstance(data.instance);
      
      // Clear QR code when connected
      if (data.instance?.status === "connected") {
        setQRCode(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Global instance status error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchQRCode = useCallback(async () => {
    try {
      setIsLoadingQR(true);
      setQRCode(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/qrcode`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to get QR code");
      }

      setQRCode(data.qrcode);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Global instance QR Code error:", err);
      toast({
        title: "Erro ao obter QR Code",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingQR(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/logout`, {
        method: "POST",
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to logout");
      }

      setQRCode(null);
      await refreshStatus();
      
      toast({
        title: "Desconectado",
        description: "Instância global desconectada com sucesso.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Erro ao desconectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, toast]);

  const restart = useCallback(async () => {
    try {
      setIsLoading(true);

      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/restart`, {
        method: "POST",
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to restart");
      }

      await refreshStatus();
      
      toast({
        title: "Reiniciando",
        description: "Instância global sendo reiniciada...",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Erro ao reiniciar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, toast]);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Auto-refresh status - adaptive polling based on connection state
  useEffect(() => {
    if (!instance) return;
    
    let pollInterval: number;
    
    // During QR pending/connecting, poll every 5 seconds for fast updates
    if (instance.status === "qr_pending" || instance.status === "connecting") {
      pollInterval = 5000;
    }
    // When disconnected, poll every 10 seconds to catch reconnections
    else if (instance.status === "disconnected") {
      pollInterval = 10000;
    }
    // When connected, poll every 60 seconds for health monitoring
    else if (instance.status === "connected") {
      pollInterval = 60000;
    } else {
      return; // Unknown status, don't poll
    }
    
    const interval = setInterval(refreshStatus, pollInterval);
    return () => clearInterval(interval);
  }, [instance?.status, refreshStatus]);

  return {
    instance,
    isLoading,
    qrCode,
    isLoadingQR,
    error,
    refreshStatus,
    fetchQRCode,
    logout,
    restart,
  };
}
