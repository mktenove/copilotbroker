import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, RefreshCw, Mail, Copy, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Invite {
  id: string;
  email: string;
  tenant_id: string;
  status: string;
  message: string | null;
  token: string;
  expires_at: string;
  created_at: string;
  tenant_name?: string;
}

const SuperAdminInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadInvites(); }, []);

  const loadInvites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("invites" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;

      // Enrich with tenant names
      const tenantIds = [...new Set((data || []).map((i: any) => i.tenant_id))];
      const { data: tenants } = await (supabase
        .from("tenants" as any)
        .select("id, name")
        .in("id", tenantIds) as any);
      const tenantMap = Object.fromEntries((tenants || []).map((t: any) => [t.id, t.name]));

      setInvites((data || []).map((i: any) => ({ ...i, tenant_name: tenantMap[i.tenant_id] || "—" })));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar convites");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelInvite = async (id: string) => {
    await (supabase.from("invites" as any).update({ status: "cancelled" }).eq("id", id) as any);
    toast.success("Convite cancelado");
    loadInvites();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "sent": return "bg-blue-500/20 text-blue-400";
      case "accepted": return "bg-emerald-500/20 text-emerald-400";
      case "expired": return "bg-red-500/20 text-red-400";
      case "cancelled": return "bg-slate-500/20 text-slate-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <>
      <Helmet><title>Convites | Super Admin</title></Helmet>
      <div className="min-h-screen bg-[#0a0a0c] text-white">
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12]">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/brokers")} className="text-slate-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" />Voltar
              </Button>
              <Shield className="w-5 h-5 text-[#FFFF00]" />
              <h1 className="text-lg font-bold">Convites Pendentes</h1>
            </div>
            <Button variant="outline" size="sm" onClick={loadInvites} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />Atualizar
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          <Card className="bg-[#1e1e22] border-[#2a2a2e]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Mail className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                  <p>Nenhum convite encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-400">
                        <th className="text-left py-3 px-3">Email</th>
                        <th className="text-left py-3 px-3">Tenant</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Expira em</th>
                        <th className="text-left py-3 px-3">Criado em</th>
                        <th className="text-right py-3 px-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(inv => (
                        <tr key={inv.id} className="border-b border-[#2a2a2e]/50 hover:bg-[#2a2a2e]/30">
                          <td className="py-3 px-3 text-white">{inv.email}</td>
                          <td className="py-3 px-3 text-slate-300">{inv.tenant_name}</td>
                          <td className="py-3 px-3"><Badge className={`text-xs ${statusColor(inv.status)}`}>{inv.status}</Badge></td>
                          <td className="py-3 px-3 text-xs text-slate-400">{new Date(inv.expires_at).toLocaleDateString("pt-BR")}</td>
                          <td className="py-3 px-3 text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(inv.token); toast.success("Token copiado"); }} className="text-slate-400 hover:text-white h-8 w-8 p-0">
                                <Copy className="w-3 h-3" />
                              </Button>
                              {inv.status === "sent" && (
                                <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)} className="text-red-400 hover:text-red-300 h-8 w-8 p-0">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
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

export default SuperAdminInvites;
