import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SuperAdminRealEstateNew = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", owner_email: "", status: "active" as string,
    included_users: 5, admin_notes: "",
    initial_status: "active" as "trialing" | "active",
    trial_days: 14,
    stripe_customer_id: "", stripe_subscription_id: "",
    send_invite: false,
    invite_message: "Olá! Sua imobiliária foi cadastrada na plataforma Copilot Broker. Acesse o link abaixo para configurar sua conta.",
  });
  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.owner_email.trim()) { toast.error("Nome e email são obrigatórios"); return; }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(form.name);
      const { data: existing } = await (supabase.from("tenants" as any).select("id").eq("slug", slug).maybeSingle() as any);
      if (existing) { toast.error("Já existe uma imobiliária com esse nome"); setIsSubmitting(false); return; }

      const { data: { session } } = await supabase.auth.getSession();

      const { data: tenant, error } = await (supabase.from("tenants" as any).insert({
        name: form.name.trim(), slug, plan_type: "real_estate",
        owner_email: form.owner_email.trim().toLowerCase(),
        status: form.initial_status === "trialing" ? "trialing" : "active",
        included_users: form.included_users, extra_users: 0,
        admin_notes: form.admin_notes.trim() || null,
        trial_ends_at: form.initial_status === "trialing" ? new Date(Date.now() + form.trial_days * 86400000).toISOString() : null,
        stripe_customer_id: form.stripe_customer_id || null,
        stripe_subscription_id: form.stripe_subscription_id || null,
      }).select("id").single() as any);
      if (error) throw error;

      // Create entitlements
      await (supabase.from("tenant_entitlements" as any).insert({
        tenant_id: tenant.id, max_users: form.included_users,
        features: { copilot: true, roletas: true, whatsapp: true, campaigns: true },
      }) as any);

      // Try linking existing broker
      const { data: existingBroker } = await (supabase.from("brokers" as any).select("id, user_id").eq("email", form.owner_email.trim().toLowerCase()).maybeSingle() as any);
      if (existingBroker) {
        await (supabase.from("brokers" as any).update({ tenant_id: tenant.id }).eq("id", existingBroker.id) as any);
        await (supabase.from("tenant_memberships" as any).insert({ tenant_id: tenant.id, user_id: existingBroker.user_id, role: "owner", is_active: true }) as any);
      }

      // Invite
      if (form.send_invite && session) {
        await (supabase.from("invites" as any).insert({
          email: form.owner_email.trim().toLowerCase(), tenant_id: tenant.id,
          invited_by: session.user.id, message: form.invite_message, status: "sent",
        }) as any);
      }

      // Audit
      if (session) {
        await (supabase.from("audit_logs" as any).insert({
          admin_user_id: session.user.id, action: "tenant_created", target_tenant_id: tenant.id,
          after_data: { name: form.name, plan_type: "real_estate", status: form.initial_status },
        }) as any);
      }

      toast.success(`Imobiliária "${form.name}" criada com sucesso!`);
      navigate("/super-admin/tenants/real-estate");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar imobiliária");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet><title>Nova Imobiliária | Super Admin</title></Helmet>
      <div className="text-white">
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/tenants/real-estate")} className="text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" />Voltar
          </Button>
          <Building2 className="w-5 h-5 text-[#FFFF00]" />
          <h1 className="text-lg font-bold">Nova Imobiliária</h1>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Dados da Imobiliária</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nome *</Label>
                    <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Ex: Imobiliária Premium" className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">E-mail do Responsável *</Label>
                    <Input type="email" value={form.owner_email} onChange={e => update("owner_email", e.target.value)} placeholder="admin@imobiliaria.com" className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Licenças incluídas</Label>
                  <Input type="number" min={1} max={100} value={form.included_users} onChange={e => update("included_users", parseInt(e.target.value) || 5)} className="bg-[#0f0f12] border-[#2a2a2e] text-white w-32" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Notas internas</Label>
                  <Textarea value={form.admin_notes} onChange={e => update("admin_notes", e.target.value)} placeholder="Observações..." className="bg-[#0f0f12] border-[#2a2a2e] text-white resize-none h-20" />
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Status Inicial</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={form.initial_status} onValueChange={v => update("initial_status", v)} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="active" id="re_active" className="mt-1 border-slate-500" />
                    <label htmlFor="re_active" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Ativo imediato</p>
                      <p className="text-xs text-slate-400">Acesso completo liberado</p>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="trialing" id="re_trial" className="mt-1 border-slate-500" />
                    <label htmlFor="re_trial" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Trial</p>
                      <p className="text-xs text-slate-400">Acesso temporário por X dias</p>
                    </label>
                  </div>
                </RadioGroup>
                {form.initial_status === "trialing" && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300">Dias de trial</Label>
                    <Input type="number" min={1} max={90} value={form.trial_days} onChange={e => update("trial_days", parseInt(e.target.value) || 14)} className="bg-[#0f0f12] border-[#2a2a2e] text-white w-32" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stripe */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Stripe (opcional)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Stripe Customer ID</Label>
                    <Input value={form.stripe_customer_id} onChange={e => update("stripe_customer_id", e.target.value)} placeholder="cus_..." className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Stripe Subscription ID</Label>
                    <Input value={form.stripe_subscription_id} onChange={e => update("stripe_subscription_id", e.target.value)} placeholder="sub_..." className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Convite */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Convite</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.send_invite} onCheckedChange={v => update("send_invite", v)} id="re_invite" />
                  <label htmlFor="re_invite" className="text-sm text-white cursor-pointer">Enviar convite ao responsável</label>
                </div>
                {form.send_invite && (
                  <Textarea value={form.invite_message} onChange={e => update("invite_message", e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-white min-h-[80px]" />
                )}
              </CardContent>
            </Card>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600] h-12 text-base font-semibold">
              {isSubmitting ? "Criando..." : "Criar Imobiliária"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default SuperAdminRealEstateNew;
