import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, TrendingUp, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TenantDetailSheet from "@/components/super-admin/TenantDetailSheet";

interface Tenant {
  id: string; name: string; slug: string; status: string; plan_type: string;
  created_at: string; owner_email: string | null; stripe_customer_id: string | null;
  included_users: number; extra_users: number;
}

interface TenantStats {
  member_count: number; lead_count: number; broker_count: number; project_count: number;
}

const SuperAdminDashboard = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Record<string, TenantStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: tenantsData, error } = await (supabase.from("tenants" as any).select("*").order("created_at", { ascending: false }) as any);
      if (error) throw error;
      setTenants(tenantsData || []);

      const statsMap: Record<string, TenantStats> = {};
      for (const tenant of (tenantsData || [])) {
        const [m, l, b, p] = await Promise.all([
          (supabase.from("tenant_memberships" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
          (supabase.from("leads" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id) as any),
          (supabase.from("brokers" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
          (supabase.from("projects" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true) as any),
        ]);
        statsMap[tenant.id] = { member_count: m.count || 0, lead_count: l.count || 0, broker_count: b.count || 0, project_count: p.count || 0 };
      }
      setStats(statsMap);
    } catch (err: any) {
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = tenants.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.owner_email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = tenants.filter(t => t.status === "active").length;
  const trialCount = tenants.filter(t => t.status === "trialing").length;
  const suspendedCount = tenants.filter(t => t.status === "suspended").length;
  const totalLeads = Object.values(stats).reduce((a, s) => a + s.lead_count, 0);

  const statusConfig: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    active: { label: "Ativo", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 className="w-3 h-3" /> },
    trialing: { label: "Trial", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Clock className="w-3 h-3" /> },
    suspended: { label: "Suspenso", classes: "bg-red-500/10 text-red-400 border-red-500/20", icon: <XCircle className="w-3 h-3" /> },
    grace_period: { label: "Carência", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
    past_due: { label: "Inadimplente", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
  };

  return (
    <>
      <Helmet><title>Dashboard | Super Admin</title></Helmet>
      <div className="text-white p-6 space-y-6">
        {/* Action bar */}
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white bg-transparent">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", value: tenants.length, icon: <Building2 className="w-5 h-5" />, color: "text-[#FFFF00]", filter: "all" },
            { label: "Ativos", value: activeCount, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-400", filter: "active" },
            { label: "Trial", value: trialCount, icon: <Clock className="w-5 h-5" />, color: "text-blue-400", filter: "trialing" },
            { label: "Suspensos", value: suspendedCount, icon: <XCircle className="w-5 h-5" />, color: "text-red-400", filter: "suspended" },
            { label: "Leads Total", value: totalLeads, icon: <TrendingUp className="w-5 h-5" />, color: "text-purple-400" },
          ].map(k => (
            <Card
              key={k.label}
              className={cn(
                "bg-[#1e1e22] border-[#2a2a2e] cursor-pointer hover:border-[#3a3a3e] transition-all rounded-xl",
                statusFilter === k.filter && "ring-1 ring-[#FFFF00]/30"
              )}
              onClick={() => k.filter && setStatusFilter(k.filter)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={k.color}>{k.icon}</div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{k.value}</p>
                  <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white placeholder:text-slate-500" />
        </div>

        {/* Table */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum tenant encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2e] text-slate-500 text-[11px] uppercase tracking-wider font-mono">
                    <th className="text-left py-3 px-4">Nome</th>
                    <th className="text-left py-3 px-4">Plano</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Membros</th>
                    <th className="text-center py-3 px-4">Corretores</th>
                    <th className="text-center py-3 px-4">Leads</th>
                    <th className="text-left py-3 px-4">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const s = stats[t.id];
                    const sc = statusConfig[t.status] || statusConfig.active;
                    return (
                      <tr key={t.id} className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20 cursor-pointer group" onClick={() => setSelectedTenant({ id: t.id, name: t.name })}>
                        <td className="py-3 px-4">
                          <p className="font-medium group-hover:text-[#FFFF00] transition-colors">{t.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{t.owner_email || t.slug}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="border-[#FFFF00]/20 text-[#FFFF00]/80 text-xs">{t.plan_type === "real_estate" ? "Imobiliária" : "Corretor"}</Badge>
                        </td>
                        <td className="py-3 px-4"><Badge className={`text-xs gap-1 ${sc.classes}`}>{sc.icon}{sc.label}</Badge></td>
                        <td className="py-3 px-4 text-center tabular-nums text-slate-300">{s?.member_count ?? "—"}</td>
                        <td className="py-3 px-4 text-center tabular-nums text-slate-300">{s?.broker_count ?? "—"}</td>
                        <td className="py-3 px-4 text-center tabular-nums text-slate-300">{s?.lead_count ?? "—"}</td>
                        <td className="py-3 px-4 text-xs text-slate-500 tabular-nums font-mono">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <TenantDetailSheet tenantId={selectedTenant?.id || null} tenantName={selectedTenant?.name || ""} open={!!selectedTenant} onOpenChange={open => !open && setSelectedTenant(null)} />
    </>
  );
};

export default SuperAdminDashboard;
