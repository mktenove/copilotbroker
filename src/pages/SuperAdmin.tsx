import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Building2, Users, DollarSign, AlertTriangle,
  RefreshCw, Search, ExternalLink, Copy, CheckCircle2,
  XCircle, Clock, TrendingUp
} from "lucide-react";
import AddTenantModal from "@/components/super-admin/AddTenantModal";
import TenantDetailSheet from "@/components/super-admin/TenantDetailSheet";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_type: string;
  created_at: string;
  owner_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  included_users: number;
  extra_users: number;
  admin_notes: string | null;
}

interface TenantStats {
  tenant_id: string;
  member_count: number;
  lead_count: number;
  broker_count: number;
  project_count: number;
}

const SuperAdmin = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Record<string, TenantStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsCheckingAuth(false);
      return;
    }

    const { data: roles } = await (supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", session.user.id) as any);

    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      setIsCheckingAuth(false);
      return;
    }

    setIsSuperAdmin(true);
    setIsCheckingAuth(false);
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

      const statsMap: Record<string, TenantStats> = {};
      for (const tenant of (tenantsData || [])) {
        const [membersRes, leadsRes, brokersRes, projectsRes] = await Promise.all([
          (supabase.from("tenant_memberships" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
          (supabase.from("leads" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id) as any),
          (supabase.from("brokers" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
          (supabase.from("projects" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
        ]);

        statsMap[tenant.id] = {
          tenant_id: tenant.id,
          member_count: membersRes.count || 0,
          lead_count: leadsRes.count || 0,
          broker_count: brokersRes.count || 0,
          project_count: projectsRes.count || 0,
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.owner_email || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMembers = Object.values(stats).reduce((a, s) => a + s.member_count, 0);
  const totalLeads = Object.values(stats).reduce((a, s) => a + s.lead_count, 0);
  const activeCount = tenants.filter(t => t.status === "active").length;
  const trialCount = tenants.filter(t => t.status === "trialing").length;
  const suspendedCount = tenants.filter(t => t.status === "suspended").length;
  const pastDueCount = tenants.filter(t => t.status === "past_due" || t.status === "grace_period").length;

  const statusConfig: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    active: { label: "Ativo", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 className="w-3 h-3" /> },
    trialing: { label: "Trial", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Clock className="w-3 h-3" /> },
    suspended: { label: "Suspenso", classes: "bg-red-500/10 text-red-400 border-red-500/20", icon: <XCircle className="w-3 h-3" /> },
    grace_period: { label: "Carência", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
    past_due: { label: "Inadimplente", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
  };

  const planLabel = (plan: string) => {
    switch (plan) {
      case "broker": return "Corretor";
      case "real_estate": return "Imobiliária";
      default: return plan;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <SuperAdminLogin onAuthenticated={checkAccess} />;
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
              <div className="w-9 h-9 rounded-lg bg-[#FFFF00]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#FFFF00]" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Super Admin</h1>
                <p className="text-xs text-slate-500">Gestão de Imobiliárias</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
                className="border-[#2a2a2e] text-slate-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <AddTenantModal onSuccess={loadData} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => { supabase.auth.signOut(); setIsSuperAdmin(false); }}
                className="border-[#2a2a2e] text-slate-400 hover:text-white"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total" value={tenants.length} icon={<Building2 className="w-5 h-5" />} color="text-[#FFFF00]" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
            <KpiCard label="Ativos" value={activeCount} icon={<CheckCircle2 className="w-5 h-5" />} color="text-emerald-400" onClick={() => setStatusFilter("active")} active={statusFilter === "active"} />
            <KpiCard label="Trial" value={trialCount} icon={<Clock className="w-5 h-5" />} color="text-blue-400" onClick={() => setStatusFilter("trialing")} active={statusFilter === "trialing"} />
            <KpiCard label="Inadimplentes" value={pastDueCount} icon={<AlertTriangle className="w-5 h-5" />} color="text-orange-400" onClick={() => setStatusFilter("past_due")} active={statusFilter === "past_due"} />
            <KpiCard label="Suspensos" value={suspendedCount} icon={<XCircle className="w-5 h-5" />} color="text-red-400" onClick={() => setStatusFilter("suspended")} active={statusFilter === "suspended"} />
            <KpiCard label="Leads Total" value={totalLeads} icon={<TrendingUp className="w-5 h-5" />} color="text-purple-400" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar imobiliária por nome ou e-mail..."
              className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white placeholder:text-slate-500"
            />
          </div>

          {/* Tenants Table */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma imobiliária encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2e] text-slate-500 text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-4">Imobiliária</th>
                      <th className="text-left py-3 px-4">Plano</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Membros</th>
                      <th className="text-center py-3 px-4">Corretores</th>
                      <th className="text-center py-3 px-4">Empreend.</th>
                      <th className="text-center py-3 px-4">Leads</th>
                      <th className="text-left py-3 px-4">Stripe</th>
                      <th className="text-left py-3 px-4">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => {
                      const s = stats[tenant.id];
                      const sc = statusConfig[tenant.status] || statusConfig.active;
                      return (
                        <tr
                          key={tenant.id}
                          className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20 transition-colors cursor-pointer group"
                          onClick={() => setSelectedTenant({ id: tenant.id, name: tenant.name })}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-white group-hover:text-[#FFFF00] transition-colors">{tenant.name}</p>
                              <p className="text-xs text-slate-500">{tenant.owner_email || tenant.slug}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="border-[#FFFF00]/20 text-[#FFFF00]/80 text-xs font-normal">
                              {planLabel(tenant.plan_type)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-xs gap-1 ${sc.classes}`}>
                              {sc.icon}
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300 tabular-nums">{s?.member_count ?? "—"}</td>
                          <td className="py-3 px-4 text-center text-slate-300 tabular-nums">{s?.broker_count ?? "—"}</td>
                          <td className="py-3 px-4 text-center text-slate-300 tabular-nums">{s?.project_count ?? "—"}</td>
                          <td className="py-3 px-4 text-center text-slate-300 tabular-nums">{s?.lead_count ?? "—"}</td>
                          <td className="py-3 px-4">
                            {tenant.stripe_customer_id ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(tenant.stripe_customer_id!); }}
                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Vinculado
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs tabular-nums">
                            {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <TenantDetailSheet
          tenantId={selectedTenant?.id || null}
          tenantName={selectedTenant?.name || ""}
          open={!!selectedTenant}
          onOpenChange={(open) => !open && setSelectedTenant(null)}
        />
      </div>
    </>
  );
};

/* ── KPI Card ── */
interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
}

const KpiCard = ({ label, value, icon, color, onClick, active }: KpiCardProps) => (
  <Card
    className={`bg-[#1e1e22] border-[#2a2a2e] cursor-pointer transition-all hover:border-[#3a3a3e] ${active ? "ring-1 ring-[#FFFF00]/30 border-[#FFFF00]/20" : ""}`}
    onClick={onClick}
  >
    <CardContent className="p-4 flex items-center gap-3">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default SuperAdmin;
