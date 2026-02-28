import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Building2, Users, DollarSign, AlertTriangle, RefreshCw } from "lucide-react";
import AddBrokerModal from "@/components/super-admin/AddBrokerModal";
import AddProjectModal from "@/components/super-admin/AddProjectModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_type: string;
  created_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  included_users: number;
  extra_users: number;
}

interface TenantStats {
  tenant_id: string;
  member_count: number;
  lead_count: number;
  broker_count: number;
}

const SuperAdmin = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Record<string, TenantStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await (supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", session.user.id) as any);

    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      toast.error("Acesso negado. Apenas super admins.");
      navigate("/auth");
      return;
    }

    setIsSuperAdmin(true);
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: tenantsData, error } = await (supabase
        .from("tenants" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setTenants(tenantsData || []);

      // Load stats per tenant
      const statsMap: Record<string, TenantStats> = {};
      for (const tenant of (tenantsData || [])) {
        const [membersRes, leadsRes, brokersRes] = await Promise.all([
          (supabase.from("tenant_memberships" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
          (supabase.from("leads" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id) as any),
          (supabase.from("brokers" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
        ]);

        statsMap[tenant.id] = {
          tenant_id: tenant.id,
          member_count: membersRes.count || 0,
          lead_count: leadsRes.count || 0,
          broker_count: brokersRes.count || 0,
        };
      }
      setStats(statsMap);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "suspended": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "grace_period": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const planLabel = (plan: string) => {
    switch (plan) {
      case "broker": return "Corretor";
      case "real_estate": return "Imobiliária";
      default: return plan;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Super Admin | Enove</title>
      </Helmet>
      <div className="min-h-screen bg-[#0a0a0c] text-white">
        {/* Header */}
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#FFFF00]" />
              <h1 className="text-xl font-bold">Super Admin</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
                className="border-[#2a2a2e] text-slate-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <AddProjectModal onSuccess={loadData} />
              <AddBrokerModal onSuccess={loadData} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="border-[#2a2a2e] text-slate-300 hover:text-white"
              >
                Voltar ao Admin
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-[#FFFF00]" />
                  <div>
                    <p className="text-2xl font-bold text-white">{tenants.length}</p>
                    <p className="text-sm text-slate-400">Tenants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {Object.values(stats).reduce((acc, s) => acc + s.member_count, 0)}
                    </p>
                    <p className="text-sm text-slate-400">Membros Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {tenants.filter(t => t.status === "active").length}
                    </p>
                    <p className="text-sm text-slate-400">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenants Table */}
          <Card className="bg-[#1e1e22] border-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#FFFF00]" />
                Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tenants.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                  <p>Nenhum tenant encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-400">
                        <th className="text-left py-3 px-2">Nome</th>
                        <th className="text-left py-3 px-2">Slug</th>
                        <th className="text-left py-3 px-2">Plano</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-center py-3 px-2">Membros</th>
                        <th className="text-center py-3 px-2">Corretores</th>
                        <th className="text-center py-3 px-2">Leads</th>
                        <th className="text-left py-3 px-2">Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((tenant) => {
                        const tenantStats = stats[tenant.id];
                        return (
                          <tr key={tenant.id} className="border-b border-[#2a2a2e]/50 hover:bg-[#2a2a2e]/30 transition-colors">
                            <td className="py-3 px-2 font-medium text-white">{tenant.name}</td>
                            <td className="py-3 px-2 text-slate-400 font-mono text-xs">{tenant.slug}</td>
                            <td className="py-3 px-2">
                              <Badge variant="outline" className="border-[#FFFF00]/30 text-[#FFFF00] text-xs">
                                {planLabel(tenant.plan_type)}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <Badge className={`text-xs ${statusColor(tenant.status)}`}>
                                {tenant.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-center text-slate-300">
                              {tenantStats?.member_count ?? "—"}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-300">
                              {tenantStats?.broker_count ?? "—"}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-300">
                              {tenantStats?.lead_count ?? "—"}
                            </td>
                            <td className="py-3 px-2 text-slate-400 text-xs">
                              {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
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

export default SuperAdmin;
