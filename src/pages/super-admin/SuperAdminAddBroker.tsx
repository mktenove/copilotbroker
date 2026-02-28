import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface InviteResult {
  accept_url: string;
  email: string;
  expires_at: string;
  token: string;
}

const SuperAdminAddBroker = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    tag: "",
    creation_type: "manual" as "self_serve" | "manual" | "migrate",
    initial_status: "active" as "trialing" | "active" | "pending_invite",
    trial_days: 14,
    stripe_customer_id: "",
    stripe_subscription_id: "",
    send_invite: true,
    invite_message: "Olá! Você foi convidado para usar o Copilot Broker. Acesse o link abaixo para criar sua conta.",
  });

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nome e email são obrigatórios"); return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminUserId = session?.user?.id;

      // Check if email already exists as tenant
      const { data: existingTenant } = await (supabase
        .from("tenants" as any)
        .select("id")
        .eq("owner_email", form.email.trim())
        .maybeSingle() as any);

      if (existingTenant) {
        toast.error("Já existe um tenant com este email");
        setIsSubmitting(false);
        return;
      }

      const slug = generateSlug(form.name);
      const tenantStatus = form.creation_type === "self_serve" ? "pending_payment" :
                           form.initial_status === "trialing" ? "trialing" : "active";

      // Create tenant
      const { data: tenant, error: tenantError } = await (supabase
        .from("tenants" as any)
        .insert({
          name: form.name.trim(),
          slug,
          plan_type: "broker",
          included_users: 1,
          extra_users: 0,
          status: tenantStatus,
          owner_email: form.email.trim(),
          owner_phone: form.phone || null,
          tag: form.tag || null,
          trial_ends_at: form.initial_status === "trialing" ? new Date(Date.now() + form.trial_days * 86400000).toISOString() : null,
          stripe_customer_id: form.stripe_customer_id || null,
          stripe_subscription_id: form.stripe_subscription_id || null,
        })
        .select("id")
        .single() as any);

      if (tenantError) throw tenantError;

      // Create entitlements
      await (supabase.from("tenant_entitlements" as any).insert({
        tenant_id: tenant.id,
        max_users: 1,
        features: { copilot: true, roletas: true, whatsapp: true, campaigns: true },
      }) as any);

      // Try to link existing broker
      const { data: existingBroker } = await (supabase
        .from("brokers" as any)
        .select("id, user_id")
        .eq("email", form.email.trim())
        .maybeSingle() as any);

      if (existingBroker) {
        await (supabase.from("brokers" as any).update({ tenant_id: tenant.id }).eq("id", existingBroker.id) as any);
        await (supabase.from("tenant_memberships" as any).insert({
          tenant_id: tenant.id, user_id: existingBroker.user_id, role: "owner", is_active: true,
        }) as any);
      }

      // Create invite via edge function
      if (form.send_invite) {
        try {
          const { data: inviteData, error: inviteErr } = await supabase.functions.invoke("create-invite", {
            body: {
              tenant_id: tenant.id,
              email: form.email.trim(),
              role: "owner",
              message: form.invite_message,
            },
          });
          if (inviteErr) throw inviteErr;
          if (inviteData?.error) throw new Error(inviteData.error);

          setInviteResult({
            accept_url: inviteData.accept_url,
            email: inviteData.email,
            expires_at: inviteData.expires_at,
            token: inviteData.token,
          });
        } catch (err: any) {
          console.error("Invite error:", err);
          toast.warning("Broker criado, mas erro ao gerar convite: " + (err?.message || ""));
        }
      }

      // Audit log
      await (supabase.from("audit_logs" as any).insert({
        admin_user_id: adminUserId,
        action: "create_broker",
        target_tenant_id: tenant.id,
        after_data: {
          name: form.name, email: form.email, creation_type: form.creation_type,
          initial_status: form.initial_status, send_invite: form.send_invite,
        },
      }) as any);

      // If self-serve, generate checkout link
      if (form.creation_type === "self_serve") {
        try {
          const { data: checkoutData } = await supabase.functions.invoke("create-checkout", {
            body: { tenant_id: tenant.id, email: form.email.trim() },
          });
          if (checkoutData?.url) {
            setCheckoutUrl(checkoutData.url);
            toast.success("Broker criado! Link de checkout gerado.");
            return;
          }
        } catch (err) {
          console.error("Checkout error:", err);
          toast.warning("Broker criado, mas não foi possível gerar o link de checkout");
        }
      }

      if (!inviteResult) {
        toast.success(`Broker "${form.name}" criado com sucesso!`);
        if (!form.send_invite) navigate("/super-admin/brokers");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao criar broker");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show invite result card
  if (inviteResult) {
    return (
      <>
        <Helmet><title>Convite Criado | Super Admin</title></Helmet>
        <div className="min-h-screen bg-[#0a0a0c] text-white">
          <div className="border-b border-[#2a2a2e] bg-[#0f0f12]">
            <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#FFFF00]" />
              <h1 className="text-lg font-bold">Convite Criado</h1>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <p className="text-white font-semibold">Broker e convite criados com sucesso!</p>
                    <p className="text-sm text-slate-400">Compartilhe o link abaixo com {inviteResult.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Link de aceite</Label>
                  <div className="bg-[#0f0f12] border border-[#2a2a2e] rounded-lg p-4 break-all">
                    <p className="text-sm text-[#FFFF00] font-mono">{inviteResult.accept_url}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Email:</span>
                    <p className="text-white">{inviteResult.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Expira em:</span>
                    <p className="text-white">{format(new Date(inviteResult.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteResult.accept_url);
                      toast.success("Link copiado!");
                    }}
                    className="bg-[#FFFF00] text-black hover:bg-[#e6e600]"
                  >
                    <Copy className="w-4 h-4 mr-2" />Copiar Link
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/super-admin/brokers")} className="border-[#2a2a2e] text-slate-300 hover:text-white">
                    Voltar à Lista
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/super-admin/invites")} className="border-[#2a2a2e] text-slate-300 hover:text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />Ver Convites
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Show checkout URL card
  if (checkoutUrl) {
    return (
      <>
        <Helmet><title>Checkout | Super Admin</title></Helmet>
        <div className="min-h-screen bg-[#0a0a0c] text-white">
          <div className="border-b border-[#2a2a2e] bg-[#0f0f12]">
            <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#FFFF00]" />
              <h1 className="text-lg font-bold">Link de Checkout</h1>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 py-6">
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white">Link de Checkout Gerado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#0f0f12] rounded-lg p-4 break-all">
                  <p className="text-sm text-[#FFFF00] font-mono">{checkoutUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { navigator.clipboard.writeText(checkoutUrl); toast.success("Link copiado!"); }} className="bg-[#FFFF00] text-black hover:bg-[#e6e600]">
                    Copiar Link
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/super-admin/brokers")} className="border-[#2a2a2e] text-slate-300">
                    Voltar à Lista
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Adicionar Broker | Super Admin</title></Helmet>
      <div className="min-h-screen bg-[#0a0a0c] text-white">
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12]">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/brokers")} className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />Voltar
            </Button>
            <Shield className="w-5 h-5 text-[#FFFF00]" />
            <h1 className="text-lg font-bold">Adicionar Broker</h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Dados do Broker</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Nome do corretor" className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="email@exemplo.com" className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="(51) 99999-0000" className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tag / Origem</Label>
                    <Input value={form.tag} onChange={e => update("tag", e.target.value)} placeholder="Ex: evento-2026" className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plano */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Plano</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#FFFF00]/20 text-[#FFFF00] border-[#FFFF00]/30">Broker (1 licença)</Badge>
                  <span className="text-sm text-slate-400">max_users = 1</span>
                </div>
              </CardContent>
            </Card>

            {/* Tipo de criação */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Tipo de Criação</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={form.creation_type} onValueChange={v => update("creation_type", v)} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="self_serve" id="self_serve" className="mt-1 border-slate-500" />
                    <label htmlFor="self_serve" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Self-serve via Stripe Checkout</p>
                      <p className="text-xs text-slate-400">Gera um link de checkout para o broker pagar</p>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="manual" id="manual" className="mt-1 border-slate-500" />
                    <label htmlFor="manual" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Provisionamento Manual</p>
                      <p className="text-xs text-slate-400">Admin cria e libera o acesso</p>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="migrate" id="migrate" className="mt-1 border-slate-500" />
                    <label htmlFor="migrate" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Migrar Broker Existente</p>
                      <p className="text-xs text-slate-400">User já existe no auth, apenas criar tenant</p>
                    </label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Status inicial */}
            {form.creation_type !== "self_serve" && (
              <Card className="bg-[#1e1e22] border-[#2a2a2e]">
                <CardHeader><CardTitle className="text-white text-base">Status Inicial</CardTitle></CardHeader>
                <CardContent>
                  <RadioGroup value={form.initial_status} onValueChange={v => update("initial_status", v)} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="trialing" id="trialing" className="mt-1 border-slate-500" />
                      <label htmlFor="trialing" className="cursor-pointer">
                        <p className="text-sm font-medium text-white">Trial</p>
                        <p className="text-xs text-slate-400">Acesso temporário por X dias</p>
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="active" id="active_status" className="mt-1 border-slate-500" />
                      <label htmlFor="active_status" className="cursor-pointer">
                        <p className="text-sm font-medium text-white">Ativo imediato (cortesia)</p>
                        <p className="text-xs text-slate-400">Acesso completo sem pagamento</p>
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="pending_invite" id="pending_invite" className="mt-1 border-slate-500" />
                      <label htmlFor="pending_invite" className="cursor-pointer">
                        <p className="text-sm font-medium text-white">Aguardando convite</p>
                        <p className="text-xs text-slate-400">Ativo assim que aceitar o convite</p>
                      </label>
                    </div>
                  </RadioGroup>
                  {form.initial_status === "trialing" && (
                    <div className="mt-3 space-y-2">
                      <Label>Dias de trial</Label>
                      <Input type="number" min={1} max={90} value={form.trial_days} onChange={e => update("trial_days", parseInt(e.target.value) || 14)} className="bg-[#0f0f12] border-[#2a2a2e] text-white w-32" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stripe */}
            {form.creation_type === "manual" && (
              <Card className="bg-[#1e1e22] border-[#2a2a2e]">
                <CardHeader><CardTitle className="text-white text-base">Stripe (opcional)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Stripe Customer ID</Label>
                    <Input value={form.stripe_customer_id} onChange={e => update("stripe_customer_id", e.target.value)} placeholder="cus_..." className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stripe Subscription ID</Label>
                    <Input value={form.stripe_subscription_id} onChange={e => update("stripe_subscription_id", e.target.value)} placeholder="sub_..." className="bg-[#0f0f12] border-[#2a2a2e] text-white" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Convite */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">Convite</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.send_invite} onCheckedChange={v => update("send_invite", v)} id="send_invite" />
                  <label htmlFor="send_invite" className="text-sm text-white cursor-pointer">Gerar convite e link de aceite</label>
                </div>
                {form.send_invite && (
                  <div className="space-y-2">
                    <Label>Mensagem do convite</Label>
                    <Textarea value={form.invite_message} onChange={e => update("invite_message", e.target.value)} className="bg-[#0f0f12] border-[#2a2a2e] text-white min-h-[80px]" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600] h-12 text-base font-semibold">
              {isSubmitting ? "Criando..." : "Criar Broker"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default SuperAdminAddBroker;
