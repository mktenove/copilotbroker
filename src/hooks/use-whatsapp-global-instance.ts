import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GlobalInstanceState {
  status: "connected" | "disconnected" | "connecting" | "qr_pending";
  phoneNumber: string | null;
  instanceName: string | null;
  lastSeenAt: string | null;
  error: string | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-global-instance-manager`;

export function useWhatsAppGlobalInstance() {
  const [state, setState] = useState<GlobalInstanceState>({
    status: "connected",
    phoneNumber: null,
    instanceName: null,
    lastSeenAt: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token || ""}`,
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FUNCTION_URL}/status`, { headers });
      const data = await response.json();

      if (data.error && !data.status) {
        setState(prev => ({
          ...prev,
          status: "disconnected",
          error: data.error,
        }));
        return;
      }

      const newStatus = data.status as GlobalInstanceState["status"];
      
      // Clear QR code if connected
      if (newStatus === "connected" && qrCode) {
        setQrCode(null);
      }

      setState({
        status: newStatus,
        phoneNumber: data.phoneNumber || null,
        instanceName: data.instanceName || null,
        lastSeenAt: data.lastSeenAt || null,
        error: null,
      });
    } catch (error) {
      console.error("Failed to refresh global instance status:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Erro ao verificar status",
      }));
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, qrCode]);

  const fetchQRCode = useCallback(async () => {
    try {
      setIsLoadingQR(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FUNCTION_URL}/qrcode`, { headers });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setState(prev => ({ ...prev, status: "qr_pending" }));
      }
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
      toast.error("Erro ao obter QR Code");
    } finally {
      setIsLoadingQR(false);
    }
  }, [getAuthHeaders]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FUNCTION_URL}/logout`, {
        method: "POST",
        headers,
      });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Instância desconectada");
      setQrCode(null);
      await refreshStatus();
    } catch (error) {
      console.error("Failed to logout:", error);
      toast.error("Erro ao desconectar");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, refreshStatus]);

  const restart = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FUNCTION_URL}/restart`, {
        method: "POST",
        headers,
      });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Instância reiniciada");
      await refreshStatus();
    } catch (error) {
      console.error("Failed to restart:", error);
      toast.error("Erro ao reiniciar");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, refreshStatus]);

  // Initial status fetch
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Adaptive polling based on status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const pollInterval = 
      state.status === "qr_pending" || state.status === "connecting" 
        ? 5000 
        : state.status === "connected" 
          ? 60000 
          : 10000;

    interval = setInterval(refreshStatus, pollInterval);

    return () => clearInterval(interval);
  }, [state.status, refreshStatus]);

  return {
    status: state.status,
    phoneNumber: state.phoneNumber,
    instanceName: state.instanceName,
    lastSeenAt: state.lastSeenAt,
    error: state.error,
    isLoading,
    qrCode,
    isLoadingQR,
    refreshStatus,
    fetchQRCode,
    logout,
    restart,
  };
}
