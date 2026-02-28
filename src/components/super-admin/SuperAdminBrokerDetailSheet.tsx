import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Users, CreditCard, Shield, FileText, Clock, Copy, Ban, Play, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tenantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const SuperAdminBrokerDetailSheet = ({ tenantId, open, onOpenChange, onRefresh }: Props) => {
  const [tenant, setTenant] = useState<any>(null);
  const [broker, setBroker] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && tenantId) loadDetail();
  }, [open, tenantId]);

  const loadDetail = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [tenantRes, brokerRes, logsRes] = await Promise.all([
        (supabase.from("tenants" as any).select("*").eq("id", tenantId).single() as any),
        (supabase.from("brokers" as any).select("*").eq("tenant_id", tenantId).limit(1) as any),
        (supabase.from("audit_logs" as any).select("*").eq("target_tenant_id", tenantId).order("created_at", { ascending: false }).limit(20) as any),
      ]);
      setTenant(tenantRes.data);
      setBroker(brokerRes.data?.[0] || null);
      setNotes(tenantRes.data?.admin_notes || "");
      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!tenantId) return;
    setIsSaving(true);
    await (supabase.from("tenants" as any).update({ admin_notes: notes }).eq("id", tenantId) as any);
    await logAudit("update_notes", { notes });
    toast.success("Notas salvas");
    setIsSaving(false);
  };

  const toggleStatus = async (newStatus: string) => {
    if (!tenantId || !tenant) return;
    const oldStatus = tenant.status;
    await (supabase.from("tenants" as any).update({ status: newStatus }).eq("id", tenantId) as any);
    await logAudit("change_status", { old: oldStatus, new: newStatus });
    toast.success(`Status alterado para ${newStatus}`);
    loadDetail();
    onRefresh();
  };

  const logAudit = async (action: string, afterData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    await (supabase.from("audit_logs" as any).insert({
      admin_user_id: session?.user?.id,
      action,
      target_tenant_id: tenantId,
      target_user_id: broker?.user_id || null,
      after_data: afterData,
    }) as any);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/20 text-emerald-400";
      case "trialing": return "bg-blue-500/20 text-blue-400";
      case "past_due": return "bg-yellow-500/20 text-yellow-400";
      case "suspended": return "bg-red-500/20 text-red-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  if (!tenant) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#1e1e22] border-[#2a2a2e] text-white w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FFFF00]" />
            {broker?.name || tenant?.name}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Identificação */}
            <Section icon={<Users className="w-4 h-4" />} title="Identificação">
              <InfoRow label="Nome" value={broker?.name || tenant?.name} />
              <InfoRow label="Email" value={broker?.email || tenant?.owner_email || "—"} />
              <InfoRow label="WhatsApp" value={broker?.whatsapp || "—"} />
              <InfoRow label="Tenant ID" value={tenantId || ""} copyable />
              <InfoRow label="Slug" value={tenant?.slug} />
            </Section>

            <Separator className="bg-[#2a2a2e]" />

            {/* Assinatura Stripe */}
            <Section icon={<CreditCard className="w-4 h-4" />} title="Assinatura Stripe">
              <InfoRow label="Customer ID" value={tenant?.stripe_customer_id || "—"} copyable={!!tenant?.stripe_customer_id} />
              <InfoRow label="Subscription ID" value={tenant?.stripe_subscription_id || "—"} copyable={!!tenant?.stripe_subscription_id} />
              <div className="flex items-center gap-2 mt-2">
                <Badge className={statusColor(tenant?.status)}>{tenant?.status}</Badge>
                {tenant?.trial_ends_at && <span className="text-xs text-slate-400">Trial até {new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}</span>}
              </div>
            </Section>

            <Separator className="bg-[#2a2a2e]" />

            {/* Acesso */}
            <Section icon={<Shield className="w-4 h-4" />} title="Acesso">
              <InfoRow label="User ID" value={broker?.user_id || tenant?.owner_user_id || "—"} copyable />
              <div className="flex gap-2 mt-2 flex-wrap">
                {tenant?.status === "active" && (
                  <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:text-red-300" onClick={() => toggleStatus("suspended")}>
                    <Ban className="w-3 h-3 mr-1" />Suspender
                  </Button>
                )}
                {tenant?.status === "suspended" && (
                  <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 hover:text-emerald-300" onClick={() => toggleStatus("active")}>
                    <Play className="w-3 h-3 mr-1" />Reativar
                  </Button>
                )}
              </div>
            </Section>

            <Separator className="bg-[#2a2a2e]" />

            {/* Notas */}
            <Section icon={<FileText className="w-4 h-4" />} title="Notas internas">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre este broker..." className="bg-[#0f0f12] border-[#2a2a2e] text-white min-h-[80px]" />
              <Button size="sm" onClick={saveNotes} disabled={isSaving} className="mt-2 bg-[#FFFF00] text-black hover:bg-[#e6e600]">
                {isSaving ? "Salvando..." : "Salvar Notas"}
              </Button>
            </Section>

            <Separator className="bg-[#2a2a2e]" />

            {/* Auditoria */}
            <Section icon={<Clock className="w-4 h-4" />} title={`Auditoria (${auditLogs.length})`}>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum evento registrado</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {auditLogs.map(log => (
                    <div key={log.id} className="bg-[#0f0f12] rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#FFFF00]">{log.action}</span>
                        <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      {log.after_data && <p className="text-xs text-slate-400 mt-1 truncate">{JSON.stringify(log.after_data)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">{icon}{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

const InfoRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-slate-400">{label}</span>
    <div className="flex items-center gap-1">
      <span className="text-sm text-white font-mono truncate max-w-[200px]">{value}</span>
      {copyable && value && value !== "—" && (
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado!"); }} className="text-slate-500 hover:text-white">
          <Copy className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);

export default SuperAdminBrokerDetailSheet;
