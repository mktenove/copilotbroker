import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users, Copy, ExternalLink, RefreshCw, Building2, CreditCard, Shield,
  UserPlus, UserMinus, Save, Plus, Minus, Clock, ChevronDown, ChevronUp,
  Mail, Key, LogOut, Pencil, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { STRIPE_PLANS, EXTRA_USER_PRICE } from "@/lib/stripe-plans";

interface TenantDetailSheetProps {
  tenantId: string | null;
  tenantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TenantData {
  id: string; name: string; slug: string; status: string; owner_email: string | null;
  owner_user_id: string | null; created_at: string; stripe_customer_id: string | null;
  stripe_subscription_id: string | null; included_users: number; extra_users: number;
  admin_notes: string | null; trial_ends_at: string | null; plan_type: string;
}

interface Membership {
  id: string; user_id: string; role: string; is_active: boolean; created_at: string;
  email?: string; name?: string;
}

interface AuditEntry {
  id: string; action: string; created_at: string; metadata: any;
  before_data: any; after_data: any;
}

interface Entitlement {
  id: string; max_users: number; features: any;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: "Ativo", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  trialing: { label: "Trial", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  suspended: { label: "Suspenso", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  past_due: { label: "Inadimplente", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  canceled: { label: "Cancelado", classes: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  grace_period: { label: "Carência", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
};

const Section = ({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#2a2a2e] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-[#0f0f12] hover:bg-[#1a1a1e] transition-colors text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">{icon}{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};

const InfoRow = ({ label, value, copyable }: { label: string; value: string | null | undefined; copyable?: boolean }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-sm text-slate-200 flex items-center gap-1 font-mono">
      {value || "—"}
      {copyable && value && (
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado!"); }} className="text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
      )}
    </span>
  </div>
);

const TenantDetailSheet = ({ tenantId, tenantName, open, onOpenChange }: TenantDetailSheetProps) => {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [extraUsers, setExtraUsers] = useState(0);
  const [savingSeats, setSavingSeats] = useState(false);
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [updatingStripe, setUpdatingStripe] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [tenantRes, membRes, entRes, auditRes] = await Promise.all([
        supabase.from("tenants" as any).select("*").eq("id", tenantId).single() as any,
        supabase.from("tenant_memberships" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: true }) as any,
        supabase.from("tenant_entitlements" as any).select("*").eq("tenant_id", tenantId).single() as any,
        supabase.from("audit_logs" as any).select("*").eq("target_tenant_id", tenantId).order("created_at", { ascending: false }).limit(20) as any,
      ]);

      const tenantData = tenantRes.data;
      setTenant(tenantData);
      setNotes(tenantData?.admin_notes || "");
      setExtraUsers(tenantData?.extra_users || 0);
      setEntitlement(entRes.data);
      setAuditLogs(auditRes.data || []);

      // Enrich memberships with broker info
      const mems: Membership[] = membRes.data || [];
      if (mems.length > 0) {
        const userIds = mems.map(m => m.user_id);
        const { data: brokers } = await (supabase.from("brokers" as any).select("user_id, name, email").in("user_id", userIds) as any);
        const brokerMap: Record<string, { name: string; email: string }> = {};
        (brokers || []).forEach((b: any) => { brokerMap[b.user_id] = { name: b.name, email: b.email }; });
        setMemberships(mems.map(m => ({ ...m, name: brokerMap[m.user_id]?.name, email: brokerMap[m.user_id]?.email })));
      } else {
        setMemberships([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { if (open && tenantId) loadData(); }, [open, tenantId, loadData]);

  const logAudit = async (action: string, beforeData?: any, afterData?: any, metadata?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from("audit_logs" as any).insert({
      admin_user_id: user.id,
      action,
      target_tenant_id: tenantId,
      before_data: beforeData || null,
      after_data: afterData || null,
      metadata: metadata || null,
    }) as any);
  };

  const saveNotes = async () => {
    if (!tenantId) return;
    setSavingNotes(true);
    const before = tenant?.admin_notes;
    const { error } = await (supabase.from("tenants" as any).update({ admin_notes: notes }).eq("id", tenantId) as any);
    if (error) { toast.error("Erro ao salvar"); setSavingNotes(false); return; }
    await logAudit("update_admin_notes", { admin_notes: before }, { admin_notes: notes });
    toast.success("Notas salvas");
    setSavingNotes(false);
    loadData();
  };

  const updateExtraUsers = async () => {
    if (!tenantId || !tenant) return;
    setSavingSeats(true);
    const newMax = (tenant.included_users || 3) + extraUsers;
    const before = { extra_users: tenant.extra_users, max_users: entitlement?.max_users };
    const { error: tErr } = await (supabase.from("tenants" as any).update({ extra_users: extraUsers }).eq("id", tenantId) as any);
    if (tErr) { toast.error("Erro: " + tErr.message); setSavingSeats(false); return; }

    if (entitlement) {
      await (supabase.from("tenant_entitlements" as any).update({ max_users: newMax }).eq("tenant_id", tenantId) as any);
    }
    await logAudit("update_seats", before, { extra_users: extraUsers, max_users: newMax });
    toast.success(`Seats atualizados: max_users = ${newMax}`);
    setSavingSeats(false);
    loadData();
  };

  const syncFromStripe = async () => {
    if (!tenantId) return;
    setSyncingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-seats", {
        body: { action: "sync_from_stripe", tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Sincronizado: extra_users=${data.extra_users}, max_users=${data.max_users}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar");
    } finally {
      setSyncingStripe(false);
    }
  };

  const updateStripeQuantity = async () => {
    if (!tenantId) return;
    setUpdatingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-seats", {
        body: { action: "update_stripe_quantity", tenant_id: tenantId, extra_users: extraUsers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Stripe atualizado: extra_users=${data.extra_users}, max_users=${data.max_users}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar Stripe");
    } finally {
      setUpdatingStripe(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!tenantId || !tenant) return;
    const before = { status: tenant.status };
    const { error } = await (supabase.from("tenants" as any).update({ status: newStatus }).eq("id", tenantId) as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    await logAudit("change_status", before, { status: newStatus });
    toast.success("Status atualizado para " + newStatus);
    loadData();
  };

  const removeMember = async (membership: Membership) => {
    const { error } = await (supabase.from("tenant_memberships" as any).update({ is_active: false }).eq("id", membership.id) as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    await logAudit("remove_member", { user_id: membership.user_id, role: membership.role }, { is_active: false });
    toast.success("Membro removido");
    loadData();
  };

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copiado!`); };

  if (!tenant && !isLoading) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#1e1e22] border-[#2a2a2e] text-white w-full sm:max-w-2xl" />
    </Sheet>
  );

  const sc = statusConfig[tenant?.status || "active"] || statusConfig.active;
  const maxUsers = entitlement?.max_users || (tenant?.included_users || 3) + (tenant?.extra_users || 0);
  const activeMembers = memberships.filter(m => m.is_active).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#1e1e22] border-[#2a2a2e] text-white w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#2a2a2e]">
          <SheetTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FFFF00]" />
            {tenantName}
            {tenant && <Badge className={`ml-2 text-xs ${sc.classes}`}>{sc.label}</Badge>}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FFFF00]" />
          </div>
        ) : tenant && (
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="p-6 space-y-4">
              {/* 1) Resumo */}
              <Section title="Resumo" icon={<Building2 className="w-4 h-4 text-[#FFFF00]" />}>
                <InfoRow label="Nome" value={tenant.name} />
                <InfoRow label="Tenant ID" value={tenant.id} copyable />
                <InfoRow label="Slug" value={tenant.slug} />
                <InfoRow label="Status" value={sc.label} />
                <InfoRow label="Plano" value={`Imobiliária (${tenant.included_users} inclusos + ${tenant.extra_users} adicionais)`} />
                <InfoRow label="Usuários" value={`${activeMembers} / ${maxUsers}`} />
                <InfoRow label="Criado em" value={new Date(tenant.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                {tenant.trial_ends_at && <InfoRow label="Trial até" value={new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")} />}
                <div className="flex gap-2 pt-2">
                  {tenant.status !== "suspended" ? (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange("suspended")} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">Suspender</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange("active")} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs">Reativar</Button>
                  )}
                </div>
              </Section>

              {/* 2) Owner */}
              <Section title="Owner / Admin Principal" icon={<Shield className="w-4 h-4 text-cyan-400" />}>
                <InfoRow label="Email" value={tenant.owner_email} copyable />
                <InfoRow label="User ID" value={tenant.owner_user_id} copyable />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" className="border-[#2a2a2e] text-slate-300 text-xs" disabled>
                    <Key className="w-3 h-3 mr-1" />Magic Link
                  </Button>
                  <Button size="sm" variant="outline" className="border-[#2a2a2e] text-slate-300 text-xs" disabled>
                    <LogOut className="w-3 h-3 mr-1" />Forçar Logout
                  </Button>
                  <Button size="sm" variant="outline" className="border-[#2a2a2e] text-slate-300 text-xs" disabled>
                    <Pencil className="w-3 h-3 mr-1" />Trocar Email
                  </Button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Ações de auth requerem service_role (em breve)</p>
              </Section>

              {/* 3) Stripe */}
              <Section title="Assinatura Stripe" icon={<CreditCard className="w-4 h-4 text-purple-400" />}>
                {tenant.stripe_customer_id ? (
                  <>
                    <InfoRow label="Customer ID" value={tenant.stripe_customer_id} copyable />
                    <InfoRow label="Subscription ID" value={tenant.stripe_subscription_id} copyable />
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" className="border-[#2a2a2e] text-slate-300 text-xs" onClick={() => window.open(`https://dashboard.stripe.com/customers/${tenant.stripe_customer_id}`, "_blank")}>
                        <ExternalLink className="w-3 h-3 mr-1" />Customer
                      </Button>
                      {tenant.stripe_subscription_id && (
                        <Button size="sm" variant="outline" className="border-[#2a2a2e] text-slate-300 text-xs" onClick={() => window.open(`https://dashboard.stripe.com/subscriptions/${tenant.stripe_subscription_id}`, "_blank")}>
                          <ExternalLink className="w-3 h-3 mr-1" />Subscription
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Nenhum vínculo Stripe encontrado</p>
                )}
              </Section>

              {/* 4) Gestão de Usuários */}
              <Section title={`Gestão de Usuários (${activeMembers}/${maxUsers})`} icon={<Users className="w-4 h-4 text-emerald-400" />}>
                {activeMembers >= maxUsers && (
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <p className="text-xs text-orange-400">Limite de usuários atingido ({activeMembers}/{maxUsers})</p>
                  </div>
                )}
                <div className="space-y-2">
                  {memberships.filter(m => m.is_active).map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-[#0f0f12] rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{m.name || "Sem nome"}</p>
                        <p className="text-xs text-slate-400">{m.email || m.user_id.slice(0, 8)} • {m.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">{m.role}</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10">
                              <UserMinus className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Desativar {m.name || m.email} do tenant {tenant.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-[#2a2a2e] text-slate-300">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeMember(m)} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* 5) Limites / Seats */}
              <Section title="Limites e Assentos" icon={<UserPlus className="w-4 h-4 text-blue-400" />}>
                <div className="bg-[#0f0f12] rounded-lg p-3 text-xs text-slate-400 space-y-1">
                  <p>Regra: <span className="text-white font-medium">{tenant.included_users} inclusos</span> + add-on de <span className="text-white font-medium">R$ {EXTRA_USER_PRICE.price.toFixed(2).replace(".", ",")}</span> por usuário adicional</p>
                  <p>max_users = {tenant.included_users} + {extraUsers} = <span className="text-[#FFFF00] font-bold">{tenant.included_users + extraUsers}</span></p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-slate-400 w-32">Usuários adicionais</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-[#2a2a2e] text-slate-300" onClick={() => setExtraUsers(Math.max(0, extraUsers - 1))} disabled={extraUsers <= 0}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number" min={0} value={extraUsers}
                      onChange={e => setExtraUsers(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 h-7 text-center bg-[#0f0f12] border-[#2a2a2e] text-white text-sm"
                    />
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-[#2a2a2e] text-slate-300" onClick={() => setExtraUsers(extraUsers + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-[#2a2a2e] my-2" />

                {/* Stripe Actions */}
                <div className="space-y-2">
                  {tenant.stripe_subscription_id && (
                    <>
                      <Button
                        size="sm" variant="outline"
                        onClick={syncFromStripe}
                        disabled={syncingStripe}
                        className="w-full border-[#2a2a2e] text-slate-300 hover:text-white text-xs justify-start"
                      >
                        <RefreshCw className={`w-3 h-3 mr-2 ${syncingStripe ? "animate-spin" : ""}`} />
                        Sincronizar com Stripe (ler quantity atual)
                      </Button>

                      {extraUsers !== (tenant.extra_users || 0) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs justify-start"
                              disabled={updatingStripe}
                            >
                              <CreditCard className="w-3 h-3 mr-2" />
                              Atualizar quantity no Stripe ({tenant.extra_users || 0} → {extraUsers})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Atualizar assentos no Stripe?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Isso vai alterar a quantity do item extra_user na subscription de {tenant.extra_users || 0} para {extraUsers}.
                                O Stripe criará proration automaticamente. max_users passará para {tenant.included_users + extraUsers}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-[#2a2a2e] text-slate-300">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={updateStripeQuantity} className="bg-purple-600 hover:bg-purple-700">Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}

                  {/* Manual update (cortesia) */}
                  {extraUsers !== (tenant.extra_users || 0) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600] text-xs justify-start" disabled={savingSeats}>
                          <Save className="w-3 h-3 mr-2" />
                          Atualizar manualmente (cortesia) → max_users = {tenant.included_users + extraUsers}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Atualização manual de seats?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            <span className="flex items-center gap-1 text-orange-400">
                              <AlertTriangle className="w-4 h-4" />
                              Isso NÃO altera o Stripe. Use apenas para cortesia/teste.
                            </span>
                            max_users passará de {maxUsers} para {tenant.included_users + extraUsers}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-[#2a2a2e] text-slate-300">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={updateExtraUsers} className="bg-[#FFFF00] text-black hover:bg-[#e6e600]">Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </Section>

              {/* 6) Notas */}
              <Section title="Notas Internas" icon={<Pencil className="w-4 h-4 text-yellow-400" />} defaultOpen={false}>
                <Textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Notas visíveis apenas para Super Admin..."
                  className="bg-[#0f0f12] border-[#2a2a2e] text-white min-h-[80px] text-sm"
                />
                {notes !== (tenant.admin_notes || "") && (
                  <Button size="sm" onClick={saveNotes} disabled={savingNotes} className="bg-[#FFFF00] text-black hover:bg-[#e6e600] text-xs">
                    <Save className="w-3 h-3 mr-1" />{savingNotes ? "Salvando..." : "Salvar Notas"}
                  </Button>
                )}
              </Section>

              {/* 7) Auditoria */}
              <Section title={`Auditoria (${auditLogs.length})`} icon={<Clock className="w-4 h-4 text-slate-400" />} defaultOpen={false}>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhum registro de auditoria</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map(log => (
                      <div key={log.id} className="border-l-2 border-[#2a2a2e] pl-3 py-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] border-[#2a2a2e] text-slate-400">{log.action}</Badge>
                          <span className="text-[10px] text-slate-600">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        {log.after_data && (
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">{JSON.stringify(log.after_data)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TenantDetailSheet;
