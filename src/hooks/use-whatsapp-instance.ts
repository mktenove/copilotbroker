import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrokerWhatsAppInstance } from "@/types/whatsapp";
import { useToast } from "@/hooks/use-toast";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-instance-manager`;

interface UseWhatsAppInstanceReturn {
  instance: BrokerWhatsAppInstance | null;
  isLoading: boolean;
  qrCode: string | null;
  isLoadingQR: boolean;
  error: string | null;
  initInstance: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  fetchQRCode: () => Promise<void>;
  logout: () => Promise<void>;
  restart: () => Promise<void>;
  togglePause: (pause: boolean, reason?: string) => Promise<void>;
  updateSettings: (settings: Partial<Pick<BrokerWhatsAppInstance, 'hourly_limit' | 'daily_limit' | 'working_hours_start' | 'working_hours_end'>>) => Promise<void>;
}

export function useWhatsAppInstance(): UseWhatsAppInstanceReturn {
  const [instance, setInstance] = useState<BrokerWhatsAppInstance | null>(null);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Status error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initInstance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/init`, {
        method: "POST",
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize instance");
      }

      setInstance(data.instance);
      toast({
        title: "Instância criada",
        description: "Escaneie o QR Code para conectar seu WhatsApp.",
      });

      // Auto-fetch QR code after init
      await fetchQRCode();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast({
        title: "Erro ao criar instância",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
      console.error("QR Code error:", err);
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
        description: "WhatsApp desconectado com sucesso.",
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
        description: "Instância sendo reiniciada...",
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

  const togglePause = useCallback(async (pause: boolean, reason?: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/pause`, {
        method: "POST",
        headers,
        body: JSON.stringify({ pause, reason }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle pause");
      }

      setInstance(data.instance);
      
      toast({
        title: pause ? "Envios pausados" : "Envios retomados",
        description: pause ? "Todos os envios foram pausados." : "Os envios foram retomados.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const updateSettings = useCallback(async (settings: Partial<Pick<BrokerWhatsAppInstance, 'hourly_limit' | 'daily_limit' | 'working_hours_start' | 'working_hours_end'>>) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setInstance(data.instance);
      
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Auto-refresh status every 30 seconds when connected or connecting
  useEffect(() => {
    if (instance?.status === "connected" || instance?.status === "connecting" || instance?.status === "qr_pending") {
      const interval = setInterval(refreshStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [instance?.status, refreshStatus]);

  return {
    instance,
    isLoading,
    qrCode,
    isLoadingQR,
    error,
    initInstance,
    refreshStatus,
    fetchQRCode,
    logout,
    restart,
    togglePause,
    updateSettings,
  };
}
