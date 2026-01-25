import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Settings, 
  User, 
  Bell, 
  Lock, 
  Loader2,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserInfo {
  email: string;
  createdAt: string;
}

interface NotificationPreferences {
  newLeads: boolean;
  staleLeads: boolean;
  statusChanges: boolean;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    newLeads: true,
    staleLeads: true,
    statusChanges: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserInfo({
          email: user.email || "",
          createdAt: user.created_at || "",
        });

        // Load preferences from localStorage (could be moved to DB later)
        const savedPrefs = localStorage.getItem("notification_preferences");
        if (savedPrefs) {
          setPreferences(JSON.parse(savedPrefs));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar informações do usuário:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    localStorage.setItem("notification_preferences", JSON.stringify(newPrefs));
    toast.success("Preferência salva!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-[#141417] border-l border-[#2a2a2e] text-slate-200 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl text-slate-100">
            <Settings className="w-5 h-5 text-primary" />
            Configurações
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Gerencie sua conta e preferências
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Account Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <User className="w-4 h-4" />
                Conta
              </div>
              <div className="bg-[#1e1e22] rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  <p className="text-sm text-slate-200">{userInfo?.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Membro desde</Label>
                  <p className="text-sm text-slate-200">
                    {userInfo?.createdAt
                      ? new Date(userInfo.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-[#2a2a2e]" />

            {/* Password Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Lock className="w-4 h-4" />
                Alterar Senha
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-400 text-sm">
                    Nova senha
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-400 text-sm">
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </div>
            </div>

            <Separator className="bg-[#2a2a2e]" />

            {/* Notification Preferences */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Bell className="w-4 h-4" />
                Preferências de Notificação
              </div>
              <div className="bg-[#1e1e22] rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm text-slate-200">Novos Leads</Label>
                    <p className="text-xs text-slate-500">
                      Receber notificação quando um novo lead chegar
                    </p>
                  </div>
                  <Switch
                    checked={preferences.newLeads}
                    onCheckedChange={(value) => handlePreferenceChange("newLeads", value)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm text-slate-200">Leads Estagnados</Label>
                    <p className="text-xs text-slate-500">
                      Alertar sobre leads sem interação há mais de 48h
                    </p>
                  </div>
                  <Switch
                    checked={preferences.staleLeads}
                    onCheckedChange={(value) => handlePreferenceChange("staleLeads", value)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm text-slate-200">Mudanças de Status</Label>
                    <p className="text-xs text-slate-500">
                      Notificar quando um lead for cadastrado ou inativado
                    </p>
                  </div>
                  <Switch
                    checked={preferences.statusChanges}
                    onCheckedChange={(value) => handlePreferenceChange("statusChanges", value)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-[#2a2a2e]" />

            {/* Help Links */}
            <div className="space-y-3">
              <a
                href="https://docs.lovable.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e22] hover:bg-[#252528] transition-colors group"
              >
                <span className="text-sm text-slate-300">Documentação</span>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
              </a>
            </div>

            {/* Version */}
            <div className="pt-4 pb-8">
              <p className="text-xs text-slate-600 text-center">
                Enove CRM v1.0.0
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
