import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Plus, Search, RefreshCw, Mail, Download, CheckCircle2, Clock, XCircle, AlertTriangle,
  ExternalLink, Users, TrendingUp, MoreHorizontal, Copy, ChevronLeft, ChevronRight, ChevronsUpDown,
  Eye, Pause, Play, Send, CreditCard, Filter, X, Calendar, Shield, UserCheck,
  DollarSign, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import TenantDetailSheet from "@/components/super-admin/TenantDetailSheet";
import { STRIPE_PLANS, EXTRA_USER_PRICE } from "@/lib/stripe-plans";

interface RealEstateTenant {
  id: string; name: string; slug: string; status: string; owner_email: string | null;
  created_at: string; stripe_customer_id: string | null; stripe_subscription_id: string | null;
  included_users: number; extra_users: number; admin_notes: string | null; trial_ends_at: string | null;
  member_count?: number; broker_count?: number; project_count?: number; lead_count?: number;
  max_users?: number; has_pending_invite?: boolean;
}

type SortField = "name" | "status" | "member_count" | "created_at" | "lead_count";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const statusConfig: Record<string, { label: string; classes: string; dotColor: string }> = {
  active: { label: "Ativo", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dotColor: "bg-emerald-400" },
  trialing: { label: "Trial", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20", dotColor: "bg-blue-400" },
  suspended: { label: "Suspenso", classes: "bg-red-500/10 text-red-400 border-red-500/20", dotColor: "bg-red-400" },
  past_due: { label: "Inadimplente", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20", dotColor: "bg-orange-400" },
  grace_period: { label: "Carência", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dotColor: "bg-yellow-400" },
  canceled: { label: "Cancelado", classes: "bg-slate-500/10 text-slate-400 border-slate-500/20", dotColor: "bg-slate-400" },
};

const SuperAdminRealEstate = () => {
  const [tenants, setTenants] = useState<RealEstateTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stripeFilter, setStripeFilter] = useState("all");
  const [limitFilter, setLimitFilter] = useState(false);
  const [inviteFilter, setInviteFilter] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
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

      const tenantIds = (data || []).map((t: any) => t.id);
      if (tenantIds.length === 0) { setTenants([]); setIsLoading(false); return; }

      // Batch count queries
      const [memberships, brokersRes, projectsRes, leadsRes, entitlements, invites] = await Promise.all([
        supabase.from("tenant_memberships" as any).select("tenant_id").eq("is_active", true).in("tenant_id", tenantIds) as any,
        supabase.from("brokers" as any).select("tenant_id").eq("is_active", true).in("tenant_id", tenantIds) as any,
        supabase.from("projects" as any).select("tenant_id").eq("is_active", true).in("tenant_id", tenantIds) as any,
        supabase.from("leads" as any).select("tenant_id").in("tenant_id", tenantIds) as any,
        supabase.from("tenant_entitlements" as any).select("tenant_id, max_users").in("tenant_id", tenantIds) as any,
        supabase.from("invites" as any).select("tenant_id, status").eq("status", "sent").in("tenant_id", tenantIds) as any,
      ]);

      const countBy = (arr: any[], field: string) => {
        const map: Record<string, number> = {};
        (arr || []).forEach((r: any) => { map[r[field]] = (map[r[field]] || 0) + 1; });
        return map;
      };

      const memberCounts = countBy(memberships.data, "tenant_id");
      const brokerCounts = countBy(brokersRes.data, "tenant_id");
      const projectCounts = countBy(projectsRes.data, "tenant_id");
      const leadCounts = countBy(leadsRes.data, "tenant_id");
      const entMap: Record<string, number> = {};
      (entitlements.data || []).forEach((e: any) => { entMap[e.tenant_id] = e.max_users; });
      const inviteSet = new Set((invites.data || []).map((i: any) => i.tenant_id));

      const enriched: RealEstateTenant[] = (data || []).map((t: any) => ({
        ...t,
        member_count: memberCounts[t.id] || 0,
        broker_count: brokerCounts[t.id] || 0,
        project_count: projectCounts[t.id] || 0,
        lead_count: leadCounts[t.id] || 0,
        max_users: entMap[t.id] || t.included_users + t.extra_users,
        has_pending_invite: inviteSet.has(t.id),
      }));
      setTenants(enriched);
    } catch (err) {
      toast.error("Erro ao carregar imobiliárias");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = tenants.filter(t => {
      if (search) {
        const s = search.toLowerCase();
        if (!t.name.toLowerCase().includes(s) && !(t.owner_email || "").toLowerCase().includes(s) && !t.id.toLowerCase().includes(s)) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (stripeFilter === "with" && !t.stripe_customer_id) return false;
      if (stripeFilter === "without" && t.stripe_customer_id) return false;
      if (limitFilter && (t.member_count || 0) < (t.max_users || 999)) return false;
      if (inviteFilter && !t.has_pending_invite) return false;
      return true;
    });

    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
        case "status": va = a.status; vb = b.status; break;
        case "member_count": va = a.member_count || 0; vb = b.member_count || 0; break;
        case "lead_count": va = a.lead_count || 0; vb = b.lead_count || 0; break;
        case "created_at": va = a.created_at; vb = b.created_at; break;
        default: va = a.created_at; vb = b.created_at;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [tenants, search, statusFilter, stripeFilter, limitFilter, inviteFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, statusFilter, stripeFilter, limitFilter, inviteFilter]);

  const kpis = useMemo(() => {
    const active = tenants.filter(t => t.status === "active").length;
    const trial = tenants.filter(t => t.status === "trialing").length;
    const pastDue = tenants.filter(t => t.status === "past_due").length;
    const suspended = tenants.filter(t => t.status === "suspended").length;
    const totalUsers = tenants.reduce((a, t) => a + (t.member_count || 0), 0);
    // MRR estimate: active * plan price + extra_users * extra price
    const mrr = tenants.filter(t => t.status === "active" || t.status === "trialing").reduce((a, t) => {
      return a + STRIPE_PLANS.imobiliaria.price + (t.extra_users || 0) * EXTRA_USER_PRICE.price;
    }, 0);
    return { active, trial, pastDue, suspended, totalUsers, mrr };
  }, [tenants]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map(t => t.id)));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleBatchAction = async (action: "suspend" | "reactivate") => {
    if (selectedIds.size === 0) return;
    const newStatus = action === "suspend" ? "suspended" : "active";
    const { error } = await (supabase.from("tenants" as any).update({ status: newStatus }).in("id", Array.from(selectedIds)) as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`${selectedIds.size} imobiliária(s) ${action === "suspend" ? "suspensa(s)" : "reativada(s)"}`);
    setSelectedIds(new Set());
    loadData();
  };

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    const { error } = await (supabase.from("tenants" as any).update({ status: newStatus }).eq("id", tenantId) as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Status atualizado");
    loadData();
  };

  const exportCSV = () => {
    const headers = ["Nome", "Email", "Status", "Membros", "Limite", "Extras", "Corretores", "Projetos", "Leads", "Stripe Customer", "Stripe Sub", "Criado"];
    const rows = filtered.map(t => [
      t.name, t.owner_email || "", t.status, t.member_count, t.max_users, t.extra_users,
      t.broker_count, t.project_count, t.lead_count, t.stripe_customer_id || "", t.stripe_subscription_id || "",
      new Date(t.created_at).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "imobiliarias.csv"; a.click();
    toast.success("CSV exportado!");
  };

  const SortHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th className={`py-3 px-4 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-slate-300 transition-colors ${className}`} onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        <ChevronsUpDown className={`w-3 h-3 ${sortField === field ? "text-[#FFFF00]" : "text-slate-600"}`} />
      </span>
    </th>
  );

  const activeFilterCount = [statusFilter !== "all", stripeFilter !== "all", limitFilter, inviteFilter].filter(Boolean).length;

  return (
    <>
      <Helmet><title>Imobiliárias | Super Admin</title></Helmet>
      <div className="text-white">
        {/* Header */}
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-[#FFFF00]" />Imobiliárias</h1>
            <p className="text-xs text-slate-500">{tenants.length} tenants do tipo imobiliária</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
              { label: "Ativas", value: kpis.active, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-400", f: "active" },
              { label: "Trial", value: kpis.trial, icon: <Clock className="w-5 h-5" />, color: "text-blue-400", f: "trialing" },
              { label: "Inadimplentes", value: kpis.pastDue, icon: <AlertTriangle className="w-5 h-5" />, color: "text-orange-400", f: "past_due" },
              { label: "Suspensas", value: kpis.suspended, icon: <XCircle className="w-5 h-5" />, color: "text-red-400", f: "suspended" },
              { label: "MRR Estimado", value: `R$ ${kpis.mrr.toFixed(2).replace(".", ",")}`, icon: <DollarSign className="w-5 h-5" />, color: "text-[#FFFF00]" },
              { label: "Total Usuários", value: kpis.totalUsers, icon: <Users className="w-5 h-5" />, color: "text-cyan-400" },
            ].map(k => (
              <Card
                key={k.label}
                className={`bg-[#1e1e22] border-[#2a2a2e] cursor-pointer hover:border-[#3a3a3e] transition-all ${statusFilter === k.f ? "ring-1 ring-[#FFFF00]/30" : ""}`}
                onClick={() => k.f && setStatusFilter(prev => prev === k.f ? "all" : k.f!)}
              >
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, email ou tenant_id..." className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-[#1e1e22] border-[#2a2a2e] text-white"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="past_due">Inadimplente</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`border-[#2a2a2e] text-slate-300 hover:text-white ${activeFilterCount > 0 ? "border-[#FFFF00]/40 text-[#FFFF00]" : ""}`}>
                <Filter className="w-4 h-4 mr-1" />Filtros{activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>

              {/* Batch actions */}
              {selectedIds.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="border-[#FFFF00]/40 text-[#FFFF00]">
                      Ações ({selectedIds.size}) <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    <DropdownMenuItem onClick={() => handleBatchAction("suspend")} className="text-red-400"><Pause className="w-4 h-4 mr-2" />Suspender</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchAction("reactivate")} className="text-emerald-400"><Play className="w-4 h-4 mr-2" />Reativar</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#2a2a2e]" />
                    <DropdownMenuItem className="text-slate-300"><Send className="w-4 h-4 mr-2" />Reenviar Convites</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="outline" size="sm" onClick={exportCSV} className="ml-auto border-[#2a2a2e] text-slate-300 hover:text-white">
                <Download className="w-4 h-4 mr-1" />CSV
              </Button>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-4 bg-[#1e1e22] border border-[#2a2a2e] rounded-lg p-4">
                <Select value={stripeFilter} onValueChange={setStripeFilter}>
                  <SelectTrigger className="w-[160px] bg-[#0f0f12] border-[#2a2a2e] text-white"><SelectValue placeholder="Stripe" /></SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                    <SelectItem value="all">Todos (Stripe)</SelectItem>
                    <SelectItem value="with">Com Stripe</SelectItem>
                    <SelectItem value="without">Sem Stripe</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <Checkbox checked={limitFilter} onCheckedChange={(v) => setLimitFilter(!!v)} className="border-[#2a2a2e] data-[state=checked]:bg-[#FFFF00] data-[state=checked]:text-black" />
                  No limite de usuários
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <Checkbox checked={inviteFilter} onCheckedChange={(v) => setInviteFilter(!!v)} className="border-[#2a2a2e] data-[state=checked]:bg-[#FFFF00] data-[state=checked]:text-black" />
                  Convite pendente
                </label>
                {(stripeFilter !== "all" || limitFilter || inviteFilter) && (
                  <Button variant="ghost" size="sm" onClick={() => { setStripeFilter("all"); setLimitFilter(false); setInviteFilter(false); }} className="text-slate-400 hover:text-white">
                    <X className="w-3 h-3 mr-1" />Limpar
                  </Button>
                )}
              </div>
            )}
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
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-500">
                        <th className="py-3 px-4 w-10">
                          <Checkbox
                            checked={selectedIds.size === paged.length && paged.length > 0}
                            onCheckedChange={toggleSelectAll}
                            className="border-[#2a2a2e] data-[state=checked]:bg-[#FFFF00] data-[state=checked]:text-black"
                          />
                        </th>
                        <SortHeader field="name" label="Imobiliária" className="text-left" />
                        <SortHeader field="status" label="Status" className="text-left" />
                        <th className="py-3 px-4 text-left text-xs uppercase tracking-wider">Plano</th>
                        <SortHeader field="member_count" label="Usuários" className="text-center" />
                        <th className="py-3 px-4 text-center text-xs uppercase tracking-wider">Extras</th>
                        <SortHeader field="created_at" label="Criado" className="text-left" />
                        <th className="py-3 px-4 text-left text-xs uppercase tracking-wider">Stripe</th>
                        <th className="py-3 px-4 text-center text-xs uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(t => {
                        const sc = statusConfig[t.status] || statusConfig.active;
                        const atLimit = (t.member_count || 0) >= (t.max_users || 999);
                        return (
                          <tr key={t.id} className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20 group">
                            <td className="py-3 px-4">
                              <Checkbox
                                checked={selectedIds.has(t.id)}
                                onCheckedChange={() => toggleSelect(t.id)}
                                className="border-[#2a2a2e] data-[state=checked]:bg-[#FFFF00] data-[state=checked]:text-black"
                              />
                            </td>
                            <td className="py-3 px-4 cursor-pointer" onClick={() => setSelectedTenant({ id: t.id, name: t.name })}>
                              <p className="font-medium group-hover:text-[#FFFF00] transition-colors">{t.name}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{t.owner_email || t.slug}</p>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`text-xs ${sc.classes}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dotColor} mr-1.5 inline-block`} />
                                {sc.label}
                              </Badge>
                              {t.has_pending_invite && (
                                <Badge className="text-xs ml-1.5 bg-purple-500/10 text-purple-400 border-purple-500/20"><Mail className="w-3 h-3 mr-1" />Convite</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-300 text-xs">Imobiliária</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`tabular-nums text-sm ${atLimit ? "text-red-400 font-semibold" : "text-slate-300"}`}>
                                {t.member_count}/{t.max_users}
                              </span>
                              {atLimit && <AlertTriangle className="w-3 h-3 text-red-400 inline ml-1" />}
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums text-slate-400">{t.extra_users}</td>
                            <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                            <td className="py-3 px-4">
                              {t.stripe_customer_id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-emerald-400">Vinculado</span>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={(e) => { e.stopPropagation(); copyToClipboard(t.stripe_customer_id!, "Customer ID"); }}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={(e) => { e.stopPropagation(); window.open(`https://dashboard.stripe.com/customers/${t.stripe_customer_id}`, "_blank"); }}>
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : <span className="text-xs text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1e1e22] border-[#2a2a2e] min-w-[180px]">
                                  <DropdownMenuItem onClick={() => setSelectedTenant({ id: t.id, name: t.name })} className="text-slate-300">
                                    <Eye className="w-4 h-4 mr-2" />Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[#2a2a2e]" />
                                  {t.status !== "suspended" ? (
                                    <DropdownMenuItem onClick={() => handleStatusChange(t.id, "suspended")} className="text-red-400">
                                      <Pause className="w-4 h-4 mr-2" />Suspender
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleStatusChange(t.id, "active")} className="text-emerald-400">
                                      <Play className="w-4 h-4 mr-2" />Reativar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="text-slate-300">
                                    <Send className="w-4 h-4 mr-2" />Reenviar Convite
                                  </DropdownMenuItem>
                                  {t.stripe_customer_id && (
                                    <>
                                      <DropdownMenuSeparator className="bg-[#2a2a2e]" />
                                      <DropdownMenuItem onClick={() => window.open(`https://dashboard.stripe.com/customers/${t.stripe_customer_id}`, "_blank")} className="text-slate-300">
                                        <CreditCard className="w-4 h-4 mr-2" />Abrir Stripe
                                      </DropdownMenuItem>
                                      {t.stripe_subscription_id && (
                                        <DropdownMenuItem onClick={() => copyToClipboard(t.stripe_subscription_id!, "Sub ID")} className="text-slate-300">
                                          <Copy className="w-4 h-4 mr-2" />Copiar Sub ID
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a2e]">
                    <p className="text-xs text-slate-500">{filtered.length} resultados • Página {page + 1} de {totalPages}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-slate-400 hover:text-white h-8 w-8 p-0">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                        const pageNum = start + i;
                        return (
                          <Button key={pageNum} variant="ghost" size="sm" onClick={() => setPage(pageNum)}
                            className={`h-8 w-8 p-0 ${page === pageNum ? "bg-[#FFFF00]/10 text-[#FFFF00]" : "text-slate-400 hover:text-white"}`}
                          >{pageNum + 1}</Button>
                        );
                      })}
                      <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-slate-400 hover:text-white h-8 w-8 p-0">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <TenantDetailSheet tenantId={selectedTenant?.id || null} tenantName={selectedTenant?.name || ""} open={!!selectedTenant} onOpenChange={open => !open && setSelectedTenant(null)} />
      </div>
    </>
  );
};

export default SuperAdminRealEstate;
