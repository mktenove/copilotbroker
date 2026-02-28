import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, AlertTriangle, RefreshCw, Plus, Search, Download, Ban, Play, Mail, Building2, CreditCard, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SuperAdminBrokerDetailSheet from "@/components/super-admin/SuperAdminBrokerDetailSheet";

interface TenantBroker {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  plan_type: string;
  owner_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  trial_ends_at: string | null;
  broker_id: string | null;
  broker_name: string | null;
  broker_email: string | null;
  broker_is_active: boolean;
  last_login: string | null;
}

const SuperAdminBrokers = () => {
  const [data, setData] = useState<TenantBroker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stripeFilter, setStripeFilter] = useState("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: roles } = await (supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id) as any);
    if (!(roles || []).some((r: any) => r.role === "admin")) { toast.error("Acesso negado"); navigate("/auth"); return; }
    setIsSuperAdmin(true);
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get all broker-plan tenants
      const { data: tenants, error } = await (supabase
        .from("tenants" as any)
        .select("*")
        .eq("plan_type", "broker")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;

      const results: TenantBroker[] = [];
      for (const t of (tenants || [])) {
        // Get broker for this tenant
        const { data: brokers } = await (supabase
          .from("brokers" as any)
          .select("id, name, email, is_active")
          .eq("tenant_id", t.id)
          .limit(1) as any);

        // Get last session
        let lastLogin: string | null = null;
        if (brokers?.[0]) {
          const { data: sessions } = await (supabase
            .from("broker_sessions" as any)
            .select("last_activity_at")
            .eq("broker_id", brokers[0].id)
            .order("last_activity_at", { ascending: false })
            .limit(1) as any);
          lastLogin = sessions?.[0]?.last_activity_at || null;
        }

        results.push({
          tenant_id: t.id,
          tenant_name: t.name,
          tenant_slug: t.slug,
          tenant_status: t.status,
          plan_type: t.plan_type,
          owner_email: t.owner_email,
          stripe_customer_id: t.stripe_customer_id,
          stripe_subscription_id: t.stripe_subscription_id,
          created_at: t.created_at,
          trial_ends_at: t.trial_ends_at,
          broker_id: brokers?.[0]?.id || null,
          broker_name: brokers?.[0]?.name || null,
          broker_email: brokers?.[0]?.email || t.owner_email,
          broker_is_active: brokers?.[0]?.is_active ?? false,
          last_login: lastLogin,
        });
      }
      setData(results);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (search) {
        const s = search.toLowerCase();
        if (!d.tenant_name.toLowerCase().includes(s) && !(d.broker_email || "").toLowerCase().includes(s) && !(d.broker_name || "").toLowerCase().includes(s))
          return false;
      }
      if (statusFilter !== "all" && d.tenant_status !== statusFilter) return false;
      if (stripeFilter === "with" && !d.stripe_subscription_id) return false;
      if (stripeFilter === "without" && d.stripe_subscription_id) return false;
      return true;
    });
  }, [data, search, statusFilter, stripeFilter]);

  const kpis = useMemo(() => ({
    active: data.filter(d => d.tenant_status === "active").length,
    trial: data.filter(d => d.tenant_status === "trialing").length,
    past_due: data.filter(d => d.tenant_status === "past_due").length,
    suspended: data.filter(d => d.tenant_status === "suspended").length,
    total: data.length,
  }), [data]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "trialing": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "past_due": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "suspended": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "canceled": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const exportCSV = () => {
    const headers = ["Nome", "Email", "Status", "Tenant ID", "Criado em", "Stripe Customer", "Stripe Subscription"];
    const rows = filtered.map(d => [
      d.broker_name || d.tenant_name,
      d.broker_email || "",
      d.tenant_status,
      d.tenant_id,
      new Date(d.created_at).toLocaleDateString("pt-BR"),
      d.stripe_customer_id || "",
      d.stripe_subscription_id || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "brokers.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const bulkAction = async (action: "suspend" | "reactivate") => {
    const targets = filtered.filter(d => action === "suspend" ? d.tenant_status === "active" : d.tenant_status === "suspended");
    if (targets.length === 0) { toast.error("Nenhum broker elegível"); return; }
    const newStatus = action === "suspend" ? "suspended" : "active";
    for (const t of targets) {
      await (supabase.from("tenants" as any).update({ status: newStatus }).eq("id", t.tenant_id) as any);
    }
    toast.success(`${targets.length} broker(s) ${action === "suspend" ? "suspensos" : "reativados"}`);
    loadData();
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
      <Helmet><title>Brokers | Super Admin</title></Helmet>
      <div className="min-h-screen bg-[#0a0a0c] text-white">
        {/* Header */}
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#FFFF00]" />
              <h1 className="text-xl font-bold">Gestão de Brokers</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />Atualizar
              </Button>
              <Button size="sm" onClick={() => navigate("/super-admin/brokers/new")} className="bg-[#FFFF00] text-black hover:bg-[#e6e600]">
                <Plus className="w-4 h-4 mr-2" />Adicionar Broker
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/super-admin/brokers/invites")} className="border-[#2a2a2e] text-slate-300 hover:text-white">
                <Mail className="w-4 h-4 mr-2" />Convites
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/super-admin")} className="border-[#2a2a2e] text-slate-300 hover:text-white">
                Voltar
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Ativos", value: kpis.active, color: "text-emerald-400", filter: "active" },
              { label: "Trial", value: kpis.trial, color: "text-blue-400", filter: "trialing" },
              { label: "Past Due", value: kpis.past_due, color: "text-yellow-400", filter: "past_due" },
              { label: "Suspensos", value: kpis.suspended, color: "text-red-400", filter: "suspended" },
              { label: "Total", value: kpis.total, color: "text-white", filter: "all" },
            ].map(k => (
              <Card key={k.label} className="bg-[#1e1e22] border-[#2a2a2e] cursor-pointer hover:border-[#FFFF00]/30 transition-colors" onClick={() => setStatusFilter(k.filter)}>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-slate-400">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou email..." className="pl-10 bg-[#0f0f12] border-[#2a2a2e] text-white" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-[#0f0f12] border-[#2a2a2e] text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stripeFilter} onValueChange={setStripeFilter}>
              <SelectTrigger className="w-[160px] bg-[#0f0f12] border-[#2a2a2e] text-white">
                <SelectValue placeholder="Stripe" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Com Stripe</SelectItem>
                <SelectItem value="without">Sem Stripe</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={exportCSV} className="border-[#2a2a2e] text-slate-300 hover:text-white">
                <Download className="w-4 h-4 mr-1" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkAction("suspend")} className="border-red-500/30 text-red-400 hover:text-red-300">
                <Ban className="w-4 h-4 mr-1" />Suspender
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkAction("reactivate")} className="border-emerald-500/30 text-emerald-400 hover:text-emerald-300">
                <Play className="w-4 h-4 mr-1" />Reativar
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card className="bg-[#1e1e22] border-[#2a2a2e]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                  <p>Nenhum broker encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-400">
                        <th className="text-left py-3 px-3">Nome</th>
                        <th className="text-left py-3 px-3">Email</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Tenant ID</th>
                        <th className="text-left py-3 px-3">Criado em</th>
                        <th className="text-left py-3 px-3">Último login</th>
                        <th className="text-left py-3 px-3">Stripe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(d => (
                        <tr key={d.tenant_id} className="border-b border-[#2a2a2e]/50 hover:bg-[#2a2a2e]/30 transition-colors cursor-pointer" onClick={() => setSelectedTenantId(d.tenant_id)}>
                          <td className="py-3 px-3 font-medium text-white">{d.broker_name || d.tenant_name}</td>
                          <td className="py-3 px-3 text-slate-300">{d.broker_email || "—"}</td>
                          <td className="py-3 px-3">
                            <Badge className={`text-xs ${statusColor(d.tenant_status)}`}>{d.tenant_status}</Badge>
                          </td>
                          <td className="py-3 px-3">
                            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(d.tenant_id); toast.success("ID copiado"); }} className="text-xs font-mono text-slate-400 hover:text-white truncate max-w-[100px] block">
                              {d.tenant_id.slice(0, 8)}…
                            </button>
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-xs">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs">{d.last_login ? new Date(d.last_login).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="py-3 px-3">
                            {d.stripe_subscription_id ? (
                              <CreditCard className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-500" />
                            )}
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

        <SuperAdminBrokerDetailSheet
          tenantId={selectedTenantId}
          open={!!selectedTenantId}
          onOpenChange={open => !open && setSelectedTenantId(null)}
          onRefresh={loadData}
        />
      </div>
    </>
  );
};

export default SuperAdminBrokers;
