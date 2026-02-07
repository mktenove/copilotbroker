import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GlobalInstanceState {
  status: "connected" | "disconnected" | "connecting" | "qr_pending";
  phoneNumber: string | null;
  instanceName: string | null;
  lastSeenAt: string | null;
  error: string | null;
  needsInit: boolean;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-global-instance-manager`;

export function useWhatsAppGlobalInstance() {
  const [state, setState] = useState<GlobalInstanceState>({
    status: "connected",
    phoneNumber: null,
    instanceName: null,
    lastSeenAt: null,
    error: null,
    needsInit: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

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
          needsInit: data.needsInit || false,
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
        error: data.error || null,
        needsInit: data.needsInit || false,
      });
    } catch (error) {
      console.error("Failed to refresh global instance status:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Erro ao verificar status",
        needsInit: true,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, qrCode]);

  const initInstance = useCallback(async () => {
    try {
      setIsInitializing(true);
      const headers = await getAuthHeaders();
      
      toast.info("Criando nova instância...");
      
      const response = await fetch(`${FUNCTION_URL}/init`, {
        method: "POST",
        headers,
      });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return false;
      }

      toast.success("Instância criada! Gerando QR Code...");
      
      // If QR code was returned, set it
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setState(prev => ({ ...prev, status: "qr_pending", needsInit: false }));
      } else {
        // Fetch QR code separately
        await fetchQRCode();
      }
      
      return true;
    } catch (error) {
      console.error("Failed to init instance:", error);
      toast.error("Erro ao criar instância");
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [getAuthHeaders]);

  const fetchQRCode = useCallback(async () => {
    try {
      setIsLoadingQR(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FUNCTION_URL}/qrcode`, { headers });
      const data = await response.json();

      if (data.error) {
        // If needs init, show specific message
        if (data.needsInit) {
          toast.error("Instância não existe. Clique em 'Criar Nova Instância' primeiro.");
          setState(prev => ({ ...prev, needsInit: true }));
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setState(prev => ({ ...prev, status: "qr_pending", needsInit: false }));
        
        if (data.newInstance) {
          toast.success("Nova instância criada! Escaneie o QR Code.");
        }
      } else {
        toast.warning("QR Code não disponível - tente novamente");
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

  const clearSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FUNCTION_URL}/clear-session`, {
        method: "POST",
        headers,
      });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Sessão limpa com sucesso");
      setQrCode(null);
      setState({
        status: "disconnected",
        phoneNumber: null,
        instanceName: null,
        lastSeenAt: null,
        error: null,
        needsInit: true,
      });
    } catch (error) {
      console.error("Failed to clear session:", error);
      toast.error("Erro ao limpar sessão");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

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
          : 15000;

    interval = setInterval(refreshStatus, pollInterval);

    return () => clearInterval(interval);
  }, [state.status, refreshStatus]);

  return {
    status: state.status,
    phoneNumber: state.phoneNumber,
    instanceName: state.instanceName,
    lastSeenAt: state.lastSeenAt,
    error: state.error,
    needsInit: state.needsInit,
    isLoading,
    qrCode,
    isLoadingQR,
    isInitializing,
    refreshStatus,
    initInstance,
    fetchQRCode,
    logout,
    restart,
    clearSession,
  };
}
