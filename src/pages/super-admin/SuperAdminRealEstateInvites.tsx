import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, Mail, Copy, Trash2, Building2, Send, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACCEPT_BASE_URL = "https://copilotbroker.lovable.app/aceitar-convite";

interface Invite {
  id: string; email: string; tenant_id: string; status: string;
  token: string; expires_at: string; created_at: string; role: string; tenant_name?: string;
}

const SuperAdminRealEstateInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data: reTenants } = await (supabase.from("tenants" as any).select("id, name").eq("plan_type", "real_estate") as any);
      const tenantMap = Object.fromEntries((reTenants || []).map((t: any) => [t.id, t.name]));
      const tenantIds = Object.keys(tenantMap);

      if (tenantIds.length === 0) { setInvites([]); setIsLoading(false); return; }

      const { data, error } = await (supabase.from("invites" as any).select("*").in("tenant_id", tenantIds).order("created_at", { ascending: false }) as any);
      if (error) throw error;

      const now = new Date();
      const enriched = (data || []).map((i: any) => {
        const isExpired = i.status === "sent" && new Date(i.expires_at) < now;
        return { ...i, status: isExpired ? "expired" : i.status, tenant_name: tenantMap[i.tenant_id] || "—" };
      });

      const expiredIds = enriched.filter((i: any) => i.status === "expired" && data.find((d: any) => d.id === i.id)?.status === "sent").map((i: any) => i.id);
      if (expiredIds.length > 0) {
        supabase.from("invites" as any).update({ status: "expired" }).in("id", expiredIds).then(() => {});
      }

      setInvites(enriched);
    } catch { toast.error("Erro ao carregar convites"); } finally { setIsLoading(false); }
  };

  const copyAcceptUrl = (token: string) => {
    navigator.clipboard.writeText(`${ACCEPT_BASE_URL}?token=${token}`);
    toast.success("Link de aceite copiado!");
  };

  const cancelInvite = async (id: string) => {
    await (supabase.from("invites" as any).update({ status: "cancelled" }).eq("id", id) as any);
    toast.success("Convite cancelado");
    load();
  };

  const resendInvite = async (invite: Invite) => {
    setResendingId(invite.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-invite", {
        body: { tenant_id: invite.tenant_id, email: invite.email, role: invite.role || "broker" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Novo convite criado!");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reenviar");
    } finally {
      setResendingId(null);
    }
  };

  const statusConfig = (s: string) => {
    switch (s) {
      case "sent": return { color: "bg-blue-500/20 text-blue-400", label: "Enviado", icon: <Mail className="w-3 h-3" /> };
      case "opened": return { color: "bg-amber-500/20 text-amber-400", label: "Aberto", icon: <Clock className="w-3 h-3" /> };
      case "accepted": return { color: "bg-emerald-500/20 text-emerald-400", label: "Aceito", icon: <CheckCircle2 className="w-3 h-3" /> };
      case "expired": return { color: "bg-red-500/20 text-red-400", label: "Expirado", icon: <AlertTriangle className="w-3 h-3" /> };
      default: return { color: "bg-slate-500/20 text-slate-400", label: s, icon: <Trash2 className="w-3 h-3" /> };
    }
  };

  return (
    <>
      <Helmet><title>Convites Imobiliárias | Super Admin</title></Helmet>
      <div className="text-white">
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/tenants/real-estate")} className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />Voltar
            </Button>
            <Building2 className="w-5 h-5 text-[#FFFF00]" />
            <h1 className="text-lg font-bold">Convites — Imobiliárias</h1>
            <Badge className="bg-[#FFFF00]/20 text-[#FFFF00] text-xs">{invites.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="p-6">
          <Card className="bg-[#1e1e22] border-[#2a2a2e]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" /></div>
              ) : invites.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><Mail className="w-10 h-10 mx-auto mb-3 text-slate-500" /><p>Nenhum convite encontrado</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-400 text-xs uppercase">
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Imobiliária</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Expira</th>
                        <th className="text-left py-3 px-4">Criado</th>
                        <th className="text-right py-3 px-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(inv => {
                        const sc = statusConfig(inv.status);
                        return (
                          <tr key={inv.id} className="border-b border-[#2a2a2e]/50 hover:bg-[#2a2a2e]/30">
                            <td className="py-3 px-4 text-white">{inv.email}</td>
                            <td className="py-3 px-4 text-slate-300 text-xs">{inv.tenant_name}</td>
                            <td className="py-3 px-4"><Badge variant="outline" className="text-xs border-slate-600 text-slate-300">{inv.role}</Badge></td>
                            <td className="py-3 px-4">
                              <Badge className={`text-xs ${sc.color} flex items-center gap-1 w-fit`}>{sc.icon}{sc.label}</Badge>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400">{format(new Date(inv.expires_at), "dd/MM/yy HH:mm", { locale: ptBR })}</td>
                            <td className="py-3 px-4 text-xs text-slate-400">{format(new Date(inv.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => copyAcceptUrl(inv.token)} className="text-slate-400 hover:text-white h-8 w-8 p-0" title="Copiar link"><Copy className="w-3 h-3" /></Button>
                                {["sent", "opened", "expired"].includes(inv.status) && (
                                  <Button variant="ghost" size="sm" onClick={() => resendInvite(inv)} disabled={resendingId === inv.id} className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0" title="Reenviar">
                                    <Send className={`w-3 h-3 ${resendingId === inv.id ? "animate-pulse" : ""}`} />
                                  </Button>
                                )}
                                {["sent", "opened"].includes(inv.status) && (
                                  <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)} className="text-red-400 hover:text-red-300 h-8 w-8 p-0" title="Cancelar"><Trash2 className="w-3 h-3" /></Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SuperAdminRealEstateInvites;
