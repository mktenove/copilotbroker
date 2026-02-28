import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Plus, Search, RefreshCw, Mail, Download, CheckCircle2, Clock, XCircle, AlertTriangle, ExternalLink, Users, Briefcase, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import TenantDetailSheet from "@/components/super-admin/TenantDetailSheet";

interface RealEstateTenant {
  id: string; name: string; slug: string; status: string; owner_email: string | null;
  created_at: string; stripe_customer_id: string | null; stripe_subscription_id: string | null;
  included_users: number; extra_users: number; admin_notes: string | null; trial_ends_at: string | null;
  member_count?: number; broker_count?: number; project_count?: number; lead_count?: number;
}

const SuperAdminRealEstate = () => {
  const [tenants, setTenants] = useState<RealEstateTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("tenants" as any).select("*")
        .eq("plan_type", "real_estate")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;

      const enriched: RealEstateTenant[] = [];
      for (const t of (data || [])) {
        const [m, b, p, l] = await Promise.all([
          (supabase.from("tenant_memberships" as any).select("id", { count: "exact", head: true }).eq("tenant_id", t.id).eq("is_active", true) as any),
          (supabase.from("brokers" as any).select("id", { count: "exact", head: true }).eq("tenant_id", t.id).eq("is_active", true) as any),
          (supabase.from("projects" as any).select("id", { count: "exact", head: true }).eq("tenant_id", t.id).eq("is_active", true) as any),
          (supabase.from("leads" as any).select("id", { count: "exact", head: true }).eq("tenant_id", t.id) as any),
        ]);
        enriched.push({ ...t, member_count: m.count || 0, broker_count: b.count || 0, project_count: p.count || 0, lead_count: l.count || 0 });
      }
      setTenants(enriched);
    } catch (err) {
      toast.error("Erro ao carregar imobiliárias");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => tenants.filter(t => {
    if (search) {
      const s = search.toLowerCase();
      if (!t.name.toLowerCase().includes(s) && !(t.owner_email || "").toLowerCase().includes(s)) return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  }), [tenants, search, statusFilter]);

  const kpis = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === "active").length,
    trial: tenants.filter(t => t.status === "trialing").length,
    suspended: tenants.filter(t => t.status === "suspended").length,
    totalBrokers: tenants.reduce((a, t) => a + (t.broker_count || 0), 0),
    totalLeads: tenants.reduce((a, t) => a + (t.lead_count || 0), 0),
  }), [tenants]);

  const statusConfig: Record<string, { label: string; classes: string }> = {
    active: { label: "Ativo", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    trialing: { label: "Trial", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    suspended: { label: "Suspenso", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
    past_due: { label: "Inadimplente", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    grace_period: { label: "Carência", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  };

  const exportCSV = () => {
    const headers = ["Nome", "Email", "Status", "Membros", "Corretores", "Projetos", "Leads", "Criado"];
    const rows = filtered.map(t => [t.name, t.owner_email || "", t.status, t.member_count, t.broker_count, t.project_count, t.lead_count, new Date(t.created_at).toLocaleDateString("pt-BR")]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "imobiliarias.csv"; a.click();
    toast.success("CSV exportado!");
  };

  return (
    <>
      <Helmet><title>Imobiliárias | Super Admin</title></Helmet>
      <div className="text-white">
        {/* Header */}
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-[#FFFF00]" />Imobiliárias</h1>
            <p className="text-xs text-slate-500">Gestão de tenants do tipo imobiliária</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/super-admin/tenants/real-estate/invites")} className="border-[#2a2a2e] text-slate-300 hover:text-white">
              <Mail className="w-4 h-4 mr-1.5" />Convites
            </Button>
            <Button size="sm" onClick={() => navigate("/super-admin/tenants/real-estate/new")} className="bg-[#FFFF00] text-black hover:bg-[#e6e600]">
              <Plus className="w-4 h-4 mr-1.5" />Nova Imobiliária
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total", value: kpis.total, icon: <Building2 className="w-5 h-5" />, color: "text-[#FFFF00]", f: "all" },
              { label: "Ativos", value: kpis.active, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-400", f: "active" },
              { label: "Trial", value: kpis.trial, icon: <Clock className="w-5 h-5" />, color: "text-blue-400", f: "trialing" },
              { label: "Suspensos", value: kpis.suspended, icon: <XCircle className="w-5 h-5" />, color: "text-red-400", f: "suspended" },
              { label: "Corretores", value: kpis.totalBrokers, icon: <Users className="w-5 h-5" />, color: "text-cyan-400" },
              { label: "Leads", value: kpis.totalLeads, icon: <TrendingUp className="w-5 h-5" />, color: "text-purple-400" },
            ].map(k => (
              <Card key={k.label} className={`bg-[#1e1e22] border-[#2a2a2e] cursor-pointer hover:border-[#3a3a3e] transition-all ${statusFilter === k.f ? "ring-1 ring-[#FFFF00]/30" : ""}`} onClick={() => k.f && setStatusFilter(k.f)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={k.color}>{k.icon}</div>
                  <div>
                    <p className="text-xl font-bold tabular-nums">{k.value}</p>
                    <p className="text-xs text-slate-500">{k.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou email..." className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-[#1e1e22] border-[#2a2a2e] text-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="past_due">Inadimplente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV} className="ml-auto border-[#2a2a2e] text-slate-300 hover:text-white">
              <Download className="w-4 h-4 mr-1" />CSV
            </Button>
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
                <p>Nenhuma imobiliária encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2e] text-slate-500 text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-4">Imobiliária</th>
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
                    {filtered.map(t => {
                      const sc = statusConfig[t.status] || statusConfig.active;
                      return (
                        <tr key={t.id} className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20 cursor-pointer group" onClick={() => setSelectedTenant({ id: t.id, name: t.name })}>
                          <td className="py-3 px-4">
                            <p className="font-medium group-hover:text-[#FFFF00] transition-colors">{t.name}</p>
                            <p className="text-xs text-slate-500">{t.owner_email || t.slug}</p>
                          </td>
                          <td className="py-3 px-4"><Badge className={`text-xs ${sc.classes}`}>{sc.label}</Badge></td>
                          <td className="py-3 px-4 text-center tabular-nums text-slate-300">{t.member_count}</td>
                          <td className="py-3 px-4 text-center tabular-nums text-slate-300">{t.broker_count}</td>
                          <td className="py-3 px-4 text-center tabular-nums text-slate-300">{t.project_count}</td>
                          <td className="py-3 px-4 text-center tabular-nums text-slate-300">{t.lead_count}</td>
                          <td className="py-3 px-4">
                            {t.stripe_customer_id ? (
                              <span className="text-xs text-emerald-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Vinculado</span>
                            ) : <span className="text-xs text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
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
      </div>
    </>
  );
};

export default SuperAdminRealEstate;
